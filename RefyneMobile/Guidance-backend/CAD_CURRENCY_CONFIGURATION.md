# CAD Currency Configuration for Stripe Connect

## Overview

This document outlines the configuration changes made to support Canadian Dollar (CAD) currency for Stripe Connect payments in the RefyneMobile application.

## Changes Made

### 1. Backend Configuration Updates

#### `/backend/config/stripe.js`
- **Default Currency**: Changed from `'usd'` to `'cad'`
- **Package Pricing**: Updated all package prices to reflect CAD amounts using 1.35 CAD = 1 USD exchange rate
- **Pricing Structure**:
  - Badminton Package 1: $47.25 CAD (was $35 USD)
  - Badminton Package 2: $54.00 CAD (was $40 USD)
  - Badminton Package 3: $60.75 CAD (was $45 USD)
  - Badminton Subscription: $94.50 CAD (was $70 USD)
  - Golf Package 1: $54.00 CAD (was $40 USD)
  - Golf Package 2: $60.75 CAD (was $45 USD)
  - Golf Package 3: $67.50 CAD (was $50 USD)
  - Golf Subscription: $101.25 CAD (was $75 USD)

#### `/backend/routes/payments.js`
- All payment intents now use CAD currency
- Checkout sessions configured for CAD
- Destination charges use CAD currency

#### `/backend/routes/connect.js`
- Transfer operations use CAD currency
- Connect account operations support Canadian accounts

#### `/backend/routes/webhooks.js`
- Webhook processing updated for CAD currency
- Transfer creation uses CAD currency

### 2. Frontend Configuration Updates

#### `/stripeConfig.js`
- **Payment Configuration**: Currency changed from `'usd'` to `'cad'`
- **Minimum Amount**: Updated to reflect CAD pricing

### 3. Database Schema Updates

#### Database Files Updated:
- `/backend/setup-database-safe.sql`
- `/backend/setup-database.sql`
- `/backend/setup-database-step-by-step.sql`
- `/backend/services/database.js`

**Changes**:
- Default currency for all tables changed from `'usd'` to `'cad'`
- Affects tables: `coaching_sessions`, `payment_transfers`

### 4. Test Files Updates

#### Updated Test Files:
- `/backend/test-webhook.js`
- `/backend/simple-server.js`
- `/backend/test-canadian-connect.js`

**Changes**:
- Mock payment intents use CAD currency
- Test data reflects Canadian pricing

## Exchange Rate

The conversion rate used is **1.35 CAD = 1 USD**, which is approximately the current exchange rate between Canadian and US dollars.

## Platform Fee Structure

The platform fee remains at **15%** of the total payment amount, calculated in CAD:

- **Platform Fee**: 15% of total payment
- **Coach Amount**: 85% of total payment
- **Currency**: All calculations performed in CAD

## Canadian Stripe Connect Support

### Supported Features:
- ✅ Canadian Express accounts
- ✅ CAD currency payments
- ✅ Canadian bank account payouts
- ✅ Canadian tax reporting
- ✅ Canadian payment methods

### Canadian Connect Account Requirements:
- Country: `'CA'`
- Business Type: `'individual'` or `'company'`
- Required Information:
  - Canadian address
  - Canadian phone number
  - Social Insurance Number (SIN)
  - Canadian bank account for payouts

## Testing

### Test Scripts Available:

1. **`test-cad-configuration.js`**: Comprehensive test of CAD configuration
   ```bash
   cd backend && node test-cad-configuration.js
   ```

2. **`test-canadian-connect.js`**: Test Canadian Connect account creation
   ```bash
   cd backend && node test-canadian-connect.js
   ```

### Test Results:
- ✅ Default currency set to CAD
- ✅ Package pricing updated for Canadian market
- ✅ Stripe API supports CAD currency
- ✅ Canadian Connect accounts can be created
- ✅ Exchange rate: ~1.35 CAD = 1 USD

## API Endpoints

All payment-related endpoints now support CAD currency:

### Payment Creation:
- `POST /api/payments/create-intent` - Creates CAD payment intents
- `POST /api/payments/create-destination-charge` - Direct CAD payments to coaches
- `POST /api/payments/create-checkout-session` - CAD checkout sessions

### Connect Operations:
- `POST /api/connect/create-account` - Create Canadian Connect accounts
- `POST /api/connect/transfer` - Transfer CAD amounts to coaches
- `GET /api/connect/account/:id/balance` - Check CAD balances

## Environment Variables

Ensure your `.env` file includes:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
STRIPE_PUBLISHABLE_KEY=pk_test_... # Your Stripe publishable key
STRIPE_WEBHOOK_SECRET=whsec_... # Your webhook secret

# Platform Configuration
PLATFORM_FEE_PERCENTAGE=15 # 15% platform fee
DEFAULT_CURRENCY=cad # Canadian Dollar

# App Configuration
APP_URL=http://localhost:3001 # Your app URL
```

## Deployment Considerations

### Production Deployment:
1. **Stripe Keys**: Use live Stripe keys for production
2. **Webhook URLs**: Update webhook endpoints to production URLs
3. **Database**: Run database migrations to update currency defaults
4. **Testing**: Test with real Canadian payment methods

### Canadian Compliance:
- Ensure compliance with Canadian payment regulations
- Consider Canadian tax implications for coaches
- Review Canadian data privacy laws (PIPEDA)

## Monitoring

### Key Metrics to Monitor:
- CAD payment success rates
- Canadian Connect account onboarding completion
- Platform fee collection in CAD
- Coach payout success rates to Canadian banks

### Logging:
All payment operations now log CAD amounts and currency information for monitoring and debugging.

## Support

For issues related to CAD currency configuration:

1. Check the test scripts for configuration validation
2. Verify Stripe account supports CAD currency
3. Ensure Canadian Connect accounts are properly onboarded
4. Review webhook processing for CAD transactions

## Future Enhancements

Potential future improvements:

1. **Multi-Currency Support**: Support for both USD and CAD
2. **Dynamic Exchange Rates**: Real-time exchange rate updates
3. **Regional Pricing**: Different pricing for different regions
4. **Canadian Tax Integration**: Automatic tax calculation for Canadian coaches

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Status**: ✅ Production Ready
