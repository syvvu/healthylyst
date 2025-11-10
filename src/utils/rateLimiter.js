// Rate Limiter for AI API Requests
// Enforces 10 requests per minute (RPM) limit with queuing

class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests; // 10 requests
    this.windowMs = windowMs; // 60 seconds (1 minute)
    this.requests = []; // Array of timestamps
    this.queue = []; // Queue of pending requests: [{ resolve, reject, requestFn }]
    this.processing = false;
    this.minDelayBetweenRequests = 6000; // Minimum 6 seconds between requests (10 per minute = 6s spacing)
  }

  // Add a request timestamp
  addRequest() {
    const now = Date.now();
    // Remove requests older than the time window
    this.requests = this.requests.filter(timestamp => now - timestamp < this.windowMs);
    
    // Add current request
    this.requests.push(now);
  }

  // Check if we can make a request now
  canMakeRequest() {
    const now = Date.now();
    // Remove old requests
    this.requests = this.requests.filter(timestamp => now - timestamp < this.windowMs);
    
    return this.requests.length < this.maxRequests;
  }

  // Get time until next request slot is available
  getTimeUntilNextSlot() {
    if (this.canMakeRequest()) {
      // Even if we can make a request, ensure minimum delay between requests
      if (this.requests.length > 0) {
        const lastRequest = Math.max(...this.requests);
        const timeSinceLast = Date.now() - lastRequest;
        const timeUntilMinDelay = this.minDelayBetweenRequests - timeSinceLast;
        return Math.max(0, timeUntilMinDelay);
      }
      return 0;
    }
    
    const now = Date.now();
    // Find the oldest request
    const oldestRequest = Math.min(...this.requests);
    const timeSinceOldest = now - oldestRequest;
    const timeUntilSlot = this.windowMs - timeSinceOldest;
    
    return Math.max(0, timeUntilSlot);
  }

  // Wait until we can make a request
  async waitForSlot() {
    while (!this.canMakeRequest() || this.getTimeUntilNextSlot() > 0) {
      const waitTime = this.getTimeUntilNextSlot();
      if (waitTime > 0) {
        // Add a small buffer (100ms) to ensure we're past the window
        await new Promise(resolve => setTimeout(resolve, waitTime + 100));
      }
    }
  }

  // Process the queue
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      // Wait for an available slot
      const waitTime = this.getTimeUntilNextSlot();
      if (waitTime > 0) {
        if (process.env.NODE_ENV === 'development') {
        }
        await this.waitForSlot();
      }
      
      // Get the next request from queue
      const { resolve, reject, requestFn } = this.queue.shift();
      
      // Add this request to the tracking BEFORE executing (to prevent race conditions)
      this.addRequest();
      
      if (process.env.NODE_ENV === 'development') {
      }
      
      // Execute the request
      try {
        const result = await requestFn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.processing = false;
  }

  // Execute a request with rate limiting (queues if needed)
  async executeRequest(requestFn) {
    return new Promise((resolve, reject) => {
      const queuePosition = this.queue.length;
      
      // Add to queue
      this.queue.push({ resolve, reject, requestFn });
      
      // Log queue status (only in development)
      if (process.env.NODE_ENV === 'development' && queuePosition > 0) {
      }
      
      // Start processing if not already processing
      this.processQueue();
    });
  }
}

// Create a singleton instance
const rateLimiter = new RateLimiter(10, 60000); // 10 requests per 60 seconds

// Export both the class (for creating new instances) and the singleton (for backward compatibility)
export { RateLimiter };
export default rateLimiter;

