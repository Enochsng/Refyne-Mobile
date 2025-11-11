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
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getAllCoachProfiles, getCoachesBySport, formatExperience, formatExpertise, cleanupDeletedProfiles, migrateCoachNames } from '../../utils/coachData';

const { width, height } = Dimensions.get('window');

const sports = [
  {
    id: 1,
    name: 'Golf',
    description: 'Perfect your swing and improve your game with professional coaching',
    image: require('../../assets/golf.jpg'),
    gradient: ['#4CAF50', '#2E7D32'],
  },
  {
    id: 2,
    name: 'Badminton',
    description: 'Enhance your badminton skills with expert guidance',
    image: require('../../assets/badmintonphoto.jpg'),
    gradient: ['#2196F3', '#1976D2'],
  },
  {
    id: 3,
    name: 'Weight Lifting',
    description: 'Improve your form and increase your strength with expert coaching',
    image: require('../../assets/weightliftingphoto.jpg'),
    gradient: ['#607D8B', '#37474F'],
  },
];

export default function ExploreSportsScreen({ navigation }) {
  const [selectedSport, setSelectedSport] = useState(null);
  const [coachesBySport, setCoachesBySport] = useState({});
  const [loading, setLoading] = useState(true);
  
  // Animation refs for header and section
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  // Card animation refs - simplified to avoid conflicts
  const cardAnimations = useRef(
    sports.map(() => ({
      // Press animations (native driver only)
      pressScale: new Animated.Value(1),
      pressTranslateY: new Animated.Value(0),
      // Card entrance animations (native driver only)
      entranceOpacity: new Animated.Value(0),
      entranceTranslateY: new Animated.Value(50),
      entranceScale: new Animated.Value(0.95),
    }))
  ).current;

  // Load coach data on component mount
  useEffect(() => {
    const loadCoachData = async () => {
      try {
        setLoading(true);
        
        // Clean up any deleted profiles first
        await cleanupDeletedProfiles();
        
        // Migrate coach names if needed
        await migrateCoachNames();
        
        const coaches = await getAllCoachProfiles();
        
        // Group coaches by sport
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
        console.error('Error loading coach data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadCoachData();
  }, []);

  React.useEffect(() => {
    // Start entrance animations for header and section
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

    // Start card entrance animations with staggered delay
    cardAnimations.forEach((cardAnim, index) => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(cardAnim.entranceOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(cardAnim.entranceTranslateY, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(cardAnim.entranceScale, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]).start();
      }, index * 150); // Stagger each card by 150ms
    });
  }, []);

  const handleSportSelect = (sport, index) => {
    setSelectedSport(sport);
    // Navigate to coaches for this sport
    navigation.navigate('Coaches', { sport: sport.name });
  };

  const handleCardPressIn = (index) => {
    // Simple native driver animations only
    Animated.parallel([
      Animated.timing(cardAnimations[index].pressScale, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(cardAnimations[index].pressTranslateY, {
        toValue: -5,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleCardPressOut = (index) => {
    // Simple native driver animations only
    Animated.parallel([
      Animated.timing(cardAnimations[index].pressScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(cardAnimations[index].pressTranslateY, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={styles.container}>
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
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Decorative Circles */}
          <View style={styles.decorativeCircle1} />
          <View style={styles.decorativeCircle2} />
          <View style={styles.decorativeCircle3} />
          
          <View style={styles.headerInner}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Explore Sports</Text>
              <Text style={styles.headerSubtitle}>
                Choose your sport and discover amazing coaches ready to help you reach your goals.
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Main Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.mainContent}>
          {/* Section Header */}
          <Animated.View 
            style={[
              styles.sectionHeader,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Text style={styles.sectionTitle}>Get started with a sport</Text>
            <Text style={styles.sectionSubtitle}>
              Select your sport to find specialized coaches and get targeted feedback
            </Text>
          </Animated.View>

          {/* Loading State */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0C295C" />
              <Text style={styles.loadingText}>Loading coaches...</Text>
            </View>
          ) : (
            /* Sports with Coach Cards */
            <View style={styles.sportsContainer}>
              {sports.map((sport, index) => {
                const sportCoaches = coachesBySport[sport.name] || [];
                const hasCoaches = sportCoaches.length > 0;
                
                return (
                  <Animated.View
                    key={sport.id}
                    style={[
                      styles.sportCardContainer,
                      {
                        opacity: cardAnimations[index].entranceOpacity,
                        transform: [
                          { translateY: cardAnimations[index].entranceTranslateY },
                          { scale: cardAnimations[index].entranceScale }
                        ]
                      }
                    ]}
                  >
                    <Animated.View
                      style={[
                        styles.sportCard,
                        {
                          transform: [
                            { scale: cardAnimations[index].pressScale },
                            { translateY: cardAnimations[index].pressTranslateY }
                          ]
                        }
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.sportCardTouchable}
                        onPress={() => handleSportSelect(sport, index)}
                        onPressIn={() => handleCardPressIn(index)}
                        onPressOut={() => handleCardPressOut(index)}
                        activeOpacity={1}
                      >
                        <View style={styles.sportImageContainer}>
                          {typeof sport.image === 'string' ? (
                            <LinearGradient
                              colors={sport.gradient}
                              style={styles.sportImageBackground}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                            >
                              <View style={styles.sportImageOverlay}>
                                <Text style={styles.sportTitle}>{sport.name}</Text>
                                {hasCoaches && (
                                  <Text style={styles.coachCount}>
                                    {sportCoaches.length} Coach{sportCoaches.length !== 1 ? 'es' : ''} Available
                                  </Text>
                                )}
                              </View>
                            </LinearGradient>
                          ) : (
                            <View style={styles.sportImageBackground}>
                              <Image
                                source={sport.image}
                                style={styles.sportImageBackground}
                                resizeMode="cover"
                              />
                              <View style={styles.sportImageOverlay}>
                                <Text style={styles.sportTitle}>{sport.name}</Text>
                                {hasCoaches && (
                                  <Text style={styles.coachCount}>
                                    {sportCoaches.length} Coach{sportCoaches.length !== 1 ? 'es' : ''} Available
                                  </Text>
                                )}
                              </View>
                            </View>
                          )}
                        </View>
                        <View style={styles.sportDescriptionContainer}>
                          <Text style={styles.sportDescription}>{sport.description}</Text>
                          
                          {/* Show coach previews */}
                          {hasCoaches && (
                            <View style={styles.coachPreviewContainer}>
                              <Text style={styles.coachPreviewTitle}>Available Coaches:</Text>
                              {sportCoaches.slice(0, 2).map((coach, coachIndex) => (
                                <View key={coach.id} style={styles.coachPreviewItem}>
                                  <View style={styles.coachPreviewAvatar}>
                                    {coach.profilePicture ? (
                                      <Image 
                                        source={{ uri: coach.profilePicture }} 
                                        style={styles.coachPreviewProfileImage}
                                        resizeMode="cover"
                                      />
                                    ) : (
                                      <Text style={styles.coachPreviewInitial}>
                                        {coach.name.charAt(0).toUpperCase()}
                                      </Text>
                                    )}
                                  </View>
                                  <View style={styles.coachPreviewInfo}>
                                    <Text style={styles.coachPreviewName}>{coach.name}</Text>
                                    <Text style={styles.coachPreviewExperience}>
                                      {formatExperience(coach.experience)}
                                    </Text>
                                  </View>
                                </View>
                              ))}
                              {sportCoaches.length > 2 && (
                                <Text style={styles.moreCoachesText}>
                                  +{sportCoaches.length - 2} more coaches
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    </Animated.View>
                  </Animated.View>
                );
              })}
            </View>
          )}
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
  headerContainer: {
    marginBottom: 8,
  },
  header: {
    paddingTop: 80,
    paddingBottom: 50,
    paddingHorizontal: 24,
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 1,
  },
  headerContent: {
    alignItems: 'left',
  },
  headerTitle: {
    fontSize: width * 0.08,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    marginBottom: 12,
    textAlign: 'left',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  headerSubtitle: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Regular',
    color: 'rgba(255, 255, 255, 0.95)',
    lineHeight: 24,
    textAlign: 'left',
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
  scrollView: {
    flex: 1,
  },
  mainContent: {
    padding: 24,
    paddingTop: 16,
  },
  sectionHeader: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: width * 0.06,
    fontFamily: 'Rubik-Bold',
    color: '#0C295C',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    lineHeight: 22,
  },
  sportsContainer: {
    gap: 20,
  },
  sportCardContainer: {
    marginBottom: 20,
  },
  sportCard: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'white',
    borderWidth: 0,
    // Sexy modern design with subtle effects
    marginHorizontal: 4,
    marginVertical: 2,
    // Add subtle inner glow effect
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sportCardTouchable: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  sportImageContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  sportImageBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  sportImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(12, 41, 92, 0.6)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    // Sexy gradient overlay effect
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  sportTitle: {
    fontSize: width * 0.085,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    textAlign: 'center',
    letterSpacing: 1.5,
    // Sexy modern typography
    textTransform: 'uppercase',
    fontWeight: '800',
  },
  sportDescriptionContainer: {
    backgroundColor: 'white',
    padding: 28,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderTopWidth: 0,
    // Sexy modern container
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(12, 41, 92, 0.05)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(12, 41, 92, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(12, 41, 92, 0.05)',
  },
  sportDescription: {
    fontSize: width * 0.042,
    fontFamily: 'Manrope-SemiBold',
    color: '#475569',
    lineHeight: 24,
    textAlign: 'center',
    letterSpacing: 0.5,
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
  coachCount: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Medium',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 8,
    textAlign: 'center',
  },
  coachPreviewContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  coachPreviewTitle: {
    fontSize: width * 0.038,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginBottom: 12,
    textAlign: 'center',
  },
  coachPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  coachPreviewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0C295C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  coachPreviewInitial: {
    fontSize: width * 0.035,
    fontFamily: 'Rubik-Bold',
    color: 'white',
  },
  coachPreviewProfileImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  coachPreviewInfo: {
    flex: 1,
  },
  coachPreviewName: {
    fontSize: width * 0.038,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginBottom: 2,
  },
  coachPreviewExperience: {
    fontSize: width * 0.032,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
  },
  moreCoachesText: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Medium',
    color: '#0C295C',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
