const Groq = require('groq-sdk');
const fetch = require('node-fetch');
const { AbortController } = require('abort-controller');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const fetchWithTimeout = async (url, options = {}, ms = 8000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const searchAllSources = async (q) => {
  const results = await Promise.allSettled([
    searchUSDA(q),
    searchOFF(q),
    searchCalorieAPI(q),
    searchAPINinjas(q)
  ]);
  return results.flatMap(r => r.status === 'fulfilled' ? r.value : []);
};

const searchUSDA = async (q) => {
  try {
    const res = await fetchWithTimeout(
      `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${process.env.USDA_API_KEY}`,
      {
        method: 'POST',
        headers: { 'User-Agent': 'LTFI/1.0', 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, pageSize: 5 })
      },
      8000
    );
    const data = await res.json();
    return (data.foods || []).map(f => {
      const nutrients = f.foodNutrients || [];
      const getByNumber = (num) => {
        const n = nutrients.find(n => String(n.nutrientNumber) === String(num));
        return n ? Math.round(n.value || 0) : 0;
      };
      return {
        name: f.description,
        calories: getByNumber(208),
        protein: getByNumber(203),
        carbs: getByNumber(205),
        fat: getByNumber(204),
        fiber: getByNumber(291),
        sodium: getByNumber(307),
        sugar: getByNumber(269),
        servingSize: 100,
        servingUnit: 'g',
        source: 'usda'
      };
    }).filter(f => f.name);
  } catch (err) {
    return [];
  }
};

const searchOFF = async (q) => {
  try {
    const res = await fetchWithTimeout(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=5&fields=product_name,nutriments`,
      { headers: { 'User-Agent': 'LTFI/1.0' } },
      5000
    );
    const data = await res.json();
    return (data.products || [])
      .filter(p => p.product_name && p.nutriments)
      .map(p => ({
        name: p.product_name,
        calories: Math.round(p.nutriments['energy-kcal_100g'] || 0),
        protein: Math.round(p.nutriments['proteins_100g'] || 0),
        carbs: Math.round(p.nutriments['carbohydrates_100g'] || 0),
        fat: Math.round(p.nutriments['fat_100g'] || 0),
        fiber: Math.round(p.nutriments['fiber_100g'] || 0),
        sodium: Math.round(p.nutriments['sodium_100g'] || 0),
        sugar: Math.round(p.nutriments['sugars_100g'] || 0),
        servingSize: 100,
        servingUnit: 'g',
        source: 'open_food_facts'
      }));
  } catch (err) {
    return [];
  }
};

const searchCalorieAPI = async (q) => {
  try {
    const res = await fetchWithTimeout(
      `https://api.calorieapi.com/api/v1/search/foods?q=${encodeURIComponent(q)}&page_size=5`,
      { headers: { 'X-API-Key': process.env.CALORIE_API_KEY, 'User-Agent': 'LTFI/1.0' } },
      8000
    );
    const data = await res.json();
    return (data.foods || data.results || []).map(f => ({
      name: f.name || f.food_name,
      calories: Math.round(f.calories || 0),
      protein: Math.round(f.protein || 0),
      carbs: Math.round(f.carbs || 0),
      fat: Math.round(f.fat || 0),
      fiber: Math.round(f.fiber || 0),
      sodium: Math.round(f.sodium || 0),
      sugar: Math.round(f.sugar || 0),
      servingSize: f.serving_size || 100,
      servingUnit: f.serving_unit || 'g',
      source: 'calorie_api'
    })).filter(f => f.name);
  } catch (err) {
    return [];
  }
};

const searchAPINinjas = async (q) => {
  try {
    const res = await fetchWithTimeout(
      `https://api.api-ninjas.com/v1/nutrition?query=${encodeURIComponent(q)}`,
      { headers: { 'X-Api-Key': process.env.API_NINJAS_KEY, 'User-Agent': 'LTFI/1.0' } },
      8000
    );
    const data = await res.json();
    return (Array.isArray(data) ? data : []).map(f => ({
      name: f.name,
      calories: Math.round(f.calories || 0),
      protein: Math.round(f.protein_g || 0),
      carbs: Math.round(f.carbohydrates_total_g || 0),
      fat: Math.round(f.fat_total_g || 0),
      fiber: Math.round(f.fiber_g || 0),
      sodium: Math.round(f.sodium_mg || 0),
      sugar: Math.round(f.sugar_g || 0),
      servingSize: f.serving_size_g || 100,
      servingUnit: 'g',
      source: 'api_ninjas'
    })).filter(f => f.name);
  } catch (err) {
    return [];
  }
};

const deduplicateResults = (results) => {
  const seen = new Set();
  return results.filter(f => {
    const key = f.name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const scanFoodImage = async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.status(400).json({ message: 'Image required' });

    const response = await groq.chat.completions.create({
      model: 'qwen/qwen3.6-27b',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a nutrition expert. Analyze this food image and return ONLY a JSON object with no markdown, no explanation, just raw JSON in this exact format:
{
  "name": "Food name",
  "calories": 000,
  "protein": 00,
  "carbs": 00,
  "fat": 00,
  "fiber": 0,
  "sodium": 0,
  "sugar": 0,
  "servingSize": 100,
  "servingUnit": "g"
}
Estimate values per 100g serving. If multiple foods are visible, return the primary dish.`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 500
    });

    const text = response.choices[0].message.content.trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const aiFood = JSON.parse(clean);

    // Search all sources using the AI-identified food name
    const allResults = await searchAllSources(aiFood.name);
    const deduplicated = deduplicateResults(allResults);

    if (deduplicated.length > 0) {
      const best = deduplicated[0];
      // Merge -- prefer DB data but keep AI name if DB name is too generic
      return res.json({
        name: aiFood.name,
        calories: best.calories || aiFood.calories,
        protein: best.protein || aiFood.protein,
        carbs: best.carbs || aiFood.carbs,
        fat: best.fat || aiFood.fat,
        fiber: best.fiber || aiFood.fiber,
        sodium: best.sodium || aiFood.sodium,
        sugar: best.sugar || aiFood.sugar,
        servingSize: best.servingSize || aiFood.servingSize,
        servingUnit: best.servingUnit || aiFood.servingUnit,
        source: best.source
      });
    }

    // No DB match -- return AI estimate as fallback
    res.json({ ...aiFood, source: 'ai_scan' });
  } catch (err) {
    console.error('AI Scan error:', err);
    res.status(500).json({ message: 'Failed to analyze image' });
  }
};

module.exports = { scanFoodImage };