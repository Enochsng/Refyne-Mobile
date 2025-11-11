#!/usr/bin/env node

/**
 * Check what data exists in the database
 */

require('dotenv').config();
const { supabase } = require('./services/database');

async function checkDatabase() {
  console.log('🔍 Checking database contents...\n');
  
  try {
    // Check coach_connect_accounts table
    console.log('1. Checking coach_connect_accounts table...');
    const { data: accounts, error: accountsError } = await supabase
      .from('coach_connect_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (accountsError) {
      console.error('❌ Error fetching accounts:', accountsError);
    } else {
      console.log(`✅ Found ${accounts ? accounts.length : 0} coach connect account(s):`);
      if (accounts && accounts.length > 0) {
        accounts.forEach((account, index) => {
          console.log(`\n   Account ${index + 1}:`);
          console.log('   Coach ID:', account.coach_id);
          console.log('   Stripe Account ID:', account.stripe_account_id);
          console.log('   Email:', account.email);
          console.log('   Country:', account.country);
          console.log('   Created At:', account.created_at);
        });
      }
    }

    // Check coaching_sessions table
    console.log('\n2. Checking coaching_sessions table...');
    const { data: sessions, error: sessionsError } = await supabase
      .from('coaching_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (sessionsError) {
      console.error('❌ Error fetching sessions:', sessionsError);
    } else {
      console.log(`✅ Found ${sessions ? sessions.length : 0} coaching session(s):`);
      if (sessions && sessions.length > 0) {
        sessions.forEach((session, index) => {
          console.log(`\n   Session ${index + 1}:`);
          console.log('   ID:', session.id);
          console.log('   Coach ID:', session.coach_id);
          console.log('   Coach Name:', session.coach_name);
          console.log('   Sport:', session.sport);
          console.log('   Status:', session.status);
          console.log('   Created At:', session.created_at);
        });
      }
    }

    // Check payment_transfers table
    console.log('\n3. Checking payment_transfers table...');
    const { data: transfers, error: transfersError } = await supabase
      .from('payment_transfers')
      .select('*')
      .order('created_at', { ascending: false });

    if (transfersError) {
      console.error('❌ Error fetching transfers:', transfersError);
    } else {
      console.log(`✅ Found ${transfers ? transfers.length : 0} payment transfer(s):`);
      if (transfers && transfers.length > 0) {
        transfers.forEach((transfer, index) => {
          console.log(`\n   Transfer ${index + 1}:`);
          console.log('   Transfer ID:', transfer.transfer_id);
          console.log('   Coach ID:', transfer.coach_id);
          console.log('   Amount:', transfer.amount);
          console.log('   Status:', transfer.status);
          console.log('   Created At:', transfer.created_at);
        });
      }
    }

    // Check conversations table
    console.log('\n4. Checking conversations table...');
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .order('created_at', { ascending: false });

    if (conversationsError) {
      console.error('❌ Error fetching conversations:', conversationsError);
    } else {
      console.log(`✅ Found ${conversations ? conversations.length : 0} conversation(s):`);
      if (conversations && conversations.length > 0) {
        conversations.forEach((conversation, index) => {
          console.log(`\n   Conversation ${index + 1}:`);
          console.log('   ID:', conversation.id);
          console.log('   Coach ID:', conversation.coach_id);
          console.log('   Coach Name:', conversation.coach_name);
          console.log('   Sport:', conversation.sport);
          console.log('   Status:', conversation.status);
          console.log('   Created At:', conversation.created_at);
        });
      }
    }

    // Summary
    console.log('\n📋 Database Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Coach Connect Accounts:', accounts ? accounts.length : 0);
    console.log('Coaching Sessions:', sessions ? sessions.length : 0);
    console.log('Payment Transfers:', transfers ? transfers.length : 0);
    console.log('Conversations:', conversations ? conversations.length : 0);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return {
      success: true,
      accounts: accounts || [],
      sessions: sessions || [],
      transfers: transfers || [],
      conversations: conversations || []
    };

  } catch (error) {
    console.error('❌ Error checking database:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the script
if (require.main === module) {
  checkDatabase()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Database check completed!');
        process.exit(0);
      } else {
        console.log('\n❌ Database check failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { checkDatabase };
