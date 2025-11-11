import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Dimensions } from 'react-native';

import HomeScreen from '../screens/player/HomeScreen';
import ExploreSportsScreen from '../screens/player/ExploreSportsScreen';
import CoachesScreen from '../screens/player/CoachesScreen';
import PaywallScreen from '../screens/player/PaywallScreen';
import StripePaymentScreen from '../screens/player/StripePaymentScreen';
import CoachFeedbackScreen from '../screens/player/CoachFeedbackScreen';
import ProfileScreen from '../screens/player/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const { width } = Dimensions.get('window');

// Stack Navigator for Explore Sports
function ExploreSportsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ExploreSportsMain" component={ExploreSportsScreen} />
      <Stack.Screen name="Coaches" component={CoachesScreen} />
      <Stack.Screen name="Paywall" component={PaywallScreen} />
      <Stack.Screen name="StripePayment" component={StripePaymentScreen} />
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
