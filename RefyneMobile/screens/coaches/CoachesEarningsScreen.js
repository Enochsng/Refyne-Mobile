import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  RefreshControl,
  Linking,
  Clipboard,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../supabaseClient';
import { STRIPE_CONNECT_CONFIG } from '../../stripeConfig';
import stripeConnectService from '../../services/stripeConnectService';

const { width, height } = Dimensions.get('window');

export default function CoachesEarningsScreen({ navigation }) {
  const [stripeAccountStatus, setStripeAccountStatus] = useState(null); // null, 'connected', 'pending', 'not_connected'
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [earningsData, setEarningsData] = useState({
    totalEarnings: 0,
    pendingEarnings: 0,
    totalCustomers: 0,
    recentTransfers: []
  });
  const [statusCheckInterval, setStatusCheckInterval] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      console.log('🎯 Earnings screen focused - checking status');
      checkStripeAccountStatus();
      
      // Start moderate checking if account is not connected (user might be returning from Stripe)
      if (stripeAccountStatus !== 'connected') {
        startModerateStatusChecking();
      } else {
        // If already connected, just check every 60 seconds
        const interval = setInterval(() => {
          console.log('⏰ Periodic status check...');
          checkStripeAccountStatus();
        }, 60000);
        
        setStatusCheckInterval(interval);
      }
      
      // Cleanup interval when screen loses focus
      return () => {
        console.log('🎯 Earnings screen unfocused - clearing interval');
        if (statusCheckInterval) {
          clearInterval(statusCheckInterval);
          setStatusCheckInterval(null);
        }
      };
    }, [stripeAccountStatus])
  );

  // Effect to fetch earnings data when status becomes connected
  useEffect(() => {
    if (stripeAccountStatus === 'connected') {
      console.log('✅ Status changed to connected - fetching earnings data');
      fetchEarningsData();
      // Clear the interval once connected
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
        setStatusCheckInterval(null);
      }
    }
  }, [stripeAccountStatus]);

  // Cleanup effect when component unmounts
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  const checkStripeAccountStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('🔍 Checking Stripe account status for user:', user.id, 'email:', user.email);

      // Use the rate-limited service
      const result = await stripeConnectService.checkStripeAccountStatus(user.id, user.email);
      
      console.log('📊 API Response:', result);
      
      if (result.success && result.account) {
        const { chargesEnabled, payoutsEnabled, detailsSubmitted, onboardingCompleted } = result.account;
        
        console.log('🔍 Account status flags:', {
          chargesEnabled,
          payoutsEnabled,
          detailsSubmitted,
          onboardingCompleted
        });
        
        // More lenient checking - if account exists and has details submitted, consider it connected
        if (detailsSubmitted || onboardingCompleted) {
          console.log('✅ Account is connected');
          setStripeAccountStatus('connected');
        } else if (chargesEnabled || payoutsEnabled) {
          console.log('⏳ Account is pending');
          setStripeAccountStatus('pending');
        } else {
          console.log('❌ Account not connected');
          setStripeAccountStatus('not_connected');
        }
      } else {
        console.log('❌ No account found in response');
        
        // Check if this is a backend server error
        if (result.error && (result.error.includes('Backend server') || result.error.includes('payment server'))) {
          console.log('🔍 Backend server not available - showing not_connected state');
          setStripeAccountStatus('not_connected');
        } else {
          setStripeAccountStatus('not_connected');
        }
      }
    } catch (error) {
      // Don't show error alerts for 404s - they're expected for new coaches
      if (error.status !== 404) {
        console.error('❌ Error checking Stripe account status:', error);
      } else {
        console.log('ℹ️ Coach account not found - this is normal for new coaches');
      }
      
      // If it's a rate limit error, don't change the status
      if (error.message.includes('Rate limited') || error.message.includes('429')) {
        console.log('⏳ Rate limited - keeping current status');
        return;
      }
      
      setStripeAccountStatus('not_connected');
    }
  };

  const fetchEarningsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      console.log('💰 Fetching earnings data for user:', user.id);

      // Use the rate-limited service
      const result = await stripeConnectService.getCoachTransfers(user.id);
      
      console.log('📊 Earnings data result:', result);
      
      if (result.success && result.summary) {
        // Use the summary data from the backend
        const { totalEarnings, pendingEarnings, totalCustomers } = result.summary;
        const transfers = result.transfers || [];

        console.log('✅ Setting earnings data:', {
          totalEarnings,
          pendingEarnings,
          totalCustomers,
          transferCount: transfers.length
        });

        setEarningsData({
          totalEarnings: totalEarnings || 0,
          pendingEarnings: pendingEarnings || 0,
          totalCustomers: totalCustomers || 0,
          recentTransfers: transfers.slice(0, 10)
        });
      } else {
        console.log('⚠️ No earnings data found or error in response:', result.error);
        // Set default values if no data
        setEarningsData({
          totalEarnings: 0,
          pendingEarnings: 0,
          totalCustomers: 0,
          recentTransfers: []
        });
      }
    } catch (error) {
      console.error('❌ Error fetching earnings data:', error);
      // Set default values on error
      setEarningsData({
        totalEarnings: 0,
        pendingEarnings: 0,
        totalCustomers: 0,
        recentTransfers: []
      });
    }
  };

  const handleConnectStripe = async () => {
    try {
      setIsConnectingStripe(true);
      console.log('Starting Stripe Connect Express onboarding process...');
      
      // Get current user data
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated. Please sign in again.');
        return;
      }

      // Get onboarding data to extract sport information
      let onboardingDataString = await AsyncStorage.getItem(`onboarding_data_${user.id}`);
      if (!onboardingDataString) {
        onboardingDataString = await AsyncStorage.getItem('onboarding_data');
      }
      
      let sport = 'badminton'; // default
      if (onboardingDataString) {
        const onboardingData = JSON.parse(onboardingDataString);
        sport = onboardingData.sport || 'badminton';
      }

      // Get coach profile data
      const { data: profile } = await supabase
        .from('coach_profiles')
        .select('name, email')
        .eq('id', user.id)
        .single();

      const coachName = profile?.name || 'Coach';
      const email = profile?.email || user.email;

      const requestBody = {
        coachId: user.id,
        coachName: coachName,
        email: email,
        sport: sport,
        country: 'CA', // Default to Canada
        businessType: 'individual'
      };

      console.log('Request body:', requestBody);

      // Use the rate-limited service
      const result = await stripeConnectService.startOnboarding(requestBody);
      console.log('Response data:', result);

      if (result.success && result.onboardingLink) {
        console.log('Onboarding link received:', result.onboardingLink.url);
        
        // Open the Stripe Connect Express onboarding link
        const onboardingUrl = result.onboardingLink.url;
        console.log('Attempting to open URL:', onboardingUrl);
        
        // Try multiple methods to open the URL
        let urlOpened = false;
        
        // Method 1: Direct Linking.openURL
        try {
          const canOpen = await Linking.canOpenURL(onboardingUrl);
          if (canOpen) {
            await Linking.openURL(onboardingUrl);
            urlOpened = true;
            console.log('✅ URL opened successfully with Linking.openURL');
          }
        } catch (error) {
          console.log('❌ Linking.openURL failed:', error);
        }

        if (!urlOpened) {
          Alert.alert(
            'Unable to Open Link',
            'Please copy this link and open it in your browser:\n\n' + onboardingUrl,
            [
              {
                text: 'Copy Link',
                onPress: () => {
                  Clipboard.setString(onboardingUrl);
                  Alert.alert('Link Copied', 'The link has been copied to your clipboard.');
                }
              },
              { text: 'OK' }
            ]
          );
        }
      } else {
        console.error('Failed to get onboarding link:', result);
        Alert.alert('Error', result.error || 'Failed to start Stripe Connect setup');
      }
    } catch (error) {
      console.error('Error connecting to Stripe:', error);
      Alert.alert(
        'Backend Connection Required',
        'Unable to connect to the payment server. Please ensure:\n\n1. The backend server is running\n2. Your device is connected to the same network\n3. The server is accessible at the configured URL\n\nYou can also try again later when the server is available.',
        [
          {
            text: 'Try Again',
            onPress: () => handleConnectStripe()
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setIsConnectingStripe(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await checkStripeAccountStatus();
    if (stripeAccountStatus === 'connected') {
      await fetchEarningsData();
    }
    setIsRefreshing(false);
  };

  // Moderate status checking when user might be returning from Stripe
  const startModerateStatusChecking = () => {
    console.log('🚀 Starting moderate status checking...');
    
    // Clear any existing interval
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
    }
    
    // Check immediately
    checkStripeAccountStatus();
    
    // Then check every 15 seconds for the first 2 minutes
    const interval = setInterval(() => {
      console.log('⚡ Moderate status check...');
      checkStripeAccountStatus();
    }, 15000);
    
    setStatusCheckInterval(interval);
    
    // After 2 minutes, switch to normal 30-second intervals
    setTimeout(() => {
      if (interval) {
        clearInterval(interval);
      }
      
      const normalInterval = setInterval(() => {
        console.log('⏰ Normal status check...');
        checkStripeAccountStatus();
      }, 30000);
      
      setStatusCheckInterval(normalInterval);
    }, 120000); // 2 minutes
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
    }).format(amount / 100);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderNotConnectedState = () => (
    <View style={styles.centerContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="card-outline" size={80} color="#90A4AE" />
      </View>
      <Text style={styles.title}>Connect Your Stripe Account</Text>
      <Text style={styles.subtitle}>
        Set up your payment processing to start receiving earnings from your coaching sessions
      </Text>
      <TouchableOpacity 
        style={[styles.connectButton, isConnectingStripe && styles.connectButtonDisabled]}
        onPress={handleConnectStripe}
        disabled={isConnectingStripe}
      >
        <LinearGradient
          colors={['#0C295C', '#1E40AF']}
          style={styles.connectButtonGradient}
        >
          <Ionicons 
            name={isConnectingStripe ? "hourglass-outline" : "card"} 
            size={24} 
            color="white" 
            style={styles.connectButtonIcon}
          />
          <Text style={styles.connectButtonText}>
            {isConnectingStripe ? "Connecting..." : "Connect Stripe Account"}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
      <Text style={styles.helpText}>
        You'll be redirected to Stripe to complete your account setup
      </Text>
    </View>
  );

  const renderConnectedState = () => (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      {/* Manual Refresh Button */}
      <View style={styles.refreshHeader}>
        <TouchableOpacity 
          style={styles.manualRefreshButton}
          onPress={onRefresh}
          disabled={isRefreshing}
        >
          <Ionicons 
            name={isRefreshing ? "refresh" : "refresh-outline"} 
            size={20} 
            color="#0C295C" 
          />
          <Text style={styles.manualRefreshText}>
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Earnings Overview */}
      <View style={styles.earningsOverview}>
        <Text style={styles.sectionTitle}>Earnings Overview</Text>
        <View style={styles.earningsGrid}>
          <View style={styles.earningsCard}>
            <Text style={styles.earningsAmount}>{formatCurrency(earningsData.totalEarnings)}</Text>
            <Text style={styles.earningsLabel}>Total Earnings</Text>
          </View>
          <View style={styles.earningsCard}>
            <Text style={styles.earningsAmount}>{earningsData.totalCustomers}</Text>
            <Text style={styles.earningsLabel}>Customers</Text>
          </View>
        </View>
      </View>

      {/* Recent Transfers */}
      <View style={styles.recentTransfers}>
        <Text style={styles.sectionTitle}>Recent Transfers</Text>
        {earningsData.recentTransfers.length > 0 ? (
          <View style={styles.transfersList}>
            {earningsData.recentTransfers.map((transfer, index) => (
              <View key={transfer.id || index} style={styles.transferItem}>
                <View style={styles.transferInfo}>
                  <Text style={styles.transferAmount}>{formatCurrency(transfer.amount)}</Text>
                  <Text style={styles.transferDate}>{formatDate(transfer.created_at)}</Text>
                  {transfer.description && (
                    <Text style={styles.transferDescription}>{transfer.description}</Text>
                  )}
                  {transfer.metadata?.source === 'stripe' && (
                    <Text style={styles.transferSource}>From Stripe</Text>
                  )}
                </View>
                <View style={styles.transferStatus}>
                  <View style={[
                    styles.statusBadge,
                    (transfer.status === 'paid' || transfer.status === 'succeeded') ? styles.statusPaid : styles.statusPending
                  ]}>
                    <Text style={[
                      styles.statusText,
                      (transfer.status === 'paid' || transfer.status === 'succeeded') ? styles.statusTextPaid : styles.statusTextPending
                    ]}>
                      {transfer.status === 'succeeded' ? 'paid' : transfer.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#90A4AE" />
            <Text style={styles.emptyStateText}>No transfers yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Your earnings will appear here once you start receiving payments
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderPendingState = () => (
    <View style={styles.centerContainer}>
      <View style={styles.iconContainer}>
        <Ionicons name="time-outline" size={80} color="#F59E0B" />
      </View>
      <Text style={styles.title}>Account Setup Pending</Text>
      <Text style={styles.subtitle}>
        Your Stripe account is being reviewed. This usually takes a few minutes.
      </Text>
      <Text style={styles.autoCheckText}>
        🔄 Automatically checking for updates...
      </Text>
      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={onRefresh}
        disabled={isRefreshing}
      >
        <Ionicons 
          name={isRefreshing ? "refresh" : "refresh-outline"} 
          size={20} 
          color="#0C295C" 
        />
        <Text style={styles.refreshButtonText}>
          {isRefreshing ? "Checking..." : "Check Now"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {stripeAccountStatus === 'not_connected' && renderNotConnectedState()}
      {stripeAccountStatus === 'pending' && renderPendingState()}
      {stripeAccountStatus === 'connected' && renderConnectedState()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  refreshHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'flex-end',
  },
  manualRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderColor: '#0C295C',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    maxWidth: width * 0.4, // Ensure button doesn't exceed 40% of screen width
  },
  manualRefreshText: {
    fontSize: width * 0.032,
    fontFamily: 'Manrope-SemiBold',
    color: '#0C295C',
    marginLeft: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: width * 0.06,
    fontFamily: 'Manrope-Bold',
    color: '#0C295C',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Medium',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  connectButton: {
    marginBottom: 16,
  },
  connectButtonDisabled: {
    opacity: 0.7,
  },
  connectButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 280,
  },
  connectButtonIcon: {
    marginRight: 12,
  },
  connectButtonText: {
    fontSize: width * 0.045,
    fontFamily: 'Manrope-SemiBold',
    color: 'white',
  },
  helpText: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Medium',
    color: '#90A4AE',
    textAlign: 'center',
  },
  serverStatusText: {
    fontSize: width * 0.032,
    fontFamily: 'Manrope-Medium',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  autoCheckText: {
    fontSize: width * 0.032,
    fontFamily: 'Manrope-Medium',
    color: '#F59E0B',
    textAlign: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderColor: '#0C295C',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  refreshButtonText: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-SemiBold',
    color: '#0C295C',
    marginLeft: 8,
  },
  earningsOverview: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: width * 0.05,
    fontFamily: 'Manrope-Bold',
    color: '#0C295C',
    marginBottom: 16,
  },
  earningsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  earningsCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  earningsAmount: {
    fontSize: width * 0.06,
    fontFamily: 'Manrope-Bold',
    color: '#059669',
    marginBottom: 4,
  },
  earningsLabel: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Medium',
    color: '#64748B',
  },
  recentTransfers: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  transfersList: {
    marginTop: 8,
  },
  transferItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  transferInfo: {
    flex: 1,
  },
  transferAmount: {
    fontSize: width * 0.045,
    fontFamily: 'Manrope-SemiBold',
    color: '#0C295C',
    marginBottom: 2,
  },
  transferDate: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Medium',
    color: '#64748B',
  },
  transferDescription: {
    fontSize: width * 0.032,
    fontFamily: 'Manrope-Medium',
    color: '#90A4AE',
    marginTop: 2,
  },
  transferSource: {
    fontSize: width * 0.03,
    fontFamily: 'Manrope-Medium',
    color: '#0C295C',
    marginTop: 2,
    fontStyle: 'italic',
  },
  transferStatus: {
    marginLeft: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPaid: {
    backgroundColor: '#D1FAE5',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: width * 0.032,
    fontFamily: 'Manrope-SemiBold',
  },
  statusTextPaid: {
    color: '#059669',
  },
  statusTextPending: {
    color: '#D97706',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: width * 0.045,
    fontFamily: 'Manrope-SemiBold',
    color: '#64748B',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Medium',
    color: '#90A4AE',
    textAlign: 'center',
    lineHeight: 20,
  },
});
