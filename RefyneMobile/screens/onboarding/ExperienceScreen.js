import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const EXPERIENCE_OPTIONS = [
  { id: 'less-than-1', label: 'Less than 1 year' },
  { id: '1-3', label: '1-3 years' },
  { id: '4-6', label: '4-6 years' },
  { id: '7-10', label: '7-10 years' },
  { id: 'more-than-10', label: 'More than 10 years' },
];

export default function ExperienceScreen({ navigation, route }) {
  const [selectedExperience, setSelectedExperience] = useState(null);
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

  const handleExperienceSelect = (experience) => {
    setSelectedExperience(experience);
  };

  const handleContinue = () => {
    if (!selectedExperience) {
      Alert.alert('Selection Required', 'Please select your coaching experience to continue.');
      return;
    }
    
    // Navigate to next screen with updated data
    navigation.navigate('Expertise', { 
      onboardingData: { 
        ...onboardingData, 
        experience: selectedExperience 
      } 
    });
  };

  const handleBack = () => {
    navigation.goBack();
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
              <Text style={styles.stepText}>Step 3 of 5</Text>
              <Text style={styles.title}>How many years of coaching experience do you have?</Text>
              <Text style={styles.subtitle}>
                This helps players understand your coaching background
              </Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: '60%' }]} />
            </View>

            {/* Experience Options */}
            <View style={styles.optionsContainer}>
                  {EXPERIENCE_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.optionCard,
                        selectedExperience === option.id && styles.optionCardSelected
                      ]}
                      onPress={() => handleExperienceSelect(option.id)}
                    >
                      {selectedExperience === option.id ? (
                        <LinearGradient
                          colors={['#0C295C', '#1A4A7A']}
                          style={styles.optionGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          <View style={styles.optionContent}>
                            <View style={styles.optionHeader}>
                              <Text style={styles.optionLabelSelected}>
                                {option.label}
                              </Text>
                              <Ionicons name="checkmark-circle" size={24} color="white" />
                            </View>
                          </View>
                        </LinearGradient>
                      ) : (
                        <View style={styles.optionContent}>
                          <View style={styles.optionHeader}>
                            <Text style={styles.optionLabel}>
                              {option.label}
                            </Text>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                selectedExperience && styles.continueButtonActive
              ]}
              onPress={handleContinue}
              disabled={!selectedExperience}
            >
              <LinearGradient
                colors={selectedExperience ? ['#0C295C', '#1A4A7A'] : ['#E5E7EB', '#D1D5DB']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[
                  styles.buttonText,
                  !selectedExperience && styles.buttonTextDisabled
                ]}>
                  Continue
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
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
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
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
    marginBottom: 10,
    marginTop: 20,
  },
  title: {
    fontSize: width * 0.06,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: width * 0.038,
    fontFamily: 'Manrope-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
  },
  progressContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginBottom: 30,
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
  optionsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  optionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  optionCardSelected: {
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  optionGradient: {
    padding: 20,
  },
  optionContent: {
    padding: 20,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionLabel: {
    fontSize: width * 0.045,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
  },
  optionLabelSelected: {
    fontSize: width * 0.045,
    fontFamily: 'Rubik-SemiBold',
    color: 'white',
  },
  continueButton: {
    marginBottom: 40,
    borderRadius: 25,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  continueButtonActive: {
    shadowOpacity: 0.5,
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
