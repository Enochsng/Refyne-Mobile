import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabaseClient';

const { width, height } = Dimensions.get('window');

export default function AuthScreen({ navigation }) {
  const [isSignIn, setIsSignIn] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userType, setUserType] = useState('Player');
  const [loading, setLoading] = useState(false);
  
  // Animation values
  const buttonScale = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(1)).current;

  const clearForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setUserType('Player');
  };

  const animateButtonPress = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateCardPress = () => {
    Animated.sequence([
      Animated.timing(cardScale, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!isSignIn) {
      if (!name.trim()) {
        Alert.alert('Error', 'Please enter your name');
        return;
      }
      if (!confirmPassword) {
        Alert.alert('Error', 'Please confirm your password');
        return;
      }
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters long');
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignIn) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        console.log('User signed in, metadata:', data.user?.user_metadata);
        
        // Set a flag to indicate this is a sign-in (not sign-up)
        await AsyncStorage.setItem('is_signin', 'true');
        // Clear any signup flags since this is a sign-in
        await AsyncStorage.removeItem('is_new_coach_signup');
        
        // Store user role for persistence
        const userRole = data.user?.user_metadata?.role || data.user?.user_metadata?.user_type?.toLowerCase() || 'player';
        await AsyncStorage.setItem('user_role', userRole);
        
        console.log('Set signin flag, cleared signup flags, and stored user role:', userRole);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: userType.toLowerCase(), // Store as 'player' or 'coach'
              user_type: userType,
              full_name: name.trim()
            }
          }
        });
        if (error) throw error;
        
        console.log('User signed up with role:', userType.toLowerCase());
        
        // Clear any signin flags since this is a sign-up
        await AsyncStorage.removeItem('is_signin');
        
        // If this is a new coach sign-up, set a flag to indicate they need onboarding
        if (userType.toLowerCase() === 'coach') {
          await AsyncStorage.setItem('is_new_coach_signup', 'true');
          console.log('Set new coach signup flag and cleared signin flag');
        }
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

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
            <Animated.View style={[styles.card, { transform: [{ scale: cardScale }] }]}>
            {/* Header */}
            <LinearGradient
              colors={['#0C295C', '#A9C3DD']}
              style={styles.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.welcomeText}>Welcome to</Text>
              <Text style={styles.appName}>Refyne</Text>
              <Text style={styles.subtitle}>Sign in or create your account</Text>
            </LinearGradient>

            {/* Auth Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, isSignIn && styles.activeTab]}
                onPress={() => {
                  setIsSignIn(true);
                  clearForm();
                }}
              >
                <Text style={[styles.tabText, isSignIn && styles.activeTabText]}>
                  SIGN IN
                </Text>
                {isSignIn && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, !isSignIn && styles.activeTab]}
                onPress={() => {
                  setIsSignIn(false);
                  clearForm();
                }}
              >
                <Text style={[styles.tabText, !isSignIn && styles.activeTabText]}>
                  SIGN UP
                </Text>
                {!isSignIn && <View style={styles.tabUnderline} />}
              </TouchableOpacity>
            </View>

            {/* Input Fields */}
            <View style={styles.inputContainer}>
              {/* Show name field for sign up */}
              {!isSignIn && (
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#90A4AE"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              )}
              
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#90A4AE"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#90A4AE"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
              
              {/* Show additional fields for sign up */}
              {!isSignIn && (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor="#90A4AE"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  
                  {/* User Type Selection */}
                  <View style={styles.userTypeContainer}>
                    <Text style={styles.userTypeLabel}>I am a:</Text>
                    <View style={styles.userTypeButtons}>
                      <TouchableOpacity
                        style={[
                          styles.userTypeButton,
                          userType === 'Player' && styles.userTypeButtonActive
                        ]}
                        onPress={() => {
                          animateCardPress();
                          setUserType('Player');
                        }}
                      >
                        {userType === 'Player' ? (
                          <LinearGradient
                            colors={['#0C295C', '#1A4A7A']}
                            style={styles.userTypeButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                          >
                            <Text style={styles.userTypeButtonTextActive}>
                              Player
                            </Text>
                          </LinearGradient>
                        ) : (
                          <Text style={styles.userTypeButtonText}>
                            Player
                          </Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.userTypeButton,
                          userType === 'Coach' && styles.userTypeButtonActive
                        ]}
                        onPress={() => {
                          animateCardPress();
                          setUserType('Coach');
                        }}
                      >
                        {userType === 'Coach' ? (
                          <LinearGradient
                            colors={['#0C295C', '#1A4A7A']}
                            style={styles.userTypeButtonGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                          >
                            <Text style={styles.userTypeButtonTextActive}>
                              Coach
                            </Text>
                          </LinearGradient>
                        ) : (
                          <Text style={styles.userTypeButtonText}>
                            Coach
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Sign In Button */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={styles.signInButton}
                onPress={() => {
                  animateButtonPress();
                  handleAuth();
                }}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#0C295C', '#A9C3DD']}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.buttonText}>
                    {loading ? 'Loading...' : isSignIn ? 'SIGN IN' : 'SIGN UP'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 30,
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 25,
    },
    shadowOpacity: 0.6,
    shadowRadius: 35,
    elevation: 30,
    overflow: 'hidden',
    marginVertical: 10,
  },
  header: {
    paddingVertical: height * 0.025,
    paddingHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: width * 0.045,
    color: 'white',
    fontFamily: 'Manrope-Regular',
    marginBottom: 5,
  },
  appName: {
    fontSize: width * 0.075,
    color: 'white',
    fontFamily: 'Rubik-Bold',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: width * 0.035,
    color: 'white',
    fontFamily: 'Manrope-Regular',
    opacity: 0.9,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 30,
    paddingTop: 10,
    paddingBottom: 5,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 5,
  },
  activeTab: {
    // Active tab styling handled by text and underline
  },
  tabText: {
    fontSize: width * 0.04,
    fontFamily: 'Rubik-SemiBold',
    color: '#90A4AE',
    letterSpacing: 1,
  },
  activeTabText: {
    color: '#0C295C',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#0C295C',
    borderRadius: 2,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  inputContainer: {
    paddingHorizontal: 30,
    paddingTop: 10,
    paddingBottom: 0,
  },
  input: {
    borderWidth: 2,
    borderColor: 'rgba(12, 41, 92, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: height * 0.018,
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    marginBottom: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    minHeight: height * 0.055,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  signInButton: {
    marginHorizontal: 30,
    marginTop: 15,
    marginBottom: 25,
    borderRadius: 25,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  buttonGradient: {
    paddingVertical: height * 0.02,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: height * 0.055,
    borderRadius: 25,
  },
  buttonText: {
    color: 'white',
    fontSize: width * 0.04,
    fontFamily: 'Rubik-Bold',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  userTypeContainer: {
    marginTop: 12,
    marginBottom: 15,
  },
  userTypeLabel: {
    fontSize: width * 0.042,
    fontFamily: 'Rubik-Medium',
    color: '#0C295C',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  userTypeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(12, 41, 92, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 48,
  },
  userTypeButtonActive: {
    borderColor: 'transparent',
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  userTypeButtonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 48,
  },
  userTypeButtonText: {
    fontSize: width * 0.042,
    fontFamily: 'Rubik-SemiBold',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  userTypeButtonTextActive: {
    color: 'white',
    fontSize: width * 0.042,
    fontFamily: 'Rubik-SemiBold',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
