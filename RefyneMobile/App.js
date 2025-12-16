import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet, AppState, DeviceEventEmitter } from 'react-native';
import { useFonts } from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { 
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_600SemiBold,
  Rubik_700Bold,
} from '@expo-google-fonts/rubik';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { supabase } from './supabaseClient';
import AuthScreen from './screens/AuthScreen';
import PlayerNavigator from './navigation/PlayerNavigator';
import CoachNavigator from './navigation/CoachNavigator';
import CoachOnboardingNavigator from './navigation/CoachOnboardingNavigator';
import SplashScreen from './components/SplashScreen';
import { STRIPE_CONFIG } from './stripeConfig';

// Conditionally import StripeProvider
let StripeProvider = null;
try {
  const stripeModule = require('@stripe/stripe-react-native');
  StripeProvider = stripeModule.StripeProvider;
} catch (error) {
  console.warn('Stripe Provider not available:', error);
  // Create a no-op provider component
  StripeProvider = ({ children }) => children;
}

const Stack = createNativeStackNavigator();

function HomeScreen() {
  return (
    <View style={styles.container}>
      {/* Placeholder for main app content */}
    </View>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('player'); // Default to player, can be 'player' or 'coach'
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showSplash, setShowSplash] = useState(true);
  
  const [fontsLoaded] = useFonts({
    'Rubik-Regular': Rubik_400Regular,
    'Rubik-Medium': Rubik_500Medium,
    'Rubik-SemiBold': Rubik_600SemiBold,
    'Rubik-Bold': Rubik_700Bold,
    'Manrope-Regular': Manrope_400Regular,
    'Manrope-Medium': Manrope_500Medium,
    'Manrope-SemiBold': Manrope_600SemiBold,
    'Manrope-Bold': Manrope_700Bold,
  });

  // Function to check onboarding status from AsyncStorage
  const checkOnboardingStatus = async () => {
    try {
      const storedCompletion = await AsyncStorage.getItem('onboarding_completed');
      const storedRole = await AsyncStorage.getItem('user_role');
      
      if (storedCompletion === 'true') {
        setOnboardingCompleted(true);
        if (storedRole) {
          setUserRole(storedRole);
        }
        console.log('Onboarding status updated from AsyncStorage');
        // Force a re-render by updating the refresh key
        setRefreshKey(prev => prev + 1);
      } else {
        // If no completion found in AsyncStorage, set to false
        setOnboardingCompleted(false);
        console.log('No onboarding completion found, setting to false');
      }
    } catch (error) {
      console.log('Error checking onboarding status:', error);
    }
  };

  useEffect(() => {
    // Get initial session
    const initializeApp = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      // Check user role from metadata
      let userRole = 'player'; // default
      
      if (session?.user?.user_metadata?.role) {
        userRole = session.user.user_metadata.role;
        console.log('User role detected:', userRole);
      } else if (session?.user?.user_metadata?.user_type) {
        // Fallback to user_type field
        userRole = session.user.user_metadata.user_type.toLowerCase();
        console.log('User role detected from user_type:', userRole);
      } else {
        // Check AsyncStorage for user role
        try {
          const storedRole = await AsyncStorage.getItem('user_role');
          if (storedRole) {
            userRole = storedRole;
            console.log('User role detected from AsyncStorage:', userRole);
          } else {
            console.log('No role found, defaulting to player');
          }
        } catch (error) {
          console.log('Error reading user role from AsyncStorage:', error);
        }
      }
      
      setUserRole(userRole);
      
      // Check onboarding completion status
      let isOnboardingCompleted = false;
      
      // For coaches, determine if they need onboarding based on sign-in vs sign-up
      if (userRole === 'coach' && session?.user) {
        try {
          // Check if this is explicitly a new coach signup
          const isNewCoachSignup = await AsyncStorage.getItem('is_new_coach_signup');
          console.log('Is new coach signup:', isNewCoachSignup);
          
          if (isNewCoachSignup === 'true') {
            // This is a SIGN-UP, they need onboarding
            isOnboardingCompleted = false;
            console.log('New coach SIGN-UP detected, onboarding required');
          } else {
            // For ALL other cases (sign-in, existing user, returning user), go to coach home
            isOnboardingCompleted = true;
            console.log('Coach user detected - going to coach home (not new signup)');
            
            // Clear any signin flags and set completion flag
            await AsyncStorage.removeItem('is_signin');
            await AsyncStorage.setItem('onboarding_completed', 'true');
          }
        } catch (error) {
          console.log('Error checking coach signin/signup status:', error);
          // Default to coach home for any error (safer for existing users)
          isOnboardingCompleted = true;
          await AsyncStorage.setItem('onboarding_completed', 'true');
        }
      }
      
      setOnboardingCompleted(isOnboardingCompleted);
      console.log('Final onboarding completed status:', isOnboardingCompleted);
      
      setLoading(false);
    };
    
    initializeApp();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      // Check user role from metadata
      let userRole = 'player'; // default
      
      if (session?.user?.user_metadata?.role) {
        userRole = session.user.user_metadata.role;
        console.log('User role detected on auth change:', userRole);
      } else if (session?.user?.user_metadata?.user_type) {
        // Fallback to user_type field
        userRole = session.user.user_metadata.user_type.toLowerCase();
        console.log('User role detected from user_type on auth change:', userRole);
      } else {
        // Check AsyncStorage for user role
        try {
          const storedRole = await AsyncStorage.getItem('user_role');
          if (storedRole) {
            userRole = storedRole;
            console.log('User role detected from AsyncStorage on auth change:', userRole);
          } else {
            console.log('No role found on auth change, defaulting to player');
          }
        } catch (error) {
          console.log('Error reading user role from AsyncStorage on auth change:', error);
        }
      }
      
      setUserRole(userRole);
      
      // Check onboarding completion status
      let isOnboardingCompleted = false;
      
      // For coaches, determine if they need onboarding based on sign-in vs sign-up
      if (userRole === 'coach' && session?.user) {
        try {
          // Check if this is explicitly a new coach signup
          const isNewCoachSignup = await AsyncStorage.getItem('is_new_coach_signup');
          console.log('Is new coach signup on auth change:', isNewCoachSignup);
          
          if (isNewCoachSignup === 'true') {
            // This is a SIGN-UP, they need onboarding
            isOnboardingCompleted = false;
            console.log('New coach SIGN-UP detected on auth change, onboarding required');
          } else {
            // For ALL other cases (sign-in, existing user, returning user), go to coach home
            isOnboardingCompleted = true;
            console.log('Coach user detected on auth change - going to coach home (not new signup)');
            
            // Clear any signin flags and set completion flag
            await AsyncStorage.removeItem('is_signin');
            await AsyncStorage.setItem('onboarding_completed', 'true');
          }
        } catch (error) {
          console.log('Error checking coach signin/signup status on auth change:', error);
          // Default to coach home for any error (safer for existing users)
          isOnboardingCompleted = true;
          await AsyncStorage.setItem('onboarding_completed', 'true');
        }
      }
      
      setOnboardingCompleted(isOnboardingCompleted);
      console.log('Final onboarding completed status on auth change:', isOnboardingCompleted);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Add app state listener to check onboarding status when app comes into focus
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        checkOnboardingStatus();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Add event listener for onboarding completion
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('onboardingCompleted', () => {
      console.log('Received onboarding completion event');
      // Force immediate state update
      setOnboardingCompleted(true);
      setUserRole('coach');
      setRefreshKey(prev => prev + 1);
      
      // Set up multiple checks to ensure navigation happens
      const checkInterval = setInterval(async () => {
        try {
          const storedCompletion = await AsyncStorage.getItem('onboarding_completed');
          const storedRole = await AsyncStorage.getItem('user_role');
          
          if (storedCompletion === 'true') {
            setOnboardingCompleted(true);
            if (storedRole) {
              setUserRole(storedRole);
            }
            console.log('Confirmed onboarding completion from AsyncStorage');
            clearInterval(checkInterval);
          }
        } catch (error) {
          console.log('Error confirming onboarding status:', error);
        }
      }, 100);
      
      // Clear the interval after 3 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
      }, 3000);
    });

    return () => subscription?.remove();
  }, []);

  // Clear onboarding status when user signs out
  useEffect(() => {
    if (!session) {
      // User signed out, clear onboarding status
      setOnboardingCompleted(false);
      setUserRole('player');
      // Clear AsyncStorage
      AsyncStorage.removeItem('onboarding_completed');
      AsyncStorage.removeItem('onboarding_data');
      AsyncStorage.removeItem('user_role');
      AsyncStorage.removeItem('is_new_coach_signup');
      AsyncStorage.removeItem('is_signin');
      console.log('User signed out, cleared onboarding status and all flags');
    }
  }, [session]);

  // Show splash screen first
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (loading || !fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0C295C" />
      </View>
    );
  }

  // Debug logging for navigation decisions
  console.log('Navigation Debug:', {
    session: !!session,
    userRole,
    onboardingCompleted,
    refreshKey
  });

  // Additional debug logging for coaches
  if (userRole === 'coach' && session) {
    console.log('Coach Navigation Decision:', {
      hasSession: !!session,
      userRole,
      onboardingCompleted,
      willShowOnboarding: !onboardingCompleted,
      willShowCoachHome: onboardingCompleted
    });
  }

  // Determine which screen to show
  const getInitialScreen = () => {
    if (!session) {
      return 'Auth';
    }
    if (userRole === 'coach') {
      return onboardingCompleted ? 'CoachApp' : 'CoachOnboarding';
    }
    return 'PlayerApp';
  };

  const initialRoute = getInitialScreen();

  // Wrap content with StripeProvider only if Stripe is available and configured
  const AppContent = (
    <StripeProvider publishableKey={STRIPE_CONFIG.publishableKey}>
      <NavigationContainer key={`nav-${initialRoute}-${refreshKey}`}>
        <Stack.Navigator 
          initialRouteName={initialRoute}
          screenOptions={{ 
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen 
            name="Auth" 
            component={AuthScreen}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="PlayerApp" 
            component={PlayerNavigator}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen 
            name="CoachApp" 
            component={CoachNavigator}
            options={{
              headerShown: false,
              animation: 'fade',
            }}
          />
          <Stack.Screen 
            name="CoachOnboarding" 
            component={CoachOnboardingNavigator}
            options={{
              headerShown: false,
              gestureEnabled: false,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </StripeProvider>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {AppContent}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
});