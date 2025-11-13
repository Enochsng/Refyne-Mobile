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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../supabaseClient';
import { getPlayerProfilePhoto } from '../../services/conversationService';

const { width, height } = Dimensions.get('window');

export default function CoachesHomeScreen({ navigation }) {
  const [coachName, setCoachName] = useState('Coach');
  const [recentActivity, setRecentActivity] = useState([]);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Function to get coach's name from Supabase
  const getCoachName = async () => {
    try {
      // Refresh the session to get the latest user data
      const { data: { session }, error: sessionError } = await supabase.auth.refreshSession();
      
      if (sessionError) {
        console.log('Session refresh error:', sessionError);
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user metadata:', user?.user_metadata);
      
      if (user?.user_metadata?.full_name) {
        const firstName = user.user_metadata.full_name.split(' ')[0];
        console.log('Setting coach name to:', firstName);
        setCoachName(firstName);
      } else {
        console.log('No full_name found in user metadata');
      }
    } catch (error) {
      console.log('Error getting coach name:', error);
    }
  };

  // Function to load recent activities from conversations and coaching sessions
  const loadRecentActivity = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        return;
      }

      const coachId = user.id;
      console.log('Loading recent activity for coach:', coachId);

      // Get conversations for this coach
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('coach_id', coachId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (convError) {
        console.error('Error fetching conversations:', convError);
        return;
      }

      if (!conversations || conversations.length === 0) {
        console.log('No conversations found for coach');
        setRecentActivity([]);
        return;
      }

      // Get coaching sessions for package info
      const sessionIds = conversations
        .map(conv => conv.session_id)
        .filter(Boolean);

      let sessions = [];
      if (sessionIds.length > 0) {
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('coaching_sessions')
          .select('*')
          .in('id', sessionIds);

        if (sessionsError) {
          console.error('Error fetching coaching sessions:', sessionsError);
        } else {
          sessions = sessionsData || [];
        }
      }

      // Create a map of session_id to session for quick lookup
      const sessionMap = {};
      sessions.forEach(session => {
        sessionMap[session.id] = session;
      });

      // Format activities from conversations and fetch profile photos
      const activitiesPromises = conversations.map(async (conv) => {
        const session = sessionMap[conv.session_id];
        
        // Get package info from session
        let packageText = 'Package';
        if (session) {
          // Calculate total clips (original package size)
          const totalClips = (session.clips_remaining || 0) + (session.clips_uploaded || 0);
          const clips = totalClips > 0 ? totalClips : (session.clips_remaining || 0);
          const sport = conv.sport || session.sport || '';
          const capitalizedSport = sport.charAt(0).toUpperCase() + sport.slice(1).toLowerCase();
          
          if (session.package_type === 'subscription') {
            packageText = `${clips} Clips Subscription • ${capitalizedSport}`;
          } else {
            packageText = `${clips} Clips Package • ${capitalizedSport}`;
          }
        } else {
          // Fallback if session not found
          const sport = conv.sport || '';
          const capitalizedSport = sport.charAt(0).toUpperCase() + sport.slice(1).toLowerCase();
          packageText = `Package • ${capitalizedSport}`;
        }

        // Get player name and initial
        const playerName = conv.player_name || 'Player';
        const studentInitial = playerName.charAt(0).toUpperCase();

        // Fetch player profile photo
        let profilePhotoUrl = null;
        try {
          profilePhotoUrl = await getPlayerProfilePhoto(conv.player_id);
          console.log(`Profile photo for ${playerName} (${conv.player_id}):`, profilePhotoUrl || 'Not found');
        } catch (error) {
          console.log('Error fetching profile photo for player:', error);
        }

        // Determine status based on session
        let status = 'Active';
        if (session) {
          if (session.status === 'active') {
            status = 'Active';
          } else if (session.status === 'completed') {
            status = 'Completed';
          } else if (session.status === 'expired') {
            status = 'Expired';
          }
        }

        return {
          id: conv.id,
          studentName: playerName,
          studentInitial: studentInitial,
          package: packageText,
          status: status,
          message: 'Click to view feedback and chat',
          conversationId: conv.id,
          sessionId: conv.session_id,
          avatar: profilePhotoUrl,
        };
      });

      const activities = await Promise.all(activitiesPromises);
      console.log('Loaded recent activities:', activities.length);
      setRecentActivity(activities);
    } catch (error) {
      console.error('Error loading recent activity:', error);
      setRecentActivity([]);
    }
  };

  useEffect(() => {
    getCoachName();
    loadRecentActivity();
    
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
    ]).start();
  }, []);

  // Refresh coach name and recent activity when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Add a small delay to ensure any recent updates have propagated
      const timer = setTimeout(() => {
        getCoachName();
        loadRecentActivity();
      }, 500);
      
      return () => clearTimeout(timer);
    }, [])
  );

  const handleReviewClips = () => {
    navigation.navigate('Messages');
  };

  const handleManageTutorials = () => {
    navigation.navigate('Tutorials');
  };

  const handleViewAnalytics = () => {
    navigation.navigate('Earnings');
  };

  const handleActivityPress = (activity) => {
    navigation.navigate('Messages', { conversationId: activity.conversationId });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={['#0C295C', '#1A4A7A', '#2D5A8A']}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Decorative dots */}
            <View style={styles.decorativeDot1} />
            <View style={styles.decorativeDot2} />
            <View style={styles.decorativeDot3} />
            <View style={styles.decorativeDot4} />
            <View style={styles.decorativeDot5} />
            
            <View style={styles.headerContent}>
              <Text style={styles.greeting}>Hi {coachName}!</Text>
              <Text style={styles.headerSubtext}>
                Review clips and provide feedback to players
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Action Cards */}
          <Animated.View 
            style={[
              styles.actionCardsContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Review Clips Card */}
            <View style={styles.actionCard}>
              <Text style={styles.cardTitle}>Review Clips</Text>
              <Text style={styles.cardDescription}>
                Provide feedback on player uploads and help them improve their technique.
              </Text>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleReviewClips}
              >
                <LinearGradient
                  colors={['#0C295C', '#1A4A7A']}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>Start Reviewing</Text>
                  <Ionicons name="arrow-forward" size={16} color="white" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* My Tutorials Card */}
            <View style={styles.actionCard}>
              <Text style={styles.cardTitle}>My Tutorials</Text>
              <Text style={styles.cardDescription}>
                Create and manage your teaching videos to help players learn new techniques.
              </Text>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleManageTutorials}
              >
                <LinearGradient
                  colors={['#2196F3', '#42A5F5']}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>Manage Tutorials</Text>
                  <Ionicons name="arrow-forward" size={16} color="white" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Track Earnings Card */}
            <View style={styles.actionCard}>
              <Text style={styles.cardTitle}>Track Earnings</Text>
              <Text style={styles.cardDescription}>
                Monitor your earnings and view detailed analytics of your coaching business.
              </Text>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={handleViewAnalytics}
              >
                <LinearGradient
                  colors={['#4CAF50', '#66BB6A']}
                  style={styles.buttonGradient}
                >
                  <Text style={styles.buttonText}>View Analytics</Text>
                  <Ionicons name="arrow-forward" size={16} color="white" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Recent Activity Section */}
          <Animated.View 
            style={[
              styles.recentActivitySection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.activityHeader}>
              <View style={styles.activityTitleContainer}>
                <Ionicons name="time" size={20} color="#0C295C" />
                <Text style={styles.activityTitle}>Recent Activity</Text>
              </View>
            </View>
            
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, index) => (
                <TouchableOpacity
                  key={activity.id}
                  style={[
                    styles.activityCard,
                    index < recentActivity.length - 1 && styles.activityCardWithMargin
                  ]}
                  onPress={() => handleActivityPress(activity)}
                  activeOpacity={0.7}
                >
                  <View style={styles.activityContent}>
                    <View style={styles.activityAvatar}>
                      {activity.avatar ? (
                        <Image 
                          source={{ uri: activity.avatar }} 
                          style={styles.avatarImage}
                          resizeMode="cover"
                          onError={() => {
                            console.log('Failed to load profile image for:', activity.studentName);
                          }}
                        />
                      ) : (
                        <LinearGradient
                          colors={['#0C295C', '#1A4A7A']}
                          style={styles.avatarGradient}
                        >
                          <Text style={styles.avatarText}>{activity.studentInitial}</Text>
                        </LinearGradient>
                      )}
                    </View>
                    
                    <View style={styles.activityInfo}>
                      <Text style={styles.studentName}>{activity.studentName}</Text>
                      <Text style={styles.packageInfo}>{activity.package}</Text>
                      <View style={styles.activityStatus}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>{activity.message}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.activityRight}>
                      <View style={[
                        styles.activeBadge,
                        activity.status === 'Active' && styles.activeBadgeActive,
                        activity.status === 'Completed' && styles.activeBadgeCompleted,
                        activity.status === 'Expired' && styles.activeBadgeExpired
                      ]}>
                        <Text style={styles.activeBadgeText}>{activity.status}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#90A4AE" />
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyStateContainer}>
                <LinearGradient
                  colors={['#FFFFFF', '#F8FAFF']}
                  style={styles.emptyStateGradient}
                >
                  <Ionicons name="time-outline" size={48} color="#CBD5E1" />
                  <Text style={styles.emptyStateTitle}>No Recent Activity</Text>
                  <Text style={styles.emptyStateText}>
                    When players book your coaching services, their activity will appear here.
                  </Text>
                </LinearGradient>
              </View>
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
  header: {
    marginBottom: 8,
  },
  headerGradient: {
    paddingTop: 90,
    paddingBottom: 60,
    paddingHorizontal: 24,
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  headerContent: {
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: width * 0.08,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtext: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
    textAlign: 'left',
  },
  // Decorative dots for header
  decorativeDot1: {
    position: 'absolute',
    top: 20,
    right: 60,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  decorativeDot2: {
    position: 'absolute',
    top: 40,
    right: 100,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  decorativeDot3: {
    position: 'absolute',
    top: 60,
    right: 80,
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  decorativeDot4: {
    position: 'absolute',
    top: 80,
    right: 120,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  decorativeDot5: {
    position: 'absolute',
    top: 100,
    right: 50,
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  mainContent: {
    padding: 24,
    paddingTop: 16,
  },
  actionCardsContainer: {
    marginBottom: 32,
  },
  actionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
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
    position: 'relative',
  },
  cardTitle: {
    fontSize: width * 0.045,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 16,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-SemiBold',
    color: 'white',
    marginRight: 6,
  },
  recentActivitySection: {
    marginBottom: 32,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityTitle: {
    fontSize: width * 0.05,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginLeft: 8,
  },
  viewAllButton: {
    backgroundColor: '#0C295C',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  viewAllText: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-SemiBold',
    color: 'white',
  },
  activityCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(12, 41, 92, 0.06)',
  },
  activityCardWithMargin: {
    marginBottom: 12,
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarText: {
    fontSize: 20,
    fontFamily: 'Rubik-SemiBold',
    color: 'white',
  },
  activityInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: width * 0.046,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  packageInfo: {
    fontSize: width * 0.036,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    marginBottom: 8,
    letterSpacing: 0.1,
  },
  activityStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 8,
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 2,
  },
  statusText: {
    fontSize: width * 0.034,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
  },
  activityRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  activeBadge: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  activeBadgeActive: {
    backgroundColor: '#4CAF50',
  },
  activeBadgeCompleted: {
    backgroundColor: '#2196F3',
  },
  activeBadgeExpired: {
    backgroundColor: '#9E9E9E',
  },
  activeBadgeText: {
    fontSize: width * 0.033,
    fontFamily: 'Rubik-Medium',
    color: 'white',
    letterSpacing: 0.3,
  },
  emptyStateContainer: {
    padding: 20,
  },
  emptyStateGradient: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: width * 0.045,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
});