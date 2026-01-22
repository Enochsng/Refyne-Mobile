// Stripe Connect Service
// This service handles all Stripe Connect operations with proper rate limiting and caching

import apiService from './apiService';
import { supabase } from '../supabaseClient';

class StripeConnectService {
  constructor() {
    this.statusCache = new Map(); // Cache status responses
    this.cacheTimeout = 30000; // 30 seconds cache timeout
    this.lastStatusCheck = new Map(); // Track last status check time
    this.minStatusCheckInterval = 10000; // Minimum 10 seconds between status checks
  }

  /**
   * Check if we can make a status check request
   * @param {string} coachId - The coach ID
   * @returns {boolean} - Whether the request is allowed
   */
  canCheckStatus(coachId) {
    const now = Date.now();
    const lastCheck = this.lastStatusCheck.get(coachId) || 0;
    return (now - lastCheck) >= this.minStatusCheckInterval;
  }

  /**
   * Get cached status if available and not expired
   * @param {string} coachId - The coach ID
   * @returns {Object|null} - Cached status or null
   */
  getCachedStatus(coachId) {
    const cached = this.statusCache.get(coachId);
    if (cached) {
      const now = Date.now();
      if (now - cached.timestamp < this.cacheTimeout) {
        console.log(`📋 Using cached status for coach ${coachId}`);
        return cached.data;
      } else {
        // Cache expired, remove it
        this.statusCache.delete(coachId);
      }
    }
    return null;
  }

  /**
   * Cache status response
   * @param {string} coachId - The coach ID
   * @param {Object} statusData - The status data to cache
   */
  cacheStatus(coachId, statusData) {
    this.statusCache.set(coachId, {
      data: statusData,
      timestamp: Date.now()
    });
    console.log(`💾 Cached status for coach ${coachId}`);
  }

  /**
   * Check Stripe account status for a coach
   * @param {string} coachId - The coach ID
   * @param {string} email - Optional email for lookup
   * @returns {Promise<Object>} - The status response
   */
  async checkStripeAccountStatus(coachId, email = null) {
    try {
      // Check if we can make a request
      if (!this.canCheckStatus(coachId)) {
        const cached = this.getCachedStatus(coachId);
        if (cached) {
          return cached;
        }
        throw new Error('Rate limited: Too frequent status checks');
      }

      // Check cache first
      const cached = this.getCachedStatus(coachId);
      if (cached) {
        return cached;
      }

      console.log(`🔍 Checking Stripe account status for coach: ${coachId}${email ? ` (email: ${email})` : ''}`);

      // Build endpoint with optional email parameter
      let endpoint = `/api/connect/coach/${coachId}/status`;
      if (email) {
        endpoint += `?email=${encodeURIComponent(email)}`;
      }

      // Make the API request with rate limiting
      const result = await apiService.get(endpoint);

      // Record the status check time
      this.lastStatusCheck.set(coachId, Date.now());

      // Cache the result
      this.cacheStatus(coachId, result);

      console.log(`✅ Status check successful for coach ${coachId}`);
      return result;

    } catch (error) {
      // Handle 404 errors silently for new coach accounts - this is expected behavior
      if (error.status === 404) {
        console.log(`🔍 Coach ${coachId} not found in Stripe Connect accounts - this is normal for new coaches`);
        return {
          success: true,
          account: {
            coachId: coachId,
            stripeAccountId: null,
            accountType: null,
            country: null,
            email: email,
            chargesEnabled: false,
            payoutsEnabled: false,
            detailsSubmitted: false,
            onboardingCompleted: false,
            businessProfile: null,
            createdAt: null,
            updatedAt: null
          },
          message: 'Coach has not set up Stripe Connect account yet'
        };
      }
      
      // Log other errors for debugging
      console.error(`❌ Error checking Stripe account status for coach ${coachId}:`, error);
      console.error('Full error details:', error);
      
      if (error.message.includes('No working backend URL found')) {
        console.log(`🔍 No working backend URL - returning not_connected status for coach ${coachId}`);
        return {
          success: false,
          account: null,
          error: 'Backend server not accessible',
          message: 'Unable to connect to payment server. Please check your network connection.'
        };
      }
      
      // Return cached data if available, even if expired
      const cached = this.statusCache.get(coachId);
      if (cached) {
        console.log(`📋 Returning expired cached status for coach ${coachId}`);
        return cached.data;
      }
      
      throw error;
    }
  }

