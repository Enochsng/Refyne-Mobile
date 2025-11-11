import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabaseClient';

// Function to get all coach profiles from AsyncStorage
export const getAllCoachProfiles = async () => {
  try {
    // Get all keys from AsyncStorage
    const keys = await AsyncStorage.getAllKeys();
    
    // Filter keys that match the onboarding data pattern
    const onboardingKeys = keys.filter(key => key.startsWith('onboarding_data_'));
    
    const coachProfiles = [];
    
    // Fetch each coach's onboarding data
    for (const key of onboardingKeys) {
      try {
        const onboardingDataString = await AsyncStorage.getItem(key);
        if (onboardingDataString) {
          const onboardingData = JSON.parse(onboardingDataString);
          
          // Only include coaches who have completed onboarding and are not deleted
          if (onboardingData.completed_at && onboardingData.user_id && !onboardingData.deleted) {
            // Try to get the coach's name and profile picture
            let coachName = 'Coach'; // Default name
            let profilePicture = null;
            
            try {
              // First, check if the coach name is stored in the onboarding data
              if (onboardingData.coach_name && onboardingData.coach_name !== 'Coach') {
                coachName = onboardingData.coach_name;
                console.log(`Found coach name in onboarding data for ${onboardingData.user_id}: ${coachName}`);
              } else {
                // Fallback: check if there's a saved name in AsyncStorage
                const savedName = await AsyncStorage.getItem(`coach_name_${onboardingData.user_id}`);
                if (savedName && savedName !== 'Coach') {
                  coachName = savedName;
                  console.log(`Found saved name for coach ${onboardingData.user_id}: ${savedName}`);
                } else {
                  // Additional fallback: try to get name from Supabase user metadata
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user && user.user_metadata?.full_name) {
                      coachName = user.user_metadata.full_name;
                      // Save this name for future use
                      await AsyncStorage.setItem(`coach_name_${onboardingData.user_id}`, coachName);
                      console.log(`Retrieved and saved coach name from user metadata for ${onboardingData.user_id}: ${coachName}`);
                    } else {
                      console.log(`No name found for coach ${onboardingData.user_id} in onboarding data, AsyncStorage, or user metadata`);
                    }
                  } catch (supabaseError) {
                    console.log(`Error retrieving user metadata for coach ${onboardingData.user_id}:`, supabaseError);
                  }
                }
              }
              
              // Check if there's a profile picture
              const savedPhotoUri = await AsyncStorage.getItem(`profile_photo_${onboardingData.user_id}`);
              if (savedPhotoUri) {
                profilePicture = savedPhotoUri;
              }
            } catch (error) {
              console.log(`Error fetching name/photo for coach ${onboardingData.user_id}:`, error);
            }
            
            // Create coach profile from onboarding data
            const coachProfile = {
              id: onboardingData.user_id,
              name: coachName,
              email: 'coach@example.com', // Default email
              sport: onboardingData.sport,
              language: onboardingData.language, // Keep for backward compatibility
              languages: onboardingData.languages || (onboardingData.language ? [onboardingData.language] : []), // Support multiple languages
              experience: onboardingData.experience,
              expertise: onboardingData.expertise || [],
              bio: onboardingData.bio,
              completed_at: onboardingData.completed_at,
              profilePicture: profilePicture,
              // Add some default values for display
              rating: 4.8, // Default rating
              price: '$75/hr', // Default price
            };
            
            coachProfiles.push(coachProfile);
          }
        }
      } catch (error) {
        console.log(`Error parsing onboarding data for key ${key}:`, error);
      }
    }
    
    return coachProfiles;
  } catch (error) {
    console.error('Error fetching coach profiles:', error);
    return [];
  }
};

// Function to get coaches by sport
export const getCoachesBySport = async (sport) => {
  try {
    const allCoaches = await getAllCoachProfiles();
    return allCoaches.filter(coach => 
      coach.sport && coach.sport.toLowerCase() === sport.toLowerCase()
    );
  } catch (error) {
    console.error('Error fetching coaches by sport:', error);
    return [];
  }
};

// Function to get all available sports from coach data
export const getAvailableSports = async () => {
  try {
    const allCoaches = await getAllCoachProfiles();
    const sports = [...new Set(allCoaches.map(coach => coach.sport).filter(Boolean))];
    return sports;
  } catch (error) {
    console.error('Error fetching available sports:', error);
    return [];
  }
};

