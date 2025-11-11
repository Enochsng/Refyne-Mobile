// Test script for badminton coach removal
// This can be imported and run in the React Native app

import AsyncStorage from '@react-native-async-storage/async-storage';

// Function to remove specific badminton coaches
export const removeSpecificBadmintonCoaches = async (coachNames = ['test coach', 'jasper']) => {
  try {
    console.log('🔍 Starting specific badminton coach removal...');
    
    // Get all coach profiles
    const keys = await AsyncStorage.getAllKeys();
    const onboardingKeys = keys.filter(key => key.startsWith('onboarding_data_'));
    
    const badmintonCoaches = [];
    
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
      coachNames.some(nameToRemove => 
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
      
      // Mark as deleted in AsyncStorage
      const key = `onboarding_data_${coach.userId}`;
      const onboardingDataString = await AsyncStorage.getItem(key);
      
      if (onboardingDataString) {
        const onboardingData = JSON.parse(onboardingDataString);
        onboardingData.deleted = true;
        onboardingData.deleted_at = new Date().toISOString();
        
        await AsyncStorage.setItem(key, JSON.stringify(onboardingData));
        console.log(`Marked coach profile as deleted: ${coach.userId}`);
      }
    }
    
    // Clean up deleted profiles
    for (const key of onboardingKeys) {
      try {
        const onboardingDataString = await AsyncStorage.getItem(key);
        if (onboardingDataString) {
          const onboardingData = JSON.parse(onboardingDataString);
          
          if (onboardingData.deleted === true || !onboardingData.completed_at) {
            console.log(`Removing deleted profile: ${key}`);
            await AsyncStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.log(`Error processing key ${key}, removing it:`, error);
        await AsyncStorage.removeItem(key);
      }
    }
    
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

// Function to test the removal
export const testBadmintonCoachRemoval = async () => {
  try {
    console.log('🚀 Starting badminton coach removal test...');
    
    const result = await removeSpecificBadmintonCoaches(['test coach', 'jasper']);
    
    console.log('✅ Removal test completed!');
    console.log(`Removed ${result.removed} coaches`);
    
    if (result.coaches && result.coaches.length > 0) {
      console.log('Removed coaches:');
      result.coaches.forEach((coach, index) => {
        console.log(`${index + 1}. ${coach.name} (User ID: ${coach.userId})`);
      });
    }
    
    if (result.error) {
      console.error('Error occurred:', result.error);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return { error: error.message };
  }
};
