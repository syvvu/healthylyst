// Multi-Key Rate Limiter for AI API Requests
// Manages separate rate limiters for different API keys/contexts

import { RateLimiter } from './rateLimiter';

class MultiKeyRateLimiter {
  constructor() {
    this.limiters = new Map();
    this.apiKeys = new Map();
  }

  // Get or create a rate limiter for a specific context
  getLimiter(context) {
    if (!this.limiters.has(context)) {
      this.limiters.set(context, new RateLimiter(10, 60000)); // 10 RPM per context
    }
    return this.limiters.get(context);
  }

  // Get API key for a context
  getApiKey(context) {
    if (this.apiKeys.has(context)) {
      return this.apiKeys.get(context);
    }

    // Load from environment variables
    const envKey = `REACT_APP_GEMINI_API_KEY_${context.toUpperCase()}`;
    const apiKey = process.env[envKey];
    
    if (apiKey) {
      this.apiKeys.set(context, apiKey);
      return apiKey;
    }

    // Fallback to default key if context-specific key not found
    const defaultKey = process.env.REACT_APP_GEMINI_API_KEY;
    if (defaultKey) {
      return defaultKey;
    }

    return null;
  }

  // Execute a request with rate limiting for a specific context
  async executeRequest(context, requestFn) {
    const limiter = this.getLimiter(context);
    return await limiter.executeRequest(requestFn);
  }

  // Get status of all limiters (for debugging)
  getStatus() {
    const status = {};
    this.limiters.forEach((limiter, context) => {
      status[context] = {
        activeRequests: limiter.requests.length,
        queuedRequests: limiter.queue.length,
        canMakeRequest: limiter.canMakeRequest()
      };
    });
    return status;
  }
}

// Create a singleton instance
const multiKeyRateLimiter = new MultiKeyRateLimiter();

export default multiKeyRateLimiter;

