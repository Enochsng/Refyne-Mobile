import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
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
  InteractionManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PanGestureHandler, State, GestureHandlerRootView } from 'react-native-gesture-handler';
import { getCoachesBySport, formatExperience, formatExpertise, cleanupDeletedProfiles, migrateCoachNames } from '../../utils/coachData';

const { width, height } = Dimensions.get('window');

// CoachCard Component with 3D and interactive effects
const CoachCard = ({ coach, onSelect, scrollViewRef }) => {
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
          ref={scrollViewRef}
          style={styles.coachDetailsScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.coachDetailsContent}
          scrollEnabled={true}
          nestedScrollEnabled={true}
          bounces={true}
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
  
  // ScrollView ref for gesture handler
  const scrollViewRef = useRef(null);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // Simplified swipe animation refs for better performance
  const translateX = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current; // Subtle 2D rotation for swipe feedback
  
  // Next and previous card animations for Tinder-like smooth transitions
  const nextCardTranslateX = useRef(new Animated.Value(0)).current;
  const nextCardOpacity = useRef(new Animated.Value(0)).current;
  const nextCardScale = useRef(new Animated.Value(0.95)).current; // Start scaled down (behind current card)
  const prevCardTranslateX = useRef(new Animated.Value(0)).current;
  const prevCardOpacity = useRef(new Animated.Value(0)).current;
  const prevCardScale = useRef(new Animated.Value(0.95)).current; // Start scaled down (behind current card)
  
  // Current card translateY to prevent vertical movement
  const translateY = useRef(new Animated.Value(0)).current;
  
  // Single card animation system - no preview cards
  const cardTransition = useRef(new Animated.Value(0)).current;
  
  // Tinder-like animation configuration for buttery smooth swipes
  const animationConfig = useRef({
    spring: {
      tension: 300,
      friction: 8,
      useNativeDriver: true,
    },
    snapBack: {
      tension: 300,
      friction: 7,
      useNativeDriver: true,
    },
    timing: {
      duration: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    },
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
      
      // Reset animation values for new data - ensure current card is centered
      translateX.setValue(0);
      translateY.setValue(0);
      scale.setValue(1);
      opacity.setValue(1);
      rotate.setValue(0);
      cardTransition.setValue(0);
      // Position next/prev cards behind current card (Tinder style)
      nextCardTranslateX.setValue(0);
      nextCardOpacity.setValue(0);
      nextCardScale.setValue(0.95);
      prevCardTranslateX.setValue(0);
      prevCardOpacity.setValue(0);
      prevCardScale.setValue(0.95);
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

  // Update next/prev card positions when index changes (Tinder style - cards behind)
  // CRITICAL: Only update when NOT animating to prevent glitches
  useLayoutEffect(() => {
    // Skip if animating - positions are managed by animation callbacks
    if (isAnimating || coaches.length === 0) return;
    
    // CRITICAL: Ensure next/prev cards are always centered (translateX: 0)
    // This prevents position jumps when cards become current
    // Use a longer delay to ensure animation callbacks have finished
    const timer = setTimeout(() => {
      // Position next card behind current - ALWAYS at translateX: 0 (centered)
      if (currentIndex < coaches.length - 1) {
        // Ensure next card is centered and behind
        nextCardTranslateX.setValue(0);
        nextCardOpacity.setValue(0);
        nextCardScale.setValue(0.95);
      }
      
      // Position prev card behind current - ALWAYS at translateX: 0 (centered)
      if (currentIndex > 0) {
        prevCardTranslateX.setValue(0);
        prevCardOpacity.setValue(0);
        prevCardScale.setValue(0.95);
      }
      
      // Ensure current card is centered
      translateY.setValue(0);
      translateX.setValue(0);
    }, 100); // Longer delay to ensure all animations have settled
    
    return () => clearTimeout(timer);
  }, [currentIndex, coaches.length, isAnimating]);

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

  // Tinder-like gesture handler - card follows finger directly with natural rotation
  const onGestureEvent = useCallback(Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { 
      useNativeDriver: true,
      listener: (event) => {
        const { translationX } = event.nativeEvent;
        const absTranslationX = Math.abs(translationX);
        
        // Tinder-style: Direct 1:1 translation - card follows finger exactly
        // No easing during drag for instant responsiveness
        
        // Natural rotation based on horizontal position (Tinder style)
        // Max rotation ~20 degrees for natural tilt
        const rotationValue = (translationX / width) * 20;
        rotate.setValue(rotationValue);
        
        // Scale down as card moves away (Tinder style)
        // More pronounced scale effect
        const scaleProgress = Math.min(absTranslationX / (width * 0.5), 1);
        const scaleValue = 1 - (scaleProgress * 0.15); // Scale down to 0.85
        scale.setValue(Math.max(scaleValue, 0.85));
        
        // Opacity fade as card moves away
        const opacityProgress = Math.min(absTranslationX / (width * 0.6), 1);
        const opacityValue = 1 - (opacityProgress * 0.5); // Fade to 0.5
        opacity.setValue(Math.max(opacityValue, 0.5));
        
        // Next/prev card animations (Tinder style - cards scale up from behind)
        const currentNextCoach = coaches[currentIndex + 1];
        const currentPrevCoach = coaches[currentIndex - 1];
        
        // CRITICAL: Always keep next/prev cards at translateX: 0 (centered)
        // This prevents position jumps when they become current
        if (translationX < 0 && currentNextCoach) {
          // Swiping left - reveal next card from behind
          const progress = Math.min(absTranslationX / (width * 0.5), 1);
          // Next card scales up and fades in as current card moves away
          // CRITICAL: Keep translateX at 0 - never change it
          nextCardTranslateX.setValue(0); // Always centered
          nextCardScale.setValue(0.95 + (progress * 0.05)); // Scale from 0.95 to 1.0
          nextCardOpacity.setValue(progress * 0.8); // Fade in
        } else if (translationX > 0 && currentPrevCoach) {
          // Swiping right - reveal prev card from behind
          const progress = Math.min(absTranslationX / (width * 0.5), 1);
          // Prev card scales up and fades in as current card moves away
          // CRITICAL: Keep translateX at 0 - never change it
          prevCardTranslateX.setValue(0); // Always centered
          prevCardScale.setValue(0.95 + (progress * 0.05)); // Scale from 0.95 to 1.0
          prevCardOpacity.setValue(progress * 0.8); // Fade in
        } else {
          // Reset next/prev cards when not swiping in their direction
          // CRITICAL: Always keep translateX at 0
          if (currentNextCoach) {
            nextCardTranslateX.setValue(0); // Always centered
            nextCardScale.setValue(0.95);
            nextCardOpacity.setValue(0);
          }
          if (currentPrevCoach) {
            prevCardTranslateX.setValue(0); // Always centered
            prevCardScale.setValue(0.95);
            prevCardOpacity.setValue(0);
          }
        }
      }
    }
  ), [translateX, scale, opacity, rotate, nextCardScale, nextCardOpacity, prevCardScale, prevCardOpacity, currentIndex, coaches, width]);

  // Memoize the current coach to prevent unnecessary re-renders
  const currentCoach = coaches[currentIndex];
  const nextCoach = coaches[currentIndex + 1];
  const previousCoach = coaches[currentIndex - 1];

  const onHandlerStateChange = useCallback((event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      if (isAnimating) return;
      
      const { translationX, velocityX } = event.nativeEvent;
      // Tinder-style thresholds - more sensitive for better UX
      const swipeThreshold = width * 0.2; // Lower threshold
      const velocityThreshold = 500; // Higher velocity threshold for quick swipes
      const shouldSwipe = Math.abs(translationX) > swipeThreshold || Math.abs(velocityX) > velocityThreshold;

      if (shouldSwipe) {
        // Check boundaries
        if (translationX < 0 && currentIndex >= coaches.length - 1) {
          // Tinder-style snap back with velocity
          Animated.parallel([
            Animated.spring(translateX, { 
              toValue: 0, 
              useNativeDriver: true, 
              ...animationConfig.snapBack,
              velocity: velocityX / 1000, // Use velocity for natural momentum
            }),
            Animated.spring(scale, { 
              toValue: 1, 
              useNativeDriver: true, 
              ...animationConfig.snapBack,
            }),
            Animated.spring(opacity, { 
              toValue: 1, 
              useNativeDriver: true, 
              ...animationConfig.snapBack,
            }),
            Animated.spring(rotate, { 
              toValue: 0, 
              useNativeDriver: true, 
              ...animationConfig.snapBack,
            })
          ]).start();
          return;
        }

        if (translationX > 0 && currentIndex <= 0) {
          // Tinder-style snap back with velocity
          Animated.parallel([
            Animated.spring(translateX, { 
              toValue: 0, 
              useNativeDriver: true, 
              ...animationConfig.snapBack,
              velocity: velocityX / 1000, // Use velocity for natural momentum
            }),
            Animated.spring(scale, { 
              toValue: 1, 
              useNativeDriver: true, 
              ...animationConfig.snapBack,
            }),
            Animated.spring(opacity, { 
              toValue: 1, 
              useNativeDriver: true, 
              ...animationConfig.snapBack,
            }),
            Animated.spring(rotate, { 
              toValue: 0, 
              useNativeDriver: true, 
              ...animationConfig.snapBack,
            })
          ]).start();
          return;
        }

        setIsAnimating(true);
        
        // Tinder-style card transition with velocity-based momentum
        const isSwipeLeft = translationX < 0;
        const toValue = isSwipeLeft ? -width * 1.5 : width * 1.5; // Further exit for smooth feel
        // Use velocity to determine animation speed (Tinder style)
        const velocityFactor = Math.min(Math.abs(velocityX) / 1000, 1.5);
        const baseDuration = 300;
        const duration = Math.max(baseDuration - velocityFactor * 100, 200);
        
        // Animate current card out and next card in (Tinder style)
        Animated.parallel([
          // Current card exits with rotation and scale
          Animated.timing(translateX, {
            toValue,
            duration,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(scale, {
            toValue: 0.8,
            duration,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: duration * 0.8,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(rotate, {
            toValue: isSwipeLeft ? -25 : 25, // More pronounced rotation (Tinder style)
            duration,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          // Next card scales up from behind (Tinder style)
          // CRITICAL: Animate smoothly to final values
          isSwipeLeft ? Animated.parallel([
            Animated.timing(nextCardScale, {
              toValue: 1,
              duration,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            }),
            Animated.timing(nextCardOpacity, {
              toValue: 1,
              duration: duration * 0.9,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            })
          ]) : Animated.parallel([
            Animated.timing(prevCardScale, {
              toValue: 1,
              duration,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            }),
            Animated.timing(prevCardOpacity, {
              toValue: 1,
              duration: duration * 0.9,
              useNativeDriver: true,
              easing: Easing.out(Easing.cubic),
            })
          ])
        ]).start((finished) => {
          // Only proceed if animation completed successfully
          if (!finished) return;
          
          const newIndex = isSwipeLeft ? currentIndex + 1 : currentIndex - 1;
          
          // CRITICAL: The card that just became current is already at:
          // - translateX: 0 (centered, because nextCardTranslateX was 0)
          // - scale: 1.0 (from animation)
          // - opacity: 1.0 (from animation)
          // We need to ensure current card values match these exactly
          
          // Set current card values to match the card that just became current
          // This ensures NO position jump - the card stays exactly where it is
          translateY.setValue(0);
          translateX.setValue(0); // CRITICAL: Must be 0 to match nextCardTranslateX
          scale.setValue(1); // Already 1.0 from animation, but ensure it
          opacity.setValue(1); // Already 1.0 from animation, but ensure it
          rotate.setValue(0);
          
          // CRITICAL: Update state FIRST
          // The card that was "next" is now "current" and is already perfectly positioned
          setCurrentIndex(newIndex);
          
          // Reset NEW next/prev cards after state update
          // Use requestAnimationFrame to ensure smooth transition
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // Reset NEW next card (the one that will be next after transition)
              // CRITICAL: Always set translateX to 0 to keep it centered
              if (newIndex < coaches.length - 1) {
                nextCardTranslateX.setValue(0);
                nextCardOpacity.setValue(0);
                nextCardScale.setValue(0.95);
              }
              
              // Reset NEW prev card (the one that will be prev after transition)
              // CRITICAL: Always set translateX to 0 to keep it centered
              if (newIndex > 0) {
                prevCardTranslateX.setValue(0);
                prevCardOpacity.setValue(0);
                prevCardScale.setValue(0.95);
              }
              
              setIsAnimating(false);
            });
          });
        });
      } else {
        // Tinder-style snap back to center with velocity
        const snapBackAnimations = [
          Animated.spring(translateX, { 
            toValue: 0, 
            useNativeDriver: true, 
            ...animationConfig.snapBack,
            velocity: velocityX / 1000, // Use velocity for natural momentum
          }),
          Animated.spring(scale, { 
            toValue: 1, 
            useNativeDriver: true, 
            ...animationConfig.snapBack,
          }),
          Animated.spring(opacity, { 
            toValue: 1, 
            useNativeDriver: true, 
            ...animationConfig.snapBack,
          }),
          Animated.spring(rotate, { 
            toValue: 0, 
            useNativeDriver: true, 
            ...animationConfig.snapBack,
          })
        ];
        
        // Reset next/prev cards behind current (Tinder style)
        if (nextCoach) {
          snapBackAnimations.push(
            Animated.spring(nextCardScale, { 
              toValue: 0.95, 
              useNativeDriver: true, 
              ...animationConfig.spring,
            }),
            Animated.spring(nextCardOpacity, { 
              toValue: 0, 
              useNativeDriver: true, 
              ...animationConfig.spring,
            })
          );
        }
        if (previousCoach) {
          snapBackAnimations.push(
            Animated.spring(prevCardScale, { 
              toValue: 0.95, 
              useNativeDriver: true, 
              ...animationConfig.spring,
            }),
            Animated.spring(prevCardOpacity, { 
              toValue: 0, 
              useNativeDriver: true, 
              ...animationConfig.spring,
            })
          );
        }
        
        Animated.parallel(snapBackAnimations).start();
      }
    }
  }, [isAnimating, currentIndex, coaches.length, translateX, scale, opacity, rotate, nextCardScale, nextCardOpacity, prevCardScale, prevCardOpacity, nextCoach, previousCoach, animationConfig, width]);

  // Navigation arrow handlers (Tinder-style)
  const handleNextCoach = useCallback(() => {
    if (currentIndex < coaches.length - 1 && !isAnimating) {
      setIsAnimating(true);
      
      // Tinder-style animation for current card out and next card in
      Animated.parallel([
        // Current card exits
        Animated.timing(translateX, {
          toValue: -width * 1.5,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(rotate, {
          toValue: -25, // Tinder-style rotation
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        // Next card scales up from behind
        Animated.timing(nextCardScale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(nextCardOpacity, {
          toValue: 1,
          duration: 270,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        })
      ]).start(() => {
        const newIndex = currentIndex + 1;
        
        // CRITICAL: Ensure current card values match the card that just became current
        // The next card was at translateX: 0, scale: 1.0, opacity: 1.0
        translateY.setValue(0);
        translateX.setValue(0); // CRITICAL: Must be 0 to prevent position jump
        scale.setValue(1);
        opacity.setValue(1);
        rotate.setValue(0);
        
        // Update state FIRST
        setCurrentIndex(newIndex);
        
        // Reset NEW next/prev cards after state update
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (newIndex < coaches.length - 1) {
              nextCardTranslateX.setValue(0);
              nextCardOpacity.setValue(0);
              nextCardScale.setValue(0.95);
            }
            
            if (newIndex > 0) {
              prevCardTranslateX.setValue(0);
              prevCardOpacity.setValue(0);
              prevCardScale.setValue(0.95);
            }
            
            setIsAnimating(false);
          });
        });
      });
    }
  }, [currentIndex, coaches.length, isAnimating, translateX, translateY, scale, opacity, rotate, nextCardScale, nextCardOpacity, prevCardScale, prevCardOpacity, width]);

  const handlePreviousCoach = useCallback(() => {
    if (currentIndex > 0 && !isAnimating) {
      setIsAnimating(true);
      
      // Tinder-style animation for current card out and previous card in
      Animated.parallel([
        // Current card exits
        Animated.timing(translateX, {
          toValue: width * 1.5,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(rotate, {
          toValue: 25, // Tinder-style rotation
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        // Previous card scales up from behind
        Animated.timing(prevCardScale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(prevCardOpacity, {
          toValue: 1,
          duration: 270,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        })
      ]).start(() => {
        const newIndex = currentIndex - 1;
        
        // CRITICAL: Ensure current card values match the card that just became current
        // The prev card was at translateX: 0, scale: 1.0, opacity: 1.0
        translateY.setValue(0);
        translateX.setValue(0); // CRITICAL: Must be 0 to prevent position jump
        scale.setValue(1);
        opacity.setValue(1);
        rotate.setValue(0);
        
        // Update state FIRST
        setCurrentIndex(newIndex);
        
        // Reset NEW next/prev cards after state update
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (newIndex > 0) {
              prevCardTranslateX.setValue(0);
              prevCardOpacity.setValue(0);
              prevCardScale.setValue(0.95);
            }
            
            if (newIndex < coaches.length - 1) {
              nextCardTranslateX.setValue(0);
              nextCardOpacity.setValue(0);
              nextCardScale.setValue(0.95);
            }
            
            setIsAnimating(false);
          });
        });
      });
    }
  }, [currentIndex, coaches.length, isAnimating, translateX, translateY, scale, opacity, rotate, nextCardScale, nextCardOpacity, prevCardScale, prevCardOpacity, width]);





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
            {/* Previous Card - positioned behind current (Tinder style) */}
            {previousCoach && (
              <Animated.View
                style={[
                  styles.coachCard,
                  styles.absoluteCard,
                  {
                    transform: [
                      { translateX: prevCardTranslateX },
                      { scale: prevCardScale },
                    ],
                    opacity: prevCardOpacity,
                    zIndex: 0, // Behind current card
                  }
                ]}
                pointerEvents="none"
              >
                <CoachCard coach={previousCoach} onSelect={() => {}} scrollViewRef={null} />
              </Animated.View>
            )}
            
            {/* Next Card - positioned behind current (Tinder style) */}
            {nextCoach && (
              <Animated.View
                style={[
                  styles.coachCard,
                  styles.absoluteCard,
                  {
                    transform: [
                      { translateX: nextCardTranslateX },
                      { scale: nextCardScale },
                    ],
                    opacity: nextCardOpacity,
                    zIndex: 0, // Behind current card
                  }
                ]}
                pointerEvents="none"
              >
                <CoachCard coach={nextCoach} onSelect={() => {}} scrollViewRef={null} />
              </Animated.View>
            )}
            
            {/* Current Card - interactive */}
            <PanGestureHandler
              onGestureEvent={onGestureEvent}
              onHandlerStateChange={onHandlerStateChange}
              minPointers={1}
              maxPointers={1}
              activeOffsetX={[-8, 8]} // Lower threshold for more responsive swipes
              failOffsetY={[-10, 10]} // Slightly more lenient vertical threshold
              simultaneousHandlers={scrollViewRef?.current ? [scrollViewRef] : []}
              shouldCancelWhenOutside={false}
              enabled={!isAnimating}
            >
              <Animated.View
                style={[
                  styles.coachCard,
                  styles.currentCard,
                  {
                    transform: [
                      { translateX: translateX },
                      { translateY: translateY },
                      { scale: scale },
                      { rotate: rotate.interpolate({
                        inputRange: [-25, 0, 25],
                        outputRange: ['-25deg', '0deg', '25deg'],
                        extrapolate: 'clamp',
                      }) },
                    ],
                    opacity: opacity,
                  }
                ]}
              >
                <CoachCard coach={currentCoach} onSelect={() => handleCoachSelect(currentCoach)} scrollViewRef={scrollViewRef} />
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
    position: 'relative',
    minHeight: 650, // Minimum height to prevent layout shifts during transitions
    overflow: 'visible', // Changed to visible to see cards during swipe
  },
  absoluteCard: {
    position: 'absolute',
    zIndex: 1,
    alignSelf: 'center',
    top: '50%',
    marginTop: -290, // Half of card height (580/2) to center it vertically
  },
  currentCard: {
    zIndex: 2,
    position: 'relative',
    alignSelf: 'center',
    // Current card appears on top (Tinder style)
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 400,
    marginTop: 'auto',
    paddingTop: 20,
    paddingBottom: 10,
    paddingHorizontal: 10,
    position: 'relative',
    zIndex: 10,
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
