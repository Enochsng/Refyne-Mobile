// Stripe Configuration
// Note: In production, these should be environment variables
// For now, using test keys - replace with your actual Stripe keys

export const STRIPE_CONFIG = {
  // Your actual Stripe publishable key from Stripe Dashboard
  publishableKey: 'pk_test_51SALeHPjC3F0lBjEUDnOFxXlS7oFyOj6LglGZBVQf5jEPEQ3ika3QbNacZ0aZSmFqJNWjLyKVVtMEqCCKBvvB1WI00WpCLOV9z',
  
  // Your backend URL for creating payment intents
  backendUrl: 'http://192.168.1.79:3001', // Use your computer's IP address for mobile access
  
  // Merchant identifier for Apple Pay (iOS)
  merchantIdentifier: 'merchant.com.yourcompany.refynemobile',
  
  // URL scheme for deep linking
  urlScheme: 'refynemobile',
};

// Stripe Connect configuration
export const STRIPE_CONNECT_CONFIG = {
  // Your Stripe Connect application ID from Stripe Dashboard
  clientId: 'ca_T6YmjebfrMSRht1lXHdEelDoXxI6JmY8',
  
  // Backend URL for API calls
  backendUrl: 'http://192.168.1.79:3001', // Use your computer's IP address for mobile access
  
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
