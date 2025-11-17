// Real payment service that calls your backend API
// Replace the backend URL with your actual backend URL

import { STRIPE_CONFIG, getPriceInCents } from '../stripeConfig';

// Backend API configuration
// For React Native development, use your server IP address for both simulator and physical device
const API_BASE_URL = __DEV__ 
  ? 'http://167.160.184.214:3001'  // Development - Server IP address
  : 'https://your-production-api.com';  // Production

// Fallback URLs for development
const FALLBACK_URLS = [
  'http://167.160.184.214:3001', // Server IP
  'http://10.0.0.51:3001', // Current network IP
  'http://192.168.1.79:3001', // Previous network IP
  'http://10.0.0.77:3001', // Previous network IP
  'http://10.0.0.50:3001',
  'http://localhost:3001',
  'http://10.0.2.2:3001', // Android emulator
  'http://127.0.0.1:3001',
  'http://0.0.0.0:3001', // All interfaces
  'http://[::1]:3001' // IPv6 localhost
];

// Global variable to store the working URL
let workingApiUrl = API_BASE_URL;
let connectionTested = false;
let connectionSuccessful = false;

/**
 * Test backend connectivity
 */
export const testBackendConnection = async () => {
  const urlsToTry = [
    `${API_BASE_URL.replace('/api', '')}/health`,
    ...FALLBACK_URLS.map(url => url.replace('/api', '') + '/health')
  ];
  
  console.log('Starting backend connection test with URLs:', urlsToTry);
  
  for (const healthUrl of urlsToTry) {
    try {
      console.log('Testing backend connection to:', healthUrl);
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout after 10 seconds')), 10000);
      });

      const fetchPromise = fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        // Add additional fetch options for better compatibility
        mode: 'cors',
        cache: 'no-cache',
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      console.log('Response received for', healthUrl, 'Status:', response.status, 'OK:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Backend connection successful:', data);
        console.log('Using URL:', healthUrl);
        
        // Store the working URL for future use
        workingApiUrl = healthUrl.replace('/health', '/api');
        console.log('Working API URL set to:', workingApiUrl);
        
        // Set connection flags
        connectionTested = true;
        connectionSuccessful = true;
        
        return true;
      } else {
        console.log('Backend health check failed for', healthUrl, ':', response.status, response.statusText);
        // Try to get response text for more details
        try {
          const errorText = await response.text();
          console.log('Error response body:', errorText);
        } catch (e) {
          console.log('Could not read error response body');
        }
      }
    } catch (error) {
      console.log('Backend connection test failed for', healthUrl, ':', error.message);
      console.log('Error type:', error.constructor.name);
      console.log('Error stack:', error.stack);
    }
  }
  
  console.error('All backend connection attempts failed. Tried URLs:', urlsToTry);
  
  // Set connection flags
  connectionTested = true;
  connectionSuccessful = false;
  
  return false;
};

/**
 * Bypass connection test and attempt direct payment creation
 * This can be used when the health check fails but the payment endpoint might still work
 */
export const attemptDirectPayment = async (paymentData) => {
  console.log('Attempting direct payment creation without connection test...');
  
  // Try to create payment directly with the primary URL
  try {
    const result = await createDestinationCharge(paymentData);
    console.log('Direct payment creation successful!');
    return result;
  } catch (error) {
    console.log('Direct payment creation failed:', error.message);
    
    // Try with fallback URLs
    for (const fallbackUrl of FALLBACK_URLS) {
      try {
        console.log('Trying fallback URL:', fallbackUrl);
        workingApiUrl = fallbackUrl;
        const result = await createDestinationCharge(paymentData);
        console.log('Payment creation successful with fallback URL:', fallbackUrl);
        return result;
      } catch (fallbackError) {
        console.log('Fallback URL failed:', fallbackUrl, fallbackError.message);
      }
    }
    
    throw new Error('All payment creation attempts failed');
  }
};

/**
 * Create a Stripe Checkout session on your backend
 */
