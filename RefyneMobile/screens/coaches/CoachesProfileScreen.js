import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
  Modal,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Clipboard,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../supabaseClient';
import { migrateCoachNames } from '../../utils/coachData';
import { STRIPE_CONNECT_CONFIG } from '../../stripeConfig';
import stripeConnectService from '../../services/stripeConnectService';

const { width, height } = Dimensions.get('window');

export default function CoachesProfileScreen({ navigation }) {
  const [coachProfile, setCoachProfile] = useState({
    name: 'Coach Name',
    email: 'coach@example.com',
    sports: [],
    languages: [],
    bio: '',
    accountType: 'Coach',
    memberSince: 'January 2024',
  });
  
  const [profilePhotoUri, setProfilePhotoUri] = useState(null);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [stripeAccountStatus, setStripeAccountStatus] = useState(null); // null, 'connected', 'pending', 'not_connected'
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  
  const [showSportModal, setShowSportModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [showBioModal, setShowBioModal] = useState(false);
  const [newLanguage, setNewLanguage] = useState('');
  const [newName, setNewName] = useState('');
  const [newBio, setNewBio] = useState('');
  const availableSports = ['Badminton', 'Golf', 'Weight lifting', 'Volleyball'];
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    // Get coach profile from Supabase and onboarding data
    const getCoachProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata) {
          // Format the actual signup date
          const signupDate = user.created_at ? formatSignupDate(user.created_at) : 'Unknown';
          
          setCoachProfile(prev => ({
            ...prev,
            name: user.user_metadata.full_name || prev.name,
            email: user.email || prev.email,
            memberSince: signupDate,
          }));

          // Check Stripe Connect status
          await checkStripeConnectStatus(user.id);
        }

        // Migration: Check for old onboarding data format and migrate it
        try {
          const oldOnboardingData = await AsyncStorage.getItem('onboarding_data');
          if (oldOnboardingData && user) {
            console.log('Found old onboarding data format, migrating...');
            await AsyncStorage.setItem(`onboarding_data_${user.id}`, oldOnboardingData);
            await AsyncStorage.removeItem('onboarding_data');
            console.log('Successfully migrated onboarding data to user-specific storage');
          }
        } catch (migrationError) {
          console.log('Error during migration:', migrationError);
        }

        // Migration: Check for old profile photo format and migrate it
        try {
          const oldProfilePhoto = await AsyncStorage.getItem('profile_photo');
          if (oldProfilePhoto && user) {
            console.log('Found old profile photo format, migrating...');
            await AsyncStorage.setItem(`profile_photo_${user.id}`, oldProfilePhoto);
            await AsyncStorage.removeItem('profile_photo');
            console.log('Successfully migrated profile photo to user-specific storage');
          }
        } catch (photoMigrationError) {
          console.log('Error during profile photo migration:', photoMigrationError);
        }

        // Fetch user-specific onboarding data from AsyncStorage
        try {
          let onboardingDataString = await AsyncStorage.getItem(`onboarding_data_${user.id}`);
          
          // Fallback: If no user-specific data, check for old format
          if (!onboardingDataString) {
            onboardingDataString = await AsyncStorage.getItem('onboarding_data');
            if (onboardingDataString) {
              console.log('Using fallback onboarding data format');
            }
          }
          
          if (onboardingDataString) {
            const onboardingData = JSON.parse(onboardingDataString);
            console.log('Fetched onboarding data for user:', user.id, onboardingData);
            
            // Update profile with sport and language from onboarding data
            setCoachProfile(prev => {
              const updatedProfile = { ...prev };
              
              // Handle sports - merge onboarding sport with any additional sports
              if (onboardingData.sport) {
                // Convert sport ID to display name
                const sportNames = {
                  'golf': 'Golf',
                  'badminton': 'Badminton', 
                  'weightlifting': 'Weight Lifting',
                  'volleyball': 'Volleyball'
                };
                const sportName = sportNames[onboardingData.sport] || onboardingData.sport;
                
                // If we have additional sports from profile updates, merge them
                if (onboardingData.sports && Array.isArray(onboardingData.sports)) {
                  updatedProfile.sports = onboardingData.sports;
                  console.log('Updated sports with profile data:', onboardingData.sports);
                } else {
                  // Use the original onboarding sport
                  updatedProfile.sports = [sportName];
                  console.log('Updated sports with onboarding data:', sportName);
                }
              } else {
                console.log('No sport found in onboarding data');
              }
              
              // Handle languages - merge onboarding language with any additional languages
              if (onboardingData.language) {
                // If we have additional languages from profile updates, use them
                if (onboardingData.languages && Array.isArray(onboardingData.languages)) {
                  updatedProfile.languages = onboardingData.languages;
                  console.log('Updated languages with profile data:', onboardingData.languages);
                } else {
                  // Use the original onboarding language
                  updatedProfile.languages = [onboardingData.language];
                  console.log('Updated languages with onboarding data:', onboardingData.language);
                }
              } else {
                console.log('No language found in onboarding data');
              }
              
              // Handle bio from onboarding data
              if (onboardingData.bio) {
                updatedProfile.bio = onboardingData.bio;
                console.log('Updated bio with onboarding data:', onboardingData.bio);
              } else {
                console.log('No bio found in onboarding data');
              }
              
              return updatedProfile;
            });
          } else {
            console.log('No onboarding data found in AsyncStorage for user:', user.id);
          }
        } catch (onboardingError) {
          console.log('Error fetching onboarding data:', onboardingError);
        }

        // Load user-specific profile photo
        try {
          let savedPhotoUri = await AsyncStorage.getItem(`profile_photo_${user.id}`);
          
          // Fallback: If no user-specific photo, check for old format
          if (!savedPhotoUri) {
            savedPhotoUri = await AsyncStorage.getItem('profile_photo');
            if (savedPhotoUri) {
              console.log('Using fallback profile photo format');
            }
          }
          
          if (savedPhotoUri) {
            setProfilePhotoUri(savedPhotoUri);
            console.log('Loaded profile photo for user:', user.id);
          } else {
            console.log('No profile photo found for user:', user.id);
          }
        } catch (photoError) {
          console.log('Error loading profile photo:', photoError);
        }
      } catch (error) {
        console.log('Error getting coach profile:', error);
      }
    };

    getCoachProfile();
    
    // Start entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('Profile screen focused, refreshing data...');
      const getCoachProfile = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.user_metadata) {
            // Format the actual signup date
            const signupDate = user.created_at ? formatSignupDate(user.created_at) : 'Unknown';
            
            setCoachProfile(prev => ({
              ...prev,
              name: user.user_metadata.full_name || prev.name,
              email: user.email || prev.email,
              memberSince: signupDate,
            }));
          }

          // Fetch user-specific onboarding data from AsyncStorage
          try {
            let onboardingDataString = await AsyncStorage.getItem(`onboarding_data_${user.id}`);
            console.log('Raw onboarding data string for user:', user.id, onboardingDataString);
            
            // Fallback: If no user-specific data, check for old format
            if (!onboardingDataString) {
              onboardingDataString = await AsyncStorage.getItem('onboarding_data');
              if (onboardingDataString) {
                console.log('Using fallback onboarding data format in useFocusEffect');
              }
            }
            
            if (onboardingDataString) {
              const onboardingData = JSON.parse(onboardingDataString);
              console.log('Parsed onboarding data:', onboardingData);
              
              // Update profile with sport and language from onboarding data
              setCoachProfile(prev => {
                const updatedProfile = { ...prev };
                
                // Handle sports - merge onboarding sport with any additional sports
                if (onboardingData.sport) {
                  // Convert sport ID to display name
                  const sportNames = {
                    'golf': 'Golf',
                    'badminton': 'Badminton', 
                    'weightlifting': 'Weight Lifting'
                  };
                  const sportName = sportNames[onboardingData.sport] || onboardingData.sport;
                  
                  // If we have additional sports from profile updates, merge them
                  if (onboardingData.sports && Array.isArray(onboardingData.sports)) {
                    updatedProfile.sports = onboardingData.sports;
                    console.log('Updated sports with profile data in useFocusEffect:', onboardingData.sports);
                  } else {
                    // Use the original onboarding sport
                    updatedProfile.sports = [sportName];
                    console.log('Updated sports with onboarding data in useFocusEffect:', sportName);
                  }
                } else {
                  console.log('No sport found in onboarding data');
                }
                
                // Handle languages - merge onboarding language with any additional languages
                if (onboardingData.language) {
                  // If we have additional languages from profile updates, use them
                  if (onboardingData.languages && Array.isArray(onboardingData.languages)) {
                    updatedProfile.languages = onboardingData.languages;
                    console.log('Updated languages with profile data in useFocusEffect:', onboardingData.languages);
                  } else {
                    // Use the original onboarding language
                    updatedProfile.languages = [onboardingData.language];
                    console.log('Updated languages with onboarding data in useFocusEffect:', onboardingData.language);
                  }
                } else {
                  console.log('No language found in onboarding data');
                }
                
                // Handle bio from onboarding data
                if (onboardingData.bio) {
                  updatedProfile.bio = onboardingData.bio;
                  console.log('Updated bio with onboarding data in useFocusEffect:', onboardingData.bio);
                } else {
                  console.log('No bio found in onboarding data');
                }
                
                console.log('Final updated profile:', updatedProfile);
                return updatedProfile;
              });
            } else {
              console.log('No onboarding data found in AsyncStorage for user:', user.id);
            }
          } catch (onboardingError) {
            console.log('Error fetching onboarding data:', onboardingError);
          }

          // Load user-specific profile photo
          try {
            let savedPhotoUri = await AsyncStorage.getItem(`profile_photo_${user.id}`);
            
            // Fallback: If no user-specific photo, check for old format
            if (!savedPhotoUri) {
              savedPhotoUri = await AsyncStorage.getItem('profile_photo');
              if (savedPhotoUri) {
                console.log('Using fallback profile photo format in useFocusEffect');
              }
            }
            
            if (savedPhotoUri) {
              setProfilePhotoUri(savedPhotoUri);
              console.log('Loaded profile photo for user in useFocusEffect:', user.id);
            } else {
              console.log('No profile photo found for user in useFocusEffect:', user.id);
            }
          } catch (photoError) {
            console.log('Error loading profile photo in useFocusEffect:', photoError);
          }
          
          // Migrate coach name if needed
          await migrateCoachNames();

          // Check Stripe Connect status
          await checkStripeConnectStatus(user.id);
        } catch (error) {
          console.log('Error getting coach profile:', error);
        }
      };

      getCoachProfile();
    }, [])
  );

  // Helper function to format date as MM/DD/YYYY
  const formatSignupDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    } catch (error) {
      console.log('Error formatting signup date:', error);
      return 'Unknown';
    }
  };

  // Check Stripe Connect status for the coach
  const checkStripeConnectStatus = async (coachId) => {
    try {
      console.log('🔍 Checking Stripe Connect status for coach:', coachId);
      console.log('🔍 Coach ID type:', typeof coachId);
      console.log('🔍 Coach ID length:', coachId ? coachId.length : 'null');
      
      // Use the rate-limited service
      const result = await stripeConnectService.checkStripeAccountStatus(coachId);
      
      console.log('🔍 Stripe Connect status response:', JSON.stringify(result, null, 2));
      
      if (result.success && result.account) {
        const account = result.account;
        console.log('📊 Account details:', {
          onboardingCompleted: account.onboardingCompleted,
          chargesEnabled: account.chargesEnabled,
          payoutsEnabled: account.payoutsEnabled,
          detailsSubmitted: account.detailsSubmitted
        });
        
        // Determine status based on account properties
        const previousStatus = stripeAccountStatus;
        console.log('🔄 Previous status:', previousStatus);
        
        if (account.onboardingCompleted && account.chargesEnabled && account.payoutsEnabled) {
          setStripeAccountStatus('connected');
          console.log('Coach Stripe account is fully connected and ready');
          
        } else if (account.stripeAccountId) {
          setStripeAccountStatus('pending');
          console.log('⏳ Coach Stripe account exists but onboarding not complete:', {
            onboardingCompleted: account.onboardingCompleted,
            chargesEnabled: account.chargesEnabled,
            payoutsEnabled: account.payoutsEnabled,
            detailsSubmitted: account.detailsSubmitted
          });
        } else {
          setStripeAccountStatus('not_connected');
          console.log('ℹ️ Coach has no Stripe account - this is normal for new coaches');
        }
      } else {
        // Handle different error types gracefully
        if (result.error && (result.error.includes('Backend server') || result.error.includes('payment server'))) {
          console.log('🔍 Backend server not available - showing not_connected state');
          setStripeAccountStatus('not_connected');
        } else if (result.error && result.error.includes('Coach account not found')) {
          console.log('ℹ️ Coach account not found - this is normal for new coaches');
          setStripeAccountStatus('not_connected');
        } else {
          setStripeAccountStatus('not_connected');
          console.log('ℹ️ No Stripe account found - this is normal for new coaches');
        }
      }
      
    } catch (error) {
      // Don't show error alerts for 404s - they're expected for new coaches
      if (error.status !== 404) {
        console.error('❌ Error checking Stripe Connect status:', error);
      } else {
        console.log('ℹ️ Coach account not found - this is normal for new coaches');
      }
      
      // If it's a rate limit error, don't change the status
      if (error.message.includes('Rate limited') || error.message.includes('429')) {
        console.log('⏳ Rate limited - keeping current status');
        return;
      }
      
      setStripeAccountStatus('not_connected');
    }
  };

  // Helper function to save profile updates to AsyncStorage
  const saveProfileUpdate = async (updatedProfile) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get existing onboarding data
        let onboardingDataString = await AsyncStorage.getItem(`onboarding_data_${user.id}`);
        let onboardingData = onboardingDataString ? JSON.parse(onboardingDataString) : {};
        
        // Update the onboarding data with new profile information
        const updatedOnboardingData = {
          ...onboardingData,
          sports: updatedProfile.sports,
          languages: updatedProfile.languages,
          updated_at: new Date().toISOString()
        };
        
        // Save back to AsyncStorage
        await AsyncStorage.setItem(`onboarding_data_${user.id}`, JSON.stringify(updatedOnboardingData));
        console.log('Profile update saved for user:', user.id);
      }
    } catch (error) {
      console.log('Error saving profile update:', error);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
            } catch (error) {
              console.log('Error signing out:', error);
            }
          },
        },
      ]
    );
  };

  const handleViewStripeAccount = () => {
    Alert.alert(
      'Stripe Account Management',
      'Your Stripe account is fully connected and ready to receive payments. You can manage your account settings, view earnings, and update payment information through the Stripe dashboard.',
      [
        {
          text: 'View Dashboard',
          onPress: () => {
            // In a real implementation, you might open the Stripe dashboard
            Alert.alert('Dashboard', 'Stripe dashboard functionality would be implemented here');
          }
        },
        { text: 'OK' }
      ]
    );
  };

  const handleRefreshStatus = async () => {
    try {
      setIsRefreshingStatus(true);
      console.log('Manually refreshing Stripe Connect status...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await checkStripeConnectStatus(user.id);
        Alert.alert(
          'Status Refreshed',
          'Your Stripe Connect account status has been updated.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error refreshing status:', error);
      Alert.alert(
        'Refresh Failed',
        'Could not refresh your account status. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  const handleConnectStripe = async () => {
    try {
      setIsConnectingStripe(true);
      console.log('Starting Stripe Connect Express onboarding process...');
      
      // Get current user data
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated. Please sign in again.');
        return;
      }

      // Get onboarding data to extract sport information
      let onboardingDataString = await AsyncStorage.getItem(`onboarding_data_${user.id}`);
      if (!onboardingDataString) {
        onboardingDataString = await AsyncStorage.getItem('onboarding_data');
      }
      
      let sport = 'badminton'; // default
      if (onboardingDataString) {
        const onboardingData = JSON.parse(onboardingDataString);
        if (onboardingData.sport) {
          sport = onboardingData.sport;
        }
      }

      // Coach data for Stripe Connect
      const coachData = {
        coachId: user.id,
        coachName: user.user_metadata?.full_name || coachProfile.name,
        email: user.email || coachProfile.email,
        sport: sport,
        country: 'CA',
        businessType: 'individual'
      };

      console.log('Sending request to backend with data:', coachData);

      // Use the centralized API service instead of hardcoded URLs
      const result = await stripeConnectService.startOnboarding(coachData);
      console.log('Response data:', result);

      if (result.success && result.onboardingLink) {
        console.log('Onboarding link received:', result.onboardingLink.url);
        
        // Open the Stripe Connect Express onboarding link
        const onboardingUrl = result.onboardingLink.url;
        console.log('Attempting to open URL:', onboardingUrl);
        
        // Try multiple methods to open the URL
        let urlOpened = false;
        
        try {
          // Method 1: Try canOpenURL + Linking.openURL
          console.log('Checking if URL can be opened...');
          const canOpen = await Linking.canOpenURL(onboardingUrl);
          console.log('Can open URL:', canOpen);
          
          if (canOpen) {
            console.log('Opening Stripe Connect Express onboarding URL...');
            await Linking.openURL(onboardingUrl);
            console.log('URL opened successfully');
            urlOpened = true;
            setStripeAccountStatus('pending');
            
            // Show success message with instructions
            Alert.alert(
              'Stripe Connect Onboarding Started',
              'Your browser should now open with the Stripe Connect onboarding process.\n\nThis will take you to the "Refyne Sandbox" onboarding page where you can:\n• Set up your business information\n• Provide your bank account details\n• Complete identity verification\n• Start receiving payments\n\nReturn to this app when finished!',
              [{ text: 'Got it!' }]
            );
          }
        } catch (linkingError) {
          console.error('Linking failed:', linkingError);
        }
        
        // Method 2: If canOpenURL failed, try direct open
        if (!urlOpened) {
          try {
            console.log('Trying direct URL open...');
            await Linking.openURL(onboardingUrl);
            console.log('Direct URL open successful');
            urlOpened = true;
            setStripeAccountStatus('pending');
            
            Alert.alert(
              'Stripe Connect Onboarding Started',
              'Your browser should now open with the Stripe Connect onboarding process.\n\nThis will take you to the "Refyne Sandbox" onboarding page where you can:\n• Set up your business information\n• Provide your bank account details\n• Complete identity verification\n• Start receiving payments\n\nReturn to this app when finished!',
              [{ text: 'Got it!' }]
            );
          } catch (directOpenError) {
            console.error('Direct URL open failed:', directOpenError);
          }
        }
        
        // Method 3: If all else fails, show manual instructions
        if (!urlOpened) {
          console.error('All URL opening methods failed');
          Alert.alert(
            'Open Stripe Onboarding',
            `Please open this URL in your browser to complete Stripe setup:\n\n${onboardingUrl}\n\nCopy this URL and paste it into your browser to continue.`,
            [
              {
                text: 'Copy URL',
                onPress: () => {
                  try {
                    Clipboard.setString(onboardingUrl);
                    Alert.alert('URL Copied', 'The Stripe onboarding URL has been copied to your clipboard.');
                  } catch (clipboardError) {
                    console.error('Clipboard error:', clipboardError);
                    Alert.alert('Error', 'Could not copy URL to clipboard. Please manually copy the URL above.');
                  }
                }
              },
              { text: 'OK' }
            ]
          );
        }
      } else {
        console.error('Backend error:', result);
        Alert.alert(
          'Setup Error',
          result.error || result.message || 'Failed to start Stripe onboarding. Please try again or contact support.',
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('Error in Stripe connection process:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        details: error.details
      });
      
      // More specific error handling
      let errorMessage = 'An unexpected error occurred while starting Stripe onboarding.';
      let errorTitle = 'Connection Error';
      
      if (error.status === 500) {
        errorTitle = 'Server Error';
        errorMessage = error.message || 'The server encountered an error while processing your request. This could be due to:\n\n• Stripe API configuration issue\n• Database connection problem\n• Missing required information\n\nPlease try again or contact support if the issue persists.';
      } else if (error.status === 400) {
        errorTitle = 'Validation Error';
        errorMessage = error.message || 'Please check that all required information is provided correctly.';
      } else if (error.message.includes('No working backend URL found')) {
        errorMessage = 'Backend server is not accessible. Please check your network connection and ensure the backend server is running.';
      } else if (error.message.includes('Request timeout')) {
        errorMessage = 'Request timed out. Please check your internet connection and try again.';
      } else if (error.message.includes('Network request failed')) {
        errorMessage = 'Network connection failed. Please check your internet connection and ensure the backend server is running.';
      } else if (error.message.includes('Server error')) {
        errorTitle = 'Server Error';
        errorMessage = error.message;
      } else if (error.message.includes('Validation error')) {
        errorTitle = 'Validation Error';
        errorMessage = error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(errorTitle, errorMessage, [{ text: 'OK' }]);
    } finally {
      setIsConnectingStripe(false);
    }
  };

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing functionality would be implemented here');
  };

  const handleChangeProfilePhoto = async () => {
    try {
      // Get current user to associate photo with their ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated. Please sign in again.');
        return;
      }

      // Request permission to access media library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to change your profile photo.'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        
        // Save profile photo URI to user-specific AsyncStorage
        await AsyncStorage.setItem(`profile_photo_${user.id}`, photoUri);
        console.log('Profile photo saved for user:', user.id);
        
        // Update local state
        setProfilePhotoUri(photoUri);
        Alert.alert('Success', 'Profile photo updated successfully!');
      }
    } catch (error) {
      console.log('Error picking image:', error);
      Alert.alert('Error', 'Failed to update profile photo. Please try again.');
    }
  };

  const handleChangeName = () => {
    setNewName(coachProfile.name);
    setShowNameModal(true);
  };

  const handleEditBio = () => {
    setNewBio(coachProfile.bio || '');
    setShowBioModal(true);
  };

  const handleSaveName = async () => {
    if (newName.trim() === '') {
      Alert.alert('Error', 'Please enter a valid name');
      return;
    }

    try {
      console.log('Updating name to:', newName.trim());
      
      // Update the name in Supabase user metadata
      const { data, error } = await supabase.auth.updateUser({
        data: { full_name: newName.trim() }
      });

      if (error) {
        console.log('Error updating name:', error);
        Alert.alert('Error', 'Failed to update name. Please try again.');
        return;
      }

      console.log('Name update successful:', data);

      // Update local state
      setCoachProfile(prev => ({
        ...prev,
        name: newName.trim()
      }));
      
      // Also save the name to AsyncStorage for other users to access
      try {
        await AsyncStorage.setItem(`coach_name_${data.user.id}`, newName.trim());
        console.log('Saved coach name to AsyncStorage for other users to access');
      } catch (storageError) {
        console.log('Error saving coach name to AsyncStorage:', storageError);
      }
      
      setNewName('');
      setShowNameModal(false);
      Alert.alert('Success', 'Name updated successfully!');
    } catch (error) {
      console.log('Error updating name:', error);
      Alert.alert('Error', 'Failed to update name. Please try again.');
    }
  };

  const handleSaveBio = async () => {
    try {
      console.log('Updating bio to:', newBio.trim());
      
      // Update local state
      setCoachProfile(prev => ({
        ...prev,
        bio: newBio.trim()
      }));
      
      // Save bio to AsyncStorage
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Get existing onboarding data
          let onboardingDataString = await AsyncStorage.getItem(`onboarding_data_${user.id}`);
          let onboardingData = onboardingDataString ? JSON.parse(onboardingDataString) : {};
          
          // Update the onboarding data with new bio
          const updatedOnboardingData = {
            ...onboardingData,
            bio: newBio.trim(),
            updated_at: new Date().toISOString()
          };
          
          // Save back to AsyncStorage
          await AsyncStorage.setItem(`onboarding_data_${user.id}`, JSON.stringify(updatedOnboardingData));
          console.log('Bio update saved for user:', user.id);
        }
      } catch (storageError) {
        console.log('Error saving bio to AsyncStorage:', storageError);
      }
      
      setNewBio('');
      setShowBioModal(false);
      Alert.alert('Success', 'Bio updated successfully!');
    } catch (error) {
      console.log('Error updating bio:', error);
      Alert.alert('Error', 'Failed to update bio. Please try again.');
    }
  };

  const handleAddSport = () => {
    setShowSportModal(true);
  };

  const handleSelectSport = async (sport) => {
    if (!coachProfile.sports.includes(sport)) {
      const updatedProfile = {
        ...coachProfile,
        sports: [...coachProfile.sports, sport]
      };
      
      setCoachProfile(updatedProfile);
      await saveProfileUpdate(updatedProfile);
    }
    setShowSportModal(false);
  };

  const isSportSelected = (sport) => {
    return coachProfile.sports.includes(sport);
  };

  const handleRemoveSport = (sportToRemove) => {
    Alert.alert(
      'Remove Sport',
      `Are you sure you want to remove ${sportToRemove} from your profile?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updatedProfile = {
              ...coachProfile,
              sports: coachProfile.sports.filter(sport => sport !== sportToRemove)
            };
            
            setCoachProfile(updatedProfile);
            await saveProfileUpdate(updatedProfile);
          },
        },
      ]
    );
  };

  const handleAddLanguage = () => {
    setShowLanguageModal(true);
  };

  const handleAddNewLanguage = async () => {
    if (newLanguage.trim() === '') {
      Alert.alert('Error', 'Please enter a language');
      return;
    }
    
    if (coachProfile.languages.includes(newLanguage.trim())) {
      Alert.alert('Error', 'This language is already added');
      return;
    }

    const updatedProfile = {
      ...coachProfile,
      languages: [...coachProfile.languages, newLanguage.trim()]
    };
    
    setCoachProfile(updatedProfile);
    await saveProfileUpdate(updatedProfile);
    
    setNewLanguage('');
    setShowLanguageModal(false);
  };

  const handleRemoveLanguage = (languageToRemove) => {
    Alert.alert(
      'Remove Language',
      `Are you sure you want to remove ${languageToRemove} from your profile?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updatedProfile = {
              ...coachProfile,
              languages: coachProfile.languages.filter(language => language !== languageToRemove)
            };
            
            setCoachProfile(updatedProfile);
            await saveProfileUpdate(updatedProfile);
          },
        },
      ]
    );
  };

  const ProfileSection = ({ title, children, icon }) => (
    <Animated.View 
      style={[
        styles.profileSection,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          {icon && <Ionicons name={icon} size={20} color="#0C295C" />}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
      </View>
      {children}
    </Animated.View>
  );

  const ProfileItem = ({ icon, title, subtitle, onPress, rightElement }) => (
    <TouchableOpacity 
      style={styles.profileItem} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.profileItemLeft}>
        <View style={styles.profileItemIcon}>
          <Ionicons name={icon} size={20} color="#0C295C" />
        </View>
        <View style={styles.profileItemContent}>
          <Text style={styles.profileItemTitle}>{title}</Text>
          {subtitle && <Text style={styles.profileItemSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {rightElement || (
        onPress && <Ionicons name="chevron-forward" size={20} color="#90A4AE" />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          <LinearGradient
            colors={['#0C295C', '#1A4A7A', '#2D5A8A']}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Decorative dots */}
            <View style={styles.decorativeDot1} />
            <View style={styles.decorativeDot2} />
            <View style={styles.decorativeDot3} />
            <View style={styles.decorativeDot4} />
            <View style={styles.decorativeDot5} />
            
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Profile</Text>
              <Text style={styles.headerSubtitle}>
                Manage your coaching profile and settings
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Profile Overview */}
          <Animated.View 
            style={[
              styles.profileOverview,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFF']}
              style={styles.profileOverviewGradient}
            >
              <View style={styles.profileAvatar}>
                {profilePhotoUri ? (
                  <Image 
                    source={{ uri: profilePhotoUri }} 
                    style={styles.profileAvatarImage}
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {coachProfile.name.split(' ').map(n => n[0]).join('')}
                  </Text>
                )}
              </View>
              
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{coachProfile.name}</Text>
                <Text style={styles.profileEmail}>{coachProfile.email}</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Account Info */}
          <View style={styles.accountContainer}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="star" size={20} color="#0C295C" />
                <Text style={styles.infoLabel}>Account type</Text>
                <Text style={styles.infoValue}>{coachProfile.accountType}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="calendar" size={20} color="#0C295C" />
                <Text style={styles.infoLabel}>Member since</Text>
                <Text style={styles.infoValue}>{coachProfile.memberSince}</Text>
              </View>
            </View>
          </View>

          {/* Sports & Specialties */}
          <ProfileSection title="Sport" icon="trophy">
            <View style={styles.profileCard}>
              <View style={styles.sportsContainer}>
                {coachProfile.sports.map((sport, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.sportTag}
                    onLongPress={() => handleRemoveSport(sport)}
                    delayLongPress={500}
                  >
                    <Text style={styles.sportTagText}>{sport}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity 
                  style={styles.addSportButton}
                  onPress={handleAddSport}
                >
                  <Ionicons name="add" size={16} color="#0C295C" />
                  <Text style={styles.addSportText}>Add Sport</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ProfileSection>

          {/* Languages */}
          <ProfileSection title="Languages" icon="language">
            <View style={styles.profileCard}>
              <View style={styles.sportsContainer}>
                {coachProfile.languages.map((language, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.sportTag}
                    onLongPress={() => handleRemoveLanguage(language)}
                    delayLongPress={500}
                  >
                    <Text style={styles.sportTagText}>{language}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity 
                  style={styles.addSportButton}
                  onPress={handleAddLanguage}
                >
                  <Ionicons name="add" size={16} color="#0C295C" />
                  <Text style={styles.addSportText}>Add Language</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ProfileSection>

          {/* Bio Section */}
          <ProfileSection title="Bio" icon="document-text">
            <View style={styles.profileCard}>
              <View style={styles.bioContainer}>
                {coachProfile.bio ? (
                  <View style={styles.bioContent}>
                    <Text style={styles.bioText}>{coachProfile.bio}</Text>
                    <TouchableOpacity 
                      style={styles.editBioButton}
                      onPress={handleEditBio}
                    >
                      <Ionicons name="create-outline" size={16} color="#0C295C" />
                      <Text style={styles.editBioText}>Edit Bio</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.noBioContainer}>
                    <Text style={styles.noBioText}>No bio added yet</Text>
                    <TouchableOpacity 
                      style={styles.addBioButton}
                      onPress={handleEditBio}
                    >
                      <Ionicons name="add" size={16} color="#0C295C" />
                      <Text style={styles.addBioText}>Add Bio</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </ProfileSection>



          {/* Account Actions */}
          <ProfileSection title="Account Settings" icon="shield-checkmark">
            <View style={styles.profileCard}>
              <ProfileItem
                icon="key"
                title="Change Password"
                onPress={() => Alert.alert('Change Password', 'Password change functionality would be implemented here')}
              />
              <ProfileItem
                icon="person"
                title="Change Name"
                onPress={handleChangeName}
              />
              <ProfileItem
                icon="camera"
                title="Add or change profile photo"
                onPress={handleChangeProfilePhoto}
              />
            </View>
          </ProfileSection>

          {/* Sign Out */}
          <Animated.View 
            style={[
              styles.signOutSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.signOutButton}
              onPress={handleSignOut}
            >
              <LinearGradient
                colors={['#F44336', '#E57373']}
                style={styles.signOutGradient}
              >
                <Ionicons name="log-out" size={20} color="white" />
                <Text style={styles.signOutText}>Sign Out</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Sport Selection Modal */}
      <Modal
        visible={showSportModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Sport</Text>
              <TouchableOpacity
                onPress={() => setShowSportModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.sportList}>
              {availableSports.map((sport, index) => {
                const isSelected = isSportSelected(sport);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.sportOption,
                      isSelected && styles.sportOptionDisabled
                    ]}
                    onPress={() => !isSelected && handleSelectSport(sport)}
                    disabled={isSelected}
                  >
                    <Text style={[
                      styles.sportOptionText,
                      isSelected && styles.sportOptionTextDisabled
                    ]}>
                      {sport}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color="#90A4AE" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Language Input Modal */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Language</Text>
              <TouchableOpacity
                onPress={() => setShowLanguageModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Enter language name:</Text>
              <TextInput
                style={styles.languageInput}
                placeholder="e.g., Spanish, French, Mandarin"
                placeholderTextColor="#90A4AE"
                value={newLanguage}
                onChangeText={setNewLanguage}
                autoFocus={true}
                returnKeyType="done"
                onSubmitEditing={handleAddNewLanguage}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => {
                  setNewLanguage('');
                  setShowLanguageModal(false);
                }}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addModalButton}
                onPress={handleAddNewLanguage}
              >
                <LinearGradient
                  colors={['#0C295C', '#1A4A7A']}
                  style={styles.addModalButtonGradient}
                >
                  <Text style={styles.addModalButtonText}>Add Language</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Name Change Modal */}
      <Modal
        visible={showNameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Name</Text>
              <TouchableOpacity
                onPress={() => setShowNameModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Enter your new name:</Text>
              <TextInput
                style={styles.languageInput}
                placeholder="Enter your name"
                placeholderTextColor="#90A4AE"
                value={newName}
                onChangeText={setNewName}
                autoFocus={true}
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => {
                  setNewName('');
                  setShowNameModal(false);
                }}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addModalButton}
                onPress={handleSaveName}
              >
                <LinearGradient
                  colors={['#0C295C', '#1A4A7A']}
                  style={styles.addModalButtonGradient}
                >
                  <Text style={styles.addModalButtonText}>Save Name</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bio Edit Modal */}
      <Modal
        visible={showBioModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBioModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView 
            contentContainerStyle={styles.modalScrollContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Bio</Text>
                <TouchableOpacity
                  onPress={() => setShowBioModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Tell us about your coaching experience:</Text>
                <TextInput
                  style={styles.bioInput}
                  placeholder="Share your coaching journey, achievements, and what makes you passionate about coaching..."
                  placeholderTextColor="#90A4AE"
                  value={newBio}
                  onChangeText={setNewBio}
                  multiline
                  textAlignVertical="top"
                  autoFocus={true}
                  maxLength={500}
                />
                <Text style={styles.characterCount}>{newBio.length}/500 characters</Text>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelModalButton}
                  onPress={() => {
                    setNewBio('');
                    setShowBioModal(false);
                  }}
                >
                  <Text style={styles.cancelModalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addModalButton}
                  onPress={handleSaveBio}
                >
                  <LinearGradient
                    colors={['#0C295C', '#1A4A7A']}
                    style={styles.addModalButtonGradient}
                  >
                    <Text style={styles.addModalButtonText}>Save Bio</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    marginBottom: 8,
  },
  headerGradient: {
    paddingTop: 90,
    paddingBottom: 60,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  headerContent: {
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: width * 0.08,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
  },
  mainContent: {
    padding: 24,
    paddingTop: 16,
  },
  profileOverview: {
    marginBottom: 32,
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  profileOverviewGradient: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(12, 41, 92, 0.1)',
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0C295C',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  avatarText: {
    fontSize: 32,
    fontFamily: 'Rubik-Bold',
    color: 'white',
  },
  profileAvatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileInfo: {
    alignItems: 'center',
    width: '100%',
  },
  profileName: {
    fontSize: width * 0.06,
    fontFamily: 'Rubik-Bold',
    color: '#0C295C',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    marginBottom: 20,
  },
  editProfileButton: {
    borderRadius: 16,
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  editProfileGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  editProfileText: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-SemiBold',
    color: 'white',
    marginLeft: 8,
  },
  accountContainer: {
    marginBottom: 25,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoLabel: {
    flex: 1,
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#0C295C',
    marginLeft: 15,
  },
  infoValue: {
    fontSize: width * 0.04,
    fontFamily: 'Rubik-Medium',
    color: '#0C295C',
  },
  profileSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: width * 0.05,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginLeft: 8,
  },
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(12, 41, 92, 0.08)',
  },
  profileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(12, 41, 92, 0.06)',
  },
  profileItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(12, 41, 92, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileItemContent: {
    flex: 1,
  },
  profileItemTitle: {
    fontSize: width * 0.045,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginBottom: 2,
  },
  profileItemSubtitle: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
  },
  sportsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 12,
  },
  sportTag: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  sportTagText: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-SemiBold',
    color: '#FF6B35',
  },
  addSportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(12, 41, 92, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(12, 41, 92, 0.2)',
    borderStyle: 'dashed',
  },
  addSportText: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-SemiBold',
    color: '#0C295C',
    marginLeft: 4,
  },
  signOutSection: {
    marginTop: 16,
    marginBottom: 32,
  },
  signOutButton: {
    borderRadius: 16,
    shadowColor: '#F44336',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  signOutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  signOutText: {
    fontSize: width * 0.045,
    fontFamily: 'Manrope-SemiBold',
    color: 'white',
    marginLeft: 8,
  },
  // Decorative dots for header
  decorativeDot1: {
    position: 'absolute',
    top: 20,
    right: 60,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  decorativeDot2: {
    position: 'absolute',
    top: 40,
    right: 100,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  decorativeDot3: {
    position: 'absolute',
    top: 60,
    right: 80,
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  decorativeDot4: {
    position: 'absolute',
    top: 80,
    right: 120,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  decorativeDot5: {
    position: 'absolute',
    top: 100,
    right: 50,
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: width * 0.85,
    maxWidth: 400,
    maxHeight: height * 0.8,
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: width * 0.05,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
  },
  closeButton: {
    padding: 4,
  },
  sportList: {
    gap: 12,
  },
  sportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#F8FAFF',
    borderWidth: 1,
    borderColor: 'rgba(12, 41, 92, 0.1)',
  },
  sportOptionDisabled: {
    backgroundColor: '#F5F7FA',
    borderColor: 'rgba(12, 41, 92, 0.05)',
  },
  sportOptionText: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Medium',
    color: '#0C295C',
  },
  sportOptionTextDisabled: {
    color: '#90A4AE',
  },
  // Language modal styles
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Medium',
    color: '#0C295C',
    marginBottom: 12,
  },
  languageInput: {
    borderWidth: 1,
    borderColor: 'rgba(12, 41, 92, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#0C295C',
    backgroundColor: '#F8FAFF',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(12, 41, 92, 0.2)',
    alignItems: 'center',
  },
  cancelModalButtonText: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-SemiBold',
    color: '#64748B',
  },
  addModalButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addModalButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  addModalButtonText: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-SemiBold',
    color: 'white',
  },
  // Bio section styles
  bioContainer: {
    padding: 20,
  },
  bioContent: {
    marginBottom: 16,
  },
  bioText: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#0C295C',
    lineHeight: 22,
    marginBottom: 16,
  },
  editBioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(12, 41, 92, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(12, 41, 92, 0.2)',
    alignSelf: 'flex-start',
  },
  editBioText: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-SemiBold',
    color: '#0C295C',
    marginLeft: 4,
  },
  noBioContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noBioText: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    marginBottom: 16,
  },
  addBioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(12, 41, 92, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(12, 41, 92, 0.2)',
    borderStyle: 'dashed',
  },
  addBioText: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-SemiBold',
    color: '#0C295C',
    marginLeft: 4,
  },
  // Bio modal styles
  bioInput: {
    borderWidth: 1,
    borderColor: 'rgba(12, 41, 92, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#0C295C',
    backgroundColor: '#F8FAFF',
    minHeight: 120,
    maxHeight: 200,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Medium',
    color: '#64748B',
    textAlign: 'right',
    marginTop: 8,
  },
  // Loading indicator styles
  loadingIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  loadingText: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-SemiBold',
    color: '#0C295C',
  },
  // Status indicator styles
  connectedIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pendingIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  // Connected account styles
  connectedAccountContainer: {
    backgroundColor: '#F0FDF4',
    borderColor: '#059669',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  connectedAccountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  connectedAccountIcon: {
    marginRight: 16,
  },
  connectedAccountInfo: {
    flex: 1,
  },
  connectedAccountTitle: {
    fontSize: width * 0.045,
    fontFamily: 'Rubik-Bold',
    color: '#059669',
    marginBottom: 4,
  },
  connectedAccountSubtitle: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Regular',
    color: '#047857',
  },
  connectedAccountBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  connectedAccountBadgeText: {
    fontSize: width * 0.03,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  connectedAccountButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  connectedAccountButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderColor: '#059669',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  refreshButton: {
    opacity: 1,
  },
  connectedAccountButtonText: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-SemiBold',
    color: '#059669',
    marginLeft: 8,
    lineHeight: 20,
  },
  refreshStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  refreshStatusButtonText: {
    fontSize: width * 0.032,
    fontFamily: 'Manrope-Medium',
    color: '#64748B',
    marginLeft: 6,
  },
});