// Function to format experience for display
export const formatExperience = (experienceId) => {
  const experienceMap = {
    'less-than-1': 'Less than 1 year',
    '1-3': '1-3 years',
    '4-6': '4-6 years',
    '7-10': '7-10 years',
    'more-than-10': 'More than 10 years',
  };
  return experienceMap[experienceId] || experienceId;
};

// Function to format expertise for display
export const formatExpertise = (expertiseIds) => {
  const expertiseMap = {
    'technique': 'Technique Improvement',
    'fitness': 'Fitness & Conditioning',
    'mental': 'Mental Game',
    'competition': 'Competition Prep',
    'beginner': 'Beginner Training',
    'intermediate': 'Intermediate Training',
    'advanced': 'Advanced Training',
  };
  
  if (Array.isArray(expertiseIds)) {
    return expertiseIds.map(id => expertiseMap[id] || id);
  }
  return [];
};

// Function to clean up deleted or invalid coach profiles
export const cleanupDeletedProfiles = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const onboardingKeys = keys.filter(key => key.startsWith('onboarding_data_'));
    
    for (const key of onboardingKeys) {
      try {
        const onboardingDataString = await AsyncStorage.getItem(key);
        if (onboardingDataString) {
          const onboardingData = JSON.parse(onboardingDataString);
          
          // Check if the profile is marked as deleted or invalid
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
  } catch (error) {
    console.error('Error cleaning up deleted profiles:', error);
  }
};

// Function to mark a coach profile as deleted
export const markCoachProfileAsDeleted = async (userId) => {
  try {
    const key = `onboarding_data_${userId}`;
    const onboardingDataString = await AsyncStorage.getItem(key);
    
    if (onboardingDataString) {
      const onboardingData = JSON.parse(onboardingDataString);
      onboardingData.deleted = true;
      onboardingData.deleted_at = new Date().toISOString();
      
      await AsyncStorage.setItem(key, JSON.stringify(onboardingData));
      console.log(`Marked coach profile as deleted: ${userId}`);
    }
  } catch (error) {
    console.error('Error marking coach profile as deleted:', error);
  }
};

// Function to migrate existing coach names (for coaches who signed up before name saving was implemented)
export const migrateCoachNames = async () => {
  try {
    console.log('Starting coach name migration...');
    
    // Get all onboarding data keys to migrate all coach names
    const keys = await AsyncStorage.getAllKeys();
    const onboardingKeys = keys.filter(key => key.startsWith('onboarding_data_'));
    
    let migratedCount = 0;
    
    for (const key of onboardingKeys) {
      try {
        const onboardingDataString = await AsyncStorage.getItem(key);
        if (onboardingDataString) {
          const onboardingData = JSON.parse(onboardingDataString);
          
          if (onboardingData.user_id && onboardingData.completed_at && !onboardingData.deleted) {
            // Check if this coach needs name migration
            const existingName = await AsyncStorage.getItem(`coach_name_${onboardingData.user_id}`);
            const hasNameInOnboarding = onboardingData.coach_name && onboardingData.coach_name !== 'Coach';
            
            if (!existingName && !hasNameInOnboarding) {
              // Try to get the user's name from Supabase (this will only work for the current user)
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user && user.id === onboardingData.user_id && user.user_metadata?.full_name) {
                  // Save the name to AsyncStorage
                  await AsyncStorage.setItem(`coach_name_${onboardingData.user_id}`, user.user_metadata.full_name);
                  
                  // Also update the onboarding data
                  onboardingData.coach_name = user.user_metadata.full_name;
                  await AsyncStorage.setItem(key, JSON.stringify(onboardingData));
                  
                  console.log(`Migrated coach name for ${onboardingData.user_id}: ${user.user_metadata.full_name}`);
                  migratedCount++;
                }
              } catch (supabaseError) {
                console.log(`Could not migrate name for ${onboardingData.user_id} (not current user or no metadata)`);
              }
            }
          }
        }
      } catch (error) {
        console.log(`Error processing key ${key} during migration:`, error);
      }
    }
    
    console.log(`Coach name migration completed. Migrated ${migratedCount} coach names.`);
  } catch (error) {
    console.error('Error during coach name migration:', error);
  }
};

