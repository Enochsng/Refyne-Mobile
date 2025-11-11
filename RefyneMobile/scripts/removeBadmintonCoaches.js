// Script to remove specific badminton coaches
// This script removes "Test Coach" and "jasper" from the badminton coaches list

import AsyncStorage from '@react-native-async-storage/async-storage';
import { markCoachProfileAsDeleted, cleanupDeletedProfiles } from '../utils/coachData';

const removeSpecificBadmintonCoaches = async () => {
  try {
    console.log('🔍 Starting badminton coach removal...');
    
    // Get all coach profiles
    const keys = await AsyncStorage.getAllKeys();
    const onboardingKeys = keys.filter(key => key.startsWith('onboarding_data_'));
    
    const badmintonCoaches = [];
    const coachesToRemove = ['test coach', 'jasper']; // Names to remove (case insensitive)
    
    // Find all badminton coaches
    for (const key of onboardingKeys) {
      try {
        const onboardingDataString = await AsyncStorage.getItem(key);
        if (onboardingDataString) {
          const onboardingData = JSON.parse(onboardingDataString);
          
          if (onboardingData.sport === 'badminton' && onboardingData.completed_at && !onboardingData.deleted) {
            const coachName = onboardingData.coach_name || 'Coach';
            const userId = onboardingData.user_id;
            
            badmintonCoaches.push({
              key: key,
              userId: userId,
              name: coachName,
              completedAt: onboardingData.completed_at,
              bio: onboardingData.bio
            });
          }
        }
      } catch (error) {
        console.log(`Error processing key ${key}:`, error);
      }
    }
    
    console.log(`📊 Found ${badmintonCoaches.length} badminton coaches:`);
    badmintonCoaches.forEach((coach, index) => {
      console.log(`${index + 1}. ${coach.name} (User ID: ${coach.userId})`);
      console.log(`   Completed: ${coach.completedAt}`);
      console.log(`   Bio: ${coach.bio?.substring(0, 50)}...`);
      console.log('---');
    });
    
    // Filter coaches to remove
    const coachesToDelete = badmintonCoaches.filter(coach => 
      coachesToRemove.some(nameToRemove => 
        coach.name.toLowerCase().includes(nameToRemove.toLowerCase())
      )
    );
    
    console.log(`🎯 Coaches to remove: ${coachesToDelete.length}`);
    coachesToDelete.forEach((coach, index) => {
      console.log(`${index + 1}. ${coach.name} (User ID: ${coach.userId})`);
    });
    
    if (coachesToDelete.length === 0) {
      console.log('✅ No matching badminton coaches found to remove.');
      return { removed: 0, coaches: [] };
    }
    
    console.log(`🗑️  Removing ${coachesToDelete.length} badminton coaches:`);
    
    // Mark coaches as deleted
    for (const coach of coachesToDelete) {
      console.log(`Marking coach as deleted: ${coach.name} (${coach.userId})`);
      await markCoachProfileAsDeleted(coach.userId);
    }
    
    // Clean up the deleted profiles
    await cleanupDeletedProfiles();
    
    console.log('✅ Successfully removed badminton coaches!');
    
    // Show remaining coaches
    const remainingCoaches = badmintonCoaches.filter(coach => 
      !coachesToDelete.some(deletedCoach => deletedCoach.userId === coach.userId)
    );
    
    console.log(`📊 Remaining badminton coaches: ${remainingCoaches.length}`);
    remainingCoaches.forEach((coach, index) => {
      console.log(`${index + 1}. ${coach.name} (User ID: ${coach.userId})`);
    });
    
    return { removed: coachesToDelete.length, coaches: coachesToDelete };
    
  } catch (error) {
    console.error('❌ Error during badminton coach removal:', error);
    return { removed: 0, coaches: [], error: error.message };
  }
};

// Export the function for use in other files
export { removeSpecificBadmintonCoaches };

// If running this script directly
if (require.main === module) {
  removeSpecificBadmintonCoaches()
    .then(result => {
      console.log('Removal completed:', result);
    })
    .catch(error => {
      console.error('Script failed:', error);
    });
}