export const createCheckoutSession = async (paymentData) => {
  try {
    const { coach, sport, selectedPackage, selectedSubscription, player } = paymentData;
    
    const requestBody = {
      coachId: coach.id,
      coachName: coach.name,
      sport: sport.toLowerCase(),
      packageType: selectedSubscription ? 'subscription' : 'package',
      packageId: selectedPackage,
      customerEmail: player?.email || coach.email, // Use player email if available
      customerName: player?.name || coach.name,
      playerId: player?.id || 'temp_user',
      playerName: player?.name || 'Player',
    };

    console.log('Creating checkout session with data:', requestBody);
    console.log('API URL:', `${workingApiUrl}/payments/create-checkout-session`);

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 30000);
    });

    const fetchPromise = fetch(`${workingApiUrl}/api/payments/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]).catch(fetchError => {
      console.error('Fetch error details:', fetchError);
      throw new Error(`Network request failed: ${fetchError.message}`);
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (!response.ok) {
      let errorMessage = 'Failed to create checkout session';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Checkout session response:', data);
    
    return data;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    
    // Provide more specific error messages
    if (error.message.includes('Network request failed')) {
      throw new Error('Unable to connect to payment server. Please check your internet connection and try again.');
    } else if (error.message.includes('timeout')) {
      throw new Error('Payment request timed out. Please try again.');
    } else {
      throw new Error(error.message || 'Failed to create checkout session. Please try again.');
    }
  }
};

/**
 * Create a payment intent on your backend
 */
export const createPaymentIntent = async (paymentData) => {
  try {
    const { coach, sport, selectedPackage, selectedSubscription, player } = paymentData;
    
    const requestBody = {
      coachId: coach.id,
      coachName: coach.name,
      sport: sport.toLowerCase(),
      packageType: selectedSubscription ? 'subscription' : 'package',
      packageId: selectedPackage,
      customerEmail: player?.email || coach.email, // Use player email if available
      customerName: player?.name || coach.name,
      playerId: player?.id || 'temp_user',
      playerName: player?.name || 'Player',
    };

    console.log('Creating payment intent with data:', requestBody);
    console.log('API URL:', `${workingApiUrl}/payments/create-intent`);

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 30000);
    });

    const fetchPromise = fetch(`${workingApiUrl}/api/payments/create-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (!response.ok) {
      let errorMessage = 'Failed to create payment intent';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Payment intent response:', data);
    
    if (!data.success) {
      throw new Error(data.message || 'Payment intent creation failed');
    }

    console.log('Payment intent created successfully:', data.paymentIntent);
    return data.paymentIntent;
  } catch (error) {
    console.error('Error creating payment intent:', error);
    
    // Provide more specific error messages
    if (error.message.includes('Network request failed')) {
      throw new Error('Unable to connect to payment server. Please check your internet connection and try again.');
    } else if (error.message.includes('timeout')) {
      throw new Error('Payment request timed out. Please try again.');
    } else {
      throw new Error(error.message || 'Failed to create payment intent. Please try again.');
    }
  }
};

/**
 * Confirm payment intent after successful payment
 */
export const confirmPaymentIntent = async (paymentIntentId, sessionData) => {
  try {
    const requestBody = {
      paymentIntentId,
      sessionData,
    };

    const response = await fetch(`${workingApiUrl}/api/payments/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to confirm payment');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Payment confirmation failed');
    }

    console.log('Payment confirmed:', data.session);
    return data.session;
  } catch (error) {
    console.error('Error confirming payment:', error);
    throw new Error(error.message || 'Failed to confirm payment');
  }
};

/**
 * Start Stripe Connect onboarding for coaches
 */
export const startStripeConnectOnboarding = async (coachData) => {
  try {
    const requestBody = {
      coachId: coachData.id,
      coachName: coachData.name,
      email: coachData.email,
      sport: coachData.sport,
      country: coachData.country || 'CA',
      businessType: coachData.businessType || 'individual',
    };

    console.log('Starting Stripe Connect onboarding with data:', requestBody);

    const response = await fetch(`${API_BASE_URL}/api/connect/start-onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to start Connect onboarding');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Connect onboarding failed');
    }

    console.log('Stripe Connect onboarding started:', data.account);
    return {
      account: data.account,
      onboardingLink: data.onboardingLink
    };
  } catch (error) {
    console.error('Error starting Stripe Connect onboarding:', error);
    throw new Error(error.message || 'Failed to start Connect onboarding');
  }
};

/**
 * Get coach's Stripe Connect account status
 */
export const getCoachConnectStatus = async (coachId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/connect/coach/${coachId}/status`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Coach doesn't have a Connect account yet
      }
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get coach Connect status');
    }

    const data = await response.json();
    return data.account;
  } catch (error) {
    console.error('Error getting coach Connect status:', error);
    throw new Error(error.message || 'Failed to get coach Connect status');
  }
};

/**
 * Create a destination charge (direct payment to coach)
 */
export const createDestinationCharge = async (paymentData) => {
  try {
    const { coach, sport, selectedPackage, selectedSubscription, player } = paymentData;
    
    const requestBody = {
      coachId: coach.id,
      coachName: coach.name,
      sport: sport.toLowerCase(),
      packageType: selectedSubscription ? 'subscription' : 'package',
      packageId: selectedPackage,
      customerEmail: player?.email || coach.email, // Use player email if available
      customerName: player?.name || coach.name,
      playerId: player?.id || 'temp_user',
      playerName: player?.name || 'Player',
    };

    console.log('Creating destination charge with data:', requestBody);

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 30000);
    });

    const fetchPromise = fetch(`${API_BASE_URL}/api/payments/create-destination-charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const response = await Promise.race([fetchPromise, timeoutPromise]);

    if (!response.ok) {
      let errorMessage = 'Failed to create destination charge';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Destination charge response:', data);
    
    if (!data.success) {
      throw new Error(data.message || 'Destination charge creation failed');
    }

    console.log('Destination charge created successfully:', data.paymentIntent);
    return {
      paymentIntent: data.paymentIntent,
      packageInfo: data.packageInfo,
      feeBreakdown: data.feeBreakdown
    };
  } catch (error) {
    console.error('Error creating destination charge:', error);
    
    if (error.message.includes('Coach not ready for payments')) {
      throw new Error('This coach has not completed their payment setup yet. Please try again later.');
    } else if (error.message.includes('Network request failed')) {
      throw new Error('Unable to connect to payment server. Please check your internet connection and try again.');
    } else if (error.message.includes('timeout')) {
      throw new Error('Payment request timed out. Please try again.');
    } else {
      throw new Error(error.message || 'Failed to create payment. Please try again.');
    }
  }
};

