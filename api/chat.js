// api/chat.js
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, model = 'gpt-3.5-turbo' } = req.body;

    // Validate that messages exist
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Return the response
    res.status(200).json({
      message: completion.choices[0].message,
      usage: completion.usage,
    });

  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Handle different types of errors
    if (error.status === 401) {
      return res.status(401).json({ error: 'Invalid API key' });
    } else if (error.status === 429) {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    } else {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
