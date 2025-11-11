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
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const EXPERTISE_OPTIONS = [
  { id: 'technique', label: 'Technique Improvement', icon: 'settings-outline' },
  { id: 'fitness', label: 'Fitness & Conditioning', icon: 'fitness-outline' },
  { id: 'mental', label: 'Mental Game', icon: 'brain-outline' },
  { id: 'competition', label: 'Competition Prep', icon: 'medal-outline' },
  { id: 'beginner', label: 'Beginner Training', icon: 'school-outline' },
  { id: 'intermediate', label: 'Intermediate Training', icon: 'trending-up-outline' },
  { id: 'advanced', label: 'Advanced Training', icon: 'trophy-outline' },
];

export default function ExpertiseScreen({ navigation, route }) {
  const [selectedExpertise, setSelectedExpertise] = useState([]);
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

  const handleExpertiseToggle = (expertiseId) => {
    setSelectedExpertise(prev => {
      if (prev.includes(expertiseId)) {
        return prev.filter(id => id !== expertiseId);
      } else {
        return [...prev, expertiseId];
      }
    });
  };

  const handleContinue = () => {
    if (selectedExpertise.length === 0) {
      Alert.alert('Selection Required', 'Please select at least one area of expertise to continue.');
      return;
    }
    
    // Navigate to next screen with updated data
    navigation.navigate('Bio', { 
      onboardingData: { 
        ...onboardingData, 
        expertise: selectedExpertise 
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
              <Text style={styles.stepText}>Step 4 of 5</Text>
              <Text style={styles.title}>What are your areas of expertise?</Text>
              <Text style={styles.subtitle}>
                Select all that apply. You can choose multiple areas.
              </Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: '80%' }]} />
            </View>

            {/* Expertise Options */}
            <ScrollView 
              style={styles.scrollContainer}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.optionsContainer}
            >
              {EXPERTISE_OPTIONS.map((option) => {
                const isSelected = selectedExpertise.includes(option.id);
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.optionCard,
                      isSelected && styles.optionCardSelected
                    ]}
                    onPress={() => handleExpertiseToggle(option.id)}
                  >
                    {isSelected ? (
                      <LinearGradient
                        colors={['#0C295C', '#1A4A7A']}
                        style={styles.optionGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <View style={styles.optionContent}>
                          <View style={styles.optionHeader}>
                            <Ionicons name={option.icon} size={24} color="white" />
                            <Text style={styles.optionLabelSelected}>
                              {option.label}
                            </Text>
                            <Ionicons name="checkmark-circle" size={20} color="white" />
                          </View>
                        </View>
                      </LinearGradient>
                    ) : (
                      <View style={styles.optionContent}>
                        <View style={styles.optionHeader}>
                          <Ionicons name={option.icon} size={24} color="#90A4AE" />
                          <Text style={styles.optionLabel}>
                            {option.label}
                          </Text>
                          <View style={styles.optionCheckbox}>
                            <Ionicons name="ellipse-outline" size={20} color="#D1D5DB" />
                          </View>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Selection Counter */}
            {selectedExpertise.length > 0 && (
              <View style={styles.counterContainer}>
                <Text style={styles.counterText}>
                  {selectedExpertise.length} area{selectedExpertise.length !== 1 ? 's' : ''} selected
                </Text>
              </View>
            )}

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                selectedExpertise.length > 0 && styles.continueButtonActive
              ]}
              onPress={handleContinue}
              disabled={selectedExpertise.length === 0}
            >
              <LinearGradient
                colors={selectedExpertise.length > 0 ? ['#0C295C', '#1A4A7A'] : ['#E5E7EB', '#D1D5DB']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[
                  styles.buttonText,
                  selectedExpertise.length === 0 && styles.buttonTextDisabled
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
  scrollContainer: {
    flex: 1,
  },
  optionsContainer: {
    paddingBottom: 20,
  },
  optionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 10,
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
    padding: 16,
  },
  optionContent: {
    padding: 16,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLabel: {
    flex: 1,
    fontSize: width * 0.042,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginLeft: 15,
  },
  optionLabelSelected: {
    flex: 1,
    fontSize: width * 0.042,
    fontFamily: 'Rubik-SemiBold',
    color: 'white',
    marginLeft: 15,
  },
  optionCheckbox: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  counterText: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255, 255, 255, 0.9)',
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
