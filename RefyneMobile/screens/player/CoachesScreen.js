import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Easing,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import { getCoachesBySport, formatExperience, formatExpertise, cleanupDeletedProfiles, migrateCoachNames } from '../../utils/coachData';

const { width, height } = Dimensions.get('window');

// CoachCard Component with 3D and interactive effects
const CoachCard = ({ coach, onSelect }) => {
  const [isPressed, setIsPressed] = useState(false);
  const pressScale = useRef(new Animated.Value(1)).current;
  const pressElevation = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.parallel([
      Animated.spring(pressScale, {
        toValue: 0.98,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.spring(pressElevation, {
        toValue: 8,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      })
    ]).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.parallel([
      Animated.spring(pressScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.spring(pressElevation, {
        toValue: 0,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      })
    ]).start();
  };

  return (
    <Animated.View 
      style={[
        styles.coachCardTouchable,
        {
          transform: [{ scale: pressScale }],
          elevation: pressElevation,
        }
      ]}
    >
      {/* Gradient Header Section with 3D effect */}
      <LinearGradient
        colors={['#0C295C', '#1A4A7A', '#1A1A1A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.coachHeader}
      >
        <View style={styles.coachAvatar}>
          {coach.profilePicture ? (
            <Image 
              source={{ uri: coach.profilePicture }} 
              style={styles.coachProfileImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.coachInitial}>{coach.name.charAt(0)}</Text>
          )}
        </View>
        <Text style={styles.coachName}>{coach.name}</Text>
      </LinearGradient>
      
      {/* White Body Section with enhanced styling */}
      <View style={styles.coachBody}>
        <ScrollView 
          style={styles.coachDetailsScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.coachDetailsContent}
        >
          <View style={styles.coachDetail}>
            <Text style={styles.detailLabel}>Coaching Experience:</Text>
            <Text style={styles.detailValue}>{formatExperience(coach.experience)}</Text>
          </View>
          
          <View style={styles.coachDetail}>
            <Text style={styles.detailLabel}>Expertise:</Text>
            <Text style={styles.detailValue}>{formatExpertise(coach.expertise).join(', ')}</Text>
          </View>
          
          <View style={styles.coachDetail}>
            <Text style={styles.detailLabel}>Languages:</Text>
            <Text style={styles.detailValue}>
              {coach.languages && coach.languages.length > 0 
                ? coach.languages.join(', ') 
                : coach.language || 'Not specified'
              }
            </Text>
          </View>
          
          <View style={styles.coachDetail}>
            <Text style={styles.detailLabel}>Bio:</Text>
            <Text style={styles.detailValue}>{coach.bio}</Text>
          </View>
        </ScrollView>
        
        <TouchableOpacity 
          style={styles.selectCoachButton}
          onPress={onSelect}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={isPressed ? ['#1A4A7A', '#0C295C'] : ['#0C295C', '#1A4A7A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.selectCoachButtonGradient}
          >
            <Text style={styles.selectCoachButtonText}>SELECT COACH</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// Sample coaches data removed - now using real coach data from AsyncStorage

export default function CoachesScreen({ route, navigation }) {
  const { sport } = route.params;
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // Simplified swipe animation refs for better performance
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  
  // Single card animation system - no preview cards
  const cardTransition = useRef(new Animated.Value(0)).current;
  
  // Optimized animation configuration for buttery smooth swipes
  const animationConfig = useRef({
    spring: {
      tension: 400,
      friction: 6,
      useNativeDriver: true,
    },
    timing: {
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    },
    quickTiming: {
      duration: 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }
  }).current;
  

  // Load coaches data function
  const loadCoaches = async () => {
    try {
      setLoading(true);
      
      // Clean up any deleted profiles first
      await cleanupDeletedProfiles();
      
      // Migrate coach names if needed
      await migrateCoachNames();
      
      const sportCoaches = await getCoachesBySport(sport);
      setCoaches(sportCoaches);
      setCurrentIndex(0);
      
      // Reset animation values for new data
      translateX.setValue(0);
      scale.setValue(1);
      opacity.setValue(1);
      cardTransition.setValue(0);
    } catch (error) {
      console.error('Error loading coaches:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load coaches data on component mount
  useEffect(() => {
    loadCoaches();
  }, [sport]);

  React.useEffect(() => {
    // Start entrance animations for header
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

  const handleCoachSelect = (coach) => {
    setSelectedCoach(coach);
    
    // For badminton and golf coaches, navigate to paywall
    if (sport.toLowerCase() === 'badminton' || sport.toLowerCase() === 'golf') {
      navigation.navigate('Paywall', { 
        coach: coach, 
        sport: sport 
      });
    } else {
      // For other sports, you can implement different flows
      console.log('Selected coach:', coach.name);
      // For now, just show an alert for non-badminton/golf coaches
      Alert.alert(
        'Coach Selected',
        `You have selected ${coach.name}. This feature is coming soon for ${sport} coaches!`,
        [{ text: 'OK' }]
      );
    }
  };

  // Smooth gesture handler for buttery swipes
  const onGestureEvent = useCallback(Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { 
      useNativeDriver: true,
      listener: (event) => {
        const { translationX } = event.nativeEvent;
        const progress = Math.min(Math.abs(translationX) / (width * 0.4), 1);
        
        // Smooth scale effect
        const scaleValue = 1 - (progress * 0.03);
        scale.setValue(Math.max(scaleValue, 0.97));
        
        // Smooth opacity effect
        const opacityValue = 1 - (progress * 0.1);
        opacity.setValue(Math.max(opacityValue, 0.9));
      }
    }
  ), [translateX, scale, opacity]);

  // Memoize the current coach to prevent unnecessary re-renders
  const currentCoach = coaches[currentIndex];
  const nextCoach = coaches[currentIndex + 1];
  const previousCoach = coaches[currentIndex - 1];

  const onHandlerStateChange = useCallback((event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      if (isAnimating) return;
      
      const { translationX, velocityX } = event.nativeEvent;
      const swipeThreshold = width * 0.25;
      const velocityThreshold = 400;
      const shouldSwipe = Math.abs(translationX) > swipeThreshold || Math.abs(velocityX) > velocityThreshold;

      if (shouldSwipe) {
        // Check boundaries
        if (translationX < 0 && currentIndex >= coaches.length - 1) {
          // Snap back to center with smooth spring
          Animated.parallel([
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true, ...animationConfig.spring }),
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...animationConfig.spring }),
            Animated.spring(opacity, { toValue: 1, useNativeDriver: true, ...animationConfig.spring })
          ]).start();
          return;
        }

        if (translationX > 0 && currentIndex <= 0) {
          // Snap back to center with smooth spring
          Animated.parallel([
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true, ...animationConfig.spring }),
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...animationConfig.spring }),
            Animated.spring(opacity, { toValue: 1, useNativeDriver: true, ...animationConfig.spring })
          ]).start();
          return;
        }

        setIsAnimating(true);
        
        // Smooth card transition with fade effect
        const toValue = translationX < 0 ? -width * 1.2 : width * 1.2;
        const velocityFactor = Math.min(Math.abs(velocityX) / 1000, 1);
        const duration = Math.max(300 - velocityFactor * 100, 250);
        
        // Animate current card out with smooth easing
        Animated.parallel([
          Animated.timing(translateX, {
            toValue,
            duration,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(scale, {
            toValue: 0.85,
            duration,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          })
        ]).start(() => {
          // Update index after animation completes
          if (translationX < 0) {
            setCurrentIndex(currentIndex + 1);
          } else {
            setCurrentIndex(currentIndex - 1);
          }
          
          // Reset animations for new card
          translateX.setValue(0);
          scale.setValue(1);
          opacity.setValue(1);
          setIsAnimating(false);
        });
      } else {
        // Snap back to center with smooth spring
        Animated.parallel([
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, ...animationConfig.spring }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...animationConfig.spring }),
          Animated.spring(opacity, { toValue: 1, useNativeDriver: true, ...animationConfig.spring })
        ]).start();
      }
    }
  }, [isAnimating, currentIndex, coaches.length, translateX, scale, opacity, animationConfig]);

  // Navigation arrow handlers
  const handleNextCoach = useCallback(() => {
    if (currentIndex < coaches.length - 1 && !isAnimating) {
      setIsAnimating(true);
      
      // Animate current card out to the left
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: -width * 1.2,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(scale, {
          toValue: 0.85,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        })
      ]).start(() => {
        // Update index and reset animations
        setCurrentIndex(currentIndex + 1);
        translateX.setValue(0);
        scale.setValue(1);
        opacity.setValue(1);
        setIsAnimating(false);
      });
    }
  }, [currentIndex, coaches.length, isAnimating, translateX, scale, opacity]);

  const handlePreviousCoach = useCallback(() => {
    if (currentIndex > 0 && !isAnimating) {
      setIsAnimating(true);
      
      // Animate current card out to the right
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: width * 1.2,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(scale, {
          toValue: 0.85,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        })
      ]).start(() => {
        // Update index and reset animations
        setCurrentIndex(currentIndex - 1);
        translateX.setValue(0);
        scale.setValue(1);
        opacity.setValue(1);
        setIsAnimating(false);
      });
    }
  }, [currentIndex, isAnimating, translateX, scale, opacity]);





  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Header */}
      <Animated.View 
        style={[
          styles.headerContainer,
          {
            opacity: fadeAnim,
            transform: [
              { translateY: slideAnim },
              { scale: scaleAnim }
            ]
          }
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#666" />
            <Text style={styles.backText}>BACK TO SPORTS</Text>
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{sport} Coaches</Text>
          </View>
        </View>
      </Animated.View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0C295C" />
            <Text style={styles.loadingText}>Loading coaches...</Text>
          </View>
        ) : coaches.length === 0 ? (
          <View style={styles.noCoachesContainer}>
            <Ionicons name="person-outline" size={64} color="#94A3B8" />
            <Text style={styles.noCoachesTitle}>No Coaches Available</Text>
            <Text style={styles.noCoachesText}>
              There are no coaches available for {sport} at the moment. Check back later!
            </Text>
          </View>
        ) : currentCoach ? (
          /* Single Card Swipe System with Navigation Arrows */
          <View style={styles.swipeContainer}>
            <PanGestureHandler
              onGestureEvent={onGestureEvent}
              onHandlerStateChange={onHandlerStateChange}
              minPointers={1}
              maxPointers={1}
              activeOffsetX={[-15, 15]}
              failOffsetY={[-25, 25]}
              shouldCancelWhenOutside={false}
              enabled={!isAnimating}
            >
              <Animated.View
                style={[
                  styles.coachCard,
                  {
                    transform: [
                      { translateX: translateX },
                      { scale: scale },
                    ],
                    opacity: opacity,
                  }
                ]}
              >
                <CoachCard coach={currentCoach} onSelect={() => handleCoachSelect(currentCoach)} />
              </Animated.View>
            </PanGestureHandler>
            
            {/* Navigation Arrows */}
            <View style={styles.navigationContainer}>
              <TouchableOpacity
                style={[
                  styles.navButton,
                  styles.leftNavButton,
                  currentIndex === 0 && styles.disabledNavButton
                ]}
                onPress={handlePreviousCoach}
                disabled={currentIndex === 0 || isAnimating}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="chevron-back" 
                  size={20} 
                  color={currentIndex === 0 ? '#ccc' : '#0C295C'} 
                />
              </TouchableOpacity>
              
              <View style={styles.coachCounter}>
                <Text style={styles.coachCounterText}>
                  {currentIndex + 1} of {coaches.length}
                </Text>
              </View>
              
              <TouchableOpacity
                style={[
                  styles.navButton,
                  styles.rightNavButton,
                  currentIndex === coaches.length - 1 && styles.disabledNavButton
                ]}
                onPress={handleNextCoach}
                disabled={currentIndex === coaches.length - 1 || isAnimating}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="chevron-forward" 
                  size={20} 
                  color={currentIndex === coaches.length - 1 ? '#ccc' : '#0C295C'} 
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  headerContainer: {
    backgroundColor: '#F5F5F5',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  header: {
    backgroundColor: '#F5F5F5',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backText: {
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
    color: '#666',
    marginLeft: 8,
  },
  headerContent: {
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: width * 0.08,
    fontFamily: 'Rubik-Bold',
    color: '#0C295C',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#666',
    lineHeight: 22,
  },
  mainContent: {
    flex: 1,
    padding: 24,
    paddingTop: 0,
  },
  swipeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 400,
    marginTop: 20,
    paddingHorizontal: 10,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(12, 41, 92, 0.1)',
  },
  leftNavButton: {
    marginRight: 'auto',
  },
  rightNavButton: {
    marginLeft: 'auto',
  },
  disabledNavButton: {
    backgroundColor: '#f5f5f5',
    shadowOpacity: 0.05,
    elevation: 2,
  },
  coachCounter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachCounterText: {
    fontSize: width * 0.032,
    fontFamily: 'Manrope-Medium',
    color: '#64748B',
    textAlign: 'center',
  },
  coachCard: {
    backgroundColor: 'white',
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 20,
    },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 20,
    borderWidth: 2,
    borderColor: 'rgba(12, 41, 92, 0.1)',
    width: width - 40, // Fixed width for consistency
    height: 580, // Reduced height to accommodate navigation
    maxWidth: 400, // Maximum width to prevent cards from being too wide on tablets
    // 3D styling
    transformStyle: 'preserve-3d',
    backfaceVisibility: 'hidden',
  },
  coachCardTouchable: {
    borderRadius: 25,
    overflow: 'hidden',
    flex: 1,
    width: '100%',
    // Enhanced 3D styling
    transformStyle: 'preserve-3d',
    backfaceVisibility: 'hidden',
  },
  coachHeader: {
    padding: 24,
    alignItems: 'center',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    position: 'relative',
    // Enhanced 3D header styling
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  coachAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
    // Enhanced 3D avatar styling
    transformStyle: 'preserve-3d',
  },
  coachInitial: {
    fontSize: 28,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  coachProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  coachName: {
    fontSize: width * 0.065,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
  },
  coachBody: {
    backgroundColor: 'white',
    padding: 24,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 350, // Reduced minimum height for content area
  },
  coachDetailsScroll: {
    flex: 1,
    marginBottom: 16,
  },
  coachDetailsContent: {
    paddingBottom: 8,
  },
  coachDetail: {
    marginBottom: 18,
  },
  detailLabel: {
    fontSize: width * 0.038,
    fontFamily: 'Rubik-SemiBold',
    color: '#64748B',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: width * 0.042,
    fontFamily: 'Manrope-Medium',
    color: '#0C295C',
    lineHeight: 22,
  },
  selectCoachButton: {
    borderRadius: 100,
    marginTop: 12,
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    alignSelf: 'stretch', // Ensure button takes full width
    // Enhanced 3D button styling
    transformStyle: 'preserve-3d',
  },
  selectCoachButtonGradient: {
    borderRadius: 100,
    paddingVertical: 18,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  selectCoachButtonText: {
    fontSize: width * 0.045,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Medium',
    color: '#64748B',
    marginTop: 16,
  },
  noCoachesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  noCoachesTitle: {
    fontSize: width * 0.05,
    fontFamily: 'Rubik-Bold',
    color: '#0C295C',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  noCoachesText: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
});
