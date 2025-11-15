import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getConversations, formatConversationForDisplay } from '../../services/conversationService';
import { supabase } from '../../supabaseClient';
import { Video, ResizeMode } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function CoachesMessagesScreen({ navigation, route }) {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [tutorials, setTutorials] = useState([]);
  const [loadingTutorials, setLoadingTutorials] = useState(false);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // ScrollView ref for auto-scrolling
  const scrollViewRef = useRef(null);
  const scrollY = useRef(0);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Handle keyboard show/hide to auto-scroll messages
  useEffect(() => {
    if (!selectedConversation) return;
    
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    
    const keyboardWillShowListener = Keyboard.addListener(
      showEvent,
      (event) => {
        // Scroll to bottom when keyboard appears with extra padding
        const delay = Platform.OS === 'ios' ? 200 : 300;
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
          }
        }, delay);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      hideEvent,
      () => {
        // Optional: scroll to bottom when keyboard hides
        setTimeout(() => {
          if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: false });
          }
        }, 100);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [selectedConversation]);

  // Mark conversation as read when messages are loaded
  useEffect(() => {
    if (selectedConversation && messages.length > 0) {
      const markAsReadWhenViewing = async () => {
        try {
          const { markConversationAsRead } = await import('../../services/conversationService');
          await markConversationAsRead(selectedConversation.id, 'coach');
          
          // Update local state to remove unread count
          setConversations(prev => 
            prev.map(conv => 
              conv.id === selectedConversation.id 
                ? { ...conv, unreadCount: 0 }
                : conv
            )
          );
          
          console.log('Conversation marked as read when viewing messages');
        } catch (error) {
          console.error('Error marking conversation as read when viewing:', error);
        }
      };
      
      markAsReadWhenViewing();
    }
  }, [selectedConversation, messages.length]);

  // Load conversations on component mount
  useEffect(() => {
    const loadConversations = async () => {
      try {
        setLoading(true);
        
        // Reset connection state to ensure we try the new URLs
        const { resetConnectionState } = await import('../../services/conversationService');
        resetConnectionState();
        
        // Add a small delay to allow connection state to reset
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get the authenticated user with timeout
        const authPromise = supabase.auth.getUser();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Authentication timeout')), 15000) // Increased timeout to 15 seconds
        );
        
        const { data: { user }, error: authError } = await Promise.race([authPromise, timeoutPromise]);
        
        if (authError) {
          console.error('Authentication error:', authError);
          throw authError;
        }
        
        if (!user) {
          console.error('No authenticated user found');
          Alert.alert('Authentication Error', 'Please sign in to view your conversations.');
          return;
        }
        
        const coachId = user.id;
        console.log('Loading conversations for authenticated coach:', coachId);
        
        const conversationsData = await getConversations(coachId, 'coach');
        console.log('Coach conversations data:', conversationsData);
        
        // Format conversations for display (now async)
        const formattedConversations = await Promise.all(
          conversationsData.map(async (conv) => {
            console.log('Processing conversation:', {
              id: conv.id,
              player_name: conv.player_name,
              coach_name: conv.coach_name,
              sport: conv.sport
            });
            
            try {
              const formatted = await formatConversationForDisplay(conv, 'coach');
              console.log('Formatted conversation result:', {
                id: formatted.id,
                otherPartyName: formatted.otherPartyName,
                playerName: formatted.playerName
              });
              return formatted;
            } catch (error) {
              console.log('Error formatting conversation:', error);
              // Return a fallback formatted conversation with actual player name
              const fallback = {
                id: conv.id,
                otherPartyName: conv.player_name || 'Student',
                sport: conv.sport,
                lastMessage: conv.last_message,
                lastMessageAt: conv.last_message_at,
                unreadCount: conv.coach_unread_count,
                sessionId: conv.session_id,
                isOnline: false,
                avatar: null
              };
              console.log('Using fallback conversation:', fallback);
              return fallback;
            }
          })
        );
        
        console.log('Formatted conversations:', formattedConversations);
        setConversations(formattedConversations);
        setFilteredConversations(formattedConversations);
      } catch (error) {
        console.error('Error loading conversations:', error);
        
        if (error.message === 'Authentication timeout') {
          Alert.alert(
            'Connection Timeout', 
            'The connection is taking longer than expected. This might be due to network issues. Would you like to try again?',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Retry', onPress: () => loadConversations() }
            ]
          );
        } else if (error.message?.includes('Authentication')) {
          Alert.alert(
            'Authentication Error', 
            'There was an issue with your login session. Please sign out and sign in again.',
            [
              { text: 'OK', onPress: () => {
                // Optionally sign out the user
                supabase.auth.signOut();
              }}
            ]
          );
        } else {
          Alert.alert(
            'Error', 
            'Failed to load conversations. Please check your internet connection and try again.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Retry', onPress: () => loadConversations() }
            ]
          );
        }
      } finally {
        setLoading(false);
      }
    };

    loadConversations();
  }, [route?.params?.coachId]);

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
    ]).start();
  }, []);

  useEffect(() => {
    // Filter conversations based on search query
    if (searchQuery.trim() === '') {
      setFilteredConversations(conversations);
    } else {
      const filtered = conversations.filter(conversation =>
        conversation.otherPartyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conversation.sport.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredConversations(filtered);
    }
  }, [searchQuery, conversations]);

  // Auto-select conversation if conversationId is passed via route params
  useEffect(() => {
    if (route?.params?.conversationId && conversations.length > 0 && !selectedConversation) {
      const conversationToSelect = conversations.find(
        conv => conv.id === route.params.conversationId
      );
      
      if (conversationToSelect) {
        console.log('Auto-selecting conversation from route params:', route.params.conversationId);
        setSelectedConversation(conversationToSelect);
        loadMessages(conversationToSelect.id);
      }
    }
  }, [route?.params?.conversationId, conversations, selectedConversation]);

  // Load messages when a conversation is selected
  const loadMessages = async (conversationId) => {
    try {
      const { getConversationMessages } = await import('../../services/conversationService');
      const messagesData = await getConversationMessages(conversationId);
      
      // Format messages for display and sort in chronological order (oldest first)
      const formattedMessages = messagesData
        .map(msg => ({
          id: msg.id,
          text: msg.content,
          isFromPlayer: msg.sender_type === 'player',
          timestamp: new Date(msg.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          messageType: msg.message_type || 'text',
          videoUri: msg.video_uri || null,
          createdAt: new Date(msg.created_at).getTime() // Add timestamp for sorting
        }))
        .sort((a, b) => a.createdAt - b.createdAt); // Sort oldest to newest
      
      setMessages(formattedMessages);
      
      // Auto-scroll to bottom after messages are loaded (newest messages)
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
      
      // Mark conversation as read after messages are loaded and displayed
      // This ensures the user has actually seen the messages
      setTimeout(async () => {
        try {
          await markAsRead(conversationId);
        } catch (error) {
          console.error('Error marking conversation as read after loading messages:', error);
        }
      }, 1000); // Longer delay to ensure user has time to see the messages
      
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (messageText.trim() && selectedConversation) {
      try {
        const coachId = route?.params?.coachId || 'temp_coach';
        // For development/testing, allow temp coaches to send messages
        // In production, this should be replaced with real user authentication
        console.log('Sending message as coach:', coachId);

        // Import the sendMessage function from conversation service
        const { sendMessage: sendMessageToConversation } = await import('../../services/conversationService');
        
        const response = await sendMessageToConversation(
          selectedConversation.id,
          coachId,
          'coach',
          messageText.trim()
        );
        
        // Handle response (coaches don't consume clips, so clipsRemaining will be undefined)
        const message = response?.message || response;

        // Add the message to local state for immediate display
        const newMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          text: messageText.trim(),
          isFromPlayer: false,
          timestamp: new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          createdAt: Date.now() // Add timestamp for proper ordering
        };

        setMessages(prev => [...prev, newMessage]);
        setMessageText('');

        // Dismiss keyboard after sending message
        Keyboard.dismiss();

        // Update conversation list with new last message and mark as read
        setConversations(prev => 
          prev.map(conv => 
            conv.id === selectedConversation.id 
              ? { 
                  ...conv, 
                  lastMessage: messageText.trim(), 
                  lastMessageAt: new Date().toISOString(),
                  unreadCount: 0 // Mark as read when coach sends message
                }
              : conv
          )
        );

      } catch (error) {
        console.error('Error sending message:', error);
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
    }
  };

  const handleVideoPress = (videoUri) => {
    setSelectedVideo(videoUri);
    setShowVideoModal(true);
  };

  const closeVideoModal = () => {
    setShowVideoModal(false);
    setSelectedVideo(null);
  };

  // Load tutorials from AsyncStorage
  const loadTutorials = async () => {
    try {
      setLoadingTutorials(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const savedTutorials = await AsyncStorage.getItem(`tutorials_${user.id}`);
        if (savedTutorials) {
          const tutorialsData = JSON.parse(savedTutorials);
          setTutorials(tutorialsData);
          console.log('Tutorials loaded for coach:', user.id, tutorialsData.length, 'tutorials');
        } else {
          setTutorials([]);
          console.log('No tutorials found for coach:', user.id);
        }
      }
    } catch (error) {
      console.error('Error loading tutorials:', error);
      setTutorials([]);
    } finally {
      setLoadingTutorials(false);
    }
  };

  // Open tutorial selection modal
  const handleOpenTutorialModal = async () => {
    await loadTutorials();
    setShowTutorialModal(true);
  };

  // Close tutorial selection modal
  const handleCloseTutorialModal = () => {
    setShowTutorialModal(false);
  };

  // Send selected tutorial as video message
  const sendTutorial = async (tutorial) => {
    if (!selectedConversation || !tutorial || !tutorial.videoUri) {
      Alert.alert('Error', 'Unable to send tutorial. Please try again.');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Authentication Error', 'Please sign in to send tutorials.');
        return;
      }

      const coachId = user.id;
      console.log('Sending tutorial as coach:', coachId, 'Tutorial:', tutorial.title);

      // Import the sendMessage function from conversation service
      const { sendMessage: sendMessageToConversation } = await import('../../services/conversationService');
      
      // Create message content with tutorial title
      const messageContent = `🎥 Tutorial: ${tutorial.title}`;
      
      // Send video message
      const response = await sendMessageToConversation(
        selectedConversation.id,
        coachId,
        'coach',
        messageContent,
        'video',
        tutorial.videoUri
      );

      // Add the video message to local state for immediate display
      const newMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: messageContent,
        isFromPlayer: false,
        timestamp: new Date().toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        messageType: 'video',
        videoUri: tutorial.videoUri,
        createdAt: Date.now()
      };

      setMessages(prev => [...prev, newMessage]);

      // Update conversation list with new last message
      setConversations(prev => 
        prev.map(conv => 
          conv.id === selectedConversation.id 
            ? { 
                ...conv, 
                lastMessage: messageContent, 
                lastMessageAt: new Date().toISOString(),
                unreadCount: 0
              }
            : conv
        )
      );

      // Close tutorial modal
      setShowTutorialModal(false);

      // Dismiss keyboard
      Keyboard.dismiss();

      // Auto-scroll to bottom
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 100);

    } catch (error) {
      console.error('Error sending tutorial:', error);
      Alert.alert('Error', 'Failed to send tutorial. Please try again.');
    }
  };

  const renderVideoMessage = (message) => {
    return (
      <TouchableOpacity 
        style={styles.videoMessageContainer}
        onPress={() => handleVideoPress(message.videoUri)}
        activeOpacity={0.8}
      >
        <View style={styles.videoThumbnail}>
          <Video
            source={{ uri: message.videoUri }}
            style={styles.videoPreview}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            isLooping={false}
            isMuted={true}
          />
          <View style={styles.playButtonOverlay}>
            <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.9)" />
          </View>
        </View>
        <Text style={styles.videoDuration}>{message.text}</Text>
      </TouchableOpacity>
    );
  };

  const handleConversationPress = async (conversation) => {
    console.log('Coach selected conversation:', {
      id: conversation.id,
      otherPartyName: conversation.otherPartyName,
      playerName: conversation.playerName,
      sport: conversation.sport,
      avatar: conversation.avatar
    });
    setSelectedConversation(conversation);
    loadMessages(conversation.id);
    
    // Don't mark as read immediately - wait for user to actually view messages
    // The markAsRead function will be called when messages are loaded and viewed
  };

  const markAsRead = async (conversationId) => {
    try {
      const { markConversationAsRead } = await import('../../services/conversationService');
      await markConversationAsRead(conversationId, 'coach');
      
      // Update local state to remove unread count
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
      
      console.log('Conversation marked as read via long press');
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  };

  const getTotalUnreadCount = () => {
    return conversations.reduce((total, conv) => total + conv.unreadCount, 0);
  };

  // If a conversation is selected, show the chat view
  if (selectedConversation) {
    return (
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        enabled={Platform.OS === 'ios'}
      >
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              console.log('Back button pressed, returning to conversations list');
              setSelectedConversation(null);
              // Clear route params to prevent auto-selection when navigating back
              navigation.setParams({ conversationId: undefined });
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#0C295C" />
          </TouchableOpacity>
          <View style={styles.coachInfo}>
            <View style={styles.coachAvatar}>
              {selectedConversation.avatar ? (
                <Image 
                  source={{ uri: selectedConversation.avatar }} 
                  style={styles.coachAvatarImage}
                  resizeMode="cover"
                  onError={() => {
                    console.log('Failed to load player profile image');
                  }}
                />
              ) : (
                <Text style={styles.coachAvatarInitial}>
                  {selectedConversation.otherPartyName ? selectedConversation.otherPartyName.charAt(0).toUpperCase() : '?'}
                </Text>
              )}
            </View>
            <View>
              <Text style={styles.coachName}>
                {selectedConversation.otherPartyName || 'Unknown Player'}
              </Text>
              <Text style={styles.coachSport}>{selectedConversation.sport} Student</Text>
            </View>
          </View>
        </View>

        {/* Messages */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesContent}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          nestedScrollEnabled={true}
          onScroll={(event) => {
            const currentScrollY = event.nativeEvent.contentOffset.y;
            scrollY.current = currentScrollY;
          }}
          scrollEventThrottle={16}
          onContentSizeChange={() => {
            // Auto-scroll to bottom when content changes (newest messages)
            setTimeout(() => {
              if (scrollViewRef.current) {
                scrollViewRef.current.scrollToEnd({ animated: true });
              }
            }, 100);
          }}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                message.isFromPlayer ? styles.playerMessage : styles.coachMessage
              ]}
            >
              {message.messageType === 'video' ? (
                <View>
                  {renderVideoMessage(message)}
                  <Text
                    style={[
                      styles.messageTime,
                      message.isFromPlayer ? styles.playerTime : styles.coachTime,
                      styles.videoMessageTime
                    ]}
                  >
                    {message.timestamp}
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.messageBubble,
                    message.isFromPlayer ? styles.playerBubble : styles.coachBubble
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      message.isFromPlayer ? styles.playerText : styles.coachText
                    ]}
                  >
                    {message.text}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      message.isFromPlayer ? styles.playerTime : styles.coachTime
                    ]}
                  >
                    {message.timestamp}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.messageInput}
              placeholder="Type a message..."
              placeholderTextColor="#90A4AE"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              blurOnSubmit={false}
              returnKeyType="default"
              editable={true}
            />
            <TouchableOpacity 
              style={styles.tutorialButton} 
              onPress={handleOpenTutorialModal}
              activeOpacity={0.7}
            >
              <Ionicons name="videocam" size={20} color="#0C295C" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
              <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Video Modal */}
        {showVideoModal && selectedVideo && (
          <View style={styles.videoModal}>
            <View style={styles.videoModalContent}>
              <View style={styles.videoModalHeader}>
                <TouchableOpacity onPress={closeVideoModal} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
              <Video
                source={{ uri: selectedVideo }}
                style={styles.fullScreenVideo}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={true}
                isLooping={false}
                isMuted={false}
                useNativeControls={true}
              />
            </View>
          </View>
        )}

        {/* Tutorial Selection Modal */}
        <Modal
          visible={showTutorialModal}
          animationType="slide"
          transparent={true}
          onRequestClose={handleCloseTutorialModal}
        >
          <View style={styles.tutorialModalOverlay}>
            <View style={styles.tutorialModalContent}>
              <View style={styles.tutorialModalHeader}>
                <Text style={styles.tutorialModalTitle}>Select Tutorial</Text>
                <TouchableOpacity 
                  onPress={handleCloseTutorialModal} 
                  style={styles.tutorialModalCloseButton}
                >
                  <Ionicons name="close" size={24} color="#0C295C" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.tutorialModalBody}>
                {loadingTutorials ? (
                  <View style={styles.tutorialLoadingContainer}>
                    <ActivityIndicator size="large" color="#0C295C" />
                    <Text style={styles.tutorialLoadingText}>Loading tutorials...</Text>
                  </View>
                ) : tutorials.length === 0 ? (
                  <View style={styles.tutorialEmptyContainer}>
                    <Ionicons name="videocam-outline" size={64} color="#A9C3DD" />
                    <Text style={styles.tutorialEmptyTitle}>No Tutorials Available</Text>
                    <Text style={styles.tutorialEmptySubtitle}>
                      Upload tutorials from the Tutorials page to send them to players.
                    </Text>
                  </View>
                ) : (
                  <ScrollView 
                    style={styles.tutorialList}
                    contentContainerStyle={styles.tutorialListContent}
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    {tutorials.map((tutorial) => (
                      <TouchableOpacity
                        key={tutorial.id}
                        style={styles.tutorialItem}
                        onPress={() => sendTutorial(tutorial)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.tutorialItemThumbnail}>
                          <Video
                            source={{ uri: tutorial.videoUri }}
                            style={styles.tutorialThumbnailVideo}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={false}
                            isLooping={false}
                            isMuted={true}
                            usePoster={false}
                          />
                          <View style={styles.tutorialPlayOverlay}>
                            <Ionicons name="play-circle" size={32} color="rgba(255,255,255,0.9)" />
                          </View>
                        </View>
                        <View style={styles.tutorialItemInfo}>
                          <Text style={styles.tutorialItemTitle} numberOfLines={2}>
                            {tutorial.title}
                          </Text>
                          <Text style={styles.tutorialItemDescription} numberOfLines={2}>
                            {tutorial.description}
                          </Text>
                          {tutorial.duration && (
                            <Text style={styles.tutorialItemDuration}>
                              Duration: {tutorial.duration}
                            </Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#90A4AE" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
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
            <View style={styles.headerTop}>
              <Text style={styles.headerTitle}>Messages</Text>
              {getTotalUnreadCount() > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{getTotalUnreadCount()}</Text>
                </View>
              )}
            </View>
            <Text style={styles.headerSubtitle}>
              Connect with your students and provide personalized feedback
            </Text>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View 
        style={[
          styles.searchContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#90A4AE" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a student"
            placeholderTextColor="#90A4AE"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#90A4AE" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Conversations List */}
      <ScrollView 
        style={styles.conversationsList}
        contentContainerStyle={styles.conversationsListContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        alwaysBounceVertical={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0C295C" />
            <Text style={styles.loadingText}>Loading conversations...</Text>
          </View>
        ) : filteredConversations.length > 0 ? (
          filteredConversations.map((conversation, index) => (
            <Animated.View
              key={conversation.id}
              style={[
                styles.conversationCard,
                {
                  opacity: fadeAnim,
                  transform: [
                    { 
                      translateY: Animated.add(
                        slideAnim,
                        new Animated.Value(index * 20)
                      )
                    }
                  ]
                }
              ]}
            >
              <TouchableOpacity
                style={styles.conversationTouchable}
                onPress={() => handleConversationPress(conversation)}
                onLongPress={() => markAsRead(conversation.id)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={conversation.unreadCount > 0 
                    ? ['#FFFFFF', '#F8FAFF', '#FFFFFF'] 
                    : ['#FFFFFF', '#FFFFFF']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.cardGradient}
                >
                  <View style={styles.conversationContent}>
                    <View style={styles.avatarContainer}>
                      <LinearGradient
                        colors={['#0C295C', '#1A4A7A', '#2D5A8A']}
                        style={styles.avatarGradient}
                      >
                        <View style={styles.avatar}>
                          {conversation.avatar ? (
                            <Image 
                              source={{ uri: conversation.avatar }} 
                              style={styles.avatarImage}
                              resizeMode="cover"
                              onError={() => {
                                console.log('Failed to load profile image for:', conversation.otherPartyName);
                              }}
                            />
                          ) : (
                            <Text style={styles.avatarText}>{conversation.otherPartyName.charAt(0)}</Text>
                          )}
                        </View>
                      </LinearGradient>
                      {conversation.isOnline && (
                        <View style={styles.onlineIndicator}>
                          <View style={styles.onlineIndicatorInner} />
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.conversationInfo}>
                      <View style={styles.conversationHeader}>
                        <Text style={styles.studentName}>{conversation.otherPartyName}</Text>
                        <Text style={styles.timestamp}>
                          {conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          }) : ''}
                        </Text>
                      </View>
                      
                      <View style={styles.conversationDetails}>
                        <Text 
                          style={[
                            styles.lastMessage,
                            conversation.unreadCount > 0 && styles.unreadMessage
                          ]}
                          numberOfLines={1}
                        >
                          {conversation.lastMessage || 'No messages yet'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.conversationRight}>
                      {conversation.unreadCount > 0 && (
                        <View style={styles.unreadCountContainer}>
                          <LinearGradient
                            colors={['#FF6B35', '#FF8C5A']}
                            style={styles.unreadCount}
                          >
                            <Text style={styles.unreadCountText}>
                              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                            </Text>
                          </LinearGradient>
                        </View>
                      )}
                      <View style={styles.chevronContainer}>
                        <Ionicons 
                          name="chevron-forward" 
                          size={18} 
                          color={conversation.unreadCount > 0 ? "#0C295C" : "#90A4AE"} 
                        />
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          ))
        ) : (
          <Animated.View 
            style={[
              styles.emptyState,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <LinearGradient
              colors={['#FFFFFF', '#F8FAFF']}
              style={styles.emptyStateCard}
            >
              <View style={styles.emptyStateIcon}>
                <Ionicons name="chatbubbles-outline" size={64} color="#A9C3DD" />
              </View>
              <Text style={styles.emptyStateTitle}>No conversations found</Text>
              <Text style={styles.emptyStateSubtitle}>
                {searchQuery ? 'Try adjusting your search terms' : 'Start connecting with students to see messages here'}
              </Text>
            </LinearGradient>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  header: {
    marginBottom: 8,
  },
  headerGradient: {
    paddingTop: 86,
    paddingBottom: 50,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  headerContent: {
    alignItems: 'flex-start',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: width * 0.08,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    marginRight: 12,
  },
  unreadBadge: {
    backgroundColor: '#FF6B35',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 28,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  unreadBadgeText: {
    fontSize: width * 0.035,
    fontFamily: 'Rubik-SemiBold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Regular',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
  },
  searchContainer: {
    paddingHorizontal: 24,
    marginBottom: 20,
    marginTop: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(12, 41, 92, 0.1)',
  },
  searchInput: {
    flex: 1,
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#0C295C',
    marginLeft: 12,
    marginRight: 8,
  },
  conversationsList: {
    flex: 1,
  },
  conversationsListContent: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 100,
  },
  conversationCard: {
    borderRadius: 20,
    marginBottom: 14,
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 6,
    overflow: 'hidden',
  },
  conversationTouchable: {
    borderRadius: 20,
  },
  cardGradient: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(12, 41, 92, 0.06)',
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 18,
  },
  avatarGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    padding: 3,
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#0C295C',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    fontSize: 24,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4CAF50',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#4CAF50',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicatorInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
  conversationInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
    marginRight: 8,
  },
  studentName: {
    fontSize: width * 0.05,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginRight: 8,
    letterSpacing: 0.3,
  },
  timestamp: {
    fontSize: width * 0.032,
    fontFamily: 'Manrope-Medium',
    color: '#90A4AE',
    marginTop: 2,
  },
  conversationDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sportTag: {
    backgroundColor: 'rgba(12, 41, 92, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 4,
  },
  sportTagText: {
    fontSize: width * 0.032,
    fontFamily: 'Manrope-Bold',
    color: '#0C295C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lastMessage: {
    flex: 1,
    fontSize: width * 0.039,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    flexWrap: 'wrap',
    marginRight: 8,
    lineHeight: 21,
    letterSpacing: 0.1,
  },
  unreadMessage: {
    fontFamily: 'Manrope-SemiBold',
    color: '#0C295C',
    fontSize: width * 0.041,
  },
  conversationRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 12,
    minWidth: 50,
  },
  unreadCountContainer: {
    marginBottom: 6,
    shadowColor: '#FF6B35',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  unreadCount: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadCountText: {
    fontSize: width * 0.034,
    fontFamily: 'Rubik-Bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.3,
  },
  chevronContainer: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateCard: {
    borderRadius: 20,
    padding: 40,
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
  emptyStateIcon: {
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: width * 0.05,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
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
  avatarImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  // Chat view styles
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 18,
    backgroundColor: 'white',
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(12, 41, 92, 0.06)',
  },
  backButton: {
    marginRight: 15,
    padding: 8,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coachInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  coachAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0C295C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    overflow: 'hidden',
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  coachAvatarInitial: {
    fontSize: 16,
    fontFamily: 'Rubik-SemiBold',
    color: 'white',
  },
  coachName: {
    fontSize: 17,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    letterSpacing: 0.2,
  },
  coachSport: {
    fontSize: 13,
    fontFamily: 'Manrope-Medium',
    color: '#90A4AE',
    marginTop: 2,
  },
  moreButton: {
    padding: 5,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#F8FAFF',
  },
  messagesContent: {
    paddingTop: 10,
    paddingBottom: 40,
  },
  messageContainer: {
    marginVertical: 5,
  },
  playerMessage: {
    alignItems: 'flex-start',
  },
  coachMessage: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    minWidth: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  playerBubble: {
    backgroundColor: '#E3F2FD',
    borderBottomLeftRadius: 6,
  },
  coachBubble: {
    backgroundColor: '#0C295C',
    borderBottomRightRadius: 6,
  },
  messageText: {
    fontSize: 15,
    fontFamily: 'Manrope-Regular',
    lineHeight: 21,
    flexWrap: 'wrap',
    letterSpacing: 0.1,
  },
  playerText: {
    color: '#0C295C',
  },
  coachText: {
    color: 'white',
  },
  messageTime: {
    fontSize: 11,
    fontFamily: 'Manrope-Medium',
    marginTop: 6,
    letterSpacing: 0.2,
  },
  playerTime: {
    color: '#90A4AE',
  },
  coachTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: 'rgba(12, 41, 92, 0.08)',
    maxHeight: 100,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFF',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(12, 41, 92, 0.1)',
  },
  messageInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
    color: '#0C295C',
    maxHeight: 60,
    minHeight: 20,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginRight: 8,
    zIndex: 1,
  },
  tutorialButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(12, 41, 92, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0C295C',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  // Video message styles
  videoMessageContainer: {
    maxWidth: '80%',
    marginVertical: 4,
  },
  videoThumbnail: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  videoPreview: {
    width: 200,
    height: 150,
    borderRadius: 12,
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  videoDuration: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  videoMessageTime: {
    marginTop: 4,
  },
  // Video modal styles
  videoModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  videoModalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoModalHeader: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1001,
  },
  closeButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenVideo: {
    width: '100%',
    height: '100%',
  },
  coachAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  // Tutorial modal styles
  tutorialModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  tutorialModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85,
    height: height * 0.85,
  },
  tutorialModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(12, 41, 92, 0.1)',
  },
  tutorialModalTitle: {
    fontSize: width * 0.06,
    fontFamily: 'Rubik-Bold',
    color: '#0C295C',
  },
  tutorialModalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(12, 41, 92, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tutorialModalBody: {
    flex: 1,
    minHeight: 0,
  },
  tutorialLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  tutorialLoadingText: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Medium',
    color: '#64748B',
    marginTop: 16,
  },
  tutorialEmptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  tutorialEmptyTitle: {
    fontSize: width * 0.05,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  tutorialEmptySubtitle: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
  tutorialList: {
    flex: 1,
  },
  tutorialListContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  tutorialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(12, 41, 92, 0.08)',
  },
  tutorialItemThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8FAFF',
    marginRight: 12,
    position: 'relative',
  },
  tutorialThumbnailVideo: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  tutorialPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  tutorialItemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  tutorialItemTitle: {
    fontSize: width * 0.045,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginBottom: 4,
  },
  tutorialItemDescription: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    marginBottom: 4,
  },
  tutorialItemDuration: {
    fontSize: width * 0.032,
    fontFamily: 'Manrope-Medium',
    color: '#90A4AE',
  },
});
