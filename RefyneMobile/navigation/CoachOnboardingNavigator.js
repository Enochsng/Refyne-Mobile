import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import SportSelectionScreen from '../screens/onboarding/SportSelectionScreen';
import LanguageScreen from '../screens/onboarding/LanguageScreen';
import ExperienceScreen from '../screens/onboarding/ExperienceScreen';
import ExpertiseScreen from '../screens/onboarding/ExpertiseScreen';
import BioScreen from '../screens/onboarding/BioScreen';

const Stack = createNativeStackNavigator();

export default function CoachOnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        gestureEnabled: false, // Prevent back navigation during onboarding
      }}
    >
      <Stack.Screen name="SportSelection" component={SportSelectionScreen} />
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="Experience" component={ExperienceScreen} />
      <Stack.Screen name="Expertise" component={ExpertiseScreen} />
      <Stack.Screen name="Bio" component={BioScreen} />
    </Stack.Navigator>
  );
}
