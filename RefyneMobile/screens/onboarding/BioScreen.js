import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Animated,
  Alert,
  KeyboardAvoidingView,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../supabaseClient';

const { width, height } = Dimensions.get('window');

export default function BioScreen({ navigation, route }) {
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const { onboardingData } = route.params || {};
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  React.useEffect(() => {
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

  const handleComplete = async () => {
    if (!bio.trim()) {
      Alert.alert('Input Required', 'Please write a short bio about your coaching experience.');
      return;
    }

    setLoading(true);
    setIsCompleting(true);
    
    try {
      // Get the current user to associate onboarding data with their ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Prepare complete onboarding data with actual user ID
      const completeOnboardingData = {
        ...onboardingData,
        bio: bio.trim(),
        completed_at: new Date().toISOString(),
        user_id: user.id, // Use actual user ID
        coach_name: user.user_metadata?.full_name || 'Coach', // Store the coach's actual name
      };

      // Store onboarding completion in AsyncStorage with user-specific key
      await AsyncStorage.setItem('onboarding_completed', 'true');
      await AsyncStorage.setItem(`onboarding_data_${user.id}`, JSON.stringify(completeOnboardingData));
      await AsyncStorage.setItem('user_role', 'coach');
      
      // Save coach name to AsyncStorage for other users to access
      if (user.user_metadata?.full_name) {
        await AsyncStorage.setItem(`coach_name_${user.id}`, user.user_metadata.full_name);
        console.log('Saved coach name to AsyncStorage during onboarding:', user.user_metadata.full_name);
      }
      
      // Clear the new coach signup flag since they've completed onboarding
      await AsyncStorage.removeItem('is_new_coach_signup');
      console.log('Successfully stored onboarding data in AsyncStorage for user:', user.id);

      // Show success message with smooth transition
      setTimeout(() => {
        Alert.alert(
          'Welcome to Refyne!',
          'Your profile has been set up successfully. You can now start coaching!',
          [
            {
              text: 'Get Started',
              onPress: () => {
                // Emit event to notify App.js that onboarding is completed
                DeviceEventEmitter.emit('onboardingCompleted');
                console.log('Emitted onboarding completion event');
              }
            }
          ]
        );
      }, 500);

      // You could also save to a separate coaches table here if needed
      // const { error: coachError } = await supabase
      //   .from('coaches')
      //   .upsert({
      //     user_id: user.id,
      //     ...completeOnboardingData
      //   });

    } catch (error) {
      console.error('Error completing onboarding:', error);
      let errorMessage = 'Failed to complete setup. Please try again.';
      
      if (error.message?.includes('JWT')) {
        errorMessage = 'Authentication error. Please sign out and sign in again.';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
      setIsCompleting(false);
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const characterCount = bio.length;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0C295C', '#A9C3DD', '#000000']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <Animated.View 
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [
                    { translateY: slideAnim },
                    { scale: scaleAnim }
                  ]
                }
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                  <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text style={styles.stepText}>Step 5 of 5</Text>
                <Text style={styles.title}>Tell us about yourself</Text>
                <Text style={styles.subtitle}>
                  Write a short bio about your coaching experience and background
                </Text>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: '100%' }]} />
              </View>

              {/* Bio Input */}
              <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Share your coaching journey, achievements, and what makes you passionate about coaching..."
                    placeholderTextColor="#90A4AE"
                    value={bio}
                    onChangeText={setBio}
                    multiline
                    textAlignVertical="top"
                    autoCapitalize="sentences"
                    autoCorrect={true}
                  />
                </View>
                
                {/* Character Counter */}
                <View style={styles.counterContainer}>
                  <Text style={styles.counterText}>
                    {characterCount} characters
                  </Text>
                </View>
              </View>

            {/* Complete Button */}
            <TouchableOpacity
              style={[
                styles.completeButton,
                bio.trim() && styles.completeButtonActive,
                isCompleting && styles.completingButton
              ]}
              onPress={handleComplete}
              disabled={!bio.trim() || loading || isCompleting}
            >
              <LinearGradient
                colors={
                  isCompleting 
                    ? ['#10B981', '#059669'] 
                    : bio.trim() 
                      ? ['#0C295C', '#1A4A7A'] 
                      : ['#E5E7EB', '#D1D5DB']
                }
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[
                  styles.buttonText,
                  (!bio.trim() || loading || isCompleting) && styles.buttonTextDisabled
                ]}>
                  {isCompleting ? 'Completing Setup...' : loading ? 'Setting up...' : 'Complete Setup'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            </Animated.View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: width,
    height: height,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 50,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  stepText: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
    marginTop: 15,
  },
  title: {
    fontSize: width * 0.06,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: width * 0.038,
    fontFamily: 'Manrope-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  progressContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginBottom: 20,
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 2,
    shadowColor: 'white',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  inputContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 10,
  },
  inputWrapper: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
    marginBottom: 12,
  },
  textInput: {
    fontSize: width * 0.042,
    fontFamily: 'Manrope-Regular',
    color: '#0C295C',
    lineHeight: 22,
    minHeight: 160,
    maxHeight: 200,
    textAlignVertical: 'top',
  },
  counterContainer: {
    alignItems: 'center',
  },
  counterText: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  counterTextWarning: {
    color: '#F59E0B',
  },
  counterTextError: {
    color: '#EF4444',
  },
  minText: {
    fontSize: width * 0.032,
    fontFamily: 'Manrope-Regular',
    color: '#F59E0B',
    marginTop: 5,
  },
  completeButton: {
    marginTop: 20,
    marginBottom: 30,
    borderRadius: 25,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  completeButtonActive: {
    shadowOpacity: 0.5,
  },
  completingButton: {
    shadowOpacity: 0.7,
    shadowColor: '#10B981',
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
  },
  buttonText: {
    color: 'white',
    fontSize: width * 0.045,
    fontFamily: 'Rubik-Bold',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  buttonTextDisabled: {
    color: '#9CA3AF',
  },
});
