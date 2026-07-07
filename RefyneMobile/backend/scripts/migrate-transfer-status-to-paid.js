#!/usr/bin/env node

/**
 * One-time migration: payment_transfers.status 'completed' → 'paid'
 * Run from RefyneMobile/backend: node scripts/migrate-transfer-status-to-paid.js
 */

require('dotenv').config();
const { supabase, isSupabaseConfigured } = require('../services/database');

async function migrateTransferStatusToPaid() {
  if (!isSupabaseConfigured || !supabase) {
    console.error('❌ Supabase is not configured. Set SUPABASE_SERVICE_KEY in .env');
    process.exit(1);
  }

  console.log('🔄 Migrating payment_transfers status: completed → paid\n');

  const { data: completedRows, error: selectError } = await supabase
    .from('payment_transfers')
    .select('transfer_id, coach_id, amount, created_at')
    .eq('status', 'completed');

  if (selectError) {
    console.error('❌ Failed to fetch completed transfers:', selectError.message);
    process.exit(1);
  }

  const count = completedRows?.length ?? 0;
  console.log(`Found ${count} transfer(s) with status 'completed'`);

  if (count === 0) {
    console.log('✅ Nothing to migrate');
    return;
  }

  completedRows.slice(0, 5).forEach((row, index) => {
    console.log(`  ${index + 1}. ${row.transfer_id} (coach: ${row.coach_id}, amount: ${row.amount})`);
  });
  if (count > 5) {
    console.log(`  ... and ${count - 5} more`);
  }

  const { error: updateError } = await supabase
    .from('payment_transfers')
    .update({
      status: 'paid',
      updated_at: new Date().toISOString(),
    })
    .eq('status', 'completed');

  if (updateError) {
    console.error('❌ Failed to update transfers:', updateError.message);
    process.exit(1);
  }

  const { count: remainingCount, error: verifyError } = await supabase
    .from('payment_transfers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed');

  if (verifyError) {
    console.error('❌ Failed to verify migration:', verifyError.message);
    process.exit(1);
  }

  if (remainingCount > 0) {
    console.error(`❌ Migration incomplete: ${remainingCount} row(s) still have status 'completed'`);
    process.exit(1);
  }

  console.log(`\n✅ Migrated ${count} transfer(s) to status 'paid'`);
}

migrateTransferStatusToPaid().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
