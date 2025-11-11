# Setup Instructions for DM Creation After Payment

## The Problem
The DM creation system isn't working because the database tables haven't been created yet. Here's how to fix it:

## Step 1: Create Database Tables

1. **Open your Supabase dashboard**
2. **Go to the SQL Editor**
3. **Copy and paste the entire contents of `setup-database.sql`**
4. **Run the SQL script**

The script will create all necessary tables:
- `coach_connect_accounts`
- `coaching_sessions` 
- `payment_transfers`
- `conversations` (for DMs)
- `messages` (for DM messages)

## Step 2: Verify Database Setup

Run this command to test if the tables were created:

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

## Step 3: Test the Webhook

After the database is set up, test the webhook functionality:

```bash
cd /Users/enoch/RefyneMobile/RefyneMobile/backend
node test-webhook.js
```

This will simulate a successful payment and create:
- A coaching session
- A DM conversation
- A welcome message

## Step 4: Test Real Payment Flow

1. **Make sure your backend server is running:**
   ```bash
   cd /Users/enoch/RefyneMobile/RefyneMobile/backend
   npm start
   ```

2. **In your app, go through the payment flow:**
   - Select a coach
   - Choose a package
   - Complete payment (use test mode)

3. **Check the backend logs** for these messages:
   ```
   Payment succeeded: pi_xxxxx
   Coaching session saved to database: session_xxxxx
   DM conversation created: conv_xxxxx
   Welcome message added to conversation
   ```

4. **Check your Supabase database** for new entries in:
   - `coaching_sessions` table
   - `conversations` table  
   - `messages` table

## Step 5: Verify Webhook Configuration

If the real payment flow still doesn't work, check your webhook configuration:

1. **In Stripe Dashboard:**
   - Go to Developers > Webhooks
   - Make sure you have a webhook endpoint pointing to: `http://your-server:3001/api/webhooks/stripe`
   - Make sure it's listening for `payment_intent.succeeded` events

2. **Check your environment variables:**
   ```bash
   # In your backend/.env file, make sure you have:
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   STRIPE_SECRET_KEY=sk_test_xxxxx
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your-service-key
   ```

## Troubleshooting

### If database test fails:
- Make sure you ran the SQL script in Supabase
- Check your Supabase connection details in `.env`

### If webhook test fails:
- Make sure the database tables exist first
- Check the error messages in the console

### If real payment doesn't create DMs:
- Check backend logs for webhook events
- Verify webhook endpoint is accessible from Stripe
- Make sure webhook secret is correct

## What Should Happen

When a payment succeeds, you should see in your database:

1. **coaching_sessions table**: New session record
2. **conversations table**: New conversation between player and coach
3. **messages table**: Welcome message from system

The conversation will be visible on both player and coach message pages.

## Next Steps

Once this is working:
1. Update your message screens to use real data instead of mock data
2. Add real-time messaging functionality
3. Integrate with user authentication system
