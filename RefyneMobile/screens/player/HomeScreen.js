import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../supabaseClient';
import { getConversations, formatConversationForDisplay } from '../../services/conversationService';
import { getCoachProfilePhoto } from '../../services/conversationService';
import { getAllCoachProfiles } from '../../utils/coachData';
import { sports } from '../../utils/sportsData';

const { width, height } = Dimensions.get('window');
const SPORT_CARD_WIDTH = width * 0.72;
const SPORT_CARD_HEIGHT = 190;

// Motivational quotes array
const motivationalQuotes = [
  {
    quote: "Champions keep playing until they get it right. - Billie Jean King",
    author: "Billie Jean King"
  },
  {
    quote: "The only way to prove you are a good sport is to lose. - Ernie Banks",
    author: "Ernie Banks"
  },
  {
    quote: "You miss 100% of the shots you don't take. - Wayne Gretzky",
    author: "Wayne Gretzky"
  },
  {
    quote: "Success is no accident. It is hard work, perseverance, learning, studying, sacrifice and most of all, love of what you are doing. - Pelé",
    author: "Pelé"
  },
  {
    quote: "The difference between the impossible and the possible lies in a person's determination. - Tommy Lasorda",
    author: "Tommy Lasorda"
  },
  {
    quote: "Champions aren't made in gyms. Champions are made from something they have deep inside them - a desire, a dream, a vision. - Muhammad Ali",
    author: "Muhammad Ali"
  }
];

