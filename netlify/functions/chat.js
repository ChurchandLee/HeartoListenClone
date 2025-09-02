exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // Parse the request body
    const { messages } = JSON.parse(event.body);

    if (!messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Messages array is required' }),
      };
    }

    // Get API key from environment variables
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.log('No API key found, using fallback');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          fallback: true,
          message: 'Using intelligent fallback system'
        }),
      };
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: 800,
        temperature: 0.7,
        presence_penalty: 0.6,
        frequency_penalty: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      
      // Return fallback signal instead of error
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          fallback: true,
          message: 'OpenAI API unavailable, using fallback'
        }),
      };
    }

    const data = await response.json();
    
    // Check for API usage or other issues
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          fallback: true,
          message: 'Invalid API response, using fallback'
        }),
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        choices: [{
          message: {
            content: data.choices[0].message.content
          }
        }],
        usage: data.usage
      }),
    };

  } catch (error) {
    console.error('Function error:', error);
    
    // Return fallback signal instead of error
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        fallback: true,
        message: 'Function error, using fallback'
      }),
    };
  }
};