  /**
   * Get coach transfers and earnings data
   * @param {string} coachId - The coach ID
   * @returns {Promise<Object>} - The transfers response
   */
  async getCoachTransfers(coachId) {
    try {
      console.log(`🔍 Getting transfers for coach: ${coachId}`);
      
      const result = await apiService.get(`/api/connect/coach/${coachId}/transfers`);
      
      console.log(`✅ Transfers retrieved successfully for coach ${coachId}:`, {
        totalTransfers: result.transfers?.length || 0,
        totalEarnings: result.summary?.totalEarnings || 0,
        pendingEarnings: result.summary?.pendingEarnings || 0
      });
      return result;
    } catch (error) {
      console.error(`❌ Error getting transfers for coach ${coachId}:`, error);
      
      // Return empty data instead of throwing error to prevent app crashes
      return {
        success: false,
        transfers: [],
        summary: {
          totalEarnings: 0,
          pendingEarnings: 0,
          totalCustomers: 0,
          totalTransfers: 0
        },
        error: error.message || 'Failed to fetch earnings data'
      };
    }
  }

  /**
   * Start Stripe Connect onboarding
   * @param {Object} onboardingData - The onboarding data
   * @returns {Promise<Object>} - The onboarding response
   */
  async startOnboarding(onboardingData) {
    try {
      console.log('🚀 Starting Stripe Connect onboarding...');
      console.log('📤 Onboarding data:', onboardingData);
      
      const result = await apiService.post('/api/connect/start-onboarding', onboardingData);
      
      console.log('✅ Onboarding started successfully');
      console.log('📥 Response:', result);
      
      // Validate response structure
      if (!result.success) {
        throw new Error(result.message || 'Failed to start onboarding');
      }
      
      if (!result.onboardingLink || !result.onboardingLink.url) {
        throw new Error('Onboarding link not received from server');
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error starting onboarding:', error);
      
      // Provide more helpful error messages
      if (error.status === 500) {
        const errorMsg = error.message || error.details?.message || 'Server error occurred. Please try again later.';
        throw new Error(`Server error: ${errorMsg}`);
      } else if (error.status === 400) {
        const errorMsg = error.message || error.details?.details || 'Invalid request data. Please check your information.';
        throw new Error(`Validation error: ${errorMsg}`);
      } else if (error.message.includes('No working backend URL')) {
        throw new Error('Unable to connect to server. Please check your internet connection.');
      }
      
      throw error;
    }
  }

  /**
   * Get onboarding link for a coach
   * @param {string} coachId - The coach ID
   * @returns {Promise<Object>} - The onboarding link response
   */
  async getOnboardingLink(coachId) {
    try {
      console.log(`🔗 Getting onboarding link for coach: ${coachId}`);
      
      const result = await apiService.get(`/api/connect/coach/${coachId}/onboarding-link`);
      
      console.log(`✅ Onboarding link retrieved successfully for coach ${coachId}`);
      return result;
    } catch (error) {
      console.error(`❌ Error getting onboarding link for coach ${coachId}:`, error);
      throw error;
    }
  }

  /**
   * Clear cache for a specific coach
   * @param {string} coachId - The coach ID
   */
  clearCoachCache(coachId) {
    this.statusCache.delete(coachId);
    this.lastStatusCheck.delete(coachId);
    console.log(`🧹 Cleared cache for coach ${coachId}`);
  }

  /**
   * Clear all cache
   */
  clearAllCache() {
    this.statusCache.clear();
    this.lastStatusCheck.clear();
    console.log('🧹 Cleared all Stripe Connect cache');
  }

  /**
   * Get cache status for debugging
   * @returns {Object} - Cache status information
   */
  getCacheStatus() {
    const now = Date.now();
    const cacheInfo = {};
    
    for (const [coachId, cached] of this.statusCache.entries()) {
      const age = now - cached.timestamp;
      const isExpired = age >= this.cacheTimeout;
      
      cacheInfo[coachId] = {
        age,
        isExpired,
        lastCheck: this.lastStatusCheck.get(coachId) || 0
      };
    }
    
    return cacheInfo;
  }
}

// Create a singleton instance
const stripeConnectService = new StripeConnectService();

export default stripeConnectService;