// Function to manually set a coach name (for testing/debugging)
export const setCoachName = async (userId, name) => {
  try {
    await AsyncStorage.setItem(`coach_name_${userId}`, name);
    
    // Also update the onboarding data if it exists
    const key = `onboarding_data_${userId}`;
    const onboardingDataString = await AsyncStorage.getItem(key);
    if (onboardingDataString) {
      const onboardingData = JSON.parse(onboardingDataString);
      onboardingData.coach_name = name;
      await AsyncStorage.setItem(key, JSON.stringify(onboardingData));
    }
    
    console.log(`Manually set coach name for ${userId}: ${name}`);
  } catch (error) {
    console.error('Error setting coach name:', error);
  }
};

// Function to get coach name from Supabase user metadata (for current user only)
export const getCoachNameFromMetadata = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    return null;
  } catch (error) {
    console.error('Error getting coach name from metadata:', error);
    return null;
  }
};

// Function to remove all Enoch coaches from badminton and golf
export const removeEnochCoaches = async () => {
  try {
    console.log('🔍 Starting Enoch coach removal...');
    
    // Get all coach profiles
    const keys = await AsyncStorage.getAllKeys();
    const onboardingKeys = keys.filter(key => key.startsWith('onboarding_data_'));
    
    const enochCoaches = [];
    
    // Find all Enoch coaches in badminton and golf
    for (const key of onboardingKeys) {
      try {
        const onboardingDataString = await AsyncStorage.getItem(key);
        if (onboardingDataString) {
          const onboardingData = JSON.parse(onboardingDataString);
          
          // Check if this is a completed coach profile that's not deleted
          if (onboardingData.completed_at && onboardingData.user_id && !onboardingData.deleted) {
            // Check if the coach name is "Enoch" and sport is badminton or golf
            const coachName = onboardingData.coach_name || 'Coach';
            const sport = onboardingData.sport;
            
            if (coachName.toLowerCase() === 'enoch' && (sport === 'badminton' || sport === 'golf')) {
              enochCoaches.push({
                key: key,
                userId: onboardingData.user_id,
                name: coachName,
                sport: sport,
                completedAt: onboardingData.completed_at,
                bio: onboardingData.bio
              });
            }
          }
        }
      } catch (error) {
        console.log(`Error processing key ${key}:`, error);
      }
    }
    
    console.log(`📊 Found ${enochCoaches.length} Enoch coaches:`);
    enochCoaches.forEach((coach, index) => {
      console.log(`${index + 1}. ${coach.name} - ${coach.sport} coach (User ID: ${coach.userId})`);
      console.log(`   Completed: ${coach.completedAt}`);
      console.log(`   Bio: ${coach.bio?.substring(0, 50)}...`);
      console.log('---');
    });
    
    if (enochCoaches.length === 0) {
      console.log('✅ No Enoch coaches found in badminton or golf. Nothing to remove.');
      return { removed: 0, coaches: [] };
    }
    
    console.log(`🗑️  Removing ${enochCoaches.length} Enoch coaches:`);
    enochCoaches.forEach((coach, index) => {
      console.log(`${index + 1}. ${coach.name} - ${coach.sport} (${coach.userId})`);
    });
    
    // Mark all Enoch coaches as deleted
    for (const coach of enochCoaches) {
      console.log(`Marking Enoch coach as deleted: ${coach.name} - ${coach.sport} (${coach.userId})`);
      await markCoachProfileAsDeleted(coach.userId);
    }
    
    // Clean up the deleted profiles
    await cleanupDeletedProfiles();
    
    console.log('✅ Successfully removed all Enoch coaches from badminton and golf!');
    
    return { removed: enochCoaches.length, coaches: enochCoaches };
    
  } catch (error) {
    console.error('❌ Error during Enoch coach removal:', error);
    return { removed: 0, coaches: [], error: error.message };
  }
};

