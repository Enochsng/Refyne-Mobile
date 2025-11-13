import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Image,
  Alert,
  Linking,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { createDestinationCharge, testBackendConnection, attemptDirectPayment, confirmPaymentIntent } from '../../services/paymentService';
import { useStripe } from '@stripe/stripe-react-native';
import { createCoachingSession } from '../../utils/sessionManager';
import { createConversation } from '../../services/conversationService';
import { supabase } from '../../supabaseClient';

const { width, height } = Dimensions.get('window');

// Coaching packages data - will be set based on sport
const getCoachingPackages = (sport) => {
  if (sport.toLowerCase() === 'golf') {
    return [
      {
        id: 1,
        name: '5 Clips Package',
        price: '$40',
        features: [
          'Send up to 5 clips per package',
          'Coaching session open for 3 days',
          'Send up to 5 messages per day',
          'Get quality and personalized feedback',
        ],
        popular: false,
        gradient: ['#6B7280', '#4B5563'],
      },
      {
        id: 2,
        name: '7 Clips Package',
        price: '$45',
        features: [
          'Send up to 7 clips per package',
          'Coaching session open for 5 days',
          'Send up to 5 messages per day',
          'Get quality and personalized feedback',
        ],
        popular: true,
        gradient: ['#0C295C', '#1A4A7A'],
      },
      {
        id: 3,
        name: '10 Clips Package',
        price: '$50',
        features: [
          'Send up to 10 clips per package',
          'Coaching session open for 7 days',
          'Send up to 5 messages per day',
          'Get quality and personalized feedback',
        ],
        popular: false,
        gradient: ['#059669', '#047857'],
      },
    ];
  } else {
    // Badminton packages (current pricing)
    return [
      {
        id: 1,
        name: '5 Clips Package',
        price: '$35',
        features: [
          'Send up to 5 clips per package',
          'Coaching session open for 3 days',
          'Send up to 5 messages per day',
          'Get quality and personalized feedback',
        ],
        popular: false,
        gradient: ['#6B7280', '#4B5563'],
      },
      {
        id: 2,
        name: '7 Clips Package',
        price: '$40',
        features: [
          'Send up to 7 clips per package',
          'Coaching session open for 5 days',
          'Send up to 5 messages per day',
          'Get quality and personalized feedback',
        ],
        popular: true,
        gradient: ['#0C295C', '#1A4A7A'],
      },
      {
        id: 3,
        name: '10 Clips Package',
        price: '$45',
        features: [
          'Send up to 10 clips per package',
          'Coaching session open for 7 days',
          'Send up to 5 messages per day',
          'Get quality and personalized feedback',
        ],
        popular: false,
        gradient: ['#059669', '#047857'],
      },
    ];
  }
};

