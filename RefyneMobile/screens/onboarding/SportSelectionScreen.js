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

const SPORTS = [
  { id: 'golf', name: 'Golf' },
  { id: 'badminton', name: 'Badminton' },
  { id: 'weightlifting', name: 'Weight Lifting' },
];

export default function SportSelectionScreen({ navigation }) {
  const [selectedSport, setSelectedSport] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
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

  const handleSportSelect = (sport) => {
    setSelectedSport(sport);
    setIsDropdownOpen(false);
  };

  const handleContinue = () => {
    if (!selectedSport) {
      Alert.alert('Selection Required', 'Please select your sport to continue.');
      return;
    }
    
    // Store the selected sport and navigate to next screen
    navigation.navigate('Language', { 
      onboardingData: { sport: selectedSport } 
    });
  };

  const selectedSportData = SPORTS.find(sport => sport.id === selectedSport);

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
              <Text style={styles.stepText}>Step 1 of 5</Text>
              <Text style={styles.title}>What sport do you coach?</Text>
              <Text style={styles.subtitle}>
                Select the primary sport you'll be coaching on Refyne
              </Text>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, { width: '20%' }]} />
            </View>

            {/* Sport Selection */}
            <View style={styles.selectionContainer}>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <View style={styles.dropdownContent}>
                  {selectedSportData ? (
                    <Text style={styles.selectedText}>
                      {selectedSportData.name}
                    </Text>
                  ) : (
                    <Text style={styles.placeholderText}>
                      Select your sport
                    </Text>
                  )}
                  <Ionicons 
                    name={isDropdownOpen ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color="#90A4AE" 
                  />
                </View>
              </TouchableOpacity>

              {isDropdownOpen && (
                <View style={styles.dropdown}>
                  {SPORTS.map((sport) => (
                    <TouchableOpacity
                      key={sport.id}
                      style={[
                        styles.dropdownItem,
                        selectedSport === sport.id && styles.dropdownItemSelected
                      ]}
                      onPress={() => handleSportSelect(sport.id)}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        selectedSport === sport.id && styles.dropdownItemTextSelected
                      ]}>
                        {sport.name}
                      </Text>
                      {selectedSport === sport.id && (
                        <Ionicons name="checkmark" size={16} color="#0C295C" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              style={[
                styles.continueButton,
                selectedSport && styles.continueButtonActive
              ]}
              onPress={handleContinue}
              disabled={!selectedSport}
            >
              <LinearGradient
                colors={selectedSport ? ['#0C295C', '#1A4A7A'] : ['#E5E7EB', '#D1D5DB']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[
                  styles.buttonText,
                  !selectedSport && styles.buttonTextDisabled
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
    marginBottom: 40,
  },
  stepText: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 10,
  },
  title: {
    fontSize: width * 0.065,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
  progressContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginBottom: 50,
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
  selectionContainer: {
    flex: 1,
    justifyContent: 'center',
    marginTop: -100,
  },
  dropdownButton: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedText: {
    flex: 1,
    fontSize: width * 0.045,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
  },
  placeholderText: {
    flex: 1,
    fontSize: width * 0.045,
    fontFamily: 'Manrope-Regular',
    color: '#90A4AE',
  },
  dropdown: {
    backgroundColor: 'white',
    borderRadius: 15,
    marginTop: 5,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemSelected: {
    backgroundColor: '#F0F9FF',
  },
  dropdownItemText: {
    fontSize: width * 0.042,
    fontFamily: 'Manrope-Medium',
    color: '#64748B',
  },
  dropdownItemTextSelected: {
    color: '#0C295C',
    fontFamily: 'Rubik-SemiBold',
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
