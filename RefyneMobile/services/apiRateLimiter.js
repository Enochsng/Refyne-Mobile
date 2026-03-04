// API Rate Limiter Service
// This service manages API request throttling and rate limiting on the client side
// to prevent hitting the backend's rate limits (100 requests per 15 minutes)

class APIRateLimiter {
  constructor() {
    this.requestQueue = new Map(); // Track requests by endpoint
    this.lastRequestTime = new Map(); // Track last request time by endpoint
    this.requestCounts = new Map(); // Track request counts by endpoint
    this.requestWindowStart = new Map(); // Track one-minute window start by endpoint
    this.minInterval = 2000; // Minimum 2 seconds between requests to same endpoint
    this.maxRequestsPerMinute = 10; // Max 10 requests per minute per endpoint
    this.retryDelays = [1000, 2000, 5000, 10000]; // Exponential backoff delays
  }

  /**
   * Check if we can make a request to the given endpoint
   * @param {string} endpoint - The API endpoint
   * @returns {boolean} - Whether the request is allowed
   */
  canMakeRequest(endpoint) {
    const now = Date.now();
    const lastTime = this.lastRequestTime.get(endpoint) || 0;
    const requestCount = this.requestCounts.get(endpoint) || 0;
    const windowStart = this.requestWindowStart.get(endpoint) || now;
    
    // Check minimum interval
    if (now - lastTime < this.minInterval) {
      console.log(`⏳ Rate limit: Too soon to request ${endpoint}. Wait ${this.minInterval - (now - lastTime)}ms`);
      return false;
    }
    
    // Check requests per minute within a rolling one-minute window.
    const windowElapsed = now - windowStart;
    if (windowElapsed < 60000 && requestCount >= this.maxRequestsPerMinute) {
      console.log(`⏳ Rate limit: Too many requests to ${endpoint}. Wait ${60000 - windowElapsed}ms`);
      return false;
    }
    
    return true;
  }

  /**
   * Record a request to the given endpoint
   * @param {string} endpoint - The API endpoint
   */
  recordRequest(endpoint) {
    const now = Date.now();
    const windowStart = this.requestWindowStart.get(endpoint) || now;
    const windowElapsed = now - windowStart;

    this.lastRequestTime.set(endpoint, now);

    // Reset counter when the one-minute window has elapsed, otherwise increment.
    if (windowElapsed >= 60000) {
      this.requestWindowStart.set(endpoint, now);
      this.requestCounts.set(endpoint, 1);
    } else {
      const currentCount = this.requestCounts.get(endpoint) || 0;
      this.requestCounts.set(endpoint, currentCount + 1);
    }
  }

  /**
   * Get delay before next request is allowed
   * @param {string} endpoint - The API endpoint
   * @returns {number} - Delay in milliseconds
   */
  getNextRequestDelay(endpoint) {
    const now = Date.now();
    const lastTime = this.lastRequestTime.get(endpoint) || 0;
    const requestCount = this.requestCounts.get(endpoint) || 0;
    const windowStart = this.requestWindowStart.get(endpoint) || now;
    const timeSinceLastRequest = now - lastTime;
    
    // Check minimum interval first
    if (timeSinceLastRequest < this.minInterval) {
      return this.minInterval - timeSinceLastRequest;
    }
    
    // Check requests-per-minute window and return time until window resets.
    const windowElapsed = now - windowStart;
    if (windowElapsed < 60000 && requestCount >= this.maxRequestsPerMinute) {
      return 60000 - windowElapsed;
    }
    
    return 0;
  }

  /**
   * Wait for the appropriate delay before making a request
   * @param {string} endpoint - The API endpoint
   * @returns {Promise<void>}
   */
  async waitForRateLimit(endpoint) {
    const delay = this.getNextRequestDelay(endpoint);
    if (delay > 0) {
      console.log(`⏳ Waiting ${delay}ms before next request to ${endpoint}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  /**
   * Make a rate-limited API request
   * @param {string} endpoint - The API endpoint
   * @param {Function} requestFunction - The function that makes the actual request
   * @param {number} retryCount - Current retry count
   * @returns {Promise<any>} - The response from the request
   */
  async makeRequest(endpoint, requestFunction, retryCount = 0) {
    try {
      // Wait for rate limit if necessary
      await this.waitForRateLimit(endpoint);
      
      // Check if we can make the request
      if (!this.canMakeRequest(endpoint)) {
        const delay = this.getNextRequestDelay(endpoint);
        console.log(`⏳ Rate limited: Waiting ${delay}ms before retry for ${endpoint}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequest(endpoint, requestFunction, retryCount);
      }
      
      // Record the request
      this.recordRequest(endpoint);
      
      console.log(`📡 Making rate-limited request to ${endpoint}`);
      
      // Make the actual request
      const result = await requestFunction();
      
      console.log(`✅ Request successful to ${endpoint}`);
      return result;
      
    } catch (error) {
      // Don't log 404 errors as console errors if they're expected (like missing coach accounts)
      if (error.status === 404) {
        console.log(`🔍 Request returned 404 for ${endpoint}: ${error.message}`);
      } else {
        console.error(`❌ Request failed to ${endpoint}:`, error.message);
      }
      
      // Handle 429 (Too Many Requests) errors
      if (error.status === 429 || error.message.includes('429')) {
        const retryDelay = this.retryDelays[Math.min(retryCount, this.retryDelays.length - 1)];
        console.log(`⏳ 429 error: Waiting ${retryDelay}ms before retry ${retryCount + 1}`);
        
        if (retryCount < this.retryDelays.length) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return this.makeRequest(endpoint, requestFunction, retryCount + 1);
        } else {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
      }
      
      // For other errors, throw immediately
      throw error;
    }
  }

  /**
   * Clear rate limit data for an endpoint (useful for testing or reset)
   * @param {string} endpoint - The API endpoint
   */
  clearEndpoint(endpoint) {
    this.requestQueue.delete(endpoint);
    this.lastRequestTime.delete(endpoint);
    this.requestCounts.delete(endpoint);
    this.requestWindowStart.delete(endpoint);
    console.log(`🧹 Cleared rate limit data for ${endpoint}`);
  }

  /**
   * Clear all rate limit data
   */
  clearAll() {
    this.requestQueue.clear();
    this.lastRequestTime.clear();
    this.requestCounts.clear();
    this.requestWindowStart.clear();
    console.log('🧹 Cleared all rate limit data');
  }

  /**
   * Get current rate limit status for an endpoint
   * @param {string} endpoint - The API endpoint
   * @returns {Object} - Rate limit status
   */
  getStatus(endpoint) {
    const now = Date.now();
    const lastTime = this.lastRequestTime.get(endpoint) || 0;
    const requestCount = this.requestCounts.get(endpoint) || 0;
    const timeSinceLastRequest = now - lastTime;
    
    return {
      endpoint,
      lastRequestTime: lastTime,
      timeSinceLastRequest,
      requestCount,
      canMakeRequest: this.canMakeRequest(endpoint),
      nextRequestDelay: this.getNextRequestDelay(endpoint)
    };
  }
}

// Create a singleton instance
const apiRateLimiter = new APIRateLimiter();

export default apiRateLimiter;
