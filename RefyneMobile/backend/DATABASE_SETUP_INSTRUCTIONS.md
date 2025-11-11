# Database Setup Instructions

## CRITICAL: You must set up the database tables before the payment flow will work!

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project: `jgtbqtpixskznnejzizm`
3. Go to the **SQL Editor** tab

### Step 2: Run the Database Setup Script
Copy and paste the entire contents of `setup-database.sql` into the SQL Editor and run it.

### Step 3: Verify Tables Were Created
After running the script, you should see these tables in your database:
- `coach_connect_accounts`
- `coaching_sessions` 
- `payment_transfers`
- `conversations`
- `messages`

### Step 4: Test the Setup
Run this command to test if everything is working:

```bash
cd /Users/enoch/RefyneMobile/RefyneMobile/backend
node test-database.js
```

You should see:
```
✅ Database connection successful
✅ Conversations table exists
✅ Messages table exists
✅ Test conversation created successfully
✅ Test conversation cleaned up
🎉 Database is ready for DM creation!
```

### Step 5: Test the Payment Flow
1. Make sure your backend server is running:
   ```bash
   cd /Users/enoch/RefyneMobile/RefyneMobile/backend
   npm start
   ```

2. Test a payment in your app
3. Check the backend logs for these messages:
   ```
   Payment succeeded: pi_xxxxx
   Coaching session saved to database: session_xxxxx
   DM conversation created: conv_xxxxx
   Welcome message added to conversation
   ```

4. Check your Supabase database for new entries in the tables

## Why This Fixes Both Issues:

### Issue 1: Stripe Connect Payments Not Showing in Coach Account
- **Root Cause**: The webhook couldn't save transfer records because the `payment_transfers` table didn't exist
- **Fix**: With the database tables created, the webhook can now properly save transfer records and the destination charge will work correctly

### Issue 2: DM Chats Not Created After Payment
- **Root Cause**: The webhook couldn't create conversations because the `conversations` and `messages` tables didn't exist
- **Fix**: With the database tables created, the webhook can now create DM conversations and welcome messages

## Additional Fixes Made:

1. **Updated frontend to use destination charges**: Changed from regular payment intents to destination charges for proper Stripe Connect integration
2. **Fixed player information**: Added player ID and name to payment metadata so DMs can be created properly
3. **Updated payment service**: Modified the destination charge function to include player information

After completing these steps, both issues should be resolved!
