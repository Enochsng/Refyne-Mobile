import React, { Suspense } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Dimensions, View, Text, ActivityIndicator } from 'react-native';

import HomeScreen from '../screens/player/HomeScreen';
import ExploreSportsScreen from '../screens/player/ExploreSportsScreen';
import CoachesScreen from '../screens/player/CoachesScreen';
import CoachFeedbackScreen from '../screens/player/CoachFeedbackScreen';
import ProfileScreen from '../screens/player/ProfileScreen';

// Lazy load Stripe-dependent screens using React.lazy to prevent initialization errors
const PaywallScreen = React.lazy(() => {
  try {
    return import('../screens/player/PaywallScreen');
  } catch (error) {
    console.warn('PaywallScreen not available:', error);
    return { default: () => (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Payment screen not available</Text>
      </View>
    )};
  }
});

const StripePaymentScreen = React.lazy(() => {
  try {
    return import('../screens/player/StripePaymentScreen');
  } catch (error) {
    console.warn('StripePaymentScreen not available:', error);
    return { default: () => (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Payment screen not available</Text>
      </View>
    )};
  }
});

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const { width } = Dimensions.get('window');

// Wrapper component for lazy-loaded screens
const LazyScreenWrapper = ({ ScreenComponent, ...props }) => (
  <Suspense fallback={
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#0C295C" />
    </View>
  }>
    <ScreenComponent {...props} />
  </Suspense>
);

// Stack Navigator for Explore Sports
function ExploreSportsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ExploreSportsMain" component={ExploreSportsScreen} />
      <Stack.Screen name="Coaches" component={CoachesScreen} />
      <Stack.Screen 
        name="Paywall" 
        component={(props) => <LazyScreenWrapper ScreenComponent={PaywallScreen} {...props} />}
      />
      <Stack.Screen 
        name="StripePayment" 
        component={(props) => <LazyScreenWrapper ScreenComponent={StripePaymentScreen} {...props} />}
      />
    </Stack.Navigator>
  );
}

export default function PlayerNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'ExploreSports') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'CoachFeedback') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={focused ? 26 : 24} color={color} />;
        },
        tabBarActiveTintColor: '#0C295C',
        tabBarInactiveTintColor: '#90A4AE',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#E8F2FF',
          paddingBottom: 40,
          paddingTop: 15,
          height: 90,
          shadowColor: '#0C295C',
          shadowOffset: {
            width: 0,
            height: -5,
          },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: width * 0.035,
          fontFamily: 'Manrope-Medium',
          marginTop: 2,
          marginBottom: 2,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen 
        name="ExploreSports" 
        component={ExploreSportsStack}
        options={{
          tabBarLabel: 'Explore',
        }}
      />
      <Tab.Screen 
        name="CoachFeedback" 
        component={CoachFeedbackScreen}
        options={{
          tabBarLabel: 'Messages',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}
