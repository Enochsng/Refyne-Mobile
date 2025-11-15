import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Alert,
  Animated,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getConversations, formatConversationForDisplay, manualConnectionTest, getRemainingClips, getRemainingDailyMessages } from '../../services/conversationService';
import { supabase } from '../../supabaseClient';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';

const { width, height } = Dimensions.get('window');

export default function CoachFeedbackScreen({ navigation, route }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [retryCount, setRetryCount] = useState(0);
  const [connectionError, setConnectionError] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [remainingClips, setRemainingClips] = useState({ remaining: 0, total: 0, used: 0 });
  const [loadingClips, setLoadingClips] = useState(false);
  const [chatExpiry, setChatExpiry] = useState(null);
  const [remainingDailyMessages, setRemainingDailyMessages] = useState({ remaining: 5, total: 5, used: 0 });
  const [loadingDailyMessages, setLoadingDailyMessages] = useState(false);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // ScrollView ref for auto-scrolling
  const scrollViewRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Retry function for loading conversations
  const retryLoadConversations = async () => {
    try {
      setRetryCount(prev => prev + 1);
      setConnectionError(false);
      await loadConversations();
    } catch (error) {
      // Error is already handled in loadConversations, but catch here to prevent unhandled rejection
      console.warn('⚠️ Error in retryLoadConversations:', error.message);
    }
  };

  // Load conversations function
  const loadConversations = async () => {
    try {
      setLoading(true);
      setConnectionError(false);
      
      console.log('🔄 Starting to load conversations...');
      
      // Get the authenticated user with timeout
      const authPromise = supabase.auth.getUser();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Authentication timeout')), 10000)
      );
      
      const { data: { user } } = await Promise.race([authPromise, timeoutPromise]);
      
      if (!user) {
        console.error('❌ No authenticated user found');
        Alert.alert('Authentication Error', 'Please sign in to view your conversations.');
        return;
      }
      
      const playerId = user.id;
      console.log('✅ Loading conversations for authenticated player:', playerId);
      
      const conversationsData = await getConversations(playerId, 'player');
      console.log('✅ Retrieved conversations data:', conversationsData);
      
      // Format conversations for display (now async)
      const formattedConversations = await Promise.all(
        conversationsData.map(conv => formatConversationForDisplay(conv, 'player'))
      );
      
      console.log('✅ Formatted conversations:', formattedConversations);
      setConversations(formattedConversations);
      
      // If we have route params for a specific conversation, select it and load messages
      if (route?.params?.conversationId) {
        const targetConversation = formattedConversations.find(
          conv => conv.id === route.params.conversationId
        );
        if (targetConversation) {
          setSelectedConversation(targetConversation);
          // Load messages for the selected conversation
          loadMessages(targetConversation.id);
        }
      }
    } catch (error) {
      // Log error details but don't use console.error to avoid triggering React Native error overlay
      console.warn('⚠️ Error loading conversations:', error.message);
      if (__DEV__) {
        console.log('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      setConnectionError(true);
      
      // Don't show Alert - let the UI error state handle the display
      // This prevents duplicate error messages
    } finally {
      setLoading(false);
    }
  };

  // Load conversations on component mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Handle route params when screen comes into focus (for tab navigator)
  useFocusEffect(
    React.useCallback(() => {
      // Only auto-select conversation if we have a conversationId in route params AND no conversation is currently selected
      // This prevents re-selection when navigating back to the list view
      if (route?.params?.conversationId && !selectedConversation) {
        if (conversations.length > 0) {
          // Conversations already loaded, find and select the target conversation
          const targetConversation = conversations.find(
            conv => conv.id === route.params.conversationId
          );
          if (targetConversation) {
            setSelectedConversation(targetConversation);
            loadMessages(targetConversation.id);
          }
        } else {
          // Conversations not loaded yet, load them first (they will handle selection in loadConversations)
          loadConversations();
        }
      }
      
      // Refresh clip counter and daily messages when screen comes into focus (e.g., after returning from purchase)
      // Only if we have a selected conversation
      if (selectedConversation?.id) {
        loadRemainingClips(selectedConversation.id);
        loadRemainingDailyMessages(selectedConversation.id);
      }
    }, [route?.params?.conversationId, conversations, selectedConversation])
  );

  // Refresh clip counter and daily messages when selected conversation changes
  useEffect(() => {
    if (selectedConversation?.id) {
      loadRemainingClips(selectedConversation.id);
      loadRemainingDailyMessages(selectedConversation.id);
    }
  }, [selectedConversation?.id]);

  // Set up interval to refresh daily message count at midnight EST
  useEffect(() => {
    if (!selectedConversation?.id) return;

    // Calculate time until next midnight EST
    const getTimeUntilMidnightEST = () => {
      const now = new Date();
      
      // Get current date in EST/EDT
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const parts = formatter.formatToParts(now);
      const estParts = {};
      parts.forEach(part => {
        estParts[part.type] = part.value;
      });
      
      // Get timezone offset
      const timeZoneFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        timeZoneName: 'short'
      });
      const timeZoneParts = timeZoneFormatter.formatToParts(now);
      const timeZoneName = timeZoneParts.find(part => part.type === 'timeZoneName')?.value || '';
      const offset = timeZoneName.includes('EDT') ? '-04:00' : '-05:00';
      
      // Create date for next midnight EST
      const currentHour = parseInt(estParts.hour);
      const currentMinute = parseInt(estParts.minute);
      const currentSecond = parseInt(estParts.second);
      
      // Calculate milliseconds until next midnight EST
      const msUntilMidnight = (24 * 60 * 60 * 1000) - (currentHour * 60 * 60 * 1000) - (currentMinute * 60 * 1000) - (currentSecond * 1000);
      
      return msUntilMidnight;
    };

    // Refresh immediately and then set up interval
    const refreshDailyMessages = () => {
      if (selectedConversation?.id) {
        loadRemainingDailyMessages(selectedConversation.id);
      }
    };

    // Refresh now
    refreshDailyMessages();

    // Calculate time until midnight EST
    const msUntilMidnight = getTimeUntilMidnightEST();
    
    // Set timeout for midnight EST
    const midnightTimeout = setTimeout(() => {
      refreshDailyMessages();
      // After midnight, refresh every minute to catch the reset
      const interval = setInterval(refreshDailyMessages, 60000);
      
      // Clear interval after 2 minutes (to catch the reset)
      setTimeout(() => clearInterval(interval), 2 * 60 * 1000);
    }, msUntilMidnight);

    // Also set up a periodic check every 5 minutes to catch any updates
    const periodicCheck = setInterval(refreshDailyMessages, 5 * 60 * 1000);

    return () => {
      clearTimeout(midnightTimeout);
      clearInterval(periodicCheck);
    };
  }, [selectedConversation?.id]);

  // Clear chat state when selectedConversation becomes null
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      setMessageText('');
      setSelectedVideo(null);
      setShowVideoModal(false);
      setRemainingClips({ remaining: 0, total: 0, used: 0 });
      setChatExpiry(null);
      setRemainingDailyMessages({ remaining: 5, total: 5, used: 0 });
    }
  }, [selectedConversation]);

  // Load messages when a conversation is selected via route params
  // Note: Manual selection from list calls loadMessages directly, so we don't need a useEffect for that

  // Filter conversations based on search query
  const filteredConversations = conversations.filter(conversation =>
    conversation.otherPartyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conversation.sport.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (conversation.lastMessage && conversation.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Start entrance animations
  useEffect(() => {
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

  // Load messages when a conversation is selected
  const markAsRead = async (conversationId) => {
    try {
      const { markConversationAsRead } = await import('../../services/conversationService');
      await markConversationAsRead(conversationId, 'player');
      
      // Update local state to remove unread count
      setConversations(prev => 
        prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
      
      console.log('Conversation marked as read for player');
      } catch (error) {
        console.warn('⚠️ Error marking conversation as read:', error.message);
        if (__DEV__) {
          console.log('Error details:', error);
        }
      }
  };

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
      
      // Auto-scroll to bottom after messages are loaded
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
          console.warn('⚠️ Error marking conversation as read after loading messages:', error.message);
          if (__DEV__) {
            console.log('Error details:', error);
          }
        }
      }, 1000); // Longer delay to ensure user has time to see the messages
      
      // Load remaining clips for this conversation
      loadRemainingClips(conversationId);
      
      // Load remaining daily messages for this conversation
      loadRemainingDailyMessages(conversationId);
      
    } catch (error) {
      console.warn('⚠️ Error loading messages:', error.message);
      if (__DEV__) {
        console.log('Error details:', error);
      }
      setMessages([]);
    }
  };

  const loadRemainingClips = async (conversationId) => {
    try {
      setLoadingClips(true);
      console.log(`\n🔄 [CoachFeedbackScreen] Loading remaining clips for conversation: ${conversationId}`);
      const clipInfo = await getRemainingClips(conversationId);
      console.log(`✅ [CoachFeedbackScreen] Clip info received:`, JSON.stringify(clipInfo, null, 2));
      console.log(`✅ [CoachFeedbackScreen] Setting remaining clips to: ${clipInfo.remaining}`);
      setRemainingClips(clipInfo);
      
      // Also get chat expiry info if available
      if (clipInfo.chatExpiry) {
        console.log(`✅ [CoachFeedbackScreen] Chat expiry info:`, JSON.stringify(clipInfo.chatExpiry, null, 2));
        setChatExpiry(clipInfo.chatExpiry);
      } else {
        setChatExpiry(null);
      }
      
      console.log(`✅ [CoachFeedbackScreen] State updated - remaining: ${clipInfo.remaining}, total: ${clipInfo.total}, used: ${clipInfo.used}`);
    } catch (error) {
      console.error('❌ [CoachFeedbackScreen] Error loading remaining clips:', error.message);
      console.error('❌ [CoachFeedbackScreen] Error details:', error);
      console.error('❌ [CoachFeedbackScreen] Error stack:', error.stack);
      // Set default values on error
      setRemainingClips({ remaining: 0, total: 0, used: 0 });
      setChatExpiry(null);
    } finally {
      setLoadingClips(false);
    }
  };

  const loadRemainingDailyMessages = async (conversationId) => {
    try {
      setLoadingDailyMessages(true);
      console.log(`\n🔄 [CoachFeedbackScreen] Loading remaining daily messages for conversation: ${conversationId}`);
      const messageInfo = await getRemainingDailyMessages(conversationId);
      console.log(`✅ [CoachFeedbackScreen] Daily message info received:`, JSON.stringify(messageInfo, null, 2));
      console.log(`✅ [CoachFeedbackScreen] Setting remaining daily messages to: ${messageInfo.remaining}`);
      setRemainingDailyMessages(messageInfo);
      console.log(`✅ [CoachFeedbackScreen] State updated - remaining: ${messageInfo.remaining}, total: ${messageInfo.total}, used: ${messageInfo.used}`);
    } catch (error) {
      console.error('❌ [CoachFeedbackScreen] Error loading remaining daily messages:', error.message);
      console.error('❌ [CoachFeedbackScreen] Error details:', error);
      // Set default values on error
      setRemainingDailyMessages({ remaining: 5, total: 5, used: 0 });
    } finally {
      setLoadingDailyMessages(false);
    }
  };

  const sendMessage = async () => {
    if (messageText.trim() && selectedConversation) {
      try {
        // Check if chat is expired
        if (chatExpiry && chatExpiry.isExpired) {
          Alert.alert(
            'Chat Expired',
            'This chat has expired and is now read-only. Please purchase a new package to continue messaging.',
            [{ text: 'OK' }]
          );
          return;
        }

        // Check daily message limit BEFORE attempting to send
        if (remainingDailyMessages.remaining <= 0) {
          Alert.alert(
            'Daily Message Limit Reached',
            'You have reached your daily limit of 5 text messages. You can send more messages tomorrow.',
            [{ text: 'OK' }]
          );
          return;
        }

        // Get the authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          Alert.alert('Authentication Error', 'Please sign in to send messages.');
          return;
        }
        
        const playerId = user.id;
        console.log('Sending message as authenticated player:', playerId);

        // Import the sendMessage function from conversation service
        const { sendMessage: sendMessageToConversation } = await import('../../services/conversationService');
        
        const response = await sendMessageToConversation(
          selectedConversation.id,
          playerId,
          'player',
          messageText.trim()
        );
        
        // Handle response (for text messages, response.message contains the message)
        const message = response?.message || response;

        // Add the message to local state for immediate display
        const newMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          text: messageText.trim(),
          isFromPlayer: true,
          timestamp: new Date().toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          createdAt: Date.now() // Add timestamp for proper ordering
        };

        setMessages(prev => [...prev, newMessage]);
        setMessageText('');

        // Update conversation list with new last message
        setConversations(prev => 
          prev.map(conv => 
            conv.id === selectedConversation.id 
              ? { ...conv, lastMessage: messageText.trim(), lastMessageAt: new Date().toISOString() }
              : conv
          )
        );

        // Update daily message count from response first (for immediate UI update)
        if (response?.dailyMessagesRemaining !== undefined) {
          setRemainingDailyMessages(prev => ({ 
            ...prev, 
            remaining: response.dailyMessagesRemaining,
            used: prev.total - response.dailyMessagesRemaining
          }));
        }
        
        // Then reload daily messages to ensure we have the latest accurate data
        // This will update the counter to show the correct remaining count (including 0 if limit reached)
        await loadRemainingDailyMessages(selectedConversation.id);

      } catch (error) {
        // Check if error is due to daily message limit
        if (error.message && (error.message.includes('Daily message limit') || error.message.includes('daily limit'))) {
          // Reload daily message info to update the UI
          if (selectedConversation) {
            await loadRemainingDailyMessages(selectedConversation.id);
          }
          // Show alert for daily limit - don't log anything
          Alert.alert(
            'Daily Message Limit Reached',
            'You have reached your daily limit of 5 text messages. You can send more messages tomorrow.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        // Check if error is due to chat expiry
        if (error.message && error.message.includes('expired')) {
          Alert.alert(
            'Chat Expired',
            'This chat has expired and is now read-only. Please purchase a new package to continue messaging.',
            [{ text: 'OK' }]
          );
          // Reload chat expiry info
          if (selectedConversation) {
            loadRemainingClips(selectedConversation.id);
            loadRemainingDailyMessages(selectedConversation.id);
          }
        } else {
          // Only log and show alert for other errors (not daily limit)
          console.warn('⚠️ Error sending message:', error.message);
          if (__DEV__) {
            console.log('Error details:', error);
          }
          Alert.alert('Error', error.message || 'Failed to send message. Please try again.');
        }
      }
    }
  };

  const pickVideo = async () => {
    try {
      // Check if chat is expired
      if (chatExpiry && chatExpiry.isExpired) {
        Alert.alert(
          'Chat Expired',
          'This chat has expired and is now read-only. Please purchase a new package to continue messaging.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Check if player has remaining clips
      if (remainingClips.remaining <= 0) {
        Alert.alert(
          'No Clips Remaining',
          'You have used all your video clips for this coaching session. Please purchase more clips to continue.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photo library to upload videos.');
        return;
      }

      // Launch image picker for videos only
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'videos',
        allowsEditing: true,
        quality: 0.8,
        // Remove videoMaxDuration to allow user to select any video, we'll validate manually
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const video = result.assets[0];
        
        console.log('Selected video details:', {
          uri: video.uri,
          duration: video.duration,
          durationType: typeof video.duration,
          fileSize: video.fileSize,
          width: video.width,
          height: video.height
        });
        
        // Parse video duration - handle different formats and units
        let videoDuration = 0;
        if (video.duration) {
          if (typeof video.duration === 'string') {
            // Handle format like "0:13" or "1:30"
            const parts = video.duration.split(':');
            if (parts.length === 2) {
              videoDuration = parseInt(parts[0]) * 60 + parseInt(parts[1]);
            } else {
              videoDuration = parseFloat(video.duration);
            }
          } else {
            videoDuration = parseFloat(video.duration);
          }
          
          // Check if duration is in milliseconds (if it's a large number, likely milliseconds)
          if (videoDuration > 1000) {
            console.log('Duration appears to be in milliseconds, converting to seconds');
            videoDuration = videoDuration / 1000;
          }
        }
        
        console.log('Parsed video duration:', videoDuration, 'seconds');
        
        // Check video duration - be more lenient with the check
        if (videoDuration > 20) {
          Alert.alert(
            'Video Too Long', 
            `Your video is ${Math.round(videoDuration)} seconds long. Please select a video that is 20 seconds or shorter.`,
            [{ text: 'OK' }]
          );
          return;
        }
        
        // If duration is 0 or invalid, allow it (some videos might not report duration correctly)
        if (videoDuration === 0) {
          console.log('Video duration not available, allowing upload');
        }

        // Get the authenticated user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          Alert.alert('Authentication Error', 'Please sign in to send videos.');
          return;
        }

        const playerId = user.id;
        console.log('Sending video as authenticated player:', playerId);
        console.log('Video duration:', videoDuration, 'seconds');

        // Import the sendMessage function from conversation service
        const { sendMessage: sendMessageToConversation } = await import('../../services/conversationService');
        
        // Format duration for display
        const displayDuration = videoDuration > 0 ? `${Math.round(videoDuration)}s` : 'Video';
        
        // Send video message
        try {
          const response = await sendMessageToConversation(
            selectedConversation.id,
            playerId,
            'player',
            `📹 Video (${displayDuration})`, // Display duration in message
            'video',
            video.uri // Pass the video URI
          );

          // Add the video message to local state for immediate display
          const newMessage = {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            text: `📹 Video (${displayDuration})`,
            isFromPlayer: true,
            timestamp: new Date().toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            }),
            messageType: 'video',
            videoUri: video.uri
          };

          setMessages(prev => [...prev, newMessage]);

          // Update conversation list with new last message
          setConversations(prev => 
            prev.map(conv => 
              conv.id === selectedConversation.id 
                ? { ...conv, lastMessage: `📹 Video (${displayDuration})`, lastMessageAt: new Date().toISOString() }
                : conv
            )
          );

          // Update clip counter immediately if available from response, then refresh to ensure accuracy
          if (response?.clipsRemaining !== undefined) {
            setRemainingClips(prev => ({ ...prev, remaining: response.clipsRemaining }));
          }
          
          // Reload remaining clips after sending video to ensure we have the latest data
          await loadRemainingClips(selectedConversation.id);

          Alert.alert('Success', `Video (${displayDuration}) sent successfully!`);
        } catch (sendError) {
          // Handle clip limit errors specifically
          if (sendError.message && sendError.message.includes('No clips remaining')) {
            Alert.alert(
              'No Clips Remaining',
              'You have used all your video clips for this coaching session. Please purchase more clips to continue.',
              [{ text: 'OK' }]
            );
            // Reload clips to update the UI
            await loadRemainingClips(selectedConversation.id);
          } else {
            throw sendError; // Re-throw other errors
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Error picking video:', error.message);
      if (__DEV__) {
        console.log('Error details:', {
          message: error.message,
          code: error.code,
          stack: error.stack
        });
      }
      Alert.alert('Error', `Failed to upload video: ${error.message || 'Unknown error'}`);
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

  if (selectedConversation) {
    return (
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              // Clear all chat-related state when going back
              setSelectedConversation(null);
              setMessages([]);
              setMessageText('');
              setSelectedVideo(null);
              setShowVideoModal(false);
              setRemainingClips({ remaining: 0, total: 0, used: 0 });
              setChatExpiry(null);
              // Clear route params to prevent auto-selection when navigating back
              navigation.setParams({ conversationId: undefined });
            }}
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
                    console.log('Failed to load coach profile image');
                  }}
                />
              ) : (
                <Text style={styles.coachAvatarInitial}>
                  {selectedConversation.otherPartyName ? selectedConversation.otherPartyName.charAt(0).toUpperCase() : '?'}
                </Text>
              )}
            </View>
            <View>
              <Text style={styles.coachName}>{selectedConversation.otherPartyName}</Text>
              <Text style={styles.coachSport}>{selectedConversation.sport} Coach</Text>
            </View>
          </View>
          {/* Clip Tracker and Message Tracker */}
          <View style={styles.trackerContainer}>
            {/* Message Tracker */}
            <View style={styles.messageTrackerContainer}>
              <View style={styles.messageTracker}>
                <Ionicons name="chatbubble" size={16} color="#0C295C" />
                <Text style={styles.messageTrackerText}>
                  {loadingDailyMessages ? '...' : remainingDailyMessages.remaining}
                </Text>
              </View>
            </View>
            {/* Clip Tracker */}
            <View style={styles.clipTrackerContainer}>
              <View style={styles.clipTracker}>
                <Ionicons name="videocam" size={16} color="#0C295C" />
                <Text style={styles.clipTrackerText}>
                  {loadingClips ? '...' : remainingClips.remaining}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Messages */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => {
            // Auto-scroll to bottom when content changes (newest messages)
            setTimeout(() => {
              if (scrollViewRef.current) {
                scrollViewRef.current.scrollToEnd({ animated: true });
              }
            }, 50);
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
          {chatExpiry && chatExpiry.isExpired ? (
            <View style={styles.readOnlyBanner}>
              <Ionicons name="lock-closed" size={16} color="#90A4AE" />
              <Text style={styles.readOnlyText}>
                This chat has expired and is now read-only. Purchase a new package to continue messaging.
              </Text>
            </View>
          ) : (
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.messageInput}
                placeholder="Type a message..."
                placeholderTextColor="#90A4AE"
                value={messageText}
                onChangeText={setMessageText}
                multiline
                maxLength={1000}
                editable={!(chatExpiry && chatExpiry.isExpired) && remainingDailyMessages.remaining > 0}
              />
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[
                    styles.uploadButton, 
                    (remainingClips.remaining <= 0 || (chatExpiry && chatExpiry.isExpired)) && styles.uploadButtonDisabled
                  ]} 
                  onPress={pickVideo}
                  disabled={remainingClips.remaining <= 0 || (chatExpiry && chatExpiry.isExpired)}
                >
                  <Ionicons 
                    name="videocam" 
                    size={20} 
                    color={(remainingClips.remaining <= 0 || (chatExpiry && chatExpiry.isExpired)) ? "#90A4AE" : "#0C295C"} 
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.sendButton,
                    ((chatExpiry && chatExpiry.isExpired) || remainingDailyMessages.remaining <= 0) && styles.sendButtonDisabled
                  ]} 
                  onPress={async () => {
                    // If chat is expired, show alert
                    if (chatExpiry && chatExpiry.isExpired) {
                      Alert.alert(
                        'Chat Expired',
                        'This chat has expired and is now read-only. Please purchase a new package to continue messaging.',
                        [{ text: 'OK' }]
                      );
                      return;
                    }
                    // If limit is reached, reload counter first to ensure it's accurate, then show alert
                    if (remainingDailyMessages.remaining <= 0) {
                      // Reload to get the latest count (in case it reset at midnight)
                      if (selectedConversation) {
                        const { getRemainingDailyMessages } = await import('../../services/conversationService');
                        const messageInfo = await getRemainingDailyMessages(selectedConversation.id);
                        // Update state with latest info
                        setRemainingDailyMessages(messageInfo);
                        // If still at 0, show alert
                        if (messageInfo.remaining <= 0) {
                          Alert.alert(
                            'Daily Message Limit Reached',
                            'You have reached your daily limit of 5 text messages. You can send more messages tomorrow.',
                            [{ text: 'OK' }]
                          );
                        }
                      } else {
                        Alert.alert(
                          'Daily Message Limit Reached',
                          'You have reached your daily limit of 5 text messages. You can send more messages tomorrow.',
                          [{ text: 'OK' }]
                        );
                      }
                      return;
                    }
                    // Otherwise, proceed with sending
                    sendMessage();
                  }}
                >
                  <Ionicons 
                    name="send" 
                    size={20} 
                    color={((chatExpiry && chatExpiry.isExpired) || remainingDailyMessages.remaining <= 0) ? "#90A4AE" : "white"} 
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
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
      </KeyboardAvoidingView>
    );
  }

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
            <Text style={styles.title}>Coach Feedback</Text>
            <Text style={styles.subtitle}>Connect with your coaches</Text>
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
                placeholder="Search for a coach"
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
          <View style={styles.conversationsContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0C295C" />
                <Text style={styles.loadingText}>Loading conversations...</Text>
              </View>
            ) : connectionError ? (
              <View style={styles.errorContainer}>
                <View style={styles.errorIcon}>
                  <Ionicons name="wifi-outline" size={48} color="#EF4444" />
                </View>
                <Text style={styles.errorTitle}>Connection Error</Text>
                <Text style={styles.errorMessage}>
                  Unable to connect to the backend server. Please check the troubleshooting steps below.
                </Text>
                <View style={styles.troubleshootingContainer}>
                  <Text style={styles.troubleshootingTitle}>Troubleshooting Steps:</Text>
                  <Text style={styles.troubleshootingStep}>1. Ensure the backend server is running (cd backend && node server.js)</Text>
                  <Text style={styles.troubleshootingStep}>2. Verify your device and computer are on the same WiFi network</Text>
                  <Text style={styles.troubleshootingStep}>3. Check that firewall allows connections on port 3001</Text>
                  <Text style={styles.troubleshootingStep}>4. Verify the IP address in conversationService.js matches your computer's IP</Text>
                </View>
                <TouchableOpacity 
                  style={styles.retryButton} 
                  onPress={retryLoadConversations}
                >
                  <Ionicons name="refresh" size={20} color="white" />
                  <Text style={styles.retryButtonText}>Retry Connection</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.debugButton} 
                  onPress={async () => {
                    console.log('🔧 Manual connection test triggered from UI');
                    try {
                      const result = await manualConnectionTest();
                      if (result) {
                        Alert.alert('Connection Test', `✅ Successfully connected to:\n${result}\n\nTrying to load conversations...`, [
                          { text: 'OK', onPress: () => loadConversations() }
                        ]);
                      } else {
                        Alert.alert('Connection Test', '❌ Could not connect to any backend URL.\n\nCheck the console for detailed connection logs.');
                      }
                    } catch (testError) {
                      Alert.alert('Connection Test', `Error: ${testError.message}`);
                    }
                  }}
                >
                  <Ionicons name="bug" size={16} color="#0C295C" />
                  <Text style={styles.debugButtonText}>Test Connection</Text>
                </TouchableOpacity>
                
                {retryCount > 0 && (
                  <Text style={styles.retryCount}>Retry attempt: {retryCount}</Text>
                )}
              </View>
            ) : filteredConversations.length > 0 ? (
              filteredConversations.map((conversation) => (
                <TouchableOpacity
                  key={conversation.id}
                  style={styles.conversationCard}
                  onPress={() => {
                    console.log('Player selected conversation:', {
                      id: conversation.id,
                      otherPartyName: conversation.otherPartyName,
                      coachName: conversation.coachName,
                      sport: conversation.sport,
                      avatar: conversation.avatar
                    });
                    setSelectedConversation(conversation);
                    loadMessages(conversation.id);
                  }}
                >
                  {/* Days Remaining Banner - Top of Card */}
                  {conversation.chatExpiry && conversation.chatExpiry.daysRemaining !== null && !conversation.chatExpiry.isExpired && (
                    <View style={styles.daysRemainingBanner}>
                      <Ionicons name="time-outline" size={14} color="#0C295C" />
                      <Text style={styles.daysRemainingText}>
                        {conversation.chatExpiry.daysRemaining === 1 
                          ? '1 day left' 
                          : `${conversation.chatExpiry.daysRemaining} days left`}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.conversationContent}>
                    <View style={styles.conversationAvatar}>
                      {conversation.avatar ? (
                        <Image 
                          source={{ uri: conversation.avatar }} 
                          style={styles.avatarImage}
                          resizeMode="cover"
                          onError={() => {
                            // If image fails to load, we'll fall back to initials
                            console.log('Failed to load profile image for:', conversation.otherPartyName);
                          }}
                        />
                      ) : (
                        <Text style={styles.avatarText}>{conversation.otherPartyName.charAt(0)}</Text>
                      )}
                    </View>
                    <View style={styles.conversationInfo}>
                      <View style={styles.conversationHeader}>
                        <Text style={styles.conversationName}>{conversation.otherPartyName}</Text>
                        <Text style={styles.conversationTime}>
                          {conversation.lastMessageAt ? new Date(conversation.lastMessageAt).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          }) : ''}
                        </Text>
                      </View>
                      <Text style={styles.conversationSport}>{conversation.sport} Coach</Text>
                      <Text style={styles.conversationMessage} numberOfLines={2}>
                        {conversation.lastMessage || 'No messages yet'}
                      </Text>
                    </View>
                    {conversation.unreadCount > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{conversation.unreadCount}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
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
                    {searchQuery ? 'Try adjusting your search terms' : 'Start connecting with coaches to see messages here'}
                  </Text>
                </LinearGradient>
              </Animated.View>
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 80,
    paddingBottom: 20,
  },
  title: {
    fontSize: width * 0.08,
    fontFamily: 'Rubik-Bold',
    color: '#0C295C',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Regular',
    color: '#0C295C',
    opacity: 0.8,
  },
  conversationsContainer: {
    marginBottom: 25,
  },
  conversationCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  daysRemainingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#90CAF9',
  },
  daysRemainingText: {
    fontSize: width * 0.032,
    fontFamily: 'Manrope-Medium',
    color: '#0C295C',
    marginLeft: 6,
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  conversationAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0C295C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    overflow: 'hidden',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  conversationName: {
    fontSize: width * 0.045,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
  },
  conversationTime: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Regular',
    color: '#0C295C',
    opacity: 0.6,
  },
  conversationSport: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Regular',
    color: '#0C295C',
    opacity: 0.7,
    marginBottom: 5,
  },
  conversationMessage: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#0C295C',
    opacity: 0.8,
  },
  unreadBadge: {
    backgroundColor: '#0C295C',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    color: 'white',
    fontSize: width * 0.035,
    fontFamily: 'Rubik-Medium',
  },
  // Chat Screen Styles
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    backgroundColor: 'white',
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    marginRight: 15,
  },
  coachInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  coachAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0C295C',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  coachAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  coachAvatarInitial: {
    fontSize: 16,
    fontFamily: 'Rubik-SemiBold',
    color: 'white',
  },
  coachName: {
    fontSize: width * 0.045,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
  },
  coachSport: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Regular',
    color: '#0C295C',
    opacity: 0.7,
  },
  trackerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  messageTrackerContainer: {
    marginRight: 8,
  },
  messageTracker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8F2FF',
  },
  messageTrackerText: {
    fontSize: 14,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginLeft: 6,
  },
  clipTrackerContainer: {
    marginRight: 0,
  },
  clipTracker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8F2FF',
  },
  clipTrackerText: {
    fontSize: 14,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginLeft: 6,
  },
  moreButton: {
    marginLeft: 5,
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  messagesContent: {
    flexGrow: 1,
    paddingBottom: 10,
  },
  messageContainer: {
    marginBottom: 15,
  },
  playerMessage: {
    alignItems: 'flex-end',
  },
  coachMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 15,
  },
  playerBubble: {
    backgroundColor: '#0C295C',
    borderBottomRightRadius: 5,
  },
  coachBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 5,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  messageText: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    lineHeight: 20,
  },
  playerText: {
    color: 'white',
  },
  coachText: {
    color: '#0C295C',
  },
  messageTime: {
    fontSize: width * 0.03,
    fontFamily: 'Manrope-Regular',
    marginTop: 4,
  },
  playerTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  coachTime: {
    color: '#0C295C',
    opacity: 0.6,
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E8F2FF',
    minHeight: 70,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  messageInput: {
    flex: 1,
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#0C295C',
    maxHeight: 100,
    minHeight: 40,
    textAlignVertical: 'top',
    paddingTop: 10,
    paddingBottom: 10,
  },
  uploadButton: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#0C295C',
  },
  uploadButtonDisabled: {
    borderColor: '#90A4AE',
    opacity: 0.5,
  },
  sendButton: {
    backgroundColor: '#0C295C',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  readOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  readOnlyText: {
    flex: 1,
    marginLeft: 8,
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Regular',
    color: '#E65100',
    lineHeight: 18,
  },
  // Search Bar Styles
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#0C295C',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(12, 41, 92, 0.08)',
  },
  searchInput: {
    flex: 1,
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#0C295C',
    marginLeft: 12,
    marginRight: 8,
  },
  // Empty State Styles
  emptyState: {
    marginTop: 40,
  },
  emptyStateCard: {
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
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(169, 195, 221, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: width * 0.045,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginBottom: 12,
  },
  emptyStateSubtitle: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
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
  avatarText: {
    fontSize: 20,
    fontFamily: 'Rubik-SemiBold',
    color: 'white',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  // Error State Styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: width * 0.05,
    fontFamily: 'Rubik-SemiBold',
    color: '#EF4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#0C295C',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  retryButtonText: {
    color: 'white',
    fontSize: width * 0.04,
    fontFamily: 'Rubik-Medium',
    marginLeft: 8,
  },
  retryCount: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    opacity: 0.7,
  },
  debugButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0C295C',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  debugButtonText: {
    color: '#0C295C',
    fontSize: width * 0.035,
    fontFamily: 'Rubik-Medium',
    marginLeft: 6,
  },
  troubleshootingContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  troubleshootingTitle: {
    fontSize: width * 0.04,
    fontFamily: 'Rubik-SemiBold',
    color: '#EF4444',
    marginBottom: 12,
  },
  troubleshootingStep: {
    fontSize: width * 0.037,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    marginBottom: 8,
    lineHeight: 20,
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
});
