import AsyncStorage from '@react-native-async-storage/async-storage';
import { markCoachProfileAsDeleted, cleanupDeletedProfiles } from './coachData';

// Function to list all golf coaches with their details
export const listGolfCoaches = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const onboardingKeys = keys.filter(key => key.startsWith('onboarding_data_'));
    
    const golfCoaches = [];
    
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
              bio: onboardingData.bio,
              experience: onboardingData.experience,
              expertise: onboardingData.expertise,
              language: onboardingData.language
            });
          }
        }
      } catch (error) {
        console.log(`Error processing key ${key}:`, error);
      }
    }
    
    // Sort by completion date (most recent first)
    golfCoaches.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    
    console.log('Current Golf Coaches (sorted by most recent):');
    golfCoaches.forEach((coach, index) => {
      console.log(`${index + 1}. User ID: ${coach.userId}`);
      console.log(`   Completed: ${coach.completedAt}`);
      console.log(`   Bio: ${coach.bio?.substring(0, 50)}...`);
      console.log(`   Experience: ${coach.experience}`);
      console.log('---');
    });
    
    return golfCoaches;
  } catch (error) {
    console.error('Error listing golf coaches:', error);
    return [];
  }
};

// Function to keep only the most recent golf coach and delete the rest
export const keepOnlyMostRecentGolfCoach = async () => {
  try {
    console.log('Starting golf coach cleanup...');
    
    const golfCoaches = await listGolfCoaches();
    
    if (golfCoaches.length <= 1) {
      console.log('Only 1 or fewer golf coaches found. No cleanup needed.');
      return;
    }
    
    // Keep the first one (most recent) and delete the rest
    const coachesToDelete = golfCoaches.slice(1); // Remove the first (most recent) coach
    
    console.log(`Keeping most recent coach: ${golfCoaches[0].userId}`);
    console.log(`Deleting ${coachesToDelete.length} older coaches...`);
    
    for (const coach of coachesToDelete) {
      console.log(`Marking coach as deleted: ${coach.userId}`);
      await markCoachProfileAsDeleted(coach.userId);
    }
    
    // Clean up the deleted profiles
    await cleanupDeletedProfiles();
    
    console.log('Golf coach cleanup completed successfully!');
    
    // List remaining coaches
    const remainingCoaches = await listGolfCoaches();
    console.log(`Remaining golf coaches: ${remainingCoaches.length}`);
    
  } catch (error) {
    console.error('Error during golf coach cleanup:', error);
  }
};

// Function to delete specific number of oldest golf coaches
export const deleteOldestGolfCoaches = async (count = 3) => {
  try {
    console.log(`Starting deletion of ${count} oldest golf coaches...`);
    
    const golfCoaches = await listGolfCoaches();
    
    if (golfCoaches.length <= count) {
      console.log(`Only ${golfCoaches.length} golf coaches found. Cannot delete ${count} coaches.`);
      return;
    }
    
    // Get the oldest coaches (last in the sorted array)
    const coachesToDelete = golfCoaches.slice(-count);
    
    console.log(`Deleting ${coachesToDelete.length} oldest coaches:`);
    coachesToDelete.forEach((coach, index) => {
      console.log(`${index + 1}. ${coach.userId} (completed: ${coach.completedAt})`);
    });
    
    for (const coach of coachesToDelete) {
      await markCoachProfileAsDeleted(coach.userId);
    }
    
    // Clean up the deleted profiles
    await cleanupDeletedProfiles();
    
    console.log('Golf coach deletion completed successfully!');
    
    // List remaining coaches
    const remainingCoaches = await listGolfCoaches();
    console.log(`Remaining golf coaches: ${remainingCoaches.length}`);
    
  } catch (error) {
    console.error('Error during golf coach deletion:', error);
  }
};
