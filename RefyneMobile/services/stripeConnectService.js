// Stripe Connect Service
// This service handles all Stripe Connect operations with proper rate limiting and caching

import apiService from './apiService';
import { supabase } from '../supabaseClient';

/**
 * Resolve the current Supabase access token for authenticated Connect API calls.
 * Same pattern as paymentService / conversationService / safetyService.
 */
async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    const error = new Error('You are not signed in. Please sign in again.');
    error.code = 'NOT_SIGNED_IN';
    throw error;
  }
  return session.access_token;
}

async function getAuthHeaders(extra = {}) {
  const accessToken = await getAccessToken();
  return {
    ...extra,
    Authorization: `Bearer ${accessToken}`,
  };
}

function toSignInError(error) {
  if (error?.code === 'NOT_SIGNED_IN') {
    return error;
  }
  const signInError = new Error('You are not signed in. Please sign in again.');
  signInError.code = 'NOT_SIGNED_IN';
  signInError.cause = error;
  return signInError;
}

class StripeConnectService {
  constructor() {
    this.statusCache = new Map(); // Cache status responses
    this.cacheTimeout = 120000; // 2 minutes cache timeout
    this.lastStatusCheck = new Map(); // Track last status check time
    this.minStatusCheckInterval = 15000; // Minimum 15 seconds between status checks
    this.pendingStatusChecks = new Map(); // Dedupe concurrent in-flight requests
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
   * Get cached status even if expired (for cooldown fallback)
   * @param {string} coachId - The coach ID
   * @returns {Object|null} - Cached status or null
   */
  getStaleCachedStatus(coachId) {
    const cached = this.statusCache.get(coachId);
    if (cached) {
      console.log(`📋 Using stale cached status for coach ${coachId}`);
      return cached.data;
    }
    return null;
  }

  /**
   * Check Stripe account status for a coach
   * @param {string} coachId - The coach ID
   * @param {string} email - Optional email for lookup
   * @param {boolean} forceRefresh - Invalidate cache and bypass cooldown for explicit refreshes
   * @returns {Promise<Object>} - The status response
   */
  async checkStripeAccountStatus(coachId, email = null, forceRefresh = false) {
    const pendingKey = coachId;
    if (this.pendingStatusChecks.has(pendingKey)) {
      return this.pendingStatusChecks.get(pendingKey);
    }

    const promise = this._fetchStripeAccountStatus(coachId, email, forceRefresh);
    this.pendingStatusChecks.set(pendingKey, promise);

    try {
      return await promise;
    } finally {
      this.pendingStatusChecks.delete(pendingKey);
    }
  }

  async _fetchStripeAccountStatus(coachId, email = null, forceRefresh = false) {
    try {
      if (forceRefresh) {
        this.statusCache.delete(coachId);
        console.log(`🧹 Invalidated status cache for coach ${coachId}`);
      }

      if (!forceRefresh && !this.canCheckStatus(coachId)) {
        const cached = this.getCachedStatus(coachId) || this.getStaleCachedStatus(coachId);
        if (cached) {
          return cached;
        }
        console.log(`No cached status for coach ${coachId} during cooldown — allowing request`);
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

      const result = await apiService.get(`/api/connect/coach/${coachId}/transfers`, {
        headers: await getAuthHeaders(),
      });
      
      console.log(`✅ Transfers retrieved successfully for coach ${coachId}:`, {
        totalTransfers: result.transfers?.length || 0,
        totalEarnings: result.summary?.totalEarnings || 0,
        pendingEarnings: result.summary?.pendingEarnings || 0
      });
      return result;
    } catch (error) {
      console.error(`❌ Error getting transfers for coach ${coachId}:`, error);

      if (error.code === 'NOT_SIGNED_IN' || error.status === 401) {
        throw toSignInError(error);
      }
      
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
        const errorMsg = error.details || error.message || 'Invalid request data. Please check your information.';
        throw new Error(errorMsg); // Don't prefix with "Validation error:" since errorMsg already contains it
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

      const result = await apiService.get(`/api/connect/coach/${coachId}/onboarding-link`, {
        headers: await getAuthHeaders(),
      });
      
      console.log(`✅ Onboarding link retrieved successfully for coach ${coachId}`);
      return result;
    } catch (error) {
      console.error(`❌ Error getting onboarding link for coach ${coachId}:`, error);
      if (error.code === 'NOT_SIGNED_IN' || error.status === 401) {
        throw toSignInError(error);
      }
      throw error;
    }
  }

  /**
   * Create a Stripe Connect account for a coach
   * @param {Object} accountData - Account creation payload
   * @returns {Promise<Object>} - The create-account response
   */
  async createAccount(accountData) {
    try {
      console.log('🏦 Creating Stripe Connect account...');
      const result = await apiService.post('/api/connect/create-account', accountData, {
        headers: await getAuthHeaders(),
      });
      console.log('✅ Stripe Connect account created');
      return result;
    } catch (error) {
      console.error('❌ Error creating Stripe Connect account:', error);
      if (error.code === 'NOT_SIGNED_IN' || error.status === 401) {
        throw toSignInError(error);
      }
      throw error;
    }
  }

  /**
   * Get Stripe Connect account balance
   * @param {string} accountId - Stripe connected account ID
   * @returns {Promise<Object>} - The balance response
   */
  async getAccountBalance(accountId) {
    try {
      console.log(`💰 Getting balance for account: ${accountId}`);
      const result = await apiService.get(`/api/connect/account/${accountId}/balance`, {
        headers: await getAuthHeaders(),
      });
      console.log(`✅ Balance retrieved for account ${accountId}`);
      return result;
    } catch (error) {
      console.error(`❌ Error getting balance for account ${accountId}:`, error);
      if (error.code === 'NOT_SIGNED_IN' || error.status === 401) {
        throw toSignInError(error);
      }
      throw error;
    }
  }

  /**
   * Get Stripe Connect account payouts
   * @param {string} accountId - Stripe connected account ID
   * @returns {Promise<Object>} - The payouts response
   */
  async getAccountPayouts(accountId) {
    try {
      console.log(`📤 Getting payouts for account: ${accountId}`);
      const result = await apiService.get(`/api/connect/account/${accountId}/payouts`, {
        headers: await getAuthHeaders(),
      });
      console.log(`✅ Payouts retrieved for account ${accountId}`);
      return result;
    } catch (error) {
      console.error(`❌ Error getting payouts for account ${accountId}:`, error);
      if (error.code === 'NOT_SIGNED_IN' || error.status === 401) {
        throw toSignInError(error);
      }
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
    this.pendingStatusChecks.clear();
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
