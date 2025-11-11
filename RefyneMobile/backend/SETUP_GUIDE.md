# Backend Setup Guide

This guide will walk you through setting up the backend API for the Refyne Mobile app with Stripe integration.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Stripe account with API keys
- A way to expose your local server (ngrok for webhooks)

## Step 1: Install Dependencies

```bash
cd backend
npm install
```

## Step 2: Environment Configuration

1. Copy the environment example file:
```bash
cp env.example .env
```

2. Update `.env` with your actual values:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_actual_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Server Configuration
PORT=3001
NODE_ENV=development

# Application Configuration
APP_NAME=Refyne Mobile Backend
APP_URL=http://localhost:3001

# Stripe Connect Configuration
STRIPE_CONNECT_CLIENT_ID=ca_your_connect_client_id
STRIPE_CONNECT_REDIRECT_URI=http://localhost:3001/auth/stripe/callback

# Platform Fee Configuration
PLATFORM_FEE_PERCENTAGE=10

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:19006,exp://localhost:19000
```

## Step 3: Get Stripe Keys

### Test Keys (Development)
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
2. Copy your **Publishable key** and **Secret key**
3. Add them to your `.env` file

### Stripe Connect Setup
1. Go to [Stripe Connect Settings](https://dashboard.stripe.com/connect/accounts/overview)
2. Create a Connect application
3. Copy the **Client ID** and add it to your `.env` file

## Step 4: Webhook Configuration

### Using ngrok (for local development)
1. Install ngrok: `npm install -g ngrok`
2. Start your backend server: `npm run dev`
3. In another terminal, expose your local server:
   ```bash
   ngrok http 3001
   ```
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

### Configure Webhook in Stripe
1. Go to [Stripe Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Enter your ngrok URL: `https://abc123.ngrok.io/api/webhooks/stripe`
4. Select these events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `account.updated`
   - `account.application.deauthorized`
   - `transfer.created`
   - `transfer.updated`
   - `payout.paid`
   - `payout.failed`
5. Copy the **Signing secret** and add it to your `.env` file

## Step 5: Start the Backend

```bash
npm run dev
```

The server will start on `http://localhost:3001`

## Step 6: Test the API

### Health Check
```bash
curl http://localhost:3001/health
```

### Create Payment Intent
```bash
curl -X POST http://localhost:3001/api/payments/create-intent \
  -H "Content-Type: application/json" \
  -d '{
    "coachId": "coach_123",
    "coachName": "John Doe",
    "sport": "badminton",
    "packageType": "package",
    "packageId": 2,
    "customerEmail": "player@example.com"
  }'
```

## Step 7: Update Frontend Configuration

Update your frontend `stripeConfig.js`:

```javascript
export const STRIPE_CONFIG = {
  publishableKey: 'pk_test_your_actual_publishable_key',
  backendUrl: 'http://localhost:3001', // Your backend URL
  merchantIdentifier: 'merchant.com.yourcompany.refynemobile',
  urlScheme: 'refynemobile',
};
```

## API Endpoints

### Payment Endpoints
- `POST /api/payments/create-intent` - Create payment intent
- `POST /api/payments/confirm` - Confirm payment
- `GET /api/payments/intent/:id` - Get payment intent status
- `POST /api/payments/refund` - Create refund

### Connect Endpoints
- `POST /api/connect/create-account` - Create Connect account
- `GET /api/connect/account/:id` - Get account info
- `PUT /api/connect/account/:id` - Update account
- `POST /api/connect/account/:id/login-link` - Create login link
- `POST /api/connect/transfer` - Create transfer
- `GET /api/connect/account/:id/balance` - Get account balance
- `GET /api/connect/account/:id/payouts` - Get payouts

### Webhook Endpoints
- `POST /api/webhooks/stripe` - Stripe webhook handler

## Testing with Stripe Test Cards

Use these test card numbers:
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **Requires Authentication**: 4000 0025 0000 3155

## Production Deployment

### Environment Variables
Update your production environment with:
- Real Stripe keys (live mode)
- Production database URL
- Production webhook URL
- Production CORS origins

### Security Considerations
- Use HTTPS in production
- Implement proper authentication
- Add rate limiting
- Use environment variables for secrets
- Implement proper logging

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Check `ALLOWED_ORIGINS` in `.env`
   - Ensure your frontend URL is included

2. **Webhook Signature Verification Failed**
   - Check `STRIPE_WEBHOOK_SECRET` in `.env`
   - Ensure webhook URL is correct

3. **Payment Intent Creation Failed**
   - Verify Stripe keys are correct
   - Check request body format
   - Ensure all required fields are provided

4. **Connect Account Issues**
   - Verify Connect application is set up
   - Check `STRIPE_CONNECT_CLIENT_ID`

### Debug Mode
Set `NODE_ENV=development` for detailed error messages.

## Next Steps

1. **Database Integration**: Add a database to store sessions, coaches, and payments
2. **Authentication**: Implement user authentication
3. **Email Notifications**: Add email notifications for payments
4. **Analytics**: Add payment and usage analytics
5. **Monitoring**: Add error monitoring and logging

## Support

For issues with:
- **Stripe**: Check [Stripe Documentation](https://stripe.com/docs)
- **Backend**: Check server logs and error messages
- **Integration**: Verify API endpoints and request formats
