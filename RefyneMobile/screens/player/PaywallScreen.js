import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { createDestinationCharge, attemptDirectPayment, confirmPaymentIntent } from '../../services/paymentService';
// Conditionally import Stripe to prevent initialization errors
let useStripe = null;
try {
  const stripeModule = require('@stripe/stripe-react-native');
  useStripe = stripeModule.useStripe || (() => ({ initPaymentSheet: () => Promise.resolve({ error: null }), presentPaymentSheet: () => Promise.resolve({ error: { message: 'Stripe not available' } }) }));
} catch (error) {
  console.warn('Stripe hook not available:', error);
  useStripe = () => ({ initPaymentSheet: () => Promise.resolve({ error: null }), presentPaymentSheet: () => Promise.resolve({ error: { message: 'Stripe not available' } }) });
}
import { createCoachingSession } from '../../utils/sessionManager';
import { supabase } from '../../supabaseClient';

const { width } = Dimensions.get('window');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isValidAuthUuid = (id) => typeof id === 'string' && UUID_REGEX.test(id);

const COLORS = {
  primary: '#0C295C',
  primaryMid: '#1A4A7A',
  bgApp: '#F8FAFF',
  textMuted: '#64748B',
  textPlaceholder: '#90A4AE',
  warning: '#FF6B35',
  success: '#4CAF50',
  borderSubtle: 'rgba(12, 41, 92, 0.06)',
  borderLight: 'rgba(12, 41, 92, 0.08)',
  white: '#FFFFFF',
  badgePopularBg: '#FFE8DE',
  badgeValueBg: '#E8EEF4',
  badgeValueText: '#1E1E1E',
};

const buildPackageFeatures = (clips, sessionDays) => [
  `Send up to ${clips} clips per package`,
  `Coaching session open for ${sessionDays} days`,
  'Send up to 5 messages per day',
  'Quality, personalized feedback',
];

const getCoachingPackages = (sport) => {
  const isGolf = sport.toLowerCase() === 'golf';
  const tiers = isGolf
    ? [
        { clips: 5, price: '40', days: 3 },
        { clips: 7, price: '45', days: 5 },
        { clips: 10, price: '50', days: 7 },
      ]
    : [
        { clips: 5, price: '35', days: 3 },
        { clips: 7, price: '40', days: 5 },
        { clips: 10, price: '45', days: 7 },
      ];

  const badgeByClips = {
    5: null,
    7: 'mostPopular',
    10: 'bestValue',
  };

  return tiers.map((tier, index) => ({
    id: index + 1,
    clips: tier.clips,
    name: `${tier.clips} Clips Pack`,
    price: `$${tier.price}`,
    priceAmount: tier.price,
    features: buildPackageFeatures(tier.clips, tier.days),
    badge: badgeByClips[tier.clips] ?? null,
  }));
};

