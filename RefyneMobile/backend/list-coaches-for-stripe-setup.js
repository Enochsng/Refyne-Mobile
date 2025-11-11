const { supabase } = require('./services/database');

/**
 * Script to help identify coaches that need Stripe Connect account setup
 * This will help you get the actual coach IDs from your system
 */

async function listCoachesNeedingStripeSetup() {
  console.log('🔍 Finding coaches that need Stripe Connect account setup...\n');
  
  try {
    // First, let's check what's in the coach_connect_accounts table
    console.log('📋 Current Stripe Connect accounts in database:');
    const { data: existingAccounts, error: accountsError } = await supabase
      .from('coach_connect_accounts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (accountsError) {
      console.error('Error fetching existing accounts:', accountsError);
    } else if (existingAccounts.length === 0) {
      console.log('   No Stripe Connect accounts found in database.');
    } else {
      console.log(`   Found ${existingAccounts.length} existing account(s):`);
      existingAccounts.forEach((account, index) => {
        console.log(`   ${index + 1}. Coach ID: ${account.coach_id}`);
        console.log(`      Stripe Account: ${account.stripe_account_id}`);
        console.log(`      Email: ${account.email}`);
        console.log(`      Onboarding Completed: ${account.onboarding_completed}`);
        console.log('');
      });
    }
    
    // Now let's check for any coaching sessions to see what coach IDs are being used
    console.log('📊 Coaching sessions in database:');
    const { data: sessions, error: sessionsError } = await supabase
      .from('coaching_sessions')
      .select('coach_id, coach_name, sport, created_at')
      .order('created_at', { ascending: false });
    
    if (sessionsError) {
      console.error('Error fetching coaching sessions:', sessionsError);
    } else if (sessions.length === 0) {
      console.log('   No coaching sessions found in database.');
    } else {
      console.log(`   Found ${sessions.length} coaching session(s):`);
      
      // Group by coach_id to see unique coaches
      const uniqueCoaches = {};
      sessions.forEach(session => {
        if (!uniqueCoaches[session.coach_id]) {
          uniqueCoaches[session.coach_id] = {
            coach_id: session.coach_id,
            coach_name: session.coach_name,
            sport: session.sport,
            session_count: 0,
            latest_session: session.created_at
          };
        }
        uniqueCoaches[session.coach_id].session_count++;
        if (session.created_at > uniqueCoaches[session.coach_id].latest_session) {
          uniqueCoaches[session.coach_id].latest_session = session.created_at;
        }
      });
      
      console.log(`\n   Unique coaches from sessions:`);
      Object.values(uniqueCoaches).forEach((coach, index) => {
        console.log(`   ${index + 1}. Coach ID: ${coach.coach_id}`);
        console.log(`      Name: ${coach.coach_name}`);
        console.log(`      Sport: ${coach.sport}`);
        console.log(`      Sessions: ${coach.session_count}`);
        console.log(`      Latest Session: ${coach.latest_session}`);
        
        // Check if this coach has a Stripe Connect account
        const hasAccount = existingAccounts?.find(acc => acc.coach_id === coach.coach_id);
        if (hasAccount) {
          console.log(`      ✅ Has Stripe Connect account: ${hasAccount.stripe_account_id}`);
        } else {
          console.log(`      ❌ Missing Stripe Connect account`);
        }
        console.log('');
      });
    }
    
    // Let's also check conversations to see what coach IDs are there
    console.log('💬 Conversations in database:');
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('coach_id, coach_name, sport, created_at')
      .order('created_at', { ascending: false });
    
    if (conversationsError) {
      console.error('Error fetching conversations:', conversationsError);
    } else if (conversations.length === 0) {
      console.log('   No conversations found in database.');
    } else {
      console.log(`   Found ${conversations.length} conversation(s):`);
      
      // Group by coach_id to see unique coaches
      const uniqueConversationCoaches = {};
      conversations.forEach(conversation => {
        if (!uniqueConversationCoaches[conversation.coach_id]) {
          uniqueConversationCoaches[conversation.coach_id] = {
            coach_id: conversation.coach_id,
            coach_name: conversation.coach_name,
            sport: conversation.sport,
            conversation_count: 0,
            latest_conversation: conversation.created_at
          };
        }
        uniqueConversationCoaches[conversation.coach_id].conversation_count++;
        if (conversation.created_at > uniqueConversationCoaches[conversation.coach_id].latest_conversation) {
          uniqueConversationCoaches[conversation.coach_id].latest_conversation = conversation.created_at;
        }
      });
      
      console.log(`\n   Unique coaches from conversations:`);
      Object.values(uniqueConversationCoaches).forEach((coach, index) => {
        console.log(`   ${index + 1}. Coach ID: ${coach.coach_id}`);
        console.log(`      Name: ${coach.coach_name}`);
        console.log(`      Sport: ${coach.sport}`);
        console.log(`      Conversations: ${coach.conversation_count}`);
        console.log(`      Latest Conversation: ${coach.latest_conversation}`);
        
        // Check if this coach has a Stripe Connect account
        const hasAccount = existingAccounts?.find(acc => acc.coach_id === coach.coach_id);
        if (hasAccount) {
          console.log(`      ✅ Has Stripe Connect account: ${hasAccount.stripe_account_id}`);
        } else {
          console.log(`      ❌ Missing Stripe Connect account`);
        }
        console.log('');
      });
    }
    
    // Summary and recommendations
    console.log('🎯 SUMMARY AND RECOMMENDATIONS:');
    console.log('='.repeat(50));
    
    const allCoachIds = new Set();
    
    // Collect all unique coach IDs
    if (sessions) {
      sessions.forEach(session => allCoachIds.add(session.coach_id));
    }
    if (conversations) {
      conversations.forEach(conversation => allCoachIds.add(conversation.coach_id));
    }
    
    const coachesNeedingSetup = Array.from(allCoachIds).filter(coachId => {
      return !existingAccounts?.find(acc => acc.coach_id === coachId);
    });
    
    if (coachesNeedingSetup.length === 0) {
      console.log('✅ All coaches have Stripe Connect accounts set up!');
    } else {
      console.log(`❌ ${coachesNeedingSetup.length} coach(es) need Stripe Connect account setup:`);
      coachesNeedingSetup.forEach((coachId, index) => {
        console.log(`   ${index + 1}. ${coachId}`);
      });
      
      console.log('\n📝 To fix this issue:');
      console.log('1. Update the COACHES_TO_SETUP array in create-coach-connect-accounts.js');
      console.log('2. Add the coach IDs listed above with their correct details');
      console.log('3. Run: node create-coach-connect-accounts.js setup');
      console.log('4. Share the onboarding links with each coach');
      console.log('5. Test payments to ensure money goes to the correct accounts');
    }
    
  } catch (error) {
    console.error('❌ Error listing coaches:', error);
  }
}

// Main execution
async function main() {
  await listCoachesNeedingStripeSetup();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  listCoachesNeedingStripeSetup
};
