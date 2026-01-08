// Stripe Configuration
// Note: In production, these should be environment variables
// IMPORTANT: Replace test keys with production keys before App Store submission

export const STRIPE_CONFIG = {
  // Your actual Stripe publishable key from Stripe Dashboard
  // TODO: Replace with production key (pk_live_...) before App Store submission
  publishableKey: __DEV__ 
    ? 'pk_test_51SALeHPjC3F0lBjEUDnOFxXlS7oFyOj6LglGZBVQf5jEPEQ3ika3QbNacZ0aZSmFqJNWjLyKVVtMEqCCKBvvB1WI00WpCLOV9z'
    : 'pk_test_51SALeHPjC3F0lBjEUDnOFxXlS7oFyOj6LglGZBVQf5jEPEQ3ika3QbNacZ0aZSmFqJNWjLyKVVtMEqCCKBvvB1WI00WpCLOV9z', // TODO: Replace with production key
  
  // Your backend URL for creating payment intents
  // TODO: Replace with your production HTTPS backend URL
  backendUrl: __DEV__
    ? 'http://167.160.184.214:3001' // Development server
    : 'https://app.refyne-coaching.com', // Production
  
  // Merchant identifier for Apple Pay (iOS)
  // Must match your Apple Developer account merchant ID
  merchantIdentifier: 'merchant.com.enoch.RefyneMobile',
  
  // URL scheme for deep linking
  urlScheme: 'refynemobile',
};

// Stripe Connect configuration
export const STRIPE_CONNECT_CONFIG = {
  // Your Stripe Connect application ID from Stripe Dashboard
  // TODO: Replace with production Connect client ID if different
  clientId: 'ca_T6YmjebfrMSRht1lXHdEelDoXxI6JmY8',
  
  // Backend URL for API calls
  // TODO: Replace with your production HTTPS backend URL
  backendUrl: __DEV__
    ? 'http://167.160.184.214:3001' // Development server
    : 'https://app.refyne-coaching.com', // Production
  
  // Redirect URI for OAuth flow
  redirectUri: 'refynemobile://stripe-connect',
  
  // Scopes for what the connected account can do
  scopes: ['read_write'],
};

// Payment configuration
export const PAYMENT_CONFIG = {
  // Currency for payments
  currency: 'cad',
  
  // Application fee percentage (for Stripe Connect)
  applicationFeePercent: 0.15, // 15% platform fee
  
  // Minimum amount for payments
  minimumAmount: 50, // $0.50 CAD in cents
};

// Helper function to get price in cents
export const getPriceInCents = (priceString) => {
  // Remove $ and convert to cents
  const price = parseFloat(priceString.replace('$', ''));
  return Math.round(price * 100);
};

// Helper function to format price for display
export const formatPrice = (cents) => {
  return `$${(cents / 100).toFixed(2)}`;
};
