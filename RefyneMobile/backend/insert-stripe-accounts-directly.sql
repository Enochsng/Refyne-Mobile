-- Insert Stripe Connect accounts directly into the database
-- This bypasses the API and RLS issues

-- First, let's see what's currently in the table
SELECT * FROM coach_connect_accounts;

-- Insert Enokski's Stripe Connect account
INSERT INTO coach_connect_accounts (
  coach_id, 
  stripe_account_id, 
  account_type, 
  country, 
  email, 
  charges_enabled, 
  payouts_enabled, 
  details_submitted, 
  onboarding_completed, 
  business_profile, 
  created_at, 
  updated_at
) VALUES (
  'e9f47d75-cd92-4a0f-810c-7258ea03d47f',
  'acct_1SGRN1PYPuQf9f7C', -- Enokski's existing Stripe account
  'express',
  'CA',
  'enokski@refyne.com',
  true,
  true,
  true,
  true,
  '{"name": "Enokski - Golf Coach", "product_description": "Professional golf coaching services", "support_email": "enokski@refyne.com"}',
  NOW(),
  NOW()
) ON CONFLICT (coach_id) DO UPDATE SET
  stripe_account_id = EXCLUDED.stripe_account_id,
  updated_at = NOW();

-- Insert Test Coach's Stripe Connect account
-- We'll create a new Stripe account ID for this coach
INSERT INTO coach_connect_accounts (
  coach_id, 
  stripe_account_id, 
  account_type, 
  country, 
  email, 
  charges_enabled, 
  payouts_enabled, 
  details_submitted, 
  onboarding_completed, 
  business_profile, 
  created_at, 
  updated_at
) VALUES (
  'test_coach',
  'acct_1SIEReB5O9eEg5ZD', -- Test Coach's real Stripe account ID
  'express',
  'CA',
  'testcoach@refyne.com',
  false,
  false,
  false,
  false,
  '{"name": "Test Coach - Golf Coach", "product_description": "Professional golf coaching services", "support_email": "testcoach@refyne.com"}',
  NOW(),
  NOW()
) ON CONFLICT (coach_id) DO UPDATE SET
  stripe_account_id = EXCLUDED.stripe_account_id,
  updated_at = NOW();

-- Verify the insertions
SELECT * FROM coach_connect_accounts ORDER BY created_at DESC;