// Function to remove all coach profiles (use with caution - this will remove ALL coach profiles)
export const removeAllCoachProfiles = async () => {
  try {
    console.log('🔍 Starting complete coach profile cleanup...');
    
    // Get all coach profiles
    const keys = await AsyncStorage.getAllKeys();
    const onboardingKeys = keys.filter(key => key.startsWith('onboarding_data_'));
    
    const allProfiles = [];
    
    // Find all coach profiles
    for (const key of onboardingKeys) {
      try {
        const onboardingDataString = await AsyncStorage.getItem(key);
        if (onboardingDataString) {
          const onboardingData = JSON.parse(onboardingDataString);
          
          // Check if this is a completed coach profile that's not deleted
          if (onboardingData.completed_at && onboardingData.user_id && !onboardingData.deleted) {
            const userId = onboardingData.user_id;
            const coachName = onboardingData.coach_name || 'Coach';
            const sport = onboardingData.sport;
            
            allProfiles.push({
              key: key,
              userId: userId,
              name: coachName,
              sport: sport,
              completedAt: onboardingData.completed_at,
              bio: onboardingData.bio
            });
          }
        }
      } catch (error) {
        console.log(`Error processing key ${key}:`, error);
      }
    }
    
    console.log(`📊 Found ${allProfiles.length} coach profiles:`);
    allProfiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.name} - ${profile.sport} coach (User ID: ${profile.userId})`);
      console.log(`   Completed: ${profile.completedAt}`);
      console.log(`   Bio: ${profile.bio?.substring(0, 50)}...`);
      console.log('---');
    });
    
    if (allProfiles.length === 0) {
      console.log('✅ No coach profiles found. Nothing to remove.');
      return { removed: 0, profiles: [] };
    }
    
    console.log(`🗑️  Removing ALL ${allProfiles.length} coach profiles:`);
    allProfiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.name} - ${profile.sport} (${profile.userId})`);
    });
    
    // Mark all profiles as deleted
    for (const profile of allProfiles) {
      console.log(`Marking profile as deleted: ${profile.name} - ${profile.sport} (${profile.userId})`);
      await markCoachProfileAsDeleted(profile.userId);
    }
    
    // Clean up the deleted profiles
    await cleanupDeletedProfiles();
    
    console.log('✅ Successfully removed ALL coach profiles!');
    
    return { removed: allProfiles.length, profiles: allProfiles };
    
  } catch (error) {
    console.error('❌ Error during complete profile cleanup:', error);
    return { removed: 0, profiles: [], error: error.message };
  }
};

// Function to remove orphaned coach profiles (profiles for users deleted from Supabase)
export const removeOrphanedCoachProfiles = async () => {
  try {
    console.log('🔍 Starting orphaned coach profile cleanup...');
    
    // Get all coach profiles
    const keys = await AsyncStorage.getAllKeys();
    const onboardingKeys = keys.filter(key => key.startsWith('onboarding_data_'));
    
    const orphanedProfiles = [];
    
    // Check each coach profile
    for (const key of onboardingKeys) {
      try {
        const onboardingDataString = await AsyncStorage.getItem(key);
        if (onboardingDataString) {
          const onboardingData = JSON.parse(onboardingDataString);
          
          // Check if this is a completed coach profile that's not deleted
          if (onboardingData.completed_at && onboardingData.user_id && !onboardingData.deleted) {
            const userId = onboardingData.user_id;
            const coachName = onboardingData.coach_name || 'Coach';
            const sport = onboardingData.sport;
            
            console.log(`Checking user ${userId} (${coachName} - ${sport})...`);
            
            // Check if user exists in Supabase
            const userExists = await checkUserExistsInSupabase(userId);
            
            if (!userExists) {
              orphanedProfiles.push({
                key: key,
                userId: userId,
                name: coachName,
                sport: sport,
                completedAt: onboardingData.completed_at,
                bio: onboardingData.bio
              });
            }
          }
        }
      } catch (error) {
        console.log(`Error processing key ${key}:`, error);
      }
    }
    
    console.log(`📊 Found ${orphanedProfiles.length} orphaned coach profiles:`);
    orphanedProfiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.name} - ${profile.sport} coach (User ID: ${profile.userId})`);
      console.log(`   Completed: ${profile.completedAt}`);
      console.log(`   Bio: ${profile.bio?.substring(0, 50)}...`);
      console.log('---');
    });
    
    if (orphanedProfiles.length === 0) {
      console.log('✅ No orphaned coach profiles found. All profiles have valid users.');
      return { removed: 0, profiles: [] };
    }
    
    console.log(`🗑️  Removing ${orphanedProfiles.length} orphaned coach profiles:`);
    orphanedProfiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.name} - ${profile.sport} (${profile.userId})`);
    });
    
    // Mark all orphaned profiles as deleted
    for (const profile of orphanedProfiles) {
      console.log(`Marking orphaned profile as deleted: ${profile.name} - ${profile.sport} (${profile.userId})`);
      await markCoachProfileAsDeleted(profile.userId);
    }
    
    // Clean up the deleted profiles
    await cleanupDeletedProfiles();
    
    console.log('✅ Successfully removed all orphaned coach profiles!');
    
    return { removed: orphanedProfiles.length, profiles: orphanedProfiles };
    
  } catch (error) {
    console.error('❌ Error during orphaned profile cleanup:', error);
    return { removed: 0, profiles: [], error: error.message };
  }
};

