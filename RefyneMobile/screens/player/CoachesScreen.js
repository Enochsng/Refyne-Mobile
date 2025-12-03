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
import { PanGestureHandler, State, GestureHandlerRootView, NativeViewGestureHandler } from 'react-native-gesture-handler';
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
        <NativeViewGestureHandler ref={scrollViewRef} simultaneousHandlers={[]}>
          <ScrollView 
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
        </NativeViewGestureHandler>
        
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
  
  // Next and previous card animations for smooth transitions
  const nextCardTranslateX = useRef(new Animated.Value(width)).current;
  const nextCardOpacity = useRef(new Animated.Value(0)).current;
  const nextCardTranslateY = useRef(new Animated.Value(0)).current;
  const nextCardRotateY = useRef(new Animated.Value(90)).current; // Start rotated for flip-in effect
  const prevCardTranslateX = useRef(new Animated.Value(-width)).current;
  const prevCardOpacity = useRef(new Animated.Value(0)).current;
  const prevCardTranslateY = useRef(new Animated.Value(0)).current;
  const prevCardRotateY = useRef(new Animated.Value(-90)).current; // Start rotated for flip-in effect
  
  // Current card translateY to prevent vertical movement
  const translateY = useRef(new Animated.Value(0)).current;
  
  // Single card animation system - no preview cards
  const cardTransition = useRef(new Animated.Value(0)).current;
  
  // Optimized animation configuration for buttery smooth swipes with enhanced bounce
  const animationConfig = useRef({
    spring: {
      tension: 300,
      friction: 7,
      useNativeDriver: true,
    },
    bouncySpring: {
      tension: 200,
      friction: 5,
      useNativeDriver: true,
    },
    timing: {
      duration: 350,
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
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
      
      // Reset animation values for new data - ensure current card is centered
      translateX.setValue(0);
      translateY.setValue(0);
      scale.setValue(1);
      opacity.setValue(1);
      rotate.setValue(0);
      cardTransition.setValue(0);
      // Position next/prev cards off-screen with rotation
      nextCardTranslateX.setValue(width);
      nextCardOpacity.setValue(0);
      nextCardTranslateY.setValue(0);
      nextCardRotateY.setValue(90);
      prevCardTranslateX.setValue(-width);
      prevCardOpacity.setValue(0);
      prevCardTranslateY.setValue(0);
      prevCardRotateY.setValue(-90);
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

  // Update next/prev card positions when index changes (for smooth transitions)
  // Use useLayoutEffect to run synchronously before paint to prevent layout shifts
  useLayoutEffect(() => {
    if (coaches.length > 0) {
      // Lock all vertical positions immediately to prevent any layout shifts
      translateY.setValue(0);
      nextCardTranslateY.setValue(0);
      prevCardTranslateY.setValue(0);
      
      // Only update positions if not animating to prevent glitches
      if (!isAnimating) {
        // Position next card off-screen to the right with rotation
        if (currentIndex < coaches.length - 1) {
          nextCardTranslateX.setValue(width);
          nextCardOpacity.setValue(0);
          nextCardRotateY.setValue(90);
        }
        // Position prev card off-screen to the left with rotation
        if (currentIndex > 0) {
          prevCardTranslateX.setValue(-width);
          prevCardOpacity.setValue(0);
          prevCardRotateY.setValue(-90);
        }
      }
    }
  }, [currentIndex, coaches.length, isAnimating, nextCardTranslateX, prevCardTranslateX, nextCardOpacity, prevCardOpacity, nextCardTranslateY, prevCardTranslateY, translateY]);

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

  // Enhanced gesture handler for fun, dynamic swipes
  const onGestureEvent = useCallback(Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { 
      useNativeDriver: true,
      listener: (event) => {
        const { translationX } = event.nativeEvent;
        const absTranslationX = Math.abs(translationX);
        const progress = Math.min(absTranslationX / (width * 0.3), 1);
        
        // Subtle vertical movement for dynamic feel (very minimal)
        const verticalOffset = Math.sin(progress * Math.PI) * 3; // Very subtle bounce
        translateY.setValue(verticalOffset);
        nextCardTranslateY.setValue(verticalOffset * 0.3);
        prevCardTranslateY.setValue(verticalOffset * 0.3);
        
        // More pronounced scale effect for better visual feedback
        const scaleValue = 1 - (progress * 0.12); // More pronounced scale down
        scale.setValue(Math.max(scaleValue, 0.88));
        
        // Enhanced opacity effect
        const opacityValue = 1 - (progress * 0.4); // More pronounced fade
        opacity.setValue(Math.max(opacityValue, 0.6));
        
        // Subtle rotation effect for visual feedback during swipe
        const rotationProgress = Math.min(absTranslationX / width, 1);
        const rotationValue = (translationX / width) * 8; // Subtle 2D rotation (max 8 degrees)
        rotate.setValue(rotationValue);
        
        // Move next/prev cards during swipe for smoother transition
        const currentNextCoach = coaches[currentIndex + 1];
        const currentPrevCoach = coaches[currentIndex - 1];
        
        if (translationX < 0 && currentNextCoach) {
          // Swiping left - move next card in from right with enhanced flip
          const nextCardProgress = Math.min(absTranslationX / width, 1);
          // Simple easing function for smoother feel
          const easedProgress = 1 - Math.pow(1 - nextCardProgress, 2);
          nextCardTranslateX.setValue(width + translationX);
          nextCardOpacity.setValue(easedProgress * 0.8); // Increased fade-in
          // Enhanced flip in from right with smoother easing
          nextCardRotateY.setValue(90 - (easedProgress * 90));
        } else if (translationX > 0 && currentPrevCoach) {
          // Swiping right - move prev card in from left with enhanced flip
          const prevCardProgress = Math.min(absTranslationX / width, 1);
          // Simple easing function for smoother feel
          const easedProgress = 1 - Math.pow(1 - prevCardProgress, 2);
          prevCardTranslateX.setValue(-width + translationX);
          prevCardOpacity.setValue(easedProgress * 0.8); // Increased fade-in
          // Enhanced flip in from left with smoother easing
          prevCardRotateY.setValue(-90 + (easedProgress * 90));
        } else {
          // Reset next/prev cards when not swiping in their direction
          if (currentNextCoach) {
            nextCardTranslateX.setValue(width);
            nextCardOpacity.setValue(0);
            nextCardRotateY.setValue(90);
          }
          if (currentPrevCoach) {
            prevCardTranslateX.setValue(-width);
            prevCardOpacity.setValue(0);
            prevCardRotateY.setValue(-90);
          }
        }
      }
    }
  ), [translateX, translateY, scale, opacity, rotate, nextCardTranslateX, nextCardOpacity, nextCardTranslateY, prevCardTranslateX, prevCardOpacity, prevCardTranslateY, currentIndex, coaches, width]);

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
          // Enhanced snap back with bouncy spring
          Animated.parallel([
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true, ...animationConfig.bouncySpring }),
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, ...animationConfig.bouncySpring }),
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...animationConfig.bouncySpring }),
            Animated.spring(opacity, { toValue: 1, useNativeDriver: true, ...animationConfig.bouncySpring }),
            Animated.spring(rotate, { toValue: 0, useNativeDriver: true, ...animationConfig.bouncySpring })
          ]).start();
          return;
        }

        if (translationX > 0 && currentIndex <= 0) {
          // Enhanced snap back with bouncy spring
          Animated.parallel([
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true, ...animationConfig.bouncySpring }),
            Animated.spring(translateY, { toValue: 0, useNativeDriver: true, ...animationConfig.bouncySpring }),
            Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...animationConfig.bouncySpring }),
            Animated.spring(opacity, { toValue: 1, useNativeDriver: true, ...animationConfig.bouncySpring }),
            Animated.spring(rotate, { toValue: 0, useNativeDriver: true, ...animationConfig.bouncySpring })
          ]).start();
          return;
        }

        setIsAnimating(true);
        
        // Enhanced card transition with more dynamic animations
        const isSwipeLeft = translationX < 0;
        const toValue = isSwipeLeft ? -width * 1.3 : width * 1.3; // Slightly further for more dramatic exit
        const velocityFactor = Math.min(Math.abs(velocityX) / 1000, 1);
        const duration = Math.max(350 - velocityFactor * 100, 280); // Slightly longer for smoother feel
        
        // Animate current card out and next card in simultaneously with enhanced flip effect
        Animated.parallel([
          // Current card out with enhanced flip and bounce
          Animated.timing(translateX, {
            toValue,
            duration,
            useNativeDriver: true,
            easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          }),
          Animated.timing(translateY, {
            toValue: isSwipeLeft ? -15 : -15, // Slight upward movement on exit
            duration,
            useNativeDriver: true,
            easing: Easing.out(Easing.quad),
          }),
          Animated.timing(scale, {
            toValue: 0.8, // More pronounced scale down
            duration,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic),
          }),
          Animated.timing(rotate, {
            toValue: isSwipeLeft ? -8 : 8,
            duration,
            useNativeDriver: true,
            easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          }),
          // Next card in (from the side) with enhanced flip and bounce
          isSwipeLeft ? Animated.parallel([
            Animated.timing(nextCardTranslateX, {
              toValue: 0,
              duration,
              useNativeDriver: true,
              easing: Easing.bezier(0.34, 1.56, 0.64, 1), // Bouncy entrance
            }),
            Animated.timing(nextCardOpacity, {
              toValue: 1,
              duration: duration * 0.8, // Faster fade-in
              useNativeDriver: true,
              easing: Easing.out(Easing.quad),
            }),
            Animated.timing(nextCardTranslateY, {
              toValue: 0,
              duration,
              useNativeDriver: true,
              easing: Easing.bezier(0.34, 1.56, 0.64, 1), // Bouncy entrance
            }),
            Animated.timing(nextCardRotateY, {
              toValue: 0, // Flip in from 90 to 0
              duration,
              useNativeDriver: true,
              easing: Easing.bezier(0.34, 1.56, 0.64, 1), // Bouncy entrance
            })
          ]) : Animated.parallel([
            Animated.timing(prevCardTranslateX, {
              toValue: 0,
              duration,
              useNativeDriver: true,
              easing: Easing.bezier(0.34, 1.56, 0.64, 1), // Bouncy entrance
            }),
            Animated.timing(prevCardOpacity, {
              toValue: 1,
              duration: duration * 0.8, // Faster fade-in
              useNativeDriver: true,
              easing: Easing.out(Easing.quad),
            }),
            Animated.timing(prevCardTranslateY, {
              toValue: 0,
              duration,
              useNativeDriver: true,
              easing: Easing.bezier(0.34, 1.56, 0.64, 1), // Bouncy entrance
            }),
            Animated.timing(prevCardRotateY, {
              toValue: 0, // Flip in from -90 to 0
              duration,
              useNativeDriver: true,
              easing: Easing.bezier(0.34, 1.56, 0.64, 1), // Bouncy entrance
            })
          ])
        ]).start(() => {
          // Update index after animation completes
          const newIndex = isSwipeLeft ? currentIndex + 1 : currentIndex - 1;
          
          // Reset animations for new card positions BEFORE state update
          // Lock all vertical positions first to prevent glitches
          translateY.setValue(0);
          nextCardTranslateY.setValue(0);
          prevCardTranslateY.setValue(0);
          
          translateX.setValue(0);
          scale.setValue(1);
          opacity.setValue(1);
          rotate.setValue(0);
          
          // Reset next/prev card positions based on new index with rotation
          if (newIndex < coaches.length - 1) {
            nextCardTranslateX.setValue(width);
            nextCardOpacity.setValue(0);
            nextCardRotateY.setValue(90);
          }
          if (newIndex > 0) {
            prevCardTranslateX.setValue(-width);
            prevCardOpacity.setValue(0);
            prevCardRotateY.setValue(-90);
          }
          
          // Use requestAnimationFrame to ensure state update happens after layout
          requestAnimationFrame(() => {
            // Update state after positions are locked
            setCurrentIndex(newIndex);
            setIsAnimating(false);
          });
        });
      } else {
        // Enhanced snap back to center with bouncy spring
        const snapBackAnimations = [
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, ...animationConfig.bouncySpring }),
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, ...animationConfig.bouncySpring }),
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, ...animationConfig.bouncySpring }),
          Animated.spring(opacity, { toValue: 1, useNativeDriver: true, ...animationConfig.bouncySpring }),
          Animated.spring(rotate, { toValue: 0, useNativeDriver: true, ...animationConfig.bouncySpring })
        ];
        
        // Reset next/prev cards if they exist with rotation
        if (nextCoach) {
          snapBackAnimations.push(
            Animated.spring(nextCardTranslateX, { toValue: width, useNativeDriver: true, ...animationConfig.spring }),
            Animated.spring(nextCardTranslateY, { toValue: 0, useNativeDriver: true, ...animationConfig.spring }),
            Animated.spring(nextCardOpacity, { toValue: 0, useNativeDriver: true, ...animationConfig.spring }),
            Animated.spring(nextCardRotateY, { toValue: 90, useNativeDriver: true, ...animationConfig.spring })
          );
        }
        if (previousCoach) {
          snapBackAnimations.push(
            Animated.spring(prevCardTranslateX, { toValue: -width, useNativeDriver: true, ...animationConfig.spring }),
            Animated.spring(prevCardTranslateY, { toValue: 0, useNativeDriver: true, ...animationConfig.spring }),
            Animated.spring(prevCardOpacity, { toValue: 0, useNativeDriver: true, ...animationConfig.spring }),
            Animated.spring(prevCardRotateY, { toValue: -90, useNativeDriver: true, ...animationConfig.spring })
          );
        }
        
        Animated.parallel(snapBackAnimations).start();
      }
    }
  }, [isAnimating, currentIndex, coaches.length, translateX, translateY, scale, opacity, rotate, nextCardTranslateX, nextCardOpacity, nextCardTranslateY, nextCardRotateY, prevCardTranslateX, prevCardOpacity, prevCardTranslateY, prevCardRotateY, nextCoach, previousCoach, animationConfig, width]);

  // Navigation arrow handlers
  const handleNextCoach = useCallback(() => {
    if (currentIndex < coaches.length - 1 && !isAnimating) {
      setIsAnimating(true);
      
      // Enhanced animation for current card out to the left and next card in
      Animated.parallel([
        // Current card out with enhanced flip
        Animated.timing(translateX, {
          toValue: -width * 1.3,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        }),
        Animated.timing(translateY, {
          toValue: -15,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(rotate, {
          toValue: -8, // Rotate out to the left
          duration: 350,
          useNativeDriver: true,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        }),
        // Next card in with bouncy flip
        Animated.timing(nextCardTranslateX, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.bezier(0.34, 1.56, 0.64, 1),
        }),
        Animated.timing(nextCardOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
        Animated.timing(nextCardTranslateY, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.bezier(0.34, 1.56, 0.64, 1),
        }),
        Animated.timing(nextCardRotateY, {
          toValue: 0, // Flip in from 90 to 0
          duration: 350,
          useNativeDriver: true,
          easing: Easing.bezier(0.34, 1.56, 0.64, 1),
        })
      ]).start(() => {
        // Update index and reset animations
        const newIndex = currentIndex + 1;
        
        // Reset animations BEFORE state update
        // Lock all vertical positions first to prevent glitches
        translateY.setValue(0);
        nextCardTranslateY.setValue(0);
        prevCardTranslateY.setValue(0);
        
        translateX.setValue(0);
        scale.setValue(1);
        opacity.setValue(1);
        rotate.setValue(0);
        
        // Reset next card position if there's still a next card with rotation
        if (newIndex < coaches.length - 1) {
          nextCardTranslateX.setValue(width);
          nextCardOpacity.setValue(0);
          nextCardRotateY.setValue(90);
        }
        // Reset prev card position with rotation
        if (newIndex > 0) {
          prevCardTranslateX.setValue(-width);
          prevCardOpacity.setValue(0);
          prevCardRotateY.setValue(-90);
        }
        
        // Use requestAnimationFrame to ensure state update happens after layout
        requestAnimationFrame(() => {
          // Update state after positions are locked
          setCurrentIndex(newIndex);
          setIsAnimating(false);
        });
      });
    }
  }, [currentIndex, coaches.length, isAnimating, translateX, translateY, scale, opacity, rotate, nextCardTranslateX, nextCardOpacity, nextCardTranslateY, nextCardRotateY, prevCardTranslateX, prevCardOpacity, prevCardTranslateY, prevCardRotateY, width]);

  const handlePreviousCoach = useCallback(() => {
    if (currentIndex > 0 && !isAnimating) {
      setIsAnimating(true);
      
      // Enhanced animation for current card out to the right and previous card in
      Animated.parallel([
        // Current card out with enhanced flip
        Animated.timing(translateX, {
          toValue: width * 1.3,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        }),
        Animated.timing(translateY, {
          toValue: -15,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
        Animated.timing(rotate, {
          toValue: 8, // Rotate out to the right
          duration: 350,
          useNativeDriver: true,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        }),
        // Previous card in with bouncy flip
        Animated.timing(prevCardTranslateX, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.bezier(0.34, 1.56, 0.64, 1),
        }),
        Animated.timing(prevCardOpacity, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
        Animated.timing(prevCardTranslateY, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
          easing: Easing.bezier(0.34, 1.56, 0.64, 1),
        }),
        Animated.timing(prevCardRotateY, {
          toValue: 0, // Flip in from -90 to 0
          duration: 350,
          useNativeDriver: true,
          easing: Easing.bezier(0.34, 1.56, 0.64, 1),
        })
      ]).start(() => {
        // Update index and reset animations
        const newIndex = currentIndex - 1;
        
        // Reset animations BEFORE state update
        // Lock all vertical positions first to prevent glitches
        translateY.setValue(0);
        nextCardTranslateY.setValue(0);
        prevCardTranslateY.setValue(0);
        
        translateX.setValue(0);
        scale.setValue(1);
        opacity.setValue(1);
        rotate.setValue(0);
        
        // Reset prev card position if there's still a prev card with rotation
        if (newIndex > 0) {
          prevCardTranslateX.setValue(-width);
          prevCardOpacity.setValue(0);
          prevCardRotateY.setValue(-90);
        }
        // Reset next card position with rotation
        if (newIndex < coaches.length - 1) {
          nextCardTranslateX.setValue(width);
          nextCardOpacity.setValue(0);
          nextCardRotateY.setValue(90);
        }
        
        // Use requestAnimationFrame to ensure state update happens after layout
        requestAnimationFrame(() => {
          // Update state after positions are locked
          setCurrentIndex(newIndex);
          setIsAnimating(false);
        });
      });
    }
  }, [currentIndex, coaches.length, isAnimating, translateX, translateY, scale, opacity, rotate, nextCardTranslateX, nextCardOpacity, nextCardTranslateY, nextCardRotateY, prevCardTranslateX, prevCardOpacity, prevCardTranslateY, prevCardRotateY, width]);





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
            {/* Previous Card - positioned off-screen to the left */}
            {previousCoach && (
              <Animated.View
                style={[
                  styles.coachCard,
                  styles.absoluteCard,
                  {
                    transform: [
                      { translateX: prevCardTranslateX },
                      { translateY: prevCardTranslateY },
                      { rotateY: prevCardRotateY.interpolate({
                        inputRange: [-90, 0],
                        outputRange: ['-90deg', '0deg']
                      }) },
                    ],
                    opacity: prevCardOpacity,
                  }
                ]}
                pointerEvents="none"
              >
                <CoachCard coach={previousCoach} onSelect={() => {}} scrollViewRef={null} />
              </Animated.View>
            )}
            
            {/* Next Card - positioned off-screen to the right */}
            {nextCoach && (
              <Animated.View
                style={[
                  styles.coachCard,
                  styles.absoluteCard,
                  {
                    transform: [
                      { translateX: nextCardTranslateX },
                      { translateY: nextCardTranslateY },
                      { rotateY: nextCardRotateY.interpolate({
                        inputRange: [0, 90],
                        outputRange: ['0deg', '90deg']
                      }) },
                    ],
                    opacity: nextCardOpacity,
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
              activeOffsetX={[-10, 10]} // Threshold for horizontal swipe activation
              failOffsetY={[-8, 8]} // Fail if vertical movement is too much
              simultaneousHandlers={scrollViewRef ? [scrollViewRef] : []}
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
                        inputRange: [-8, 0, 8],
                        outputRange: ['-8deg', '0deg', '8deg']
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
    // Use relative positioning for current card to ensure transforms work properly
    // The container's justifyContent: 'center' will center it vertically
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
