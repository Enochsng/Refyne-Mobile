import React, { useState, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../supabaseClient';

const { width, height } = Dimensions.get('window');

// Empty tutorials array - no mock data
const mockTutorials = [];

export default function CoachesTutorialsScreen({ navigation }) {
  const [tutorials, setTutorials] = useState(mockTutorials);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newTutorial, setNewTutorial] = useState({
    title: '',
    description: '',
  });
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [previewTutorial, setPreviewTutorial] = useState(null);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  // Helper function to save tutorials to AsyncStorage
  const saveTutorials = async (tutorialsToSave) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await AsyncStorage.setItem(`tutorials_${user.id}`, JSON.stringify(tutorialsToSave));
        console.log('Tutorials saved for user:', user.id);
      }
    } catch (error) {
      console.log('Error saving tutorials:', error);
    }
  };

  // Helper function to load tutorials from AsyncStorage
  const loadTutorials = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const savedTutorials = await AsyncStorage.getItem(`tutorials_${user.id}`);
        if (savedTutorials) {
          const tutorialsData = JSON.parse(savedTutorials);
          setTutorials(tutorialsData);
          console.log('Tutorials loaded for user:', user.id, tutorialsData.length, 'tutorials');
        } else {
          console.log('No tutorials found for user:', user.id);
        }
      }
    } catch (error) {
      console.log('Error loading tutorials:', error);
    }
  };

  useEffect(() => {
    // Load tutorials from AsyncStorage
    loadTutorials();

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

  // Reload tutorials when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('Tutorials screen focused, reloading tutorials...');
      loadTutorials();
    }, [])
  );

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getTotalTutorials = () => {
    return tutorials.length;
  };

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getVideoDuration = async (uri) => {
    try {
      // Create a temporary video element to get duration
      const video = new Video({ uri });
      await video.loadAsync();
      const status = await video.getStatusAsync();
      if (status.isLoaded) {
        return status.durationMillis / 1000; // Convert to seconds
      }
      return null;
    } catch (error) {
      console.log('Error getting video duration:', error);
      return null;
    }
  };

  const selectVideo = async () => {
    try {
      // Request permission to access media library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Sorry, we need camera roll permissions to select videos!',
          [{ text: 'OK' }]
        );
        return;
      }

      // Launch image picker for videos only
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'videos',
        allowsEditing: true,
        quality: 1,
        videoMaxDuration: 300, // 5 minutes max
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const video = result.assets[0];
        setSelectedVideo(video);
        console.log('Video selected:', video);
        
        Alert.alert(
          'Video Selected',
          `Video "${video.fileName || 'Untitled'}" has been selected successfully!`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error selecting video:', error);
      Alert.alert(
        'Error',
        'Failed to select video. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };


  const handleUploadTutorial = async () => {
    if (newTutorial.title.trim() === '' || newTutorial.description.trim() === '') {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    if (!selectedVideo) {
      Alert.alert('Error', 'Please select a video to upload');
      return;
    }

    // Get video duration
    let videoDuration = '0:00';
    if (selectedVideo.duration) {
      videoDuration = formatDuration(selectedVideo.duration / 1000);
    } else {
      // Fallback: try to get duration from video URI
      const duration = await getVideoDuration(selectedVideo.uri);
      if (duration) {
        videoDuration = formatDuration(duration);
      }
    }

    const tutorial = {
      id: Date.now(), // Use timestamp for unique ID
      title: newTutorial.title,
      description: newTutorial.description,
      videoUri: selectedVideo.uri,
      videoName: selectedVideo.fileName || 'Tutorial Video',
      duration: videoDuration,
      views: 0,
      uploadDate: new Date().toISOString().split('T')[0],
      thumbnail: '🎥',
      isPublic: true,
    };

    const updatedTutorials = [tutorial, ...tutorials];
    setTutorials(updatedTutorials);
    
    // Save to AsyncStorage
    await saveTutorials(updatedTutorials);
    
    setNewTutorial({ title: '', description: '' });
    setSelectedVideo(null);
    setShowUploadModal(false);
    
    Alert.alert('Success', 'Tutorial uploaded successfully!');
  };

  const handleTutorialPress = (tutorial) => {
    setPreviewTutorial(tutorial);
    setShowVideoPreview(true);
  };

  const handleDeleteTutorial = (tutorial) => {
    Alert.alert(
      'Delete Tutorial',
      `Are you sure you want to delete "${tutorial.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            const updatedTutorials = tutorials.filter(t => t.id !== tutorial.id);
            setTutorials(updatedTutorials);
            
            // Save to AsyncStorage
            await saveTutorials(updatedTutorials);
            
            Alert.alert(
              'Tutorial Deleted',
              `"${tutorial.title}" has been successfully deleted.`,
              [{ text: 'OK' }]
            );
          }
        }
      ]
    );
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
            {/* Decorative dots */}
            <View style={styles.decorativeDot1} />
            <View style={styles.decorativeDot2} />
            <View style={styles.decorativeDot3} />
            <View style={styles.decorativeDot4} />
            <View style={styles.decorativeDot5} />
            
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>My Tutorials</Text>
              <Text style={styles.headerSubtitle}>
                Create and manage your coaching tutorial videos
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Upload Button */}
          <Animated.View 
            style={[
              styles.uploadButtonContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { translateY: slideAnim },
                  { scale: scaleAnim }
                ]
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.uploadButton}
              onPress={() => setShowUploadModal(true)}
            >
              <LinearGradient
                colors={['#0C295C', '#1A4A7A']}
                style={styles.uploadButtonGradient}
              >
                <Ionicons name="add" size={28} color="white" />
                <Text style={styles.uploadButtonText}>Upload</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Tutorials List */}
          <Animated.View 
            style={[
              styles.tutorialsSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Ionicons name="list" size={20} color="#0C295C" />
                <Text style={styles.sectionTitle}>My Tutorials</Text>
              </View>
            </View>
            
            {tutorials.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <Animated.View
                  style={[
                    styles.emptyState,
                    {
                      opacity: fadeAnim,
                      transform: [{ translateY: slideAnim }]
                    }
                  ]}
                >
                  <View style={styles.emptyStateIcon}>
                    <Ionicons name="videocam-outline" size={48} color="#90A4AE" />
                  </View>
                  <Text style={styles.emptyStateTitle}>No Tutorials Yet</Text>
                  <Text style={styles.emptyStateMessage}>
                    Upload your first personalized tutorial
                  </Text>
                </Animated.View>
              </View>
            ) : (
              <View style={styles.tutorialsList}>
                {tutorials.map((tutorial) => (
                  <Animated.View
                    key={tutorial.id}
                    style={[
                      styles.tutorialCard,
                      {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }]
                      }
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.tutorialCardContent}
                      onPress={() => handleTutorialPress(tutorial)}
                    >
                      <View style={styles.tutorialThumbnail}>
                        <Text style={styles.tutorialEmoji}>{tutorial.thumbnail}</Text>
                      </View>
                      
                      <View style={styles.tutorialInfo}>
                        <Text style={styles.tutorialTitle} numberOfLines={2}>
                          {tutorial.title}
                        </Text>
                        <Text style={styles.tutorialDescription} numberOfLines={2}>
                          {tutorial.description}
                        </Text>
                        
                        <View style={styles.tutorialMeta}>
                          <View style={styles.tutorialMetaItem}>
                            <Ionicons name="time-outline" size={14} color="#64748B" />
                            <Text style={styles.tutorialMetaText}>{tutorial.duration}</Text>
                          </View>
                        </View>
                      </View>
                      
                      <View style={styles.tutorialActions}>
                        <TouchableOpacity 
                          style={styles.deleteButton}
                          onPress={() => handleDeleteTutorial(tutorial)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            )}
          </Animated.View>
        </View>
      </ScrollView>

      {/* Upload Modal */}
      <Modal
        visible={showUploadModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUploadModal(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload New Tutorial</Text>
              <TouchableOpacity onPress={() => setShowUploadModal(false)}>
                <Ionicons name="close" size={24} color="#90A4AE" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Add Video</Text>
                <TouchableOpacity style={styles.addVideoButton} onPress={selectVideo}>
                  <LinearGradient
                    colors={['#F8FAFF', '#E8F2FF']}
                    style={styles.addVideoButtonGradient}
                  >
                    <Ionicons name="videocam" size={24} color="#0C295C" />
                    <Text style={styles.addVideoButtonText}>
                      {selectedVideo ? selectedVideo.fileName || 'Video Selected' : 'Select Video from Camera Roll'}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#0C295C" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Title</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter tutorial title"
                  value={newTutorial.title}
                  onChangeText={(text) => setNewTutorial(prev => ({ ...prev, title: text }))}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Enter tutorial description"
                  multiline
                  numberOfLines={4}
                  value={newTutorial.description}
                  onChangeText={(text) => setNewTutorial(prev => ({ ...prev, description: text }))}
                />
              </View>
              
            </ScrollView>
            
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowUploadModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handleUploadTutorial}
              >
                <LinearGradient
                  colors={['#0C295C', '#1A4A7A']}
                  style={styles.uploadButtonGradient}
                >
                  <Ionicons name="cloud-upload" size={20} color="white" />
                  <Text style={styles.uploadButtonText}>Upload</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Video Preview Modal */}
      <Modal
        visible={showVideoPreview}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowVideoPreview(false)}
      >
        <View style={styles.videoPreviewOverlay}>
          <View style={styles.videoPreviewContainer}>
            <View style={styles.videoPreviewHeader}>
              <Text style={styles.videoPreviewTitle}>
                {previewTutorial?.title || 'Tutorial Preview'}
              </Text>
              <TouchableOpacity 
                style={styles.videoPreviewCloseButton}
                onPress={() => setShowVideoPreview(false)}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            
            {previewTutorial?.videoUri && (
              <View style={styles.videoContainer}>
                <Video
                  source={{ uri: previewTutorial.videoUri }}
                  style={styles.videoPlayer}
                  useNativeControls
                  resizeMode="contain"
                  shouldPlay={false}
                />
              </View>
            )}
            
            <View style={styles.videoPreviewInfo}>
              <Text style={styles.videoPreviewDescription}>
                {previewTutorial?.description || ''}
              </Text>
              <View style={styles.videoPreviewMeta}>
                <View style={styles.videoPreviewMetaItem}>
                  <Ionicons name="time-outline" size={16} color="#64748B" />
                  <Text style={styles.videoPreviewMetaText}>
                    {previewTutorial?.duration || '0:00'}
                  </Text>
                </View>
              </View>
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
  header: {
    marginBottom: 8,
  },
  headerGradient: {
    paddingTop: 90,
    paddingBottom: 60,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  headerContent: {
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: width * 0.08,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
  },
  mainContent: {
    padding: 24,
    paddingTop: 16,
  },
  uploadButtonContainer: {
    marginBottom: 20,
  },
  uploadButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  uploadButtonGradient: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    borderRadius: 16,
    minHeight: 120,
  },
  uploadButtonText: {
    fontSize: width * 0.05,
    fontFamily: 'Manrope-SemiBold',
    color: 'white',
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: width * 0.05,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginLeft: 8,
  },
  tutorialsSection: {
    marginBottom: 32,
  },
  tutorialsList: {
    gap: 16,
  },
  tutorialCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tutorialCardContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  tutorialThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F8FAFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tutorialEmoji: {
    fontSize: 24,
  },
  tutorialInfo: {
    flex: 1,
    marginRight: 12,
  },
  tutorialTitle: {
    fontSize: width * 0.045,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginBottom: 4,
  },
  tutorialDescription: {
    fontSize: width * 0.032,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    marginBottom: 8,
    lineHeight: 16,
  },
  tutorialMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  tutorialMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tutorialMetaText: {
    fontSize: width * 0.03,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
  },
  tutorialActions: {
    flexDirection: 'column',
    gap: 8,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tutorialCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
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
  tutorialTouchable: {
    padding: 16,
  },
  tutorialContent: {
    flexDirection: 'row',
  },
  tutorialThumbnail: {
    width: 80,
    height: 60,
    borderRadius: 12,
    backgroundColor: 'rgba(12, 41, 92, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  thumbnailEmoji: {
    fontSize: 32,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  durationText: {
    fontSize: width * 0.03,
    fontFamily: 'Manrope-SemiBold',
    color: 'white',
  },
  tutorialInfo: {
    flex: 1,
  },
  tutorialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tutorialTitle: {
    fontSize: width * 0.045,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    flex: 1,
    marginRight: 8,
  },
  visibilityButton: {
    padding: 4,
  },
  tutorialDescription: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 12,
  },
  tutorialMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sportTag: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sportTagText: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-SemiBold',
    color: '#FF6B35',
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Regular',
    color: '#90A4AE',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: height * 0.9,
    minHeight: height * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(12, 41, 92, 0.1)',
  },
  modalTitle: {
    fontSize: width * 0.05,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
  },
  modalBody: {
    padding: 24,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-SemiBold',
    color: '#0C295C',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: 'rgba(12, 41, 92, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#0C295C',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  addVideoButton: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(12, 41, 92, 0.2)',
  },
  addVideoButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  addVideoButtonText: {
    flex: 1,
    fontSize: width * 0.04,
    fontFamily: 'Manrope-SemiBold',
    color: '#0C295C',
    marginLeft: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(12, 41, 92, 0.2)',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-SemiBold',
    color: '#0C295C',
  },
  uploadButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  uploadButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  uploadButtonText: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-SemiBold',
    color: 'white',
    marginLeft: 8,
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
  // Empty state styles
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F7FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: width * 0.06,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  // Video Preview Modal Styles
  videoPreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPreviewContainer: {
    width: width * 0.95,
    maxHeight: height * 0.8,
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
  },
  videoPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#0C295C',
  },
  videoPreviewTitle: {
    flex: 1,
    fontSize: width * 0.05,
    fontFamily: 'Rubik-SemiBold',
    color: 'white',
    marginRight: 16,
  },
  videoPreviewCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    width: '100%',
    height: height * 0.4,
    backgroundColor: '#000',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  videoPreviewInfo: {
    padding: 20,
  },
  videoPreviewDescription: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    lineHeight: 22,
    marginBottom: 16,
  },
  videoPreviewMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  videoPreviewMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  videoPreviewMetaText: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
  },
});
