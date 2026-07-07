import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabaseClient';
import apiService from './apiService';

async function clearLocalAuthData(userId) {
  const keysToRemove = [
    'onboarding_completed',
    'onboarding_data',
    'user_role',
    'is_new_coach_signup',
    'is_signin',
  ];

  if (userId) {
    keysToRemove.push(
      `onboarding_data_${userId}`,
      `profile_photo_${userId}`,
    );
  }

  await AsyncStorage.multiRemove(keysToRemove);
  await supabase.auth.signOut();
}

export async function deleteAccountAndSignOut({ onDeletingChange } = {}) {
  onDeletingChange?.(true);

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      Alert.alert('Error', 'You are not signed in. Please sign in again.');
      onDeletingChange?.(false);
      return;
    }

    const userId = session.user?.id;

    await apiService.post('/api/account/delete', null, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    await clearLocalAuthData(userId);
  } catch (error) {
    console.error('Delete account error:', error);
    Alert.alert(
      'Error',
      error.message || 'Failed to delete account. Please try again.'
    );
    onDeletingChange?.(false);
  }
}

export function confirmDeleteAccount({ onDeletingChange } = {}) {
  Alert.alert(
    'Delete Account',
    'Are you sure you want to delete your account?',
    [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: () => deleteAccountAndSignOut({ onDeletingChange }),
      },
    ]
  );
}
