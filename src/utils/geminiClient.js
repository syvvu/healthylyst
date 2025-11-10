// Gemini API Client Setup
import { GoogleGenerativeAI } from '@google/generative-ai';
import multiKeyRateLimiter from './multiKeyRateLimiter';

// Check if API key is valid format
const isValidApiKey = (key) => {
  return key && typeof key === 'string' && key.length > 20 && key.startsWith('AIza');
};

// Cache of initialized models per context
const modelCache = new Map();

// Function to get or initialize a model for a specific context
const getModelForContext = (context) => {
  // Check cache first
  if (modelCache.has(context)) {
    return modelCache.get(context);
  }

  // Get API key for this context
  const API_KEY = multiKeyRateLimiter.getApiKey(context);
  
  if (!API_KEY) {
    return null;
  }

  if (!isValidApiKey(API_KEY)) {
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(API_KEY);
    // Use gemini-2.5-flash which is the stable model available
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    modelCache.set(context, model);
    return model;
  } catch (error) {
    console.error(`❌ Gemini AI initialization error for context "${context}":`, error.message);
    return null;
  }
};

// Generate content using Gemini with rate limiting for a specific context
// context: 'dashboard', 'timeline', 'insights_correlations', 'insights_anomalies', 'metrics'
export const generateContent = async (prompt, options = {}) => {
  const context = options.context || 'dashboard'; // Default to dashboard if not specified
  
  // Get model for this context
  const model = getModelForContext(context);
  
  if (!model) {
      return {
        text: generateFallbackResponse(prompt),
        success: false,
      error: `AI service unavailable for context "${context}" - API key not configured. Please check your .env file and restart the dev server.`
      };
  }
  
  // Use context-specific rate limiter to enforce 10 RPM limit per context
  return await multiKeyRateLimiter.executeRequest(context, async () => {
  try {
    const {
      temperature = 0.7,
      maxTokens = 1000,
      topP = 0.8,
      topK = 40
    } = options;
    
    const generationConfig = {
      temperature,
      topP,
      topK,
      maxOutputTokens: maxTokens,
    };
    
    // Use simple string format with config as second parameter (this works with gemini-2.5-flash)
    const result = await model.generateContent(prompt, generationConfig);
    const response = await result.response;
    const text = response.text();
    
    return {
      text,
      success: true
    };
  } catch (error) {
      
      // Check if it's a rate limit error
      if (error.message && (error.message.includes('429') || error.message.includes('rate limit') || error.message.includes('quota'))) {
        // Wait a bit longer and retry once
        await new Promise(resolve => setTimeout(resolve, 7000)); // Wait 7 seconds
        
        try {
          const {
            temperature = 0.7,
            maxTokens = 1000,
            topP = 0.8,
            topK = 40
          } = options;
          
          const generationConfig = {
            temperature,
            topP,
            topK,
            maxOutputTokens: maxTokens,
          };
          
          const result = await model.generateContent(prompt, generationConfig);
          const response = await result.response;
          const text = response.text();
          
          return {
            text,
            success: true
          };
        } catch (retryError) {
          return {
            text: generateFallbackResponse(prompt),
            success: false,
            error: retryError.message
          };
        }
      }
    
    // Return a fallback response instead of throwing
    return {
      text: generateFallbackResponse(prompt),
      success: false,
      error: error.message
    };
  }
  });
};

// Generate fallback response when AI is unavailable
const generateFallbackResponse = (prompt) => {
  // Simple keyword-based fallback responses
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('sleep')) {
    return 'Your sleep patterns show interesting correlations with other health metrics. Maintaining consistent sleep duration and quality can significantly impact your daily energy and mood.';
  }
  if (lowerPrompt.includes('activity') || lowerPrompt.includes('exercise') || lowerPrompt.includes('steps')) {
    return 'Regular physical activity is strongly linked to improved mood and energy levels. Even moderate daily movement can have positive effects on your overall wellbeing.';
  }
  if (lowerPrompt.includes('stress') || lowerPrompt.includes('mood')) {
    return 'Stress and mood levels are interconnected with sleep quality and physical activity. Managing stress through relaxation techniques and regular exercise can improve your mental wellbeing.';
  }
  if (lowerPrompt.includes('nutrition') || lowerPrompt.includes('calories') || lowerPrompt.includes('protein')) {
    return 'Your nutrition choices impact your energy levels and physical performance. Balanced meals with adequate protein support both activity and recovery.';
  }
  if (lowerPrompt.includes('correlation') || lowerPrompt.includes('pattern')) {
    return 'We\'ve identified meaningful patterns in your health data. These correlations reveal how different aspects of your lifestyle influence each other, providing opportunities for optimization.';
  }
  
  // Generic fallback
  return 'Based on your health data, there are interesting patterns worth exploring. Review the Insights Hub for detailed analysis of correlations and trends in your wellness journey.';
};

// Generate streaming content (if supported) with rate limiting for a specific context
export const generateContentStream = async (prompt, onChunk, context = 'dashboard') => {
  // Get model for this context
  const model = getModelForContext(context);
  
  if (!model) {
      return {
        text: 'Sorry, AI service is not available. Please check your API key configuration and restart the dev server.',
        success: false,
      error: `AI initialization failed for context "${context}" - API key not configured`
      };
  }
  
  // Use context-specific rate limiter to enforce 10 RPM limit per context
  return await multiKeyRateLimiter.executeRequest(context, async () => {
  try {
    // Try simple string format first
    let result;
    try {
      result = await model.generateContentStream(prompt);
    } catch (simpleError) {
      result = await model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
    }
    
    let fullText = '';
    
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      if (onChunk) {
        onChunk(chunkText);
      }
    }
    
    return {
      text: fullText,
      success: true
    };
  } catch (error) {
    console.error('Error generating streaming content with Gemini:', error);
    return {
      text: 'Sorry, I encountered an error generating a response. Please try again.',
      success: false,
      error: error.message
    };
  }
  });
};

// Check if Gemini is available for a specific context
export const isGeminiAvailable = (context = 'dashboard') => {
  return getModelForContext(context) !== null;
};

// Get model info for a specific context
export const getModelInfo = (context = 'dashboard') => {
  return {
    available: isGeminiAvailable(context),
    modelName: 'gemini-2.5-flash',
    context
  };
};

// Get rate limiter status for all contexts (for debugging)
export const getRateLimiterStatus = () => {
  return multiKeyRateLimiter.getStatus();
};

