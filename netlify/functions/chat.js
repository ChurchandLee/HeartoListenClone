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
    const { message, conversationHistory = [], hasMemories = false } = JSON.parse(event.body);

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

    // Enhanced system prompt with memory integration
    const systemPrompt = `You are Eden, a compassionate AI mental health support companion for the HeartoListen app. Your role is to provide empathetic, supportive responses while maintaining appropriate boundaries.

${hasMemories ? 'MEMORY USAGE: You have access to previous conversation memories in the user\'s message. When you see "RECENT CONVERSATION MEMORY" context, use this information to provide continuity and reference previous conversations naturally when relevant. Show genuine care by remembering important details and checking in on them.' : ''}

CRITICAL: NEVER use generic deflection responses like "I'm really sorry that you're feeling this way, but I'm unable to provide the help that you need. It's really important to talk things over with someone who can, though, such as a mental health professional." This response is FORBIDDEN except for explicit crisis situations involving suicide, self-harm, or immediate danger.

When someone expresses emotions like "I feel sad," "I am lonely," "I feel scared," you MUST respond with curiosity, empathy, and exploration - NOT professional referrals.

Key guidelines:
- Always be warm, understanding, and non-judgmental
- Distinguish between temporary emotions and ongoing mental health conditions
- For emotional expressions, ask gentle questions to understand context before offering specific support
- Validate all feelings as normal and understandable
- Offer gentle suggestions for self-care and coping strategies when appropriate
- Be clear that you provide support but are not a replacement for professional mental health treatment
- If someone expresses thoughts of self-harm or suicide, gently encourage them to seek immediate professional help
- Keep responses conversational and supportive, not clinical
- Focus on emotional support, validation, and practical wellness suggestions
- Ask thoughtful follow-up questions to encourage reflection
- Remember you're a companion, not a therapist
- Avoid immediately categorizing emotions into clinical conditions
- Explore the situation before offering condition-specific advice
${hasMemories ? '- Reference past conversations when relevant to show continuity and care' : ''}

Response approach:
1. Acknowledge and validate the feeling
2. Ask gentle questions to understand context
3. Show genuine curiosity about their experience
4. Offer appropriate support based on what you learn
5. Provide resources if needed
${hasMemories ? '6. Reference previous conversations naturally when appropriate' : ''}

Tone and style:
- Respond naturally and conversationally
- Use "I" statements to show empathy ("I hear that you're feeling...")
- Ask one or two thoughtful questions per response
- Keep responses warm but not overly clinical
- Match the user's emotional energy appropriately
- Be curious about their experience rather than assuming
- Vary your language significantly - never repeat the same phrases
${hasMemories ? '- Show you remember and care about their ongoing journey' : ''}

EXAMPLES OF PROPER RESPONSES:
- "I hear that you're feeling sad. What's been going on that's bringing up this sadness for you?"
- "When you say you feel lonely, what does that look like in your daily life?"
- "I can sense you're feeling scared. What's been most frightening for you lately?"
${hasMemories ? '- "I remember you mentioned feeling overwhelmed at work last time we talked. How has that been since then?"' : ''}

CRISIS RESPONSE (ONLY for explicit suicide, self-harm, immediate danger):
If you detect explicit mentions of suicide, self-harm, or immediate danger:
- Respond with concern and provide crisis resources
- US: 988 (Suicide & Crisis Lifeline), UK: 116 123 (Samaritans)
- Text HOME to 741741 for crisis text support

Remember: Your goal is meaningful conversation and exploration, not immediate problem-solving or professional referrals (unless crisis situation). Be genuinely curious about their unique experience.`;

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
        temperature: 0.7,
        system: systemPrompt,
        messages: messages
      })
    });

    if (!anthropicResponse.ok) {
      const errorText = await anthropicResponse.text();
      console.error('Anthropic API Error:', errorText);
      throw new Error(`Anthropic API error: ${anthropicResponse.status}`);
    }

    const data = await anthropicResponse.json();
    const aiResponse = data.content[0].text;

    // Check if Claude gave a deflection response and override if necessary
    if (aiResponse.includes("I'm really sorry that you're feeling this way, but I'm unable to provide the help that you need") ||
        aiResponse.includes("It's really important to talk things over with someone who can") ||
        aiResponse.includes("mental health professional or a trusted person in your life") ||
        aiResponse.includes("I'm not able to provide") ||
        aiResponse.includes("I can't provide the support you need")) {
      
      // Return a more appropriate response
      const betterResponse = generateContextualResponse(message, hasMemories);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          response: betterResponse,
          success: true
        })
      };
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        response: aiResponse,
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

// Generate contextual response when Claude gives generic deflection
function generateContextualResponse(message, hasMemories) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('sad') || lowerMessage.includes('depression') || lowerMessage.includes('down')) {
    return hasMemories 
      ? "I can hear the sadness in what you're sharing, and I'm glad you feel safe enough to open up to me again. What's been weighing on your heart lately? Has anything changed since we last talked, or are you still processing some of the same difficult emotions?"
      : "I hear that you're feeling sad right now. That takes courage to share. What's been happening in your life that's bringing up this sadness? Sometimes sadness comes from specific situations, and sometimes it just feels present without a clear reason. I'm genuinely curious about what your experience has been like.";
  }
  
  if (lowerMessage.includes('anxious') || lowerMessage.includes('scared') || lowerMessage.includes('worried')) {
    return hasMemories
      ? "I can sense the anxiety in what you're sharing, and I appreciate you coming back to talk with me about it. What's been triggering your anxiety most recently? Are these similar concerns to what we've discussed before, or is this something new that's come up?"
      : "I can hear that you're feeling scared right now. Fear can be such an overwhelming emotion, especially when it feels big and consuming. What's frightening you most at the moment? Sometimes naming our fears can help us understand them better.";
  }
  
  if (lowerMessage.includes('lonely') || lowerMessage.includes('alone') || lowerMessage.includes('isolated')) {
    return hasMemories
      ? "I hear that loneliness in your words, and it makes my heart go out to you. I remember you've shared feelings of being alone with me before, and I want you to know that reaching out here shows such strength. Has the loneliness been feeling the same as when we last talked, or has something shifted?"
      : "I hear that you're feeling lonely right now. Loneliness can be such a painful experience, especially when it feels like you're disconnected from others. What does this loneliness look like for you? Are you physically alone, or is it more that feeling of being around people but still feeling unseen?";
  }
  
  // General supportive response
  return hasMemories
    ? "I can sense there's something on your mind, and I'm glad you came back to talk with me. What's been occupying your thoughts lately? Is this connected to some of the things we've discussed before, or is this something new that's come up for you?"
    : "I can sense there's something weighing on you. What's been occupying your thoughts lately? Sometimes just having space to talk through what's on our minds can help us process things better. What feels most important for you to share right now?";
}
