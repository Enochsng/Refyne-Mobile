import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Animated,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../supabaseClient';

const { width, height } = Dimensions.get('window');


export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState({
    name: 'Enoch',
    email: 'enok.song12@gmail.com',
    sports: ['Football', 'Basketball'],
    joinDate: 'January 2024',
    accountType: 'Player', // Default to Player
  });
  
  const [profilePhotoUri, setProfilePhotoUri] = useState(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [newName, setNewName] = useState('');

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Helper function to format date as MM/DD/YYYY
  const formatSignupDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    } catch (error) {
      console.log('Error formatting signup date:', error);
      return 'Unknown';
    }
  };

  React.useEffect(() => {
    // Get user's data from Supabase
    const getUserData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          // Get name from user metadata or email
          let userName = 'Enoch'; // Default fallback
          if (authUser.user_metadata?.full_name) {
            userName = authUser.user_metadata.full_name.split(' ')[0]; // Get first name
          } else if (authUser.user_metadata?.name) {
            userName = authUser.user_metadata.name.split(' ')[0];
          } else if (authUser.user_metadata?.display_name) {
            userName = authUser.user_metadata.display_name.split(' ')[0];
          }

          // Get account type
          let accountType = 'Player';
          if (authUser.user_metadata?.account_type) {
            accountType = authUser.user_metadata.account_type === 'coach' ? 'Coach' : 'Player';
          }

          // Format the actual signup date
          const signupDate = authUser.created_at ? formatSignupDate(authUser.created_at) : 'Unknown';

          setUser(prevUser => ({
            ...prevUser,
            name: userName,
            email: authUser.email || 'enok.song12@gmail.com',
            accountType: accountType,
            joinDate: signupDate
          }));

          // Load user-specific profile photo
          try {
            let savedPhotoUri = await AsyncStorage.getItem(`profile_photo_${authUser.id}`);
            
            // Fallback: If no user-specific photo, check for old format
            if (!savedPhotoUri) {
              savedPhotoUri = await AsyncStorage.getItem('profile_photo');
              if (savedPhotoUri) {
                console.log('Using fallback profile photo format for player');
              }
            }
            
            if (savedPhotoUri) {
              setProfilePhotoUri(savedPhotoUri);
              console.log('Loaded profile photo for player user:', authUser.id);
            } else {
              console.log('No profile photo found for player user:', authUser.id);
            }
          } catch (photoError) {
            console.log('Error loading profile photo for player:', photoError);
          }
        }
      } catch (error) {
        console.log('Error getting user data:', error);
      }
    };

    getUserData();

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

  const handleChangeName = () => {
    setNewName(user.name);
    setShowNameModal(true);
  };

  const handleSaveName = async () => {
    if (newName.trim() === '') {
      Alert.alert('Error', 'Please enter a valid name');
      return;
    }

    try {
      console.log('Updating name to:', newName.trim());
      
      // Update the name in Supabase user metadata
      const { data, error } = await supabase.auth.updateUser({
        data: { full_name: newName.trim() }
      });

      if (error) {
        console.log('Error updating name:', error);
        Alert.alert('Error', 'Failed to update name. Please try again.');
        return;
      }

      console.log('Name update successful:', data);

      // Update local state
      setUser(prev => ({
        ...prev,
        name: newName.trim()
      }));
      
      setNewName('');
      setShowNameModal(false);
      Alert.alert('Success', 'Name updated successfully!');
    } catch (error) {
      console.log('Error updating name:', error);
      Alert.alert('Error', 'Failed to update name. Please try again.');
    }
  };

  const handleChangeProfilePhoto = async () => {
    try {
      // Get current user to associate photo with their ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'User not authenticated. Please sign in again.');
        return;
      }

      // Request permission to access media library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to change your profile photo.'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        
        // Save profile photo URI to user-specific AsyncStorage
        await AsyncStorage.setItem(`profile_photo_${user.id}`, photoUri);
        console.log('Profile photo saved for player user:', user.id);
        
        // Update local state
        setProfilePhotoUri(photoUri);
        Alert.alert('Success', 'Profile photo updated successfully!');
      }
    } catch (error) {
      console.log('Error picking image:', error);
      Alert.alert('Error', 'Failed to update profile photo. Please try again.');
    }
  };

  const handleChangePassword = () => {
    Alert.alert('Change Password', 'Password change feature coming soon!');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const { error } = await supabase.auth.signOut();
              if (error) {
                Alert.alert('Error', 'Failed to logout. Please try again.');
                console.error('Logout error:', error);
              } else {
                // Navigation will be handled automatically by the auth state change listener in App.js
                console.log('Successfully logged out');
              }
            } catch (error) {
              Alert.alert('Error', 'An unexpected error occurred. Please try again.');
              console.error('Logout error:', error);
            }
          }
        }
      ]
    );
  };

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
                <Text style={styles.headerTitle}>Your Profile</Text>
                <Text style={styles.headerSubtitle}>
                  Manage your account settings and update your profile
                </Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                {profilePhotoUri ? (
                  <Image 
                    source={{ uri: profilePhotoUri }} 
                    style={styles.avatarImage}
                  />
                ) : (
                  <Ionicons name="person" size={40} color="#0C295C" />
                )}
              </View>
              <TouchableOpacity 
                style={styles.editAvatarButton}
                onPress={handleChangeProfilePhoto}
              >
                <Ionicons name="camera" size={16} color="white" />
              </TouchableOpacity>
            </View>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userEmail}>{user.email}</Text>
          </View>



          {/* Account Info */}
          <View style={styles.accountContainer}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="calendar" size={20} color="#0C295C" />
                <Text style={styles.infoLabel}>Member since</Text>
                <Text style={styles.infoValue}>{user.joinDate}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="person-circle" size={20} color="#0C295C" />
                <Text style={styles.infoLabel}>Account type</Text>
                <Text style={styles.infoValue}>{user.accountType}</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={handleChangeName}>
              <Ionicons name="create-outline" size={24} color="#0C295C" />
              <Text style={styles.actionButtonText}>Change Name</Text>
              <Ionicons name="chevron-forward" size={20} color="#90A4AE" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleChangeProfilePhoto}>
              <Ionicons name="camera-outline" size={24} color="#0C295C" />
              <Text style={styles.actionButtonText}>Add or change profile photo</Text>
              <Ionicons name="chevron-forward" size={20} color="#90A4AE" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleChangePassword}>
              <Ionicons name="key-outline" size={24} color="#0C295C" />
              <Text style={styles.actionButtonText}>Change Password</Text>
              <Ionicons name="chevron-forward" size={20} color="#90A4AE" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.logoutButton]} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#FF5722" />
              <Text style={[styles.actionButtonText, styles.logoutText]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Name Change Modal */}
      <Modal
        visible={showNameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Change Name</Text>
              <TouchableOpacity
                onPress={() => setShowNameModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Enter your new name:</Text>
              <TextInput
                style={styles.languageInput}
                placeholder="Enter your name"
                placeholderTextColor="#90A4AE"
                value={newName}
                onChangeText={setNewName}
                autoFocus={true}
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => {
                  setNewName('');
                  setShowNameModal(false);
                }}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addModalButton}
                onPress={handleSaveName}
              >
                <LinearGradient
                  colors={['#0C295C', '#1A4A7A']}
                  style={styles.addModalButtonGradient}
                >
                  <Text style={styles.addModalButtonText}>Save Name</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: 90,
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
  headerTitle: {
    fontSize: width * 0.08,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    marginBottom: 16,
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
  profileCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginBottom: 25,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0C295C',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: width * 0.06,
    fontFamily: 'Rubik-Bold',
    color: '#0C295C',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#0C295C',
    opacity: 0.7,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: width * 0.05,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginBottom: 15,
  },
  accountContainer: {
    marginBottom: 25,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoLabel: {
    flex: 1,
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#0C295C',
    marginLeft: 15,
  },
  infoValue: {
    fontSize: width * 0.04,
    fontFamily: 'Rubik-Medium',
    color: '#0C295C',
  },
  actionsContainer: {
    marginBottom: 30,
  },
  actionButton: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    flex: 1,
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Medium',
    color: '#0C295C',
    marginLeft: 15,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#FF5722',
  },
  logoutText: {
    color: '#FF5722',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: width * 0.85,
    maxWidth: 400,
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 15,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: width * 0.05,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
  },
  closeButton: {
    padding: 4,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Medium',
    color: '#0C295C',
    marginBottom: 12,
  },
  languageInput: {
    borderWidth: 1,
    borderColor: 'rgba(12, 41, 92, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#0C295C',
    backgroundColor: '#F8FAFF',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(12, 41, 92, 0.2)',
    alignItems: 'center',
  },
  cancelModalButtonText: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-SemiBold',
    color: '#64748B',
  },
  addModalButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addModalButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  addModalButtonText: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-SemiBold',
    color: 'white',
  },
});
