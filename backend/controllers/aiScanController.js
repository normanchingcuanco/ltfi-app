const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const scanFoodImage = async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) return res.status(400).json({ message: 'Image required' });

    const response = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
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
    const food = JSON.parse(clean);

    res.json({ ...food, source: 'ai_scan' });
  } catch (err) {
    console.error('AI Scan error:', err);
    res.status(500).json({ message: 'Failed to analyze image' });
  }
};

module.exports = { scanFoodImage };