# Stripe Connect Integration for Refyne Mobile

This document outlines the Stripe Connect integration implemented in the Refyne Mobile app, enabling players to purchase coaching packages and coaches to receive payments.

## Overview

The integration provides a complete payment flow:
1. Players browse and select coaches
2. Players choose coaching packages (5, 7, or 10 clips) or monthly subscriptions
3. Players complete secure payments via Stripe
4. Coaching sessions are automatically created after successful payment
5. Coaches receive payments through Stripe Connect

## Architecture

### Key Components

1. **Stripe Configuration** (`stripeConfig.js`)
   - Centralized configuration for Stripe keys and settings
   - Helper functions for price formatting
   - Stripe Connect configuration

2. **Payment Screen** (`StripePaymentScreen.js`)
   - Secure payment interface using Stripe Payment Sheet
   - Supports credit cards, Apple Pay, and Google Pay
   - Handles payment success/failure scenarios

3. **Session Management** (`utils/sessionManager.js`)
   - Creates and manages coaching sessions after payment
   - Tracks session status, clips uploaded, and expiry
   - Handles session lifecycle (active, completed, expired)

4. **Payment Service** (`services/paymentService.js`)
   - Mock API service for creating payment intents
   - Handles Stripe Connect account creation
   - Manages transfers to coaches

## User Flow

### Player Experience

1. **Coach Selection**
   - Player navigates to sport-specific coaches
   - Selects desired coach from available options

2. **Package Selection**
   - Player views available packages:
     - 5 Clips Package ($35-40)
     - 7 Clips Package ($40-45) - Most Popular
     - 10 Clips Package ($45-50)
     - Monthly Subscription ($70-75)
   - Selects preferred option

3. **Payment Process**
   - Player taps "Purchase Package" button
   - Redirected to secure Stripe payment screen
   - Completes payment using preferred method
   - Receives confirmation of successful payment

4. **Session Activation**
   - Coaching session automatically created
   - Player can immediately start uploading clips
   - Session details include expiry date and clip limits

### Coach Experience

1. **Account Setup** (Future Implementation)
   - Coaches create Stripe Connect accounts
   - Verify identity and banking information
   - Enable automatic payouts

2. **Payment Processing**
   - Platform takes 10% fee
   - Remaining 90% transferred to coach's account
   - Transfers processed automatically after payment

## Configuration

### Required Setup

1. **Stripe Account**
   - Create Stripe account at https://stripe.com
   - Obtain publishable and secret keys
   - Enable Stripe Connect for marketplace functionality

2. **Update Configuration**
   ```javascript
   // In stripeConfig.js
   export const STRIPE_CONFIG = {
     publishableKey: 'pk_live_your_actual_publishable_key', // Replace with real key
     backendUrl: 'https://your-backend-url.com', // Your backend API
     merchantIdentifier: 'merchant.com.yourcompany.refynemobile',
     urlScheme: 'refynemobile',
   };
   ```

3. **Backend Integration**
   - Implement payment intent creation endpoint
   - Set up webhook handlers for payment events
   - Create Stripe Connect account management
   - Implement transfer functionality

### Environment Variables

For production, use environment variables:

```javascript
// Example with environment variables
export const STRIPE_CONFIG = {
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  backendUrl: process.env.BACKEND_URL,
  // ... other config
};
```

## Package Pricing

### Badminton Coaching
- 5 Clips Package: $35 (3-day session)
- 7 Clips Package: $40 (5-day session) - Most Popular
- 10 Clips Package: $45 (7-day session)
- Monthly Subscription: $70 (50 clips, 30 days)

### Golf Coaching
- 5 Clips Package: $40 (3-day session)
- 7 Clips Package: $45 (5-day session) - Most Popular
- 10 Clips Package: $50 (7-day session)
- Monthly Subscription: $75 (50 clips, 30 days)

## Security Features

1. **Secure Payment Processing**
   - All payments processed through Stripe's secure infrastructure
   - PCI compliance handled by Stripe
   - No sensitive payment data stored locally

2. **Session Management**
   - Sessions stored locally with AsyncStorage
   - Automatic expiry handling
   - Secure session ID generation

3. **Error Handling**
   - Comprehensive error handling for payment failures
   - User-friendly error messages
   - Fallback mechanisms for network issues

## Testing

### Test Mode Setup

1. Use Stripe test keys for development
2. Test with Stripe's test card numbers:
   - Success: 4242 4242 4242 4242
   - Decline: 4000 0000 0000 0002
   - Requires authentication: 4000 0025 0000 3155

### Test Scenarios

1. **Successful Payment**
   - Complete payment flow
   - Verify session creation
   - Check navigation to coaching interface

2. **Failed Payment**
   - Test with declined card
   - Verify error handling
   - Ensure user can retry

3. **Session Management**
   - Test session expiry
   - Verify clip limits
   - Check session status updates

## Future Enhancements

### Planned Features

1. **Coach Onboarding**
   - Stripe Connect account creation flow
   - Identity verification process
   - Banking information setup

2. **Advanced Payment Options**
   - Recurring subscription management
   - Prorated billing for upgrades
   - Refund processing

3. **Analytics & Reporting**
   - Payment analytics dashboard
   - Coach earnings reports
   - Platform revenue tracking

4. **Multi-Currency Support**
   - Support for international currencies
   - Localized pricing
   - Currency conversion

## Troubleshooting

### Common Issues

1. **Payment Sheet Not Loading**
   - Check Stripe configuration
   - Verify network connectivity
   - Ensure proper key format

2. **Session Creation Fails**
   - Check AsyncStorage permissions
   - Verify session data format
   - Review error logs

3. **Navigation Issues**
   - Ensure proper screen registration
   - Check navigation parameters
   - Verify route configuration

### Debug Mode

Enable debug logging by setting:
```javascript
console.log('Stripe Debug Mode Enabled');
```

## Support

For technical support:
1. Check Stripe documentation: https://stripe.com/docs
2. Review React Native Stripe docs: https://stripe.com/docs/stripe-react-native
3. Contact development team for app-specific issues

## Compliance

- PCI DSS compliance handled by Stripe
- GDPR compliance for EU users
- Local payment regulations compliance
- Terms of service and privacy policy updates required

---

**Note**: This integration uses mock payment processing for demonstration purposes. Replace mock services with actual backend API calls for production use.
