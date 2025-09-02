// Replace the existing callChatGPT function in your HTML with this:
async function callChatGPT(messages) {
    try {
        // Call your secure Netlify function instead of OpenAI directly
        const response = await fetch('/.netlify/functions/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: messages
            })
        });
        
        if (!response.ok) {
            throw new Error(`Function Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check if backend signaled to use fallback
        if (data.fallback) {
            throw new Error('Backend fallback requested');
        }
        
        const apiResponse = data.choices[0].message.content.trim();
        
        // Check if API gave generic unhelpful response - if so, use our intelligent system instead
        if (apiResponse.includes("I'm really sorry that you're feeling this way, but I'm unable to provide the help that you need") ||
            apiResponse.includes("It's really important to talk things over with someone who can") ||
            apiResponse.includes("mental health professional or a trusted person in your life") ||
            apiResponse.includes("I'm not able to provide") ||
            apiResponse.includes("I can't provide the support you need")) {
            
            // Use our intelligent response system instead
            const lastUserMessage = messages[messages.length - 1].content;
            return generateIntelligentResponse(lastUserMessage, messages);
        }
        
        return data;
        
    } catch (error) {
        console.error('Backend Function Error:', error);
        // Fall back to intelligent response system
        const lastUserMessage = messages[messages.length - 1].content;
        return generateIntelligentResponse(lastUserMessage, messages);
    }
}

// Remove this line from your HTML since the API key is now in the backend:
// const OPENAI_API_KEY = 'YOUR_API_KEY_HERE';
