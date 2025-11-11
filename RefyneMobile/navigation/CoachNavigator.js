import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Dimensions } from 'react-native';

import CoachesHomeScreen from '../screens/coaches/CoachesHomeScreen';
import CoachesMessagesScreen from '../screens/coaches/CoachesMessagesScreen';
import CoachesTutorialsScreen from '../screens/coaches/CoachesTutorialsScreen';
import CoachesEarningsScreen from '../screens/coaches/CoachesEarningsScreen';
import CoachesProfileScreen from '../screens/coaches/CoachesProfileScreen';

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');

export default function CoachNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Messages') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Tutorials') {
            iconName = focused ? 'play-circle' : 'play-circle-outline';
          } else if (route.name === 'Earnings') {
            iconName = focused ? 'card' : 'card-outline';
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
        component={CoachesHomeScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen 
        name="Messages" 
        component={CoachesMessagesScreen}
        options={{
          tabBarLabel: 'Messages',
        }}
      />
      <Tab.Screen 
        name="Tutorials" 
        component={CoachesTutorialsScreen}
        options={{
          tabBarLabel: 'Tutorials',
        }}
      />
      <Tab.Screen 
        name="Earnings" 
        component={CoachesEarningsScreen}
        options={{
          tabBarLabel: 'Earnings',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={CoachesProfileScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}
