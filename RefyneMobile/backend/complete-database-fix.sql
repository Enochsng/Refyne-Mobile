-- Complete Database Fix for Stripe Connect Issues
-- Run this entire script in your Supabase SQL Editor

-- 1. Add missing business_profile column
ALTER TABLE coach_connect_accounts 
ADD COLUMN IF NOT EXISTS business_profile JSONB;

-- 2. Set default values for existing records
UPDATE coach_connect_accounts 
SET business_profile = NULL 
WHERE business_profile IS NULL;

-- 3. Ensure all required columns exist with proper defaults
ALTER TABLE coach_connect_accounts 
ALTER COLUMN charges_enabled SET DEFAULT FALSE;

ALTER TABLE coach_connect_accounts 
ALTER COLUMN payouts_enabled SET DEFAULT FALSE;

ALTER TABLE coach_connect_accounts 
ALTER COLUMN details_submitted SET DEFAULT FALSE;

ALTER TABLE coach_connect_accounts 
ALTER COLUMN onboarding_completed SET DEFAULT FALSE;

-- 4. Update existing records to have proper default values
UPDATE coach_connect_accounts 
SET charges_enabled = COALESCE(charges_enabled, FALSE),
    payouts_enabled = COALESCE(payouts_enabled, FALSE),
    details_submitted = COALESCE(details_submitted, FALSE),
    onboarding_completed = COALESCE(onboarding_completed, FALSE)
WHERE charges_enabled IS NULL 
   OR payouts_enabled IS NULL 
   OR details_submitted IS NULL 
   OR onboarding_completed IS NULL;

-- 5. Verify the table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'coach_connect_accounts' 
ORDER BY ordinal_position;

-- 6. Show current data
SELECT 
    coach_id,
    email,
    charges_enabled,
    payouts_enabled,
    details_submitted,
    onboarding_completed,
    business_profile IS NOT NULL as has_business_profile
FROM coach_connect_accounts
ORDER BY created_at DESC;
