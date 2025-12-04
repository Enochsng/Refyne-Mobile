import React, { useState, useRef, useEffect } from 'react';
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
  ScrollView,
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
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(50)).current;
  const tabSlide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(cardTranslateY, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    // Tab slide animation
    Animated.spring(tabSlide, {
      toValue: isSignIn ? 0 : 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [isSignIn]);

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
        toValue: 0.96,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 150,
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
        
        await AsyncStorage.setItem('is_signin', 'true');
        await AsyncStorage.removeItem('is_new_coach_signup');
        
        const userRole = data.user?.user_metadata?.role || data.user?.user_metadata?.user_type?.toLowerCase() || 'player';
        await AsyncStorage.setItem('user_role', userRole);
        
        console.log('Set signin flag, cleared signup flags, and stored user role:', userRole);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: userType.toLowerCase(),
              user_type: userType,
              full_name: name.trim()
            }
          }
        });
        if (error) throw error;
        
        console.log('User signed up with role:', userType.toLowerCase());
        
        await AsyncStorage.removeItem('is_signin');
        
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

  // Calculate tab width: screen width - card padding (48) - tabWrapper padding (48) = available width, then / 2 for one tab
  const tabWidth = (width - 48 - 48) / 2;
  const tabIndicatorTranslateX = tabSlide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, tabWidth],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0C295C', '#0C295C', 'rgba(12, 41, 92, 0.95)', '#FFFFFF']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* Decorative elements */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        <View style={styles.decorativeCircle3} />
        
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header - Outside card */}
              <View style={styles.headerContainer}>
                <Text style={styles.welcomeText}>Welcome to</Text>
                <Text style={styles.appName}>Refyne</Text>
                <Text style={styles.subtitle}>
                  {isSignIn ? 'Sign in to continue' : 'Create your account'}
                </Text>
              </View>

              {/* Auth Card */}
              <Animated.View
                style={[
                  styles.card,
                  {
                    opacity: cardOpacity,
                    transform: [{ translateY: cardTranslateY }],
                  },
                ]}
              >
                {/* Tab Navigation */}
                <View style={styles.tabContainer}>
                  <View style={styles.tabWrapper}>
                    <TouchableOpacity
                      style={styles.tab}
                      onPress={() => {
                        setIsSignIn(true);
                        clearForm();
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.tabText, isSignIn && styles.activeTabText]}>
                        Sign In
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.tab}
                      onPress={() => {
                        setIsSignIn(false);
                        clearForm();
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.tabText, !isSignIn && styles.activeTabText]}>
                        Sign Up
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Animated.View
                    style={[
                      styles.tabIndicator,
                      {
                        transform: [{ translateX: tabIndicatorTranslateX }],
                      },
                    ]}
                  />
                </View>

                {/* Input Fields */}
                <View style={styles.inputContainer}>
                  {!isSignIn && (
                    <View style={styles.inputWrapper}>
                      <Text style={styles.inputLabel}>Full Name</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your full name"
                        placeholderTextColor="rgba(12, 41, 92, 0.4)"
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                        autoCorrect={false}
                      />
                    </View>
                  )}
                  
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email"
                      placeholderTextColor="rgba(12, 41, 92, 0.4)"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Password</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor="rgba(12, 41, 92, 0.4)"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  {!isSignIn && (
                    <>
                      <View style={styles.inputWrapper}>
                        <Text style={styles.inputLabel}>Confirm Password</Text>
                        <TextInput
                          style={styles.input}
                          placeholder="Confirm your password"
                          placeholderTextColor="rgba(12, 41, 92, 0.4)"
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          secureTextEntry
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>

                      {/* User Type Selection */}
                      <View style={styles.userTypeContainer}>
                        <Text style={styles.userTypeLabel}>I am a:</Text>
                        <View style={styles.userTypeButtons}>
                          <TouchableOpacity
                            style={[
                              styles.userTypeButton,
                              userType === 'Player' && styles.userTypeButtonActive,
                            ]}
                            onPress={() => setUserType('Player')}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.userTypeButtonText,
                                userType === 'Player' && styles.userTypeButtonTextActive,
                              ]}
                            >
                              Player
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.userTypeButton,
                              userType === 'Coach' && styles.userTypeButtonActive,
                            ]}
                            onPress={() => setUserType('Coach')}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.userTypeButtonText,
                                userType === 'Coach' && styles.userTypeButtonTextActive,
                              ]}
                            >
                              Coach
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </>
                  )}
                </View>

                {/* Submit Button */}
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    style={styles.submitButton}
                    onPress={() => {
                      animateButtonPress();
                      handleAuth();
                    }}
                    disabled={loading}
                    activeOpacity={0.9}
                  >
                    <Text style={styles.submitButtonText}>
                      {loading ? 'Please wait...' : isSignIn ? 'Sign In' : 'Create Account'}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>
            </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'Manrope-Regular',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  appName: {
    fontSize: 48,
    color: 'white',
    fontFamily: 'Rubik-Bold',
    marginBottom: 12,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    fontFamily: 'Manrope-Regular',
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 32,
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 25,
    overflow: 'hidden',
  },
  tabContainer: {
    position: 'relative',
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(12, 41, 92, 0.08)',
  },
  tabWrapper: {
    flexDirection: 'row',
    paddingHorizontal: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 16,
    fontFamily: 'Rubik-SemiBold',
    color: 'rgba(12, 41, 92, 0.4)',
    letterSpacing: 0.5,
  },
  activeTabText: {
    color: '#0C295C',
    fontFamily: 'Rubik-Bold',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 24, // Match tabWrapper paddingHorizontal
    width: '50%',
    height: 3,
    backgroundColor: '#0C295C',
    borderRadius: 2,
  },
  inputContainer: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 8,
  },
  inputWrapper: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    color: '#0C295C',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1.5,
    borderColor: 'rgba(12, 41, 92, 0.12)',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Manrope-Regular',
    backgroundColor: 'rgba(12, 41, 92, 0.02)',
    color: '#0C295C',
  },
  userTypeContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  userTypeLabel: {
    fontSize: 14,
    fontFamily: 'Rubik-Medium',
    color: '#0C295C',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  userTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  userTypeButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(12, 41, 92, 0.15)',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userTypeButtonActive: {
    backgroundColor: '#0C295C',
    borderColor: '#0C295C',
  },
  userTypeButtonText: {
    fontSize: 15,
    fontFamily: 'Rubik-SemiBold',
    color: 'rgba(12, 41, 92, 0.6)',
    letterSpacing: 0.3,
  },
  userTypeButtonTextActive: {
    color: 'white',
  },
  submitButton: {
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 32,
    borderRadius: 16,
    backgroundColor: '#0C295C',
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 17,
    fontFamily: 'Rubik-Bold',
    letterSpacing: 0.5,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -120,
    left: -100,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  decorativeCircle3: {
    position: 'absolute',
    top: height * 0.25,
    left: width * 0.15,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
});
