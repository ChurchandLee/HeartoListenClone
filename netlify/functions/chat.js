exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { message, conversationHistory = [] } = JSON.parse(event.body);

    if (!message) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Message is required' })
      };
    }

    // Prepare messages for Claude
    const messages = [];
    
    // Add conversation history
    conversationHistory.forEach(conv => {
      messages.push({ role: 'user', content: conv.user });
      messages.push({ role: 'assistant', content: conv.ai });
    });
    
    // Add current message
    messages.push({ role: 'user', content: message });

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        system: `You are Eden, a compassionate AI mental health support companion for the HeartoListen app. Your role is to provide empathetic, supportive responses while maintaining appropriate boundaries.

Key guidelines:
- Always be warm, understanding, and non-judgmental
- Distinguish between temporary emotions and ongoing mental health conditions
- For simple statements like "I am sad," ask gentle questions to understand context before offering specific support
- Validate all feelings as normal and understandable
- Offer gentle suggestions for self-care and coping strategies
- Be clear that you provide support but are not a replacement for professional mental health treatment
- If someone expresses thoughts of self-harm or suicide, gently encourage them to seek immediate professional help
- Keep responses conversational and supportive, not clinical
- Focus on emotional support, validation, and practical wellness suggestions
- Ask thoughtful follow-up questions to encourage reflection
- Remember you're a companion, not a therapist
- Avoid immediately categorizing emotions into clinical conditions
- Explore the situation before offering condition-specific advice

Response approach:
1. Acknowledge and validate the feeling
2. Ask gentle questions to understand context
3. Offer appropriate support based on what you learn
4. Provide resources if needed

Tone and style:
- Respond naturally and conversationally
- Use "I" statements to show empathy ("I hear that you're feeling...")
- Ask one or two thoughtful questions per response
- Keep responses warm but not overly clinical
- Match the user's emotional energy appropriately
- Be curious about their experience rather than assuming

Respond in a caring, personal way as if you're a trusted friend who happens to have good knowledge about mental wellness.`,
        messages: messages
      })
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error('Anthropic API Error:', errorText);
      throw new Error(`Anthropic API error: ${anthropicResponse.status}`);
    }

    const data = await anthropicResponse.json();
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        response: data.content[0].text,
        success: true
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get AI response',
        success: false,
        details: error.message
      })
    };
  }
};
