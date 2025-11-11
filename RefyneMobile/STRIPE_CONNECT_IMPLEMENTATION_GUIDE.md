# Stripe Connect Implementation Guide

This guide shows you how to implement the complete Stripe Connect coach flow with destination charges and database integration.

## Overview

Your Stripe Connect implementation now includes:

1. ✅ **Coach Onboarding**: Redirect coaches to Stripe's onboarding screen
2. ✅ **Database Integration**: Save account data and onboarding status
3. ✅ **Destination Charges**: Direct payments to coaches with platform fees
4. ✅ **Webhook Handling**: Automatic account status updates
5. ✅ **Transfer Tracking**: Complete payment and transfer history

## Setup Steps

### 1. Database Setup

First, set up your Supabase database tables by running the SQL commands in `backend/DATABASE_SETUP.md`.

### 2. Environment Variables

Add these to your backend `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App Configuration
APP_URL=http://localhost:3001
PLATFORM_FEE_PERCENTAGE=15
```

### 3. Install Dependencies

```bash
cd backend
npm install @supabase/supabase-js
```

## Implementation Examples

### Coach Onboarding Flow

```javascript
import { startStripeConnectOnboarding, getCoachConnectStatus } from '../services/paymentService';

// 1. Check if coach already has a Connect account
const checkCoachStatus = async (coachId) => {
  try {
    const account = await getCoachConnectStatus(coachId);
    
    if (!account) {
      // Coach needs to set up Stripe Connect
      return { needsSetup: true };
    }
    
    if (!account.onboardingCompleted) {
      // Coach started but didn't finish onboarding
      return { needsCompletion: true, account };
    }
    
    // Coach is ready to receive payments
    return { ready: true, account };
  } catch (error) {
    console.error('Error checking coach status:', error);
    return { error: error.message };
  }
};

// 2. Start onboarding for new coaches
const startCoachOnboarding = async (coachData) => {
  try {
    const result = await startStripeConnectOnboarding({
      id: coachData.id,
      name: coachData.name,
      email: coachData.email,
      sport: coachData.sport,
      country: 'CA',
      businessType: 'individual'
    });
    
    // Redirect coach to Stripe's onboarding
    const { onboardingLink } = result;
    
    // In React Native, use Linking to open the URL
    import { Linking } from 'react-native';
    await Linking.openURL(onboardingLink.url);
    
    return result;
  } catch (error) {
    console.error('Error starting onboarding:', error);
    throw error;
  }
};
```

### Player Payment Flow

```javascript
import { createDestinationCharge } from '../services/paymentService';

// 1. Check if coach is ready for payments
const checkCoachPaymentReadiness = async (coachId) => {
  const status = await checkCoachStatus(coachId);
  
  if (!status.ready) {
    throw new Error('Coach is not ready to receive payments yet');
  }
  
  return true;
};

// 2. Create destination charge (direct payment to coach)
const processPlayerPayment = async (paymentData) => {
  try {
    // Check coach readiness first
    await checkCoachPaymentReadiness(paymentData.coach.id);
    
    // Create destination charge
    const result = await createDestinationCharge({
      coach: paymentData.coach,
      sport: paymentData.sport,
      selectedPackage: paymentData.packageId,
      selectedSubscription: paymentData.isSubscription
    });
    
    const { paymentIntent, feeBreakdown } = result;
    
    // Use Stripe's payment sheet to collect payment
    const { error } = await initPaymentSheet({
      paymentIntentClientSecret: paymentIntent.client_secret,
      merchantDisplayName: 'Refyne Mobile',
    });
    
    if (error) {
      throw new Error(error.message);
    }
    
    // Present payment sheet
    const { error: presentError } = await presentPaymentSheet();
    
    if (presentError) {
      throw new Error(presentError.message);
    }
    
    // Payment successful - money goes directly to coach
    console.log('Payment successful!');
    console.log(`Coach receives: $${feeBreakdown.coachAmount / 100}`);
    console.log(`Platform fee: $${feeBreakdown.platformFee / 100}`);
    
    return result;
  } catch (error) {
    console.error('Payment failed:', error);
    throw error;
  }
};
```

### Coach Dashboard Integration

