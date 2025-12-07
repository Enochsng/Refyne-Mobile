import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
// Conditionally import Stripe to prevent initialization errors
let useStripe = null;
try {
  const stripeModule = require('@stripe/stripe-react-native');
  useStripe = stripeModule.useStripe || (() => ({ initPaymentSheet: () => Promise.resolve({ error: null }), presentPaymentSheet: () => Promise.resolve({ error: { message: 'Stripe not available' } }) }));
} catch (error) {
  console.warn('Stripe hook not available:', error);
  useStripe = () => ({ initPaymentSheet: () => Promise.resolve({ error: null }), presentPaymentSheet: () => Promise.resolve({ error: { message: 'Stripe not available' } }) });
}
import { STRIPE_CONFIG, getPriceInCents, formatPrice } from '../../stripeConfig';
import { createCoachingSession } from '../../utils/sessionManager';
import { createDestinationCharge, confirmPaymentIntent, attemptDirectPayment } from '../../services/paymentService';
import { supabase } from '../../supabaseClient';

const { width } = Dimensions.get('window');

export default function StripePaymentScreen({ route, navigation }) {
  const { coach, sport, selectedPackage, selectedSubscription } = route.params;
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);
  const [paymentSheetEnabled, setPaymentSheetEnabled] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState(null);

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

  const priceInCents = getPackagePrice();
  const formattedPrice = formatPrice(priceInCents);

  // Initialize payment sheet
  useEffect(() => {
    initializePaymentSheet();
  }, []);

  const initializePaymentSheet = async () => {
    try {
      setLoading(true);

      // Create payment intent using the payment service
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        Alert.alert('Authentication Error', 'Please sign in to make payments.');
        return;
      }
      
      const playerId = user.id;
      const playerName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Player';
      const playerEmail = user.email || 'player@example.com';
      
      const paymentData = {
        coach,
        sport,
        selectedPackage,
        selectedSubscription,
        player: {
          id: playerId,
          name: playerName,
          email: playerEmail
        }
      };

      console.log('Initializing payment sheet with data:', paymentData);

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

  const handlePayment = async () => {
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

  const handlePaymentSuccess = async () => {
    try {
      // First, confirm the payment with the backend
      const sessionData = {
        coachId: coach.id,
        coachName: coach.name,
        sport: sport,
        packageType: selectedSubscription ? 'subscription' : 'package',
        packageId: selectedPackage,
      };

      // Confirm payment and get session from backend
      const confirmedSession = await confirmPaymentIntent(
        paymentIntentId, // Use the actual payment intent ID
        sessionData
      );

      // Create local coaching session for the app
      const localSessionData = {
        coachId: coach.id,
        coachName: coach.name,
        sport: sport,
        packageType: selectedSubscription ? 'subscription' : 'package',
        packageId: selectedPackage,
        amount: priceInCents,
        paymentMethod: 'stripe',
        paymentStatus: 'completed',
      };

      const newSession = await createCoachingSession(localSessionData);

      // Find existing conversation between player and coach
      // The webhook should have already created/updated the conversation, but we'll find it here
      // to get the conversation ID for navigation
      let conversation = null;
      try {
        // Get the authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Authentication check - User:', user ? 'Found' : 'Not found');
        
        if (user) {
          const playerId = user.id;
          console.log('Finding existing conversation for player:', playerId);
          
          // Get conversations for this player
          const { getConversations } = await import('../../services/conversationService');
          const playerConversations = await getConversations(playerId, 'player');
          
          // Find conversation with this coach
          // Raw conversations from API have coach_id and coach_name (snake_case)
          conversation = playerConversations.find(conv => 
            (conv.coach_id === coach.id) || 
            (conv.coach_name === coach.name)
          );
          
          if (conversation) {
            console.log('✅ Found existing conversation:', conversation.id);
            console.log('   → Conversation will be updated by webhook with new session_id');
          } else {
            console.log('⚠️ No existing conversation found - webhook will create one');
            console.log('   → Conversation will be created automatically by webhook');
          }
        } else {
          console.log('No authenticated user found - skipping conversation lookup');
        }
      } catch (conversationError) {
        console.error('Error finding conversation (non-critical):', conversationError);
        // Continue with the flow even if conversation lookup fails
        // The webhook will handle conversation creation/update
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
      console.error('Error confirming payment:', error);
      Alert.alert(
        'Payment Successful',
        'Your payment was processed successfully, but there was an issue setting up your session. Please contact support.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  };

  const getPackageName = () => {
    if (selectedSubscription) {
      return 'Monthly Subscription';
    }
    
    const packageNames = {
      1: '5 Clips Package',
      2: '7 Clips Package',
      3: '10 Clips Package',
    };
    return packageNames[selectedPackage] || 'Coaching Package';
  };

  const getPackageDescription = () => {
    if (selectedSubscription) {
      return 'Send your coach up to 50 clips every month with no session limit!';
    }
    
    const packageDescriptions = {
      1: 'Upload up to 5 clips per package with 3-day coaching session',
      2: 'Upload up to 7 clips per package with 5-day coaching session',
      3: 'Upload up to 10 clips per package with 7-day coaching session',
    };
    return packageDescriptions[selectedPackage] || 'Get personalized coaching feedback';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#0C295C', '#1A4A7A', '#2D5A8A']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Stripe Checkout</Text>
            <Text style={styles.headerSubtitle}>Secure payment powered by Stripe</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Coach Info */}
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

        {/* Package Details */}
        <View style={styles.packageCard}>
          <View style={styles.packageHeader}>
            <Text style={styles.packageName}>{getPackageName()}</Text>
            <Text style={styles.packagePrice}>{formattedPrice}</Text>
          </View>
          <Text style={styles.packageDescription}>{getPackageDescription()}</Text>
          
          {selectedSubscription && (
            <View style={styles.subscriptionNote}>
              <Ionicons name="infinite" size={16} color="#059669" />
              <Text style={styles.subscriptionNoteText}>
                Billed monthly, cancel anytime
              </Text>
            </View>
          )}
        </View>

        {/* Stripe Branding */}
        <View style={styles.stripeBrandingCard}>
          <View style={styles.stripeBrandingHeader}>
            <View style={styles.stripeLogo}>
              <Text style={styles.stripeLogoText}>stripe</Text>
            </View>
            <Text style={styles.stripeBrandingTitle}>Powered by Stripe</Text>
          </View>
          <Text style={styles.stripeBrandingText}>
            Your payment is processed securely by Stripe, trusted by millions of businesses worldwide. 
            Your payment information is encrypted and we never store your card details.
          </Text>
        </View>

        {/* Payment Security */}
        <View style={styles.securityCard}>
          <View style={styles.securityHeader}>
            <Ionicons name="shield-checkmark" size={20} color="#059669" />
            <Text style={styles.securityTitle}>Bank-Level Security</Text>
          </View>
          <Text style={styles.securityText}>
            Your payment information is protected with 256-bit SSL encryption and processed 
            according to PCI DSS standards. Stripe is certified as a Level 1 PCI Service Provider.
          </Text>
        </View>

        {/* Payment Methods */}
        <View style={styles.paymentMethodsCard}>
          <Text style={styles.paymentMethodsTitle}>Accepted Payment Methods</Text>
          <View style={styles.paymentMethodsList}>
            <View style={styles.paymentMethod}>
              <Ionicons name="card" size={24} color="#0C295C" />
              <Text style={styles.paymentMethodText}>Credit/Debit Cards</Text>
            </View>
            <View style={styles.paymentMethod}>
              <Ionicons name="phone-portrait" size={24} color="#0C295C" />
              <Text style={styles.paymentMethodText}>Apple Pay</Text>
            </View>
            <View style={styles.paymentMethod}>
              <Ionicons name="logo-google" size={24} color="#0C295C" />
              <Text style={styles.paymentMethodText}>Google Pay</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Payment Button */}
      <View style={styles.paymentButtonContainer}>
        <TouchableOpacity 
          style={[styles.paymentButton, loading && styles.paymentButtonDisabled]}
          onPress={handlePayment}
          disabled={loading || !paymentSheetEnabled}
        >
          <LinearGradient
            colors={loading ? ['#94A3B8', '#64748B'] : ['#0C295C', '#1A4A7A', '#2D5A8A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.paymentButtonGradient}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="white" />
                <Text style={styles.paymentButtonText}>Processing...</Text>
              </View>
            ) : (
              <View style={styles.paymentButtonContent}>
                <View style={styles.paymentButtonLeft}>
                  <View style={styles.stripeButtonIcon}>
                    <Text style={styles.stripeButtonIconText}>stripe</Text>
                  </View>
                  <Text style={styles.paymentButtonText}>
                    {selectedSubscription ? 'Subscribe with Stripe' : 'Pay with Stripe'}
                  </Text>
                </View>
                <Text style={styles.paymentButtonPrice}>{formattedPrice}</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: width * 0.065,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  coachInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 4 },
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
  packageCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  packageName: {
    fontSize: width * 0.055,
    fontFamily: 'Rubik-Bold',
    color: '#0C295C',
    flex: 1,
  },
  packagePrice: {
    fontSize: width * 0.08,
    fontFamily: 'Rubik-Bold',
    color: '#0C295C',
  },
  packageDescription: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    lineHeight: 22,
  },
  subscriptionNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  subscriptionNoteText: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Medium',
    color: '#059669',
    marginLeft: 8,
  },
  stripeBrandingCard: {
    backgroundColor: '#F8FAFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stripeBrandingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stripeLogo: {
    backgroundColor: '#635BFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
  },
  stripeLogoText: {
    fontSize: width * 0.04,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  stripeBrandingTitle: {
    fontSize: width * 0.045,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
  },
  stripeBrandingText: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    lineHeight: 22,
  },
  securityCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  securityTitle: {
    fontSize: width * 0.045,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginLeft: 8,
  },
  securityText: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    lineHeight: 22,
  },
  paymentMethodsCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  paymentMethodsTitle: {
    fontSize: width * 0.045,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginBottom: 16,
  },
  paymentMethodsList: {
    gap: 12,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodText: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Medium',
    color: '#374151',
    marginLeft: 12,
  },
  paymentButtonContainer: {
    padding: 24,
    paddingBottom: 30,
    backgroundColor: 'rgba(248, 250, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  paymentButton: {
    borderRadius: 16,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  paymentButtonDisabled: {
    shadowOpacity: 0.1,
    elevation: 2,
  },
  paymentButtonGradient: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  paymentButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stripeButtonIcon: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  stripeButtonIconText: {
    fontSize: width * 0.032,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    letterSpacing: 0.3,
  },
  paymentButtonText: {
    fontSize: width * 0.045,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    marginLeft: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  paymentButtonPrice: {
    fontSize: width * 0.05,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
