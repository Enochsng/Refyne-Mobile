// Centralized API Service
// This service provides rate-limited API calls with proper error handling and retry logic

import apiRateLimiter from './apiRateLimiter';
import { testBackendConnection } from './conversationService';

class APIService {
  constructor() {
    this.workingApiUrl = null;
    this.connectionTested = false;
    this.lastConnectionAttempt = 0;
    this.CONNECTION_RETRY_INTERVAL = 30000; // 30 seconds
  }

  /**
   * Get the working API URL, testing connection if necessary
   * @returns {Promise<string|null>} - The working API URL or null if none found
   */
  async getWorkingApiUrl() {
    const now = Date.now();
    
    // If we have a working URL and haven't tried to reconnect recently, use it
    if (this.connectionTested && this.workingApiUrl && (now - this.lastConnectionAttempt) < this.CONNECTION_RETRY_INTERVAL) {
      console.log(`🔄 Using cached working URL: ${this.workingApiUrl}`);
      return this.workingApiUrl;
    }

    this.lastConnectionAttempt = now;
    const workingUrl = await testBackendConnection();
    
    if (workingUrl) {
      this.workingApiUrl = workingUrl;
      this.connectionTested = true;
    }
    
    return workingUrl;
  }

  /**
   * Make a rate-limited GET request
   * @param {string} endpoint - The API endpoint (without base URL)
   * @param {Object} options - Additional fetch options
   * @returns {Promise<any>} - The response data
   */
  async get(endpoint, options = {}) {
    const workingUrl = await this.getWorkingApiUrl();
    if (!workingUrl) {
      throw new Error('No working backend URL found');
    }

    const fullUrl = `${workingUrl}${endpoint}`;
    
    return apiRateLimiter.makeRequest(fullUrl, async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...options.headers
          },
          signal: controller.signal,
          ...options
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
          error.status = response.status;
          error.response = response;
          throw error;
        }

        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
    });
  }

  /**
   * Make a rate-limited POST request
   * @param {string} endpoint - The API endpoint (without base URL)
   * @param {Object} data - The request body data
   * @param {Object} options - Additional fetch options
   * @returns {Promise<any>} - The response data
   */
  async post(endpoint, data = null, options = {}) {
    const workingUrl = await this.getWorkingApiUrl();
    if (!workingUrl) {
      throw new Error('No working backend URL found');
    }

    const fullUrl = `${workingUrl}${endpoint}`;
    
    return apiRateLimiter.makeRequest(fullUrl, async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await fetch(fullUrl, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...options.headers
          },
          body: data ? JSON.stringify(data) : undefined,
          signal: controller.signal,
          ...options
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
          error.status = response.status;
          error.response = response;
          throw error;
        }

        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
    });
  }

  /**
   * Make a rate-limited PUT request
   * @param {string} endpoint - The API endpoint (without base URL)
   * @param {Object} data - The request body data
   * @param {Object} options - Additional fetch options
   * @returns {Promise<any>} - The response data
   */
  async put(endpoint, data = null, options = {}) {
    const workingUrl = await this.getWorkingApiUrl();
    if (!workingUrl) {
      throw new Error('No working backend URL found');
    }

    const fullUrl = `${workingUrl}${endpoint}`;
    
    return apiRateLimiter.makeRequest(fullUrl, async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await fetch(fullUrl, {
          method: 'PUT',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...options.headers
          },
          body: data ? JSON.stringify(data) : undefined,
          signal: controller.signal,
          ...options
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
          error.status = response.status;
          error.response = response;
          throw error;
        }

        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
    });
  }

  /**
   * Make a rate-limited DELETE request
   * @param {string} endpoint - The API endpoint (without base URL)
   * @param {Object} options - Additional fetch options
   * @returns {Promise<any>} - The response data
   */
  async delete(endpoint, options = {}) {
    const workingUrl = await this.getWorkingApiUrl();
    if (!workingUrl) {
      throw new Error('No working backend URL found');
    }

    const fullUrl = `${workingUrl}${endpoint}`;
    
    return apiRateLimiter.makeRequest(fullUrl, async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        const response = await fetch(fullUrl, {
          method: 'DELETE',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...options.headers
          },
          signal: controller.signal,
          ...options
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
          error.status = response.status;
          error.response = response;
          throw error;
        }

        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
    });
  }

  /**
   * Reset connection state (useful for retrying after errors)
   */
  resetConnectionState() {
    this.workingApiUrl = null;
    this.connectionTested = false;
    this.lastConnectionAttempt = 0;
    console.log('🔄 API service connection state reset');
  }

  /**
   * Get rate limit status for an endpoint
   * @param {string} endpoint - The API endpoint
   * @returns {Object} - Rate limit status
   */
  getRateLimitStatus(endpoint) {
    return apiRateLimiter.getStatus(endpoint);
  }
}

// Create a singleton instance
const apiService = new APIService();

export default apiService;
