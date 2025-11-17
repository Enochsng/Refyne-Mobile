# Stripe Connect Onboarding Testing Guide

This guide will help you test the complete Stripe Connect onboarding flow for coaches in the RefyneMobile app.

## Prerequisites

1. **Backend Server Running**
   - Navigate to the backend directory: `cd backend`
   - Install dependencies: `npm install`
   - Start the server: `npm run dev`
   - Server should be running on `http://localhost:3001`

2. **Environment Variables Set**
   - Ensure your `.env` file in the backend directory has valid Stripe keys
   - Test keys are already configured in the example

3. **Database Setup**
   - Run the SQL commands from `backend/DATABASE_SETUP.md` in your Supabase dashboard
   - Ensure the database tables are created

## Testing Steps

### Step 1: Test Backend Connection

Run the test script to verify backend functionality:

```bash
cd backend
node test-connect.js
```

Expected output:
- ✅ Health check successful
- ✅ Onboarding endpoint working
- ✅ Status endpoint working
- 🎉 Onboarding link generated

### Step 2: Test Coach Onboarding Flow

1. **Open the RefyneMobile App**
   - Launch the app on your device/simulator
   - Sign in as a coach user

2. **Navigate to Profile**
   - Go to the Profile tab in the coach navigation
   - Scroll down to the "Track Earnings" section

3. **Click "Connect Stripe Account"**
   - You should see the "Connect Stripe Account" button
   - Click on it to start the onboarding process

4. **Expected Behavior**
   - The app should show "Connecting..." briefly
   - Your browser should open with the Stripe Connect onboarding page
   - You should see the "Refyne Sandbox" branding in the onboarding flow

### Step 3: Complete Stripe Onboarding

1. **Fill Out Business Information**
   - Enter your business details
   - Provide your personal information
   - Add your bank account details

2. **Complete Identity Verification**
   - Upload required documents if prompted
   - Complete any additional verification steps

3. **Return to App**
   - After completing onboarding, return to the RefyneMobile app
   - The profile should now show "Stripe Account Connected" status

### Step 4: Verify Account Status

1. **Check Profile Status**
   - The "Track Earnings" section should show:
     - ✅ "Stripe Account Connected" with green checkmark
     - "Your account is ready to receive payments"

2. **Test Backend Status Check**
   - The app should automatically check and display the correct status
   - You can also manually refresh the profile screen

## Expected User Experience

### Before Onboarding
- Button shows: "Connect Stripe Account"
- Subtitle: "Set up your payment processing to receive earnings"
- Right arrow indicating it's clickable

### During Onboarding
- Button shows: "Connecting..."
- Subtitle: "Setting up your payment processing..."
- Loading indicator

### After Successful Onboarding
- Button shows: "Stripe Account Connected" with green checkmark
- Subtitle: "Your account is ready to receive payments"
- Additional "View Earnings on Stripe" option appears

### If Onboarding is Incomplete
- Button shows: "Stripe Account Pending" with clock icon
- Subtitle: "Complete your onboarding to start receiving payments"
- Clicking allows re-entering the onboarding flow

## Troubleshooting

### Backend Connection Issues

**Problem**: "Backend Connection Required" error
**Solution**: 
- Ensure backend server is running: `cd backend && npm run dev`
- Check that the server is accessible at `http://localhost:3001`
- Verify your device is on the same network as your development machine

### Stripe Onboarding Issues

**Problem**: Onboarding link doesn't open
**Solution**:
- Check device browser settings
- Try manually opening the link in a browser
- Ensure you have internet connectivity

**Problem**: Onboarding page shows generic Stripe branding
**Solution**:
- This is expected for test mode
- In production, you'll see your custom branding
- The functionality remains the same

### Status Check Issues

**Problem**: Status doesn't update after onboarding
**Solution**:
- Wait a few minutes for webhook processing
- Manually refresh the profile screen
- Check backend logs for webhook events

## Testing with Different Scenarios

### Test 1: New Coach (No Stripe Account)
- Expected: "Connect Stripe Account" button
- Action: Click to start onboarding
- Result: Opens Stripe Connect onboarding

### Test 2: Coach with Incomplete Onboarding
- Expected: "Stripe Account Pending" button
- Action: Click to continue onboarding
- Result: Opens Stripe Connect onboarding to complete setup

### Test 3: Coach with Complete Onboarding
- Expected: "Stripe Account Connected" status
- Action: No action needed
- Result: Shows connected status with earnings option

### Test 4: Backend Offline
- Expected: "Backend Connection Required" error
- Action: Start backend server
- Result: Retry button allows re-attempting connection

## Production Considerations

### Before Going Live

1. **Replace Test Keys**
   - Update `STRIPE_SECRET_KEY` with live key
   - Update `STRIPE_PUBLISHABLE_KEY` with live key
   - Set up webhook endpoints in Stripe Dashboard

2. **Configure Webhooks**
   - Add webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Enable required events:
     - `account.updated`
     - `payment_intent.succeeded`
     - `transfer.created`
     - `payout.paid`

3. **Database Security**
   - Enable Row Level Security (RLS) policies
   - Use service role key for backend operations
   - Implement proper error handling

4. **Custom Branding**
   - Configure Stripe Connect branding in Stripe Dashboard
   - Set up custom domain for onboarding
   - Add your logo and colors

## Success Criteria

✅ **Backend Tests Pass**
- Health endpoint responds
- Onboarding endpoint creates account
- Status endpoint returns correct data

✅ **Frontend Integration Works**
- Button appears in coach profile
- Clicking opens Stripe onboarding
- Status updates correctly after onboarding

✅ **Stripe Onboarding Completes**
- Coach can complete full onboarding flow
- Account becomes ready for payments
- Status reflects in the app

✅ **Error Handling Works**
- Network errors are handled gracefully
- Backend offline scenarios work
- User gets clear feedback

## Next Steps After Testing

1. **Set up Production Environment**
   - Configure live Stripe keys
   - Set up production database
   - Deploy backend to production server

2. **Configure Webhooks**
   - Set up webhook endpoints
   - Test webhook processing
   - Monitor webhook events

3. **Test Payment Flow**
   - Test destination charges
   - Verify coach payments
   - Test platform fee handling

4. **Monitor and Maintain**
   - Set up logging and monitoring
   - Create alerts for failures
   - Regular testing of the flow

---

**Note**: This testing guide covers the complete Stripe Connect onboarding flow. The implementation takes coaches to the proper Stripe Connect Express onboarding page (not the signup page) and provides a seamless experience for setting up payment processing.
