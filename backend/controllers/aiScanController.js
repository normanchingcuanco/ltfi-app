const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const scanFoodImage = async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) return res.status(400).json({ message: 'Image required' });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a nutrition expert. Analyze this food image and return ONLY a JSON object with no markdown, no explanation, just raw JSON in this exact format:
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
Estimate values per 100g serving. If multiple foods are visible, return the primary dish.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64,
          mimeType: mimeType || 'image/jpeg'
        }
      }
    ]);

    const text = result.response.text().trim();
    const food = JSON.parse(text);

    res.json({ ...food, source: 'ai_scan' });
  } catch (err) {
    console.error('AI Scan error:', err);
    res.status(500).json({ message: 'Failed to analyze image' });
  }
};

module.exports = { scanFoodImage };