/**
 * Create a Stripe Connect account for coaches (legacy function)
 */
export const createConnectAccount = async (coachData) => {
  try {
    const requestBody = {
      coachId: coachData.id,
      coachName: coachData.name,
      email: coachData.email,
      sport: coachData.sport,
      country: coachData.country || 'CA',
      businessType: coachData.businessType || 'individual',
    };

    const response = await fetch(`${API_BASE_URL}/api/connect/create-account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create Connect account');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Connect account creation failed');
    }

    console.log('Connect account created:', data.account);
    return data.account;
  } catch (error) {
    console.error('Error creating Connect account:', error);
    throw new Error(error.message || 'Failed to create Connect account');
  }
};

/**
 * Create a transfer to coach's Connect account
 */
export const createTransfer = async (paymentIntentId, coachAccountId, amount, description) => {
  try {
    const requestBody = {
      paymentIntentId,
      coachAccountId,
      amount,
      description,
    };

    const response = await fetch(`${API_BASE_URL}/api/connect/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create transfer');
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Transfer creation failed');
    }

    console.log('Transfer created:', data.transfer);
    return data.transfer;
  } catch (error) {
    console.error('Error creating transfer:', error);
    throw new Error(error.message || 'Failed to create transfer');
  }
};

/**
 * Get Connect account information
 */
export const getConnectAccount = async (accountId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/connect/account/${accountId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get Connect account');
    }

    const data = await response.json();
    return data.account;
  } catch (error) {
    console.error('Error getting Connect account:', error);
    throw new Error(error.message || 'Failed to get Connect account');
  }
};

/**
 * Create login link for Connect account
 */
export const createLoginLink = async (accountId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/connect/account/${accountId}/login-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create login link');
    }

    const data = await response.json();
    return data.loginLink;
  } catch (error) {
    console.error('Error creating login link:', error);
    throw new Error(error.message || 'Failed to create login link');
  }
};

/**
 * Get payment intent status
 */
export const getPaymentIntentStatus = async (paymentIntentId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/payments/intent/${paymentIntentId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to get payment intent status');
    }

    const data = await response.json();
    return data.paymentIntent;
  } catch (error) {
    console.error('Error getting payment intent status:', error);
    throw new Error(error.message || 'Failed to get payment intent status');
  }
};

/**
 * Create refund
 */
export const createRefund = async (paymentIntentId, reason, amount) => {
  try {
    const requestBody = {
      paymentIntentId,
      reason,
      amount,
    };

    const response = await fetch(`${API_BASE_URL}/api/payments/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create refund');
    }

    const data = await response.json();
    return data.refund;
  } catch (error) {
    console.error('Error creating refund:', error);
    throw new Error(error.message || 'Failed to create refund');
  }
};

// Helper function to get package price
const getPackagePrice = (sport, packageId) => {
  const packagePrices = {
    golf: { 1: '$40', 2: '$45', 3: '$50' },
    badminton: { 1: '$35', 2: '$40', 3: '$45' },
  };
  
  const sportKey = sport.toLowerCase();
  return packagePrices[sportKey]?.[packageId] || '$40';
};

/**
 * Webhook handler for Stripe events
 * In a real app, this would be implemented on your backend
 */
export const handleStripeWebhook = async (event) => {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log('Payment succeeded:', event.data.object);
        // Handle successful payment
        break;
        
      case 'payment_intent.payment_failed':
        console.log('Payment failed:', event.data.object);
        // Handle failed payment
        break;
        
      case 'account.updated':
        console.log('Connect account updated:', event.data.object);
        // Handle account updates
        break;
        
      default:
        console.log('Unhandled event type:', event.type);
    }
  } catch (error) {
    console.error('Error handling webhook:', error);
    throw error;
  }
};
