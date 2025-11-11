import AsyncStorage from '@react-native-async-storage/async-storage';
import { markCoachProfileAsDeleted, cleanupDeletedProfiles } from './coachData';

// Utility function to delete specific coach profiles
// You can call this function with the user IDs of coaches you want to remove
export const deleteSpecificCoaches = async (userIds) => {
  try {
    console.log('Starting deletion of specific coach profiles...');
    
    for (const userId of userIds) {
      await markCoachProfileAsDeleted(userId);
    }
    
    // Clean up the deleted profiles
    await cleanupDeletedProfiles();
    
    console.log('Successfully deleted coach profiles:', userIds);
  } catch (error) {
    console.error('Error deleting coach profiles:', error);
  }
};

// Function to list all current coach profiles (for debugging)
export const listAllCoachProfiles = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const onboardingKeys = keys.filter(key => key.startsWith('onboarding_data_'));
    
    console.log('Current coach profiles:');
    for (const key of onboardingKeys) {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const profile = JSON.parse(data);
        console.log(`- ${key}: ${profile.sport} coach, completed: ${profile.completed_at ? 'Yes' : 'No'}, deleted: ${profile.deleted ? 'Yes' : 'No'}`);
      }
    }
  } catch (error) {
    console.error('Error listing coach profiles:', error);
  }
};

// Example usage:
// To delete specific coaches, you would call:
// deleteSpecificCoaches(['user-id-1', 'user-id-2', 'user-id-3']);
//
// To list all profiles:
// listAllCoachProfiles();