export default function HomeScreen({ navigation }) {
  const [userName, setUserName] = useState('Player');
  const [todaysQuote, setTodaysQuote] = useState(motivationalQuotes[0]);
  const [hasFeedback, setHasFeedback] = useState(false); // Default to no feedback
  const [recentFeedback, setRecentFeedback] = useState(null);
  const [coachesBySport, setCoachesBySport] = useState({});
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Get user's name from Supabase
  const getUserName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('User data:', user); // Debug log
      console.log('User metadata:', user?.user_metadata); // Debug log
      
      if (user?.user_metadata?.full_name) {
        const firstName = user.user_metadata.full_name.split(' ')[0];
        console.log('Setting user name to:', firstName); // Debug log
        setUserName(firstName);
      } else {
        console.log('No full_name found in metadata, checking other fields...');
        // Try alternative field names
        if (user?.user_metadata?.name) {
          const firstName = user.user_metadata.name.split(' ')[0];
          setUserName(firstName);
        } else if (user?.user_metadata?.display_name) {
          const firstName = user.user_metadata.display_name.split(' ')[0];
          setUserName(firstName);
        } else {
          console.log('No name found, keeping default "Player"');
          // For testing purposes, you can temporarily set a default name
          // setUserName('Enoch'); // Uncomment this line for testing
        }
      }
    } catch (error) {
      console.log('Error getting user name:', error);
    }
  };

  // Function to load recent feedback from conversations
  const loadRecentFeedback = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        setHasFeedback(false);
        setRecentFeedback(null);
        return;
      }

      const playerId = user.id;
      console.log('Loading recent feedback for player:', playerId);

      // Get conversations for this player
      let conversationsData;
      try {
        conversationsData = await getConversations(playerId, 'player');
        console.log('Retrieved conversations data:', conversationsData);
      } catch (conversationError) {
        if (conversationError?.rateLimited) {
          console.log('⏳ Rate limited loading recent feedback - keeping current state');
          return;
        }
        // Handle backend connection errors gracefully
        const errorMessage = conversationError?.message || '';
        const isBackendConnectionError = 
          errorMessage.includes('No working backend URL found') ||
          errorMessage.includes('Network request failed') ||
          errorMessage.includes('Unable to connect') ||
          errorMessage.includes('Unable to reach');
        
        if (isBackendConnectionError) {
          // Backend is not available - silently handle this case
          if (__DEV__) {
            console.log('⚠️ Backend server not available. Recent feedback will not be displayed.');
            console.log('   This is normal if the backend server is not running.');
            console.log('   To enable feedback: cd backend && node server.js');
          }
          setHasFeedback(false);
          setRecentFeedback(null);
          return;
        }
        // Re-throw other errors
        throw conversationError;
      }

      if (!conversationsData || conversationsData.length === 0) {
        console.log('No conversations found for player');
        setHasFeedback(false);
        setRecentFeedback(null);
        return;
      }

      // Get the most recent conversation
      const mostRecentConv = conversationsData[0]; // Conversations are already sorted by last_message_at

      // Format the conversation for display
      const formattedConversation = await formatConversationForDisplay(mostRecentConv, 'player');
      console.log('Formatted conversation:', formattedConversation);

      // Get coaching session info for package details
      let packageText = 'Package';
      if (formattedConversation.sessionId) {
        try {
          const { data: session, error: sessionError } = await supabase
            .from('coaching_sessions')
            .select('*')
            .eq('id', formattedConversation.sessionId)
            .single();

          if (!sessionError && session) {
            const totalClips = (session.clips_remaining || 0) + (session.clips_uploaded || 0);
            const clips = totalClips > 0 ? totalClips : (session.clips_remaining || 0);
            const sport = formattedConversation.sport || session.sport || '';
            const capitalizedSport = sport.charAt(0).toUpperCase() + sport.slice(1).toLowerCase();
            
            if (session.package_type === 'subscription') {
              packageText = `${clips} Clips Subscription • ${capitalizedSport}`;
            } else {
              packageText = `${clips} Clips Package • ${capitalizedSport}`;
            }
          } else {
            // Fallback if session not found
            const sport = formattedConversation.sport || '';
            const capitalizedSport = sport.charAt(0).toUpperCase() + sport.slice(1).toLowerCase();
            packageText = `Package • ${capitalizedSport}`;
          }
        } catch (error) {
          console.log('Error fetching session info:', error);
          const sport = formattedConversation.sport || '';
          const capitalizedSport = sport.charAt(0).toUpperCase() + sport.slice(1).toLowerCase();
          packageText = `Package • ${capitalizedSport}`;
        }
      } else {
        const sport = formattedConversation.sport || '';
        const capitalizedSport = sport.charAt(0).toUpperCase() + sport.slice(1).toLowerCase();
        packageText = `Package • ${capitalizedSport}`;
      }

      // Determine status - check chat expiry first, then session status
      let status = 'Active';
      
      // Check if chat is expired (0 days left or isExpired = true)
      if (formattedConversation.chatExpiry) {
        if (formattedConversation.chatExpiry.isExpired || 
            formattedConversation.chatExpiry.daysRemaining === 0) {
          status = 'Inactive';
        }
      }
      
      // If chat is not expired, check session status
      if (status === 'Active' && formattedConversation.sessionId) {
        try {
          const { data: session } = await supabase
            .from('coaching_sessions')
            .select('status')
            .eq('id', formattedConversation.sessionId)
            .single();
          
          if (session) {
            if (session.status === 'active') {
              status = 'Active';
            } else if (session.status === 'completed') {
              status = 'Completed';
            } else if (session.status === 'expired') {
              status = 'Expired';
            }
          }
        } catch (error) {
          console.log('Error checking session status:', error);
        }
      }

      // Get coach profile photo if not already in formatted conversation
      let avatarUrl = formattedConversation.avatar;
      if (!avatarUrl && formattedConversation.coachName) {
        try {
          // Try to get coach ID from conversation
          const { data: conv } = await supabase
            .from('conversations')
            .select('coach_id')
            .eq('id', formattedConversation.id)
            .single();
          
          if (conv && conv.coach_id) {
            avatarUrl = await getCoachProfilePhoto(conv.coach_id);
          }
        } catch (error) {
          console.log('Error fetching coach profile photo:', error);
        }
      }

      const feedbackData = {
        id: formattedConversation.id,
        coachName: formattedConversation.otherPartyName || formattedConversation.coachName || 'Coach',
        coachInitial: (formattedConversation.otherPartyName || formattedConversation.coachName || 'C').charAt(0).toUpperCase(),
        package: packageText,
        status: status,
        message: formattedConversation.lastMessage || 'Click to view feedback and chat',
        avatar: avatarUrl,
        conversationId: formattedConversation.id,
      };

      console.log('Loaded recent feedback:', feedbackData);
      setRecentFeedback(feedbackData);
      setHasFeedback(true);
    } catch (error) {
      // Only log non-backend-connection errors
      const errorMessage = error?.message || '';
      const isBackendConnectionError = 
        errorMessage.includes('No working backend URL found') ||
        errorMessage.includes('Network request failed') ||
        errorMessage.includes('Unable to connect') ||
        errorMessage.includes('Unable to reach');
      
      if (!isBackendConnectionError) {
        // Log unexpected errors
        console.error('Error loading recent feedback:', error);
      } else if (__DEV__) {
        // In development, log backend connection issues but don't show error overlay
        console.log('⚠️ Backend connection issue (handled gracefully):', errorMessage);
      }
      
      setHasFeedback(false);
      setRecentFeedback(null);
    }
  };

  const loadCoachCounts = async () => {
    try {
      const coaches = await getAllCoachProfiles();
      const groupedCoaches = {};
      coaches.forEach(coach => {
        if (coach.sport) {
          if (!groupedCoaches[coach.sport]) {
            groupedCoaches[coach.sport] = [];
          }
          groupedCoaches[coach.sport].push(coach);
        }
      });
      setCoachesBySport(groupedCoaches);
    } catch (error) {
      console.error('Error loading coach counts:', error);
    }
  };

  const handleSportCardPress = (sport) => {
    navigation.navigate('ExploreSports', {
      screen: 'Coaches',
      params: { sport: sport.name },
    });
  };

  const getCoachCountForSport = (sportName) => {
    const match = Object.entries(coachesBySport).find(
      ([key]) => key.toLowerCase() === sportName.toLowerCase()
    );
    return match ? match[1].length : 0;
  };

  useEffect(() => {
    // Get today's motivational quote (based on day of year)
    const getTodaysQuote = () => {
      const today = new Date();
      const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
      const quoteIndex = dayOfYear % motivationalQuotes.length;
      setTodaysQuote(motivationalQuotes[quoteIndex]);
    };

    getUserName();
    getTodaysQuote();
    loadRecentFeedback();
    loadCoachCounts();
    
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
  }, []);

  // Refresh user name and recent feedback when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      getUserName();
      // Add a small delay to ensure any recent updates have propagated
      const timer = setTimeout(() => {
        loadRecentFeedback();
        loadCoachCounts();
      }, 500);
      
      return () => clearTimeout(timer);
    }, [])
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header with Dark Blue Background */}
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
          <LinearGradient
            colors={['#0C295C', '#1A4A7A', '#2D5A8A']}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Decorative Circles */}
            <View style={styles.decorativeCircle1} />
            <View style={styles.decorativeCircle2} />
            <View style={styles.decorativeCircle3} />
            
            <View style={styles.header}>
              <View style={styles.headerContent}>
                <Text style={styles.greeting}>Hi {userName}!</Text>
                <Text style={styles.headerSubtext}>
                  Pick a sport, find your coach, and start getting personalized feedback.
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Find a Coach Section */}
          <Animated.View
            style={[
              styles.findCoachSection,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim },
                ],
              },
            ]}
          >
            <View style={styles.findCoachHeader}>
              <Text style={styles.findCoachTitle}>Find a Coach</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('ExploreSports', { screen: 'ExploreSportsMain' })}
              >
                <Text style={styles.seeAllLink}>See all</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.findCoachSubtitle}>
              Choose a sport to browse expert coaches
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled={true}
              style={styles.sportCardsScroll}
              contentContainerStyle={styles.sportCardsContainer}
            >
              {sports.map((sport) => {
                const coachCount = getCoachCountForSport(sport.name);
                return (
                  <TouchableOpacity
                    key={sport.id}
                    style={styles.sportCard}
                    activeOpacity={0.9}
                    onPress={() => handleSportCardPress(sport)}
                  >
                    <Image
                      source={sport.image}
                      style={styles.sportCardImage}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(12, 41, 92, 0.75)']}
                      style={styles.sportCardGradient}
                    />
                    <View style={styles.coachCountBadge}>
                      <View style={styles.coachCountDot} />
                      <Text style={styles.coachCountText}>
                        {coachCount} coach{coachCount !== 1 ? 'es' : ''}
                      </Text>
                    </View>
                    <View style={styles.sportCardContent}>
                      <Text style={styles.sportCardName}>{sport.name}</Text>
                      <View style={styles.browseCoachesRow}>
                        <Text style={styles.browseCoachesText}>Browse coaches</Text>
                        <Ionicons name="arrow-forward" size={14} color="white" />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>

          {/* Recent Feedback Section */}
          <Animated.View 
            style={[
              styles.feedbackSection,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            <View style={styles.sectionHeader}>
              <Ionicons name="chatbubbles" size={20} color="#0C295C" />
              <Text style={styles.sectionTitle}>Recent Feedback</Text>
            </View>
            {hasFeedback && recentFeedback ? (
              <>
                <TouchableOpacity 
                  style={styles.feedbackCard}
                  onPress={() => navigation.navigate('CoachFeedback', { conversationId: recentFeedback.conversationId })}
                >
                  <View style={styles.feedbackAvatar}>
                    {recentFeedback.avatar ? (
                      <Image 
                        source={{ uri: recentFeedback.avatar }} 
                        style={styles.feedbackAvatarImage}
                        resizeMode="cover"
                        onError={() => {
                          console.log('Failed to load coach profile image for:', recentFeedback.coachName);
                        }}
                      />
                    ) : (
                      <Text style={styles.feedbackInitial}>{recentFeedback.coachInitial}</Text>
                    )}
                  </View>
                  <View style={styles.feedbackContent}>
                    <Text style={styles.feedbackCoachName}>{recentFeedback.coachName}</Text>
                    <Text style={styles.feedbackPackage}>{recentFeedback.package}</Text>
                    <View style={styles.feedbackStatus}>
                      <View style={styles.statusDot} />
                      <Text style={styles.feedbackStatusText}>{recentFeedback.message}</Text>
                    </View>
                  </View>
                  <View style={styles.feedbackRight}>
                    <View style={[
                      styles.activeBadge,
                      recentFeedback.status === 'Active' && styles.activeBadgeActive,
                      recentFeedback.status === 'Inactive' && styles.activeBadgeInactive,
                      recentFeedback.status === 'Completed' && styles.activeBadgeCompleted,
                      recentFeedback.status === 'Expired' && styles.activeBadgeExpired
                    ]}>
                      <Text style={styles.activeBadgeText}>{recentFeedback.status}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#90A4AE" />
                  </View>
                </TouchableOpacity>
              </>
            ) : (
              <LinearGradient
                colors={['#FFFFFF', '#F8FAFF']}
                style={styles.noFeedbackCard}
              >
                <View style={styles.noFeedbackIconWrapper}>
                  <View style={styles.noFeedbackIconContainer}>
                    <Ionicons name="chatbubbles" size={36} color="#0C295C" />
                  </View>
                  <View style={styles.noFeedbackPlusBadge}>
                    <Ionicons name="add" size={14} color="white" />
                  </View>
                </View>
                <Text style={styles.noFeedbackTitle}>No feedback yet</Text>
                <Text style={styles.noFeedbackSubtitle}>
                  Pick a sport above and send your first clip — your coach's feedback will show up right here.
                </Text>
                <TouchableOpacity
                  style={styles.getStartedButton}
                  onPress={() => navigation.navigate('ExploreSports', { screen: 'ExploreSportsMain' })}
                >
                  <View style={styles.getStartedButtonInner}>
                    <Text style={styles.getStartedButtonText}>Find your first coach</Text>
                    <Ionicons name="arrow-forward" size={16} color="white" />
                  </View>
                </TouchableOpacity>
              </LinearGradient>
            )}
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  scrollView: {
    flex: 1,
  },
  headerContainer: {
    marginBottom: 8,
  },
  headerGradient: {
    paddingTop: 86,
    paddingBottom: 50,
    paddingHorizontal: 24,
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  header: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerContent: {
    alignItems: 'flex-start',
    textAlign: 'left',
  },
  greeting: {
    fontSize: width * 0.08,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    marginBottom: 12,
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtext: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Regular',
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: 22,
    textAlign: 'left',
  },
  headerIcon: {
    marginLeft: 20,
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  decorativeCircle3: {
    position: 'absolute',
    top: 20,
    left: width * 0.3,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  mainContent: {
    padding: 24,
    paddingTop: 16,
  },
  motivationCard: {
    marginBottom: 32,
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  motivationGradient: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(12, 41, 92, 0.1)',
  },
  motivationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  motivationTitle: {
    fontSize: width * 0.045,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginLeft: 8,
  },
  motivationQuote: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#2C3E50',
    lineHeight: 26,
    fontStyle: 'italic',
  },
  feedbackSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: width * 0.05,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginLeft: 8,
  },
  feedbackCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(12, 41, 92, 0.08)',
  },
  feedbackAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0C295C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    overflow: 'hidden',
  },
  feedbackAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  feedbackInitial: {
    fontSize: 20,
    fontFamily: 'Rubik-SemiBold',
    color: 'white',
  },
  feedbackContent: {
    flex: 1,
  },
  feedbackCoachName: {
    fontSize: width * 0.045,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginBottom: 2,
  },
  feedbackPackage: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Regular',
    color: '#0C295C',
    opacity: 0.7,
    marginBottom: 8,
  },
  feedbackStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  feedbackStatusText: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Regular',
    color: '#0C295C',
    opacity: 0.7,
  },
  feedbackRight: {
    alignItems: 'center',
  },
  activeBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  activeBadgeActive: {
    backgroundColor: '#4CAF50',
  },
  activeBadgeInactive: {
    backgroundColor: '#9E9E9E',
  },
  activeBadgeCompleted: {
    backgroundColor: '#2196F3',
  },
  activeBadgeExpired: {
    backgroundColor: '#F44336',
  },
  activeBadgeText: {
    fontSize: width * 0.035,
    fontFamily: 'Rubik-Medium',
    color: 'white',
  },
  findCoachSection: {
    marginBottom: 28,
  },
  findCoachHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  findCoachTitle: {
    fontSize: width * 0.05,
    fontFamily: 'Rubik-Bold',
    color: '#0C295C',
  },
  seeAllLink: {
    fontSize: width * 0.038,
    fontFamily: 'Manrope-Medium',
    color: '#2D5A8A',
  },
  findCoachSubtitle: {
    fontSize: width * 0.038,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    marginBottom: 16,
  },
  sportCardsScroll: {
    marginHorizontal: -24,
  },
  sportCardsContainer: {
    paddingLeft: 24,
    paddingRight: 24,
  },
  sportCard: {
    width: SPORT_CARD_WIDTH,
    height: SPORT_CARD_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  sportCardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  sportCardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  coachCountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  coachCountDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  coachCountText: {
    fontSize: width * 0.03,
    fontFamily: 'Manrope-Medium',
    color: '#0C295C',
  },
  sportCardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  sportCardName: {
    fontSize: width * 0.055,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    marginBottom: 4,
  },
  browseCoachesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  browseCoachesText: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Medium',
    color: 'white',
    marginRight: 4,
  },
  noFeedbackCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(12, 41, 92, 0.08)',
  },
  noFeedbackIconWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  noFeedbackIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(169, 195, 221, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noFeedbackPlusBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  noFeedbackTitle: {
    fontSize: width * 0.045,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginBottom: 12,
  },
  noFeedbackSubtitle: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  getStartedButton: {
    borderRadius: 30,
    backgroundColor: '#FF6B35',
    shadowColor: '#FF6B35',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  getStartedButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 16,
  },
  getStartedButtonText: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-SemiBold',
    color: 'white',
    marginRight: 8,
  },
});