```javascript
// Coach profile screen showing payment status
const CoachProfileScreen = () => {
  const [connectStatus, setConnectStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadConnectStatus();
  }, []);
  
  const loadConnectStatus = async () => {
    try {
      const status = await getCoachConnectStatus(coachId);
      setConnectStatus(status);
    } catch (error) {
      console.error('Error loading connect status:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSetupPayments = async () => {
    try {
      await startCoachOnboarding(coachData);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return (
    <View>
      {!connectStatus ? (
        <View>
          <Text>Set up payments to start earning</Text>
          <Button title="Set Up Payments" onPress={handleSetupPayments} />
        </View>
      ) : !connectStatus.onboardingCompleted ? (
        <View>
          <Text>Complete your payment setup</Text>
          <Button title="Continue Setup" onPress={handleSetupPayments} />
        </View>
      ) : (
        <View>
          <Text>✅ Ready to receive payments</Text>
          <Text>Charges enabled: {connectStatus.chargesEnabled ? 'Yes' : 'No'}</Text>
          <Text>Payouts enabled: {connectStatus.payoutsEnabled ? 'Yes' : 'No'}</Text>
        </View>
      )}
    </View>
  );
};
```

## API Endpoints

### Coach Onboarding

```bash
# Start onboarding
POST /api/connect/start-onboarding
{
  "coachId": "coach-123",
  "coachName": "John Doe",
  "email": "john@example.com",
  "sport": "badminton",
  "country": "CA",
  "businessType": "individual"
}

# Check coach status
GET /api/connect/coach/{coachId}/status
```

### Payments

```bash
# Create destination charge
POST /api/payments/create-destination-charge
{
  "coachId": "coach-123",
  "coachName": "John Doe",
  "sport": "badminton",
  "packageType": "package",
  "packageId": 1,
  "customerEmail": "player@example.com",
  "customerName": "Jane Player"
}
```

## Webhook Events

Your backend automatically handles these Stripe webhook events:

- `account.updated` - Updates coach account status in database
- `payment_intent.succeeded` - Creates coaching sessions and tracks transfers
- `transfer.created/updated` - Tracks transfer status
- `payout.paid/failed` - Monitors coach payouts

## Database Schema

### coach_connect_accounts
- Stores Stripe Connect account information
- Tracks onboarding status
- Links coach IDs to Stripe account IDs

### coaching_sessions
- Records all coaching sessions
- Links to payment intents
- Tracks clips and session status

### payment_transfers
- Records all transfers to coaches
- Tracks platform fees
- Links to coaching sessions

## Testing

### Test Coach Onboarding

```bash
# 1. Create a test coach account
curl -X POST http://localhost:3001/api/connect/start-onboarding \
  -H "Content-Type: application/json" \
  -d '{
    "coachId": "test-coach-123",
    "coachName": "Test Coach",
    "email": "test@example.com",
    "sport": "badminton",
    "country": "CA",
    "businessType": "individual"
  }'

# 2. Check the response for onboardingLink.url
# 3. Open the URL in a browser to complete onboarding
# 4. Check coach status
curl http://localhost:3001/api/connect/coach/test-coach-123/status
```

### Test Destination Charge

```bash
# After coach completes onboarding
curl -X POST http://localhost:3001/api/payments/create-destination-charge \
  -H "Content-Type: application/json" \
  -d '{
    "coachId": "test-coach-123",
    "coachName": "Test Coach",
    "sport": "badminton",
    "packageType": "package",
    "packageId": 1,
    "customerEmail": "player@example.com",
    "customerName": "Test Player"
  }'
```

## Production Considerations

### Security
- Use service role key for backend operations
- Enable Row Level Security (RLS) on database tables
- Validate all webhook signatures
- Use HTTPS in production

### Monitoring
- Set up Stripe webhook monitoring
- Monitor failed transfers and payouts
- Track coach onboarding completion rates
- Set up alerts for payment failures

### Compliance
- Ensure coaches complete KYC requirements
- Handle tax reporting requirements
- Implement proper data retention policies
- Follow PCI compliance guidelines

## Troubleshooting

### Common Issues

1. **Coach not ready for payments**
   - Check if onboarding is completed
   - Verify charges_enabled and payouts_enabled are true
   - Check database for account status

2. **Destination charge fails**
   - Verify coach has valid Connect account
   - Check Stripe account status
   - Ensure proper webhook configuration

3. **Database connection issues**
   - Verify Supabase credentials
   - Check network connectivity
   - Ensure tables are created

### Debug Mode

Enable debug logging:

```env
NODE_ENV=development
DEBUG=stripe:*,supabase:*
```

This will show detailed logs for Stripe and database operations.

## Next Steps

1. Set up your Supabase database using the provided SQL
2. Configure your environment variables
3. Test the onboarding flow with a test coach
4. Test destination charges with test payments
5. Set up webhook endpoints in Stripe dashboard
6. Deploy to production with proper security measures

Your Stripe Connect implementation is now complete and ready for production use!