export default function PaywallScreen({ route, navigation }) {
  const { coach, sport, existingConversationId } = route.params;
  const [selectedPackage, setSelectedPackage] = useState(2);
  const [isPurchasing, setIsPurchasing] = useState(false);
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
    // Only initialize if a package is selected
    if (selectedPackage) {
      initializePaymentSheet();
    }
  }, [selectedPackage]);

  // Calculate pricing
  const getPackagePrice = () => {
    // Package pricing based on sport (volleyball same as badminton)
    const packagePrices = {
      golf: { 1: 4000, 2: 4500, 3: 5000 }, // $40, $45, $50
      badminton: { 1: 3500, 2: 4000, 3: 4500 }, // $35, $40, $45
      volleyball: { 1: 3500, 2: 4000, 3: 4500 }, // same as badminton
    };
    const sportKey = sport.toLowerCase();
    return packagePrices[sportKey]?.[selectedPackage] || 4000;
  };

  const initializePaymentSheet = async () => {
    try {
      setPaymentSheetEnabled(false);

      // Create payment intent using the payment service
      const paymentData = {
        coach,
        sport,
        selectedPackage,
        selectedSubscription: false,
        player: {
          id: route?.params?.playerId || 'temp_user_session',
          name: route?.params?.playerName || 'Player',
          email: route?.params?.playerEmail || 'player@example.com'
        }
      };

      console.log('Initializing payment sheet with data:', paymentData);
      console.log('  - selectedPackage:', selectedPackage);

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
        packageType: 'package',
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
          packageType: 'package',
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

      // Create or reactivate conversation only after backend payment confirmation
      let conversation = null;
      try {
        if (!confirmedSession?.id) {
          console.log('Skipping conversation creation — waiting for confirmed backend session');
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          console.log('Authentication check - User:', user ? 'Found' : 'Not found');

          if (user && isValidAuthUuid(user.id)) {
            const playerId = user.id;
            const { createConversation, resolveAuthenticatedPlayerName } = await import('../../services/conversationService');

            let playerName = null;
            const maxAttempts = 3;
            for (let attempt = 0; attempt < maxAttempts; attempt++) {
              playerName = await resolveAuthenticatedPlayerName(playerId, {
                refreshSession: attempt === 0,
              });
              if (playerName) break;
              if (attempt < maxAttempts - 1) {
                await new Promise((resolve) => setTimeout(resolve, 300));
              }
            }

            if (!playerName) {
              console.log('Skipping conversation creation — real player name not available yet (payment flow continues)');
            } else if (!isValidAuthUuid(coach.id)) {
              console.log('Skipping conversation creation — coach id is not a valid auth UUID');
            } else {
              console.log('Creating or reactivating conversation after payment success...');
              console.log('  - playerId:', playerId);
              console.log('  - playerName:', playerName);
              console.log('  - coachId:', coach.id);
              console.log('  - coachName:', coach.name);
              console.log('  - sport:', sport);
              console.log('  - sessionId:', confirmedSession.id);
              console.log('  - existingConversationId:', existingConversationId || 'none');

              conversation = await createConversation({
                playerId,
                playerName,
                coachId: coach.id,
                coachName: coach.name,
                sport,
                sessionId: confirmedSession.id,
                existingConversationId: existingConversationId || undefined,
              });
              console.log('✅ Conversation ready:', conversation.id);
            }
          } else {
            console.log('No authenticated user with valid UUID found - skipping conversation creation');
          }
        }
      } catch (conversationError) {
        console.log('Conversation creation skipped or failed (non-critical):', conversationError?.message);
        // Don't block user flow — payment already succeeded
      }

      // Always show success message regardless of conversation creation
      Alert.alert(
        'Payment Successful!',
        `Your coaching session with ${coach.name} has been activated. You can now start chatting and uploading your clips!`,
        [
          {
            text: 'Start Session',
            onPress: () => {
              navigation.navigate('CoachFeedback', { 
                sessionId: confirmedSession?.id || newSession.id,
                sessionData: newSession,
                conversationId: conversation?.id || existingConversationId,
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
  
  const selectedPkg =
    coachingPackages.find((pkg) => pkg.id === selectedPackage) || coachingPackages[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePackageSelect = (packageId) => {
    setSelectedPackage(packageId);
  };

  const handleRestorePress = () => {
    Alert.alert(
      'Restore purchases',
      'If you have a previous purchase to restore, contact support and we will help activate your session.',
    );
  };

  const handlePurchase = async () => {
    if (!selectedPackage) {
      Alert.alert('Selection Required', 'Please select a package to continue.');
      return;
    }

    if (!paymentSheetEnabled) {
      Alert.alert('Error', 'Payment is not ready. Please wait and try again.');
      return;
    }

    try {
      setIsPurchasing(true);
      
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
          // Don't show an alert for user cancellation
        } else {
          console.error('Payment error:', error);
          
          // Provide user-friendly error messages
          let errorMessage = 'Payment failed. Please try again.';
          
          if (error.message) {
            // Check for specific error types and provide friendly messages
            if (error.message.includes('API key') || error.message.includes('Authorization')) {
              errorMessage = 'Payment service is not properly configured. Please contact support.';
            } else if (error.message.includes('network') || error.message.includes('connection')) {
              errorMessage = 'Network error. Please check your internet connection and try again.';
            } else if (error.message.includes('card') || error.message.includes('payment method')) {
              errorMessage = 'There was an issue with your payment method. Please try a different card.';
            } else {
              // For other errors, show a generic but friendly message
              errorMessage = 'Unable to process payment. Please try again or contact support if the problem persists.';
            }
          }
          
          Alert.alert('Payment Error', errorMessage);
        }
      } else {
        // Payment succeeded
        console.log('Payment successful!');
        handlePaymentSuccess();
      }
    } catch (error) {
      console.error('Payment error:', error);
      
      // Provide user-friendly error messages for caught errors
      let errorMessage = 'Payment failed. Please try again.';
      
      if (error.message) {
        if (error.message.includes('API key') || error.message.includes('Authorization')) {
          errorMessage = 'Payment service is not properly configured. Please contact support.';
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        }
      }
      
      Alert.alert('Payment Error', errorMessage);
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={28} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleRestorePress} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.restoreText}>Restore</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            }}
          >
            <Text style={styles.headline}>Choose your package</Text>
            <Text style={styles.eyebrow}>Your journey starts here</Text>

            <View style={styles.segmentTrack}>
              {coachingPackages.map((pkg) => {
                const isSelected = selectedPackage === pkg.id;
                return (
                  <TouchableOpacity
                    key={pkg.id}
                    style={[styles.segmentOption, isSelected && styles.segmentOptionSelected]}
                    onPress={() => handlePackageSelect(pkg.id)}
                    activeOpacity={0.85}
                  >
                    {isSelected ? (
                      <LinearGradient
                        colors={[COLORS.primary, COLORS.primaryMid]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.segmentGradient}
                      >
                        <Text style={styles.segmentClipSelected}>{pkg.clips}</Text>
                        <Text style={styles.segmentLabelSelected}>clips</Text>
                      </LinearGradient>
                    ) : (
                      <View style={styles.segmentInner}>
                        <Text style={styles.segmentClip}>{pkg.clips}</Text>
                        <Text style={styles.segmentLabel}>clips</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <LinearGradient
              colors={[COLORS.white, COLORS.bgApp]}
              style={styles.packageCard}
            >
              <View style={styles.packageTitleRow}>
                <Text style={styles.packageName}>{selectedPkg.name}</Text>
                {selectedPkg.badge ? <PackageBadge variant={selectedPkg.badge} /> : null}
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceCurrency}>$</Text>
                <Text style={styles.priceAmount}>{selectedPkg.priceAmount}</Text>
                <Text style={styles.priceCadence}>one-time</Text>
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.featuresContainer}>
                {selectedPkg.features.map((feature, featureIndex) => (
                  <View key={featureIndex} style={styles.featureItem}>
                    <View style={styles.featureIconWrap}>
                      <Ionicons name="checkmark" size={14} color={COLORS.success} />
                    </View>
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </Animated.View>
        </ScrollView>

        <Animated.View
          style={[
            styles.footer,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <TouchableOpacity
            style={[styles.continueButton, (isPurchasing || !paymentSheetEnabled) && styles.continueButtonDisabled]}
            onPress={handlePurchase}
            disabled={isPurchasing || !paymentSheetEnabled}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={isPurchasing ? ['#94A3B8', '#64748B'] : [COLORS.primary, COLORS.primaryMid]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueGradient}
            >
              {isPurchasing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={COLORS.white} />
                  <Text style={[styles.continueText, { marginLeft: 10 }]}>Processing...</Text>
                </View>
              ) : (
                <Text style={styles.continueText}>
                  Start Improving Today
                </Text>
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
    backgroundColor: COLORS.bgApp,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bgApp,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 4,
  },
  restoreText: {
    fontSize: 14,
    fontFamily: 'Manrope-SemiBold',
    color: COLORS.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  headline: {
    fontSize: 32,
    fontFamily: 'Rubik-Bold',
    color: COLORS.primary,
    letterSpacing: -0.5,
    lineHeight: 38,
    marginBottom: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontFamily: 'Rubik-Bold',
    color: COLORS.warning,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: COLORS.borderSubtle,
    borderRadius: 100,
    padding: 4,
    marginTop: 28,
    marginBottom: 24,
  },
  segmentOption: {
    flex: 1,
    borderRadius: 100,
    overflow: 'hidden',
  },
  segmentOptionSelected: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  segmentGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 100,
  },
  segmentInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  segmentClip: {
    fontSize: 18,
    fontFamily: 'Rubik-Bold',
    color: COLORS.primary,
    lineHeight: 22,
  },
  segmentClipSelected: {
    fontSize: 18,
    fontFamily: 'Rubik-Bold',
    color: COLORS.white,
    lineHeight: 22,
  },
  segmentLabel: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: COLORS.textMuted,
    marginTop: 2,
  },
  segmentLabelSelected: {
    fontSize: 12,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  packageCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  packageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  packageName: {
    fontSize: 18,
    fontFamily: 'Rubik-SemiBold',
    color: COLORS.primary,
  },
  packageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    marginLeft: 8,
  },
  packageBadgePopular: {
    backgroundColor: COLORS.badgePopularBg,
  },
  packageBadgeValue: {
    backgroundColor: COLORS.badgeValueBg,
  },
  packageBadgeIcon: {
    marginRight: 4,
  },
  packageBadgeText: {
    fontSize: 10,
    fontFamily: 'Rubik-Bold',
    letterSpacing: 0.5,
  },
  packageBadgeTextPopular: {
    color: COLORS.warning,
  },
  packageBadgeTextValue: {
    color: COLORS.badgeValueText,
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  priceCurrency: {
    fontSize: 20,
    fontFamily: 'Rubik-Bold',
    color: COLORS.primary,
    marginBottom: 6,
    marginRight: 2,
  },
  priceAmount: {
    fontSize: 40,
    fontFamily: 'Rubik-Bold',
    color: COLORS.primary,
    letterSpacing: -1,
    lineHeight: 44,
  },
  priceCadence: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: COLORS.textMuted,
    marginLeft: 10,
    marginBottom: 8,
  },
  featuresContainer: {},
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(76, 175, 80, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: '#33415C',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 20,
    backgroundColor: COLORS.bgApp,
  },
  continueButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  continueButtonDisabled: {
    shadowOpacity: 0.1,
    elevation: 2,
  },
  continueGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    fontSize: 16,
    fontFamily: 'Rubik-Bold',
    color: COLORS.white,
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

function PackageBadge({ variant }) {
  const isPopular = variant === 'mostPopular';
  return (
    <View
      style={[
        styles.packageBadge,
        isPopular ? styles.packageBadgePopular : styles.packageBadgeValue,
      ]}
    >
      <Ionicons name="star" size={10} color={COLORS.warning} style={styles.packageBadgeIcon} />
      <Text
        style={[
          styles.packageBadgeText,
          isPopular ? styles.packageBadgeTextPopular : styles.packageBadgeTextValue,
        ]}
      >
        {isPopular ? 'MOST POPULAR' : 'BEST VALUE'}
      </Text>
    </View>
  );
}