// Function to list all coach names in AsyncStorage (for debugging)
export const listCoachNames = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const nameKeys = keys.filter(key => key.startsWith('coach_name_'));
    
    console.log('Current coach names in AsyncStorage:');
    for (const key of nameKeys) {
      const name = await AsyncStorage.getItem(key);
      const userId = key.replace('coach_name_', '');
      console.log(`- ${userId}: ${name}`);
    }
  } catch (error) {
    console.error('Error listing coach names:', error);
  }
};

// Function to list all current coach profiles (for debugging)
export const listAllCoachProfiles = async () => {
  try {
    console.log('🔍 Listing all current coach profiles...');
    
    // Get all coach profiles
    const keys = await AsyncStorage.getAllKeys();
    const onboardingKeys = keys.filter(key => key.startsWith('onboarding_data_'));
    
    const allProfiles = [];
    
    // Find all coach profiles
    for (const key of onboardingKeys) {
      try {
        const onboardingDataString = await AsyncStorage.getItem(key);
        if (onboardingDataString) {
          const onboardingData = JSON.parse(onboardingDataString);
          
          // Check if this is a completed coach profile that's not deleted
          if (onboardingData.completed_at && onboardingData.user_id && !onboardingData.deleted) {
            const userId = onboardingData.user_id;
            const coachName = onboardingData.coach_name || 'Coach';
            const sport = onboardingData.sport;
            
            allProfiles.push({
              key: key,
              userId: userId,
              name: coachName,
              sport: sport,
              completedAt: onboardingData.completed_at,
              bio: onboardingData.bio
            });
          }
        }
      } catch (error) {
        console.log(`Error processing key ${key}:`, error);
      }
    }
    
    console.log(`📊 Found ${allProfiles.length} active coach profiles:`);
    allProfiles.forEach((profile, index) => {
      console.log(`${index + 1}. ${profile.name} - ${profile.sport} coach`);
      console.log(`   User ID: ${profile.userId}`);
      console.log(`   Completed: ${profile.completedAt}`);
      console.log(`   Bio: ${profile.bio?.substring(0, 50)}...`);
      console.log('---');
    });
    
    return allProfiles;
  } catch (error) {
    console.error('❌ Error listing coach profiles:', error);
    return [];
  }
};

// Function to remove specific badminton coaches by name
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

// Function to update existing onboarding data with coach names
export const updateExistingCoachNames = async () => {
  try {
    console.log('Updating existing coach onboarding data with names...');
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('No authenticated user found');
      return;
    }
    
    // Get all onboarding data keys
    const keys = await AsyncStorage.getAllKeys();
    const onboardingKeys = keys.filter(key => key.startsWith('onboarding_data_'));
    
    let updatedCount = 0;
    
    for (const key of onboardingKeys) {
      try {
        const onboardingDataString = await AsyncStorage.getItem(key);
        if (onboardingDataString) {
          const onboardingData = JSON.parse(onboardingDataString);
          
          // If this is the current user's onboarding data and they don't have a proper coach_name
          if (onboardingData.user_id === user.id && 
              (!onboardingData.coach_name || onboardingData.coach_name === 'Coach') && 
              user.user_metadata?.full_name) {
            onboardingData.coach_name = user.user_metadata.full_name;
            await AsyncStorage.setItem(key, JSON.stringify(onboardingData));
            
            // Also save to the separate name storage
            await AsyncStorage.setItem(`coach_name_${user.id}`, user.user_metadata.full_name);
            
            console.log(`Updated onboarding data for ${user.id} with name: ${user.user_metadata.full_name}`);
            updatedCount++;
          }
        }
      } catch (error) {
        console.log(`Error updating onboarding data for key ${key}:`, error);
      }
    }
    
    console.log(`Finished updating existing coach names. Updated ${updatedCount} profiles.`);
  } catch (error) {
    console.error('Error updating existing coach names:', error);
  }
};