export default function PaywallScreen({ route, navigation }) {
  const { coach, sport } = route.params;
  const [selectedPackage, setSelectedPackage] = useState(2); // Default to Premium
  const [selectedSubscription, setSelectedSubscription] = useState(false); // Track subscription selection
  const [loading, setLoading] = useState(false);
  const [paymentSheetEnabled, setPaymentSheetEnabled] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  
  // Stripe hook
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  
  // Get packages based on sport
  const coachingPackages = getCoachingPackages(sport);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // Initialize payment sheet when component mounts OR when package selection changes
  useEffect(() => {
    // Only initialize if a package or subscription is selected
    if (selectedPackage || selectedSubscription) {
      initializePaymentSheet();
    }
  }, [selectedPackage, selectedSubscription]);

  // Calculate pricing
  const getPackagePrice = () => {
    if (selectedSubscription) {
      return sport.toLowerCase() === 'golf' ? 7500 : 7000; // $75 or $70 in cents
    } else {
      // Package pricing based on sport
      const packagePrices = {
        golf: { 1: 4000, 2: 4500, 3: 5000 }, // $40, $45, $50
        badminton: { 1: 3500, 2: 4000, 3: 4500 }, // $35, $40, $45
      };
      const sportKey = sport.toLowerCase();
      return packagePrices[sportKey]?.[selectedPackage] || 4000;
    }
  };

  const initializePaymentSheet = async () => {
    try {
      setLoading(true);

      // Create payment intent using the payment service
      const paymentData = {
        coach,
        sport,
        selectedPackage,
        selectedSubscription,
        player: {
          id: route?.params?.playerId || 'temp_user_session',
          name: route?.params?.playerName || 'Player',
          email: route?.params?.playerEmail || 'player@example.com'
        }
      };

      console.log('Initializing payment sheet with data:', paymentData);
      console.log('  - selectedPackage:', selectedPackage);
      console.log('  - selectedSubscription:', selectedSubscription);

      let paymentResult;
      try {
        // Try the normal payment creation first
        paymentResult = await createDestinationCharge(paymentData);
      } catch (error) {
        console.log('Normal payment creation failed, trying direct payment approach:', error.message);
        // If that fails, try the direct payment approach
        paymentResult = await attemptDirectPayment(paymentData);
      }
      
      const paymentIntent = paymentResult.paymentIntent;
      
      // Store the payment intent ID for later use
      setPaymentIntentId(paymentIntent.id);

      console.log('Payment intent created, initializing payment sheet...');

      // Check if this is a mock payment intent (for development)
      if (paymentIntent.id.startsWith('pi_mock_')) {
        console.log('Mock payment intent detected - skipping Stripe Payment Sheet initialization');
        setPaymentSheetEnabled(true);
        return;
      }

      const { error } = await initPaymentSheet({
        merchantDisplayName: 'Refyne Mobile',
        paymentIntentClientSecret: paymentIntent.client_secret,
        allowsDelayedPaymentMethods: true,
        returnURL: 'refynemobile://stripe-return',
      });

      if (error) {
        console.error('Error initializing payment sheet:', error);
        Alert.alert(
          'Payment Setup Error', 
          `Failed to initialize payment: ${error.message || 'Unknown error'}. Please try again.`
        );
        return;
      }

      console.log('Payment sheet initialized successfully');
      setPaymentSheetEnabled(true);
    } catch (error) {
      console.error('Error setting up payment:', error);
      Alert.alert(
        'Payment Setup Error', 
        error.message || 'Failed to set up payment. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      console.log('Payment success flow started');
      
      // Create local coaching session for the app (this should always work)
      const localSessionData = {
        coachId: coach.id,
        coachName: coach.name,
        sport: sport,
        packageType: selectedSubscription ? 'subscription' : 'package',
        packageId: selectedPackage,
        amount: getPackagePrice(),
        paymentMethod: 'stripe',
        paymentStatus: 'completed',
      };

      console.log('Creating local coaching session...');
      const newSession = await createCoachingSession(localSessionData);
      console.log('Local session created:', newSession);
      
      // Try to confirm payment with backend (optional - don't fail if this doesn't work)
      let confirmedSession = null;
      try {
        const sessionData = {
          coachId: coach.id,
          coachName: coach.name,
          sport: sport,
          packageType: selectedSubscription ? 'subscription' : 'package',
          packageId: selectedPackage,
        };

        console.log('Confirming payment with backend...');
        confirmedSession = await confirmPaymentIntent(
          paymentIntentId, // Use the actual payment intent ID
          sessionData
        );
        console.log('Payment confirmed with backend:', confirmedSession);
      } catch (backendError) {
        console.log('Backend confirmation failed (non-critical):', backendError.message);
        // Continue with the flow even if backend confirmation fails
      }

      // Try to create a conversation between player and coach (optional)
      let conversation = null;
      try {
        // Get the authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Authentication check - User:', user ? 'Found' : 'Not found');
        
        if (user) {
          const playerId = user.id;
          console.log('Creating conversation for authenticated player:', playerId);
          
          // Get player name from user metadata
          let playerName = 'Player'; // Default fallback
          if (user.user_metadata?.full_name) {
            playerName = user.user_metadata.full_name;
          } else if (user.user_metadata?.name) {
            playerName = user.user_metadata.name;
          } else if (user.user_metadata?.display_name) {
            playerName = user.user_metadata.display_name;
          } else if (user.email) {
            // Use email prefix as fallback
            playerName = user.email.split('@')[0];
          }
          
          console.log('Player name for conversation:', playerName);
          
          // Use the session ID from the backend if available, otherwise use local session ID
          const sessionIdToUse = confirmedSession?.session?.id || newSession.id;
          console.log('Using session ID for conversation:', sessionIdToUse);
          console.log('  - Backend session ID:', confirmedSession?.session?.id || 'not available');
          console.log('  - Local session ID:', newSession.id);
          
          const conversationData = {
            playerId: playerId,
            playerName: playerName,
            coachId: coach.id,
            coachName: coach.name,
            sport: sport,
            sessionId: sessionIdToUse
          };

          conversation = await createConversation(conversationData);
          console.log('Conversation created successfully:', conversation.id);
          console.log('  - Conversation linked to session:', sessionIdToUse);

          // Note: Welcome message removed as requested
        } else {
          console.log('No authenticated user found - skipping conversation creation');
        }
      } catch (conversationError) {
        console.error('Error creating conversation (non-critical):', conversationError);
        // Continue with the flow even if conversation creation fails
      }

      // Always show success message regardless of conversation creation
      Alert.alert(
        'Payment Successful!',
        `Your coaching session with ${coach.name} has been activated. You can now start chatting and uploading your clips!`,
        [
          {
            text: 'Start Session',
            onPress: () => {
              // Navigate to coaching session screen
              navigation.navigate('CoachFeedback', { 
                sessionId: newSession.id,
                sessionData: newSession,
                conversationId: conversation?.id, // Include conversation ID if available
                isNewSession: true 
              });
            },
          },
        ]
      );
    } catch (error) {
      console.error('Critical error in payment success flow:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        type: error.constructor?.name || 'Unknown'
      });
      
      // Even if there's a critical error, show a basic success message
      Alert.alert(
        'Payment Successful!',
        'Your payment was processed successfully. You can now start your coaching session!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  };
  
  // Package card animations
  const packageAnimations = useRef(
    coachingPackages.map(() => ({
      pressScale: new Animated.Value(1),
      pressTranslateY: new Animated.Value(0),
      entranceOpacity: new Animated.Value(0),
      entranceTranslateY: new Animated.Value(50),
      entranceScale: new Animated.Value(0.95),
    }))
  ).current;

  // Subscription card animations
  const subscriptionAnimations = useRef({
    pressScale: new Animated.Value(1),
    pressTranslateY: new Animated.Value(0),
    entranceOpacity: new Animated.Value(0),
    entranceTranslateY: new Animated.Value(50),
    entranceScale: new Animated.Value(0.95),
  }).current;

  useEffect(() => {
    // Start entrance animations
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

    // Start package card animations with staggered delay
    packageAnimations.forEach((packageAnim, index) => {
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(packageAnim.entranceOpacity, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
          Animated.spring(packageAnim.entranceTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
          Animated.spring(packageAnim.entranceScale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
        ]).start();
      }, index * 150);
    });

    // Start subscription card animation
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(subscriptionAnimations.entranceOpacity, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.spring(subscriptionAnimations.entranceTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.spring(subscriptionAnimations.entranceScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
      ]).start();
    }, coachingPackages.length * 150);
  }, []);

  const handlePackageSelect = (packageId) => {
    setSelectedPackage(packageId);
    setSelectedSubscription(false); // Deselect subscription when package is selected
  };

  const handleSubscriptionSelect = () => {
    setSelectedSubscription(true);
    setSelectedPackage(null); // Deselect package when subscription is selected
  };

  const handleCardPressIn = (index) => {
    Animated.parallel([
      Animated.spring(packageAnimations[index].pressScale, {
        toValue: 0.96,
        useNativeDriver: true,
        tension: 300,
        friction: 8,
      }),
      Animated.spring(packageAnimations[index].pressTranslateY, {
        toValue: -2,
        useNativeDriver: true,
        tension: 300,
        friction: 8,
      }),
    ]).start();
  };

  const handleCardPressOut = (index) => {
    Animated.parallel([
      Animated.spring(packageAnimations[index].pressScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 8,
      }),
      Animated.spring(packageAnimations[index].pressTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 300,
        friction: 8,
      }),
    ]).start();
  };

  const handleSubscriptionPressIn = () => {
    Animated.parallel([
      Animated.spring(subscriptionAnimations.pressScale, {
        toValue: 0.96,
        useNativeDriver: true,
        tension: 300,
        friction: 8,
      }),
      Animated.spring(subscriptionAnimations.pressTranslateY, {
        toValue: -2,
        useNativeDriver: true,
        tension: 300,
        friction: 8,
      }),
    ]).start();
  };

  const handleSubscriptionPressOut = () => {
    Animated.parallel([
      Animated.spring(subscriptionAnimations.pressScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 8,
      }),
      Animated.spring(subscriptionAnimations.pressTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 300,
        friction: 8,
      }),
    ]).start();
  };

  const handlePurchase = async () => {
    if (!selectedSubscription && !selectedPackage) {
      Alert.alert('Selection Required', 'Please select a package or subscription to continue.');
      return;
    }

    if (!paymentSheetEnabled) {
      Alert.alert('Error', 'Payment is not ready. Please wait and try again.');
      return;
    }

    try {
      setLoading(true);
      
      // Check if this is a mock payment intent (for development)
      if (paymentIntentId && paymentIntentId.startsWith('pi_mock_')) {
        console.log('Mock payment - simulating successful payment');
        // Simulate a successful payment for development
        setTimeout(() => {
          handlePaymentSuccess();
        }, 1000);
        return;
      }

      const { error } = await presentPaymentSheet();

      if (error) {
        if (error.code === 'Canceled') {
          // User canceled the payment
          console.log('Payment canceled by user');
        } else {
          console.error('Payment error:', error);
          Alert.alert('Payment Error', error.message || 'Payment failed. Please try again.');
        }
      } else {
        // Payment succeeded
        console.log('Payment successful!');
        handlePaymentSuccess();
      }
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
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
            <View style={styles.headerInner}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="#0C295C" />
              </TouchableOpacity>
              
              <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>Choose Your Package</Text>
                <Text style={styles.headerSubtitle}>
                  Select a coaching package to start your journey with {coach.name}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Coach Info Section */}
        <Animated.View 
          style={[
            styles.coachInfoContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <View style={styles.coachInfoCard}>
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
            <View style={styles.coachDetails}>
              <Text style={styles.coachName}>{coach.name}</Text>
              <Text style={styles.coachSport}>{sport} Coach</Text>
              <Text style={styles.coachExperience}>
                {coach.experience} years of experience
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Main Content */}
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.mainContent}>
            {/* Packages Section */}
            <View style={styles.packagesContainer}>
              <Text style={styles.sectionTitle}>Available Packages</Text>
              <Text style={styles.sectionSubtitle}>
                Choose the package that best fits your training needs
              </Text>
              
              {coachingPackages.map((pkg, index) => (
                <Animated.View
                  key={pkg.id}
                  style={[
                    styles.packageCardContainer,
                    {
                      opacity: packageAnimations[index].entranceOpacity,
                      transform: [
                        { translateY: packageAnimations[index].entranceTranslateY },
                        { scale: packageAnimations[index].entranceScale },
                        { scale: packageAnimations[index].pressScale },
                        { translateY: packageAnimations[index].pressTranslateY },
                      ],
                    }
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.packageCard,
                      selectedPackage === pkg.id && styles.selectedPackageCard,
                      pkg.popular && styles.popularPackageCard,
                    ]}
                    onPress={() => handlePackageSelect(pkg.id)}
                    onPressIn={() => handleCardPressIn(index)}
                    onPressOut={() => handleCardPressOut(index)}
                    activeOpacity={1}
                  >
                    {pkg.popular && (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                      </View>
                    )}
                    
                    <View style={[styles.packageHeader, pkg.popular && styles.packageHeaderPopular]}>
                      <View style={styles.packageTitleRow}>
                        <Text style={styles.packageName}>{pkg.name}</Text>
                        {selectedPackage === pkg.id && (
                          <View style={styles.selectedIndicatorInline}>
                            <Ionicons name="checkmark-circle" size={24} color="#0C295C" />
                          </View>
                        )}
                      </View>
                      <View style={styles.priceContainer}>
                        <Text style={styles.packagePrice}>{pkg.price}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.featuresContainer}>
                      {pkg.features.map((feature, featureIndex) => (
                        <View key={featureIndex} style={styles.featureItem}>
                          <Ionicons name="checkmark-circle" size={18} color="#059669" />
                          <Text style={styles.featureText}>{feature}</Text>
                        </View>
                      ))}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))}
              
              {/* Subscription Card */}
              <Animated.View
                style={[
                  styles.subscriptionCardContainer,
                  {
                    opacity: subscriptionAnimations.entranceOpacity,
                    transform: [
                      { translateY: subscriptionAnimations.entranceTranslateY },
                      { scale: subscriptionAnimations.entranceScale },
                      { scale: subscriptionAnimations.pressScale },
                      { translateY: subscriptionAnimations.pressTranslateY },
                    ],
                  }
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.subscriptionCard,
                    selectedSubscription && styles.selectedSubscriptionCard,
                  ]}
                  onPress={handleSubscriptionSelect}
                  onPressIn={handleSubscriptionPressIn}
                  onPressOut={handleSubscriptionPressOut}
                  activeOpacity={1}
                >
                  <View style={styles.subscriptionHeader}>
                    <View style={styles.subscriptionTitleRow}>
                      <View style={styles.subscriptionIconTitle}>
                        <Ionicons name="infinite" size={24} color="white" />
                        <Text style={styles.subscriptionTitle}>Monthly Subscription</Text>
                      </View>
                      {selectedSubscription && (
                        <View style={styles.subscriptionSelectedIndicator}>
                          <Ionicons name="checkmark-circle" size={24} color="white" />
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.subscriptionContent}>
                    <Text style={styles.subscriptionDescription}>
                      Send your coach up to 50 clips every month and have no session limit!
                    </Text>
                    
                    <View style={styles.subscriptionPriceContainer}>
                      <Text style={styles.subscriptionPrice}>
                        {sport.toLowerCase() === 'golf' ? '$75' : '$70'}
                      </Text>
                      <Text style={styles.subscriptionPricePeriod}>/month</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </ScrollView>

        {/* Purchase Button */}
        <Animated.View 
          style={[
            styles.purchaseContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <TouchableOpacity 
            style={[styles.purchaseButton, loading && styles.purchaseButtonDisabled]} 
            onPress={handlePurchase}
            disabled={loading || !paymentSheetEnabled}
          >
            <LinearGradient
              colors={loading ? ['#94A3B8', '#64748B'] : ['#0C295C', '#1A4A7A', '#2D5A8A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.purchaseButtonGradient}
            >
              {/* Subtle shimmer overlay */}
              <View style={styles.shimmerOverlay} />
              
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.purchaseButtonText}>Processing...</Text>
                </View>
              ) : (
                <View style={styles.purchaseButtonContent}>
                  <View style={styles.purchaseButtonLeft}>
                    <Ionicons name="card" size={18} color="rgba(255, 255, 255, 0.95)" />
                    <Text style={styles.purchaseButtonText} numberOfLines={1}>
                      {selectedSubscription 
                        ? `Purchase Monthly Subscription with ${coach.name}`
                        : `Purchase ${coachingPackages.find(pkg => pkg.id === selectedPackage)?.name || ''} with ${coach.name}`
                      }
                    </Text>
                  </View>
                  <Text style={styles.purchaseButtonPrice}>
                    {selectedSubscription 
                      ? (sport.toLowerCase() === 'golf' ? '$75' : '$70')
                      : coachingPackages.find(pkg => pkg.id === selectedPackage)?.price || '$0'
                    }
                  </Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  headerContainer: {
    marginBottom: 8,
    backgroundColor: '#F8FAFF',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 16 : 24,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#F8FAFF',
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: width * 0.065,
    fontFamily: 'Rubik-Bold',
    color: '#0C295C',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: width * 0.038,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    lineHeight: 20,
  },
  coachInfoContainer: {
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 24,
  },
  coachInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  coachAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#0C295C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  coachInitial: {
    fontSize: 24,
    fontFamily: 'Rubik-Bold',
    color: 'white',
  },
  coachProfileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  coachDetails: {
    flex: 1,
  },
  coachName: {
    fontSize: width * 0.05,
    fontFamily: 'Rubik-Bold',
    color: '#0C295C',
    marginBottom: 4,
  },
  coachSport: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Medium',
    color: '#64748B',
    marginBottom: 2,
  },
  coachExperience: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Regular',
    color: '#94A3B8',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Extra padding to account for fixed purchase button
  },
  mainContent: {
    padding: 24,
    paddingTop: 0,
  },
  packagesContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: width * 0.06,
    fontFamily: 'Rubik-Bold',
    color: '#0C295C',
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  packageCardContainer: {
    marginBottom: 16,
  },
  packageCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    paddingTop: 28,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    position: 'relative',
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'visible',
  },
  selectedPackageCard: {
    borderColor: '#0C295C',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  popularPackageCard: {
    borderColor: '#0C295C',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    alignSelf: 'center',
    backgroundColor: '#0C295C',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  popularBadgeText: {
    fontSize: width * 0.032,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  packageHeader: {
    marginBottom: 20,
    paddingTop: 8,
  },
  packageHeaderPopular: {
    paddingTop: 20,
  },
  packageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  packageName: {
    fontSize: width * 0.055,
    fontFamily: 'Rubik-Bold',
    color: '#0C295C',
    flex: 1,
  },
  selectedIndicatorInline: {
    marginLeft: 12,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  packagePrice: {
    fontSize: width * 0.08,
    fontFamily: 'Rubik-Bold',
    color: '#0C295C',
  },
  packageDuration: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    marginLeft: 4,
  },
  featuresContainer: {
    marginTop: 4,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  featureText: {
    fontSize: width * 0.038,
    fontFamily: 'Manrope-Medium',
    color: '#374151',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  purchaseContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    backgroundColor: 'rgba(248, 250, 255, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(12, 41, 92, 0.1)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  purchaseButton: {
    borderRadius: 16,
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  purchaseButtonDisabled: {
    shadowOpacity: 0.1,
    elevation: 2,
  },
  purchaseButtonGradient: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
  },
  purchaseButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  purchaseButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  purchaseButtonText: {
    fontSize: width * 0.038,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginLeft: 10,
    flex: 1,
  },
  purchaseButtonPrice: {
    fontSize: width * 0.048,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscriptionCardContainer: {
    marginBottom: 24,
    marginTop: 8,
  },
  subscriptionCard: {
    backgroundColor: '#0C295C',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#1A4A7A',
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
  },
  selectedSubscriptionCard: {
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  subscriptionSelectedIndicator: {
    marginLeft: 12,
  },
  subscriptionHeader: {
    marginBottom: 16,
  },
  subscriptionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subscriptionIconTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: width * 0.055,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    marginLeft: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  subscriptionContent: {
    flex: 1,
  },
  subscriptionDescription: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
    marginBottom: 20,
    textAlign: 'center',
  },
  subscriptionPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  subscriptionPrice: {
    fontSize: width * 0.08,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subscriptionPricePeriod: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 4,
  },
});
