// Standalone script to remove bottom 3-4 golf coaches
// Run this script to immediately clean up golf coaches

import AsyncStorage from '@react-native-async-storage/async-storage';
import { markCoachProfileAsDeleted, cleanupDeletedProfiles } from '../utils/coachData';

const removeBottomGolfCoaches = async () => {
  try {
    console.log('🔍 Starting golf coach cleanup...');
    
    // Get all coach profiles
    const keys = await AsyncStorage.getAllKeys();
    const onboardingKeys = keys.filter(key => key.startsWith('onboarding_data_'));
    
    const golfCoaches = [];
    
    // Find all golf coaches
    for (const key of onboardingKeys) {
      try {
        const onboardingDataString = await AsyncStorage.getItem(key);
        if (onboardingDataString) {
          const onboardingData = JSON.parse(onboardingDataString);
          
          if (onboardingData.sport === 'golf' && onboardingData.completed_at && !onboardingData.deleted) {
            golfCoaches.push({
              key: key,
              userId: onboardingData.user_id,
              completedAt: onboardingData.completed_at,
              bio: onboardingData.bio
            });
          }
        }
      } catch (error) {
        console.log(`Error processing key ${key}:`, error);
      }
    }
    
    // Sort by completion date (most recent first)
    golfCoaches.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    
    console.log(`📊 Found ${golfCoaches.length} golf coaches:`);
    golfCoaches.forEach((coach, index) => {
      console.log(`${index + 1}. User ID: ${coach.userId}`);
      console.log(`   Completed: ${coach.completedAt}`);
      console.log(`   Bio: ${coach.bio?.substring(0, 50)}...`);
      console.log('---');
    });
    
    if (golfCoaches.length <= 1) {
      console.log('✅ Only 1 or fewer golf coaches found. No cleanup needed.');
      return;
    }
    
    // Remove bottom 3-4 coaches (keep the most recent ones)
    const coachesToKeep = Math.min(2, golfCoaches.length); // Keep top 1-2 coaches
    const coachesToDelete = golfCoaches.slice(coachesToKeep);
    
    console.log(`🗑️  Deleting ${coachesToDelete.length} oldest golf coaches:`);
    coachesToDelete.forEach((coach, index) => {
      console.log(`${index + 1}. ${coach.userId} (completed: ${coach.completedAt})`);
    });
    
    // Mark coaches as deleted
    for (const coach of coachesToDelete) {
      await markCoachProfileAsDeleted(coach.userId);
    }
    
    // Clean up the deleted profiles
    await cleanupDeletedProfiles();
    
    console.log('✅ Golf coach cleanup completed successfully!');
    
    // Show remaining coaches
    const remainingKeys = await AsyncStorage.getAllKeys();
    const remainingOnboardingKeys = remainingKeys.filter(key => key.startsWith('onboarding_data_'));
    let remainingCount = 0;
    
    for (const key of remainingOnboardingKeys) {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const profile = JSON.parse(data);
        if (profile.sport === 'golf' && profile.completed_at && !profile.deleted) {
          remainingCount++;
        }
      }
    }
    
    console.log(`📈 Remaining golf coaches: ${remainingCount}`);
    
  } catch (error) {
    console.error('❌ Error during golf coach cleanup:', error);
  }
};

// Run the cleanup
removeBottomGolfCoaches();
