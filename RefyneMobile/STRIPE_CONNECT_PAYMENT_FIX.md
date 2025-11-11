# Stripe Connect Payment Routing Fix

## Problem Identified

The issue was in the `getCoachConnectAccountId` function in `/backend/services/database.js`. The function had hardcoded fallback logic that always returned the same Stripe account ID (`acct_1SGRN1PYPuQf9f7C`) for any UUID-based coach ID, causing all payments to go to the same account regardless of which coach was selected.

## Root Cause

```javascript
// PROBLEMATIC CODE (now fixed):
if (isUuid) {
  console.log(`CoachId appears to be a UUID, using default Stripe account for testing`);
  // For any UUID, use the Enokski account for testing
  return 'acct_1SGRN1PYPuQf9f7C'; // ❌ This caused all payments to go to the same account
}
```

## Solution Implemented

### 1. Fixed Payment Routing Logic

**File:** `/backend/services/database.js`

- Removed the hardcoded fallback that always returned the same account ID for UUIDs
- Now properly returns `null` when no Stripe Connect account is found for a coach
- Only uses known coach mappings for specific coach IDs, not for UUIDs
- Each coach must have their own Stripe Connect account properly stored in the database

### 2. Enhanced Error Handling

The payment route already had proper error handling for when `coachAccountId` is null:

```javascript
if (!coachAccountId) {
  console.log(`No Connect account found for coach: ${coachId}`);
  return res.status(400).json({
    error: 'Coach not ready for payments',
    message: 'Coach has not completed Stripe Connect setup'
  });
}
```

### 3. Created Setup Scripts

**File:** `/backend/create-coach-connect-accounts.js`
- Script to create Stripe Connect accounts for multiple coaches
- Handles database storage and onboarding link creation
- Provides detailed logging and error handling

**File:** `/backend/list-coaches-for-stripe-setup.js`
- Script to identify coaches that need Stripe Connect account setup
- Shows which coaches have accounts and which are missing them
- Provides recommendations for next steps

## How to Fix Your System

### Step 1: Identify Coaches Needing Setup

Run the diagnostic script to see which coaches need Stripe Connect accounts:

```bash
cd /Users/enoch/RefyneMobile/RefyneMobile/backend
node list-coaches-for-stripe-setup.js
```

This will show you:
- Current Stripe Connect accounts in your database
- Coaches from coaching sessions and conversations
- Which coaches are missing Stripe Connect accounts

### Step 2: Update Coach Configuration

Edit `/backend/create-coach-connect-accounts.js` and update the `COACHES_TO_SETUP` array with your actual coach data:

```javascript
const COACHES_TO_SETUP = [
  {
    coachId: 'actual-coach-uuid-1', // Replace with real coach UUID
    coachName: 'Actual Coach 1 Name',
    email: 'coach1@example.com',
    sport: 'golf',
    country: 'CA',
    businessType: 'individual'
  },
  {
    coachId: 'actual-coach-uuid-2', // Replace with real coach UUID
    coachName: 'Actual Coach 2 Name', 
    email: 'coach2@example.com',
    sport: 'badminton',
    country: 'CA',
    businessType: 'individual'
  }
  // Add more coaches as needed
];
```

### Step 3: Create Stripe Connect Accounts

Run the setup script to create Stripe Connect accounts for all coaches:

```bash
node create-coach-connect-accounts.js setup
```

This will:
- Create Stripe Connect accounts for each coach
- Save account information to your database
- Generate onboarding links for each coach

### Step 4: Complete Coach Onboarding

1. Share the onboarding links with each coach
2. Coaches complete their Stripe Connect onboarding process
3. Verify that each coach's account shows as "onboarding_completed: true" in the database

### Step 5: Test Payments

1. Try making a payment to Coach 1 - money should go to Coach 1's Stripe account
2. Try making a payment to Coach 2 - money should go to Coach 2's Stripe account
3. Verify in your Stripe dashboard that payments are going to the correct accounts

## Verification Commands

### List existing coaches and their Stripe accounts:
```bash
node list-coaches-for-stripe-setup.js
```

### List existing Stripe Connect accounts:
```bash
node create-coach-connect-accounts.js list
```

## Expected Behavior After Fix

- ✅ Player 1 pays Coach 1 → Money goes to Coach 1's Stripe Connect account
- ✅ Player 1 pays Coach 2 → Money goes to Coach 2's Stripe Connect account  
- ✅ Each coach receives payments in their own Stripe Connect account
- ❌ If a coach doesn't have a Stripe Connect account → Payment fails with clear error message

## Database Schema

The fix relies on the `coach_connect_accounts` table:

```sql
CREATE TABLE coach_connect_accounts (
  id SERIAL PRIMARY KEY,
  coach_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_account_id VARCHAR(255) UNIQUE NOT NULL,
  account_type VARCHAR(50) DEFAULT 'express',
  country VARCHAR(2) NOT NULL,
  email VARCHAR(255) NOT NULL,
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  details_submitted BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  business_profile JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Troubleshooting

### If payments still go to the wrong account:
1. Check that each coach has a unique `stripe_account_id` in the database
2. Verify that the `coach_id` in payment requests matches the `coach_id` in the database
3. Check the server logs to see which Stripe account ID is being used

### If you get "Coach not ready for payments" error:
1. Run `node list-coaches-for-stripe-setup.js` to see which coaches need setup
2. Create Stripe Connect accounts for missing coaches
3. Ensure coaches complete their onboarding process

### If you need to update an existing coach's Stripe account:
1. Update the `stripe_account_id` in the `coach_connect_accounts` table
2. Or delete the old record and create a new one using the setup script

## Files Modified

1. `/backend/services/database.js` - Fixed `getCoachConnectAccountId` function
2. `/backend/create-coach-connect-accounts.js` - New setup script
3. `/backend/list-coaches-for-stripe-setup.js` - New diagnostic script
4. `/STRIPE_CONNECT_PAYMENT_FIX.md` - This documentation

The core payment routing logic in `/backend/routes/payments.js` was already correct and didn't need changes.
