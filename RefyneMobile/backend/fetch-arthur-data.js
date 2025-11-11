#!/usr/bin/env node

/**
 * Fetch data for coach Arthur from the database
 */

require('dotenv').config();
const { 
  getCoachConnectAccount, 
  getCoachTransfers,
  supabase 
} = require('./services/database');

// Arthur's coach ID from the create-arthur-connect.js file
const ARTHUR_COACH_ID = 'testcoach2-canadian';

async function fetchArthurData() {
  console.log('🏸 Fetching data for Coach Arthur...\n');
  
  try {
    // 1. Get Arthur's Stripe Connect account information
    console.log('1. Fetching Stripe Connect account information...');
    const connectAccount = await getCoachConnectAccount(ARTHUR_COACH_ID);
    
    if (connectAccount) {
      console.log('✅ Found Arthur\'s Connect account:');
      console.log('   Coach ID:', connectAccount.coach_id);
      console.log('   Stripe Account ID:', connectAccount.stripe_account_id);
      console.log('   Email:', connectAccount.email);
      console.log('   Country:', connectAccount.country);
      console.log('   Account Type:', connectAccount.account_type);
      console.log('   Charges Enabled:', connectAccount.charges_enabled);
      console.log('   Payouts Enabled:', connectAccount.payouts_enabled);
      console.log('   Details Submitted:', connectAccount.details_submitted);
      console.log('   Onboarding Completed:', connectAccount.onboarding_completed);
      console.log('   Created At:', connectAccount.created_at);
      console.log('   Updated At:', connectAccount.updated_at);
      
      if (connectAccount.business_profile) {
        console.log('   Business Profile:', JSON.stringify(connectAccount.business_profile, null, 2));
      }
    } else {
      console.log('❌ No Connect account found for Arthur');
    }

    // 2. Get Arthur's coaching sessions
    console.log('\n2. Fetching coaching sessions...');
    const { data: sessions, error: sessionsError } = await supabase
      .from('coaching_sessions')
      .select('*')
      .eq('coach_id', ARTHUR_COACH_ID)
      .order('created_at', { ascending: false });

    if (sessionsError) {
      console.error('❌ Error fetching coaching sessions:', sessionsError);
    } else if (sessions && sessions.length > 0) {
      console.log(`✅ Found ${sessions.length} coaching session(s):`);
      sessions.forEach((session, index) => {
        console.log(`\n   Session ${index + 1}:`);
        console.log('   ID:', session.id);
        console.log('   Coach Name:', session.coach_name);
        console.log('   Sport:', session.sport);
        console.log('   Package Type:', session.package_type);
        console.log('   Amount:', session.amount);
        console.log('   Currency:', session.currency);
        console.log('   Clips Remaining:', session.clips_remaining);
        console.log('   Clips Uploaded:', session.clips_uploaded);
        console.log('   Status:', session.status);
        console.log('   Session Expiry:', session.session_expiry);
        console.log('   Created At:', session.created_at);
      });
    } else {
      console.log('ℹ️  No coaching sessions found for Arthur');
    }

    // 3. Get Arthur's payment transfers
    console.log('\n3. Fetching payment transfers...');
    const transfers = await getCoachTransfers(ARTHUR_COACH_ID);
    
    if (transfers && transfers.length > 0) {
      console.log(`✅ Found ${transfers.length} transfer(s):`);
      transfers.forEach((transfer, index) => {
        console.log(`\n   Transfer ${index + 1}:`);
        console.log('   Transfer ID:', transfer.transfer_id);
        console.log('   Payment Intent ID:', transfer.payment_intent_id);
        console.log('   Amount:', transfer.amount);
        console.log('   Currency:', transfer.currency);
        console.log('   Platform Fee:', transfer.platform_fee);
        console.log('   Status:', transfer.status);
        console.log('   Description:', transfer.description);
        console.log('   Created At:', transfer.created_at);
        if (transfer.metadata) {
          console.log('   Metadata:', JSON.stringify(transfer.metadata, null, 2));
        }
      });
    } else {
      console.log('ℹ️  No payment transfers found for Arthur');
    }

    // 4. Get Arthur's conversations
    console.log('\n4. Fetching conversations...');
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('*')
      .eq('coach_id', ARTHUR_COACH_ID)
      .order('last_message_at', { ascending: false, nullsLast: true });

    if (conversationsError) {
      console.error('❌ Error fetching conversations:', conversationsError);
    } else if (conversations && conversations.length > 0) {
      console.log(`✅ Found ${conversations.length} conversation(s):`);
      conversations.forEach((conversation, index) => {
        console.log(`\n   Conversation ${index + 1}:`);
        console.log('   ID:', conversation.id);
        console.log('   Player ID:', conversation.player_id);
        console.log('   Coach Name:', conversation.coach_name);
        console.log('   Sport:', conversation.sport);
        console.log('   Session ID:', conversation.session_id);
        console.log('   Last Message:', conversation.last_message);
        console.log('   Last Message At:', conversation.last_message_at);
        console.log('   Player Unread Count:', conversation.player_unread_count);
        console.log('   Coach Unread Count:', conversation.coach_unread_count);
        console.log('   Status:', conversation.status);
        console.log('   Created At:', conversation.created_at);
      });
    } else {
      console.log('ℹ️  No conversations found for Arthur');
    }

    // 5. Summary
    console.log('\n📋 Arthur\'s Data Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Coach ID:', ARTHUR_COACH_ID);
    console.log('Connect Account:', connectAccount ? '✅ Found' : '❌ Not Found');
    console.log('Coaching Sessions:', sessions ? sessions.length : 0);
    console.log('Payment Transfers:', transfers ? transfers.length : 0);
    console.log('Conversations:', conversations ? conversations.length : 0);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return {
      success: true,
      connectAccount,
      sessions: sessions || [],
      transfers: transfers || [],
      conversations: conversations || []
    };

  } catch (error) {
    console.error('❌ Error fetching Arthur\'s data:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the script
if (require.main === module) {
  fetchArthurData()
    .then(result => {
      if (result.success) {
        console.log('\n✅ Successfully fetched Arthur\'s data!');
        process.exit(0);
      } else {
        console.log('\n❌ Failed to fetch Arthur\'s data!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { fetchArthurData };
