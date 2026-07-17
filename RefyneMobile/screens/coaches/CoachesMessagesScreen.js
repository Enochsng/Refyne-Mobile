import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { getConversations, formatConversationForDisplay, hideConversationForCoach } from '../../services/conversationService';
import { blockUser, listBlocks, unblockUser } from '../../services/safetyService';
import { supabase } from '../../supabaseClient';
import { Video, ResizeMode } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ChatProfileBottomSheet from '../../components/ChatProfileBottomSheet';
import MessageContextMenu from '../../components/MessageContextMenu';

const { width, height } = Dimensions.get('window');

const LIST_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'active', label: 'Active' },
];

function isConversationSessionActive(conversation) {
  const sessionStatus = conversation?.sessionStatus;
  return sessionStatus != null && sessionStatus.isActive === true;
}

function getLastMessagePreview(lastMessage) {
  if (!lastMessage) return { isVideo: false, text: 'No messages yet' };
  if (lastMessage.includes('Tutorial:')) {
    const title = lastMessage.replace(/^🎥\s*Tutorial:\s*/, '').trim();
    return { isVideo: true, text: `New clip · ${title}` };
  }
  if (lastMessage.startsWith('📹') || /Video\s*\(/.test(lastMessage)) {
    const title = lastMessage.replace(/^📹\s*/, '').trim();
    return { isVideo: true, text: `New clip · ${title}` };
  }
  return { isVideo: false, text: lastMessage };
}

export default function CoachesMessagesScreen({ navigation, route }) {
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [listFilter, setListFilter] = useState('all');
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
  const [coachId, setCoachId] = useState(null);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [isOtherUserBlocked, setIsOtherUserBlocked] = useState(false);
  const [blockRecordId, setBlockRecordId] = useState(null);
  const [messageContextMenu, setMessageContextMenu] = useState(null);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const swipeableRefs = useRef({});
  const isFirstFocus = useRef(true);
  
  // ScrollView ref for auto-scrolling
  const scrollViewRef = useRef(null);
  const messageRefs = useRef({});
  const scrollY = useRef(0);
  const inputBarPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dy > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 24) {
          Keyboard.dismiss();
        }
      },
    })
  ).current;

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

  // Hide tab bar only while a conversation thread is open.
  useEffect(() => {
    navigation.setParams({ hideTabBar: Boolean(selectedConversation) });
  }, [navigation, selectedConversation]);

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

  // Load conversations on component mount and when tab regains focus
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);

      const authPromise = supabase.auth.getUser();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Authentication timeout')), 15000)
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

      const currentCoachId = user.id;
      setCoachId(currentCoachId);
      console.log('Loading conversations for authenticated coach:', currentCoachId);

      const conversationsData = await getConversations(currentCoachId, 'coach');
      console.log('Coach conversations data:', conversationsData);
      console.log('[loadConversations] raw API sessionStatus:', conversationsData.map((conv) => ({
        id: conv.id,
        sessionStatus: conv.sessionStatus ?? null,
      })));

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
              playerName: formatted.playerName,
              sessionStatus: formatted.sessionStatus ?? conv.sessionStatus ?? null,
            });
            return {
              ...formatted,
              sessionStatus: formatted.sessionStatus ?? conv.sessionStatus ?? null,
              playerId: conv.player_id || formatted.playerId || null,
              otherPartyId: formatted.otherPartyId || conv.player_id || null,
              archivedAt: formatted.archivedAt || conv.archived_at || null,
            };
          } catch (error) {
            console.log('Error formatting conversation:', error);
            const fallback = {
              id: conv.id,
              otherPartyName: conv.player_name || 'Student',
              otherPartyId: conv.player_id || null,
              sport: conv.sport,
              lastMessage: conv.last_message,
              lastMessageAt: conv.last_message_at,
              unreadCount: conv.coach_unread_count,
              sessionId: conv.session_id,
              isOnline: false,
              avatar: null,
              sessionStatus: conv.sessionStatus ?? null,
              playerId: conv.player_id || null,
              coachId: conv.coach_id || null,
              archivedAt: conv.archived_at || null,
            };
            console.log('Using fallback conversation:', fallback);
            return fallback;
          }
        })
      );

      console.log('Formatted conversations:', formattedConversations);
      setConversations(formattedConversations);
      setFilteredConversations(formattedConversations);
      return formattedConversations;
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
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations, route?.params?.coachId]);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      if (!selectedConversation) {
        loadConversations();
      }
    }, [loadConversations, selectedConversation])
  );

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
    let result = conversations;

    if (listFilter === 'unread') {
      result = result.filter(conversation => conversation.unreadCount > 0);
    } else if (listFilter === 'active') {
      console.log('[Active tab filter] conversations:', conversations);
      let missingCount = 0;
      let activeCount = 0;
      let inactiveCount = 0;

      conversations.forEach((conversation) => {
        const sessionStatus = conversation.sessionStatus;
        const sessionStatusState =
          sessionStatus === undefined ? 'undefined' :
          sessionStatus === null ? 'null' :
          'present';

        if (sessionStatus == null) {
          missingCount += 1;
        } else if (sessionStatus.isActive === true) {
          activeCount += 1;
        } else {
          inactiveCount += 1;
        }

        console.log('[Active tab filter] sessionStatus:', {
          conversationId: conversation.id,
          otherPartyName: conversation.otherPartyName,
          sessionId: conversation.sessionId,
          sessionStatus,
          sessionStatusState,
        });
      });

      console.log('[Active tab filter] summary:', {
        total: conversations.length,
        missing: missingCount,
        isActiveTrue: activeCount,
        isActiveFalse: inactiveCount,
      });

      result = result.filter(isConversationSessionActive);
    }

    if (searchQuery.trim() !== '') {
      result = result.filter(conversation =>
        conversation.otherPartyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conversation.sport.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredConversations(result);
  }, [searchQuery, conversations, listFilter]);

  useEffect(() => {
    const total = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);
    navigation.setOptions({
      tabBarBadge: total > 0 ? (total > 99 ? '99+' : total) : undefined,
    });
  }, [conversations, navigation]);

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
        // Always use authenticated user id so messages.sender_id matches conversations.coach_id (UUID)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          Alert.alert('Authentication Error', 'Please sign in to send messages.');
          return;
        }
        const coachId = user.id;
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

  const leaveConversationAfterBlock = () => {
    setShowProfileSheet(false);
    setMessageContextMenu(null);
    setSelectedConversation(null);
    setMessages([]);
    setMessageText('');
    setIsOtherUserBlocked(false);
    setBlockRecordId(null);
    navigation.setParams({ conversationId: undefined, hideTabBar: false });
    loadConversations();
  };

  const openProfileSheet = async () => {
    const otherId =
      selectedConversation?.otherPartyId || selectedConversation?.playerId;
    setIsOtherUserBlocked(false);
    setBlockRecordId(null);
    setShowProfileSheet(true);
    if (!otherId) return;
    try {
      const result = await listBlocks();
      const blocks = result?.blocks || [];
      const match = blocks.find(
        (b) => String(b.blocked_id) === String(otherId)
      );
      if (match) {
        setIsOtherUserBlocked(true);
        setBlockRecordId(match.id);
      }
    } catch (error) {
      console.error('Error loading block status:', error);
    }
  };

  const handleReportUser = () => {
    setShowProfileSheet(false);
    const reportedUserId =
      selectedConversation?.otherPartyId || selectedConversation?.playerId;
    if (!reportedUserId) {
      Alert.alert('Error', 'Unable to report this user. Please try again.');
      return;
    }
    navigation.navigate('ReportReason', {
      reportedUserId,
      conversationId: selectedConversation.id,
      otherPartyName: selectedConversation.otherPartyName,
    });
  };

  const closeMessageContextMenu = () => {
    setMessageContextMenu(null);
  };

  const handleCopyMessage = async (message) => {
    try {
      await Clipboard.setStringAsync(message?.text || '');
    } catch (error) {
      Alert.alert('Error', 'Failed to copy message. Please try again.');
    }
  };

  const handleReportMessage = (message) => {
    const reportedUserId =
      selectedConversation?.otherPartyId || selectedConversation?.playerId;
    if (!reportedUserId || !selectedConversation?.id || !message?.id) {
      Alert.alert('Error', 'Unable to report this message. Please try again.');
      return;
    }
    navigation.navigate('ReportReason', {
      reportedUserId,
      conversationId: selectedConversation.id,
      otherPartyName: selectedConversation.otherPartyName,
      messageId: message.id,
    });
  };

  const handleMessageLongPress = (message) => {
    const node = messageRefs.current[message.id];
    if (!node || typeof node.measureInWindow !== 'function') {
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      if (!width || !height) {
        return;
      }
      setMessageContextMenu({
        message,
        isOwn: message.isFromPlayer === false,
        anchor: { x, y, width, height },
      });
    });
  };

  const handleContextMenuCopy = async () => {
    const message = messageContextMenu?.message;
    closeMessageContextMenu();
    if (message) {
      await handleCopyMessage(message);
    }
  };

  const handleContextMenuReport = () => {
    const message = messageContextMenu?.message;
    closeMessageContextMenu();
    if (message) {
      handleReportMessage(message);
    }
  };

  const handleBlockUser = () => {
    setShowProfileSheet(false);
    const blockedId =
      selectedConversation?.otherPartyId || selectedConversation?.playerId;
    if (!blockedId) {
      Alert.alert('Error', 'Unable to block this user. Please try again.');
      return;
    }
    const name = selectedConversation?.otherPartyName || 'this user';
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${name}? You will no longer be able to message each other, and any active session will end.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(blockedId);
              leaveConversationAfterBlock();
              Alert.alert('User Blocked', `${name} has been blocked.`);
            } catch (error) {
              if (error?.status === 409) {
                leaveConversationAfterBlock();
                Alert.alert('User Blocked', `${name} has already been blocked.`);
                return;
              }
              Alert.alert(
                'Error',
                error?.message || 'Failed to block user. Please try again.'
              );
            }
          },
        },
      ]
    );
  };

  const handleUnblockUser = () => {
    setShowProfileSheet(false);
    if (!blockRecordId) {
      Alert.alert('Error', 'Unable to unblock this user. Please try again.');
      return;
    }
    const name = selectedConversation?.otherPartyName || 'this user';
    const conversationId = selectedConversation?.id;
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock ${name}? You will be able to message each other again if you start a new session.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            try {
              await unblockUser(blockRecordId);
            } catch (error) {
              Alert.alert(
                'Error',
                error?.message || 'Failed to unblock user. Please try again.'
              );
              return;
            }

            setIsOtherUserBlocked(false);
            setBlockRecordId(null);

            // Refresh so archivedAt matches server (cleared only when pair is fully unblocked).
            try {
              const refreshed = await loadConversations();
              if (conversationId && Array.isArray(refreshed)) {
                const match = refreshed.find((conv) => conv.id === conversationId);
                if (match) {
                  setSelectedConversation(match);
                }
              }
            } catch (e) {
              console.warn('Post-unblock loadConversations failed:', e?.message || e);
            }

            Alert.alert('User Unblocked', `${name} has been unblocked.`);
          },
        },
      ]
    );
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

      const { uploadChatMedia, sendMessage: sendMessageToConversation } = await import('../../services/conversationService');

      // If tutorial video is a local URI, upload to Supabase first so it stays visible after reload
      let videoUrlToStore = tutorial.videoUri;
      if (tutorial.videoUri && (tutorial.videoUri.startsWith('file://') || tutorial.videoUri.startsWith('content://') || tutorial.videoUri.startsWith('ph://'))) {
        try {
          videoUrlToStore = await uploadChatMedia(
            tutorial.videoUri,
            'video/mp4',
            tutorial.videoName || `tutorial-${Date.now()}.mp4`
          );
        } catch (uploadErr) {
          console.warn('Tutorial upload failed, sending local URI:', uploadErr.message);
        }
      }

      // Create message content with tutorial title
      const messageContent = `🎥 Tutorial: ${tutorial.title}`;

      // Send video message with permanent URL
      const response = await sendMessageToConversation(
        selectedConversation.id,
        coachId,
        'coach',
        messageContent,
        'video',
        videoUrlToStore
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
        videoUri: videoUrlToStore,
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
    const isHighlighted = messageContextMenu?.message?.id === message.id;
    const isRightAligned = message.isFromPlayer === false;
    return (
      <View
        ref={(ref) => {
          if (ref) {
            messageRefs.current[message.id] = ref;
          } else {
            delete messageRefs.current[message.id];
          }
        }}
        collapsable={false}
        style={[
          styles.messageMeasureWrapVideo,
          isRightAligned
            ? styles.messageMeasureAlignEnd
            : styles.messageMeasureAlignStart,
          isHighlighted && styles.messageHiddenWhileMenuOpen,
        ]}
      >
        <TouchableOpacity 
          style={styles.videoMessageContainer}
          onPress={() => handleVideoPress(message.videoUri)}
          onLongPress={() => handleMessageLongPress(message)}
          delayLongPress={300}
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
      </View>
    );
  };

  const renderFloatingContextMessage = () => {
    const message = messageContextMenu?.message;
    if (!message) return null;

    if (message.messageType === 'video') {
      return (
        <View style={styles.videoMessageContainer}>
          <View style={[styles.videoShadowWrap, styles.messageSoftShadow]}>
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
          </View>
          <Text style={styles.videoDuration}>{message.text}</Text>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.messageBubble,
          message.isFromPlayer ? styles.playerBubble : styles.coachBubble,
          styles.messageSoftShadow,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            message.isFromPlayer ? styles.playerText : styles.coachText,
          ]}
        >
          {message.text}
        </Text>
        <Text
          style={[
            styles.messageTime,
            message.isFromPlayer ? styles.playerTime : styles.coachTime,
          ]}
        >
          {message.timestamp}
        </Text>
      </View>
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

  const handleDeleteConversation = (conversation) => {
    Alert.alert(
      'Delete Chat',
      'Are you sure you want to delete this chat?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            if (!coachId) {
              Alert.alert('Error', 'Unable to delete chat. Please try again.');
              return;
            }
            try {
              await hideConversationForCoach(conversation.id, coachId);
              setConversations(prev => prev.filter(c => c.id !== conversation.id));
              setFilteredConversations(prev => prev.filter(c => c.id !== conversation.id));
            } catch (error) {
              console.error('Error hiding conversation:', error);
              Alert.alert('Error', 'Failed to delete chat. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderRightActions = (conversation) => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => {
        swipeableRefs.current[conversation.id]?.close();
        handleDeleteConversation(conversation);
      }}
      activeOpacity={0.8}
    >
      <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
      <Text style={styles.deleteActionText}>Delete</Text>
    </TouchableOpacity>
  );

  const getTotalUnreadCount = () => {
    return conversations.reduce((total, conv) => total + conv.unreadCount, 0);
  };

  const getEmptyStateSubtitle = () => {
    if (searchQuery.trim()) {
      return 'Try adjusting your search terms';
    }
    if (listFilter === 'unread') {
      return 'You have no unread messages';
    }
    if (listFilter === 'active') {
      return 'No active conversations right now';
    }
    return 'Start connecting with students to see messages here';
  };

  // If a conversation is selected, show the chat view
  if (selectedConversation) {
    const isArchived = Boolean(selectedConversation.archivedAt);

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
              setShowProfileSheet(false);
              setMessageContextMenu(null);
              setSelectedConversation(null);
              setIsOtherUserBlocked(false);
              setBlockRecordId(null);
              // Clear route params to prevent auto-selection when navigating back
              navigation.setParams({ conversationId: undefined, hideTabBar: false });
            }}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#0C295C" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.coachInfo}
            onPress={openProfileSheet}
            activeOpacity={0.7}
          >
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
            <View style={styles.coachTextContainer}>
              <View style={styles.coachNameRow}>
                <Text style={styles.coachName}>
                  {selectedConversation.otherPartyName || 'Unknown Player'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#90A4AE" style={{ marginLeft: 4 }} />
              </View>
              <Text style={styles.coachSport}>{selectedConversation.sport} Student</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesContent}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="always"
          nestedScrollEnabled={true}
          onScrollBeginDrag={closeMessageContextMenu}
          onScroll={(event) => {
            const currentScrollY = event.nativeEvent.contentOffset.y;
            scrollY.current = currentScrollY;
          }}
          scrollEventThrottle={16}
        >
          {messages.map((message) => {
            const isHighlighted =
              messageContextMenu?.message?.id === message.id;
            const isRightAligned = message.isFromPlayer === false;
            return (
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
                      styles.videoMessageTime,
                      isHighlighted && styles.messageHiddenWhileMenuOpen,
                    ]}
                  >
                    {message.timestamp}
                  </Text>
                </View>
              ) : (
                <View
                  ref={(ref) => {
                    if (ref) {
                      messageRefs.current[message.id] = ref;
                    } else {
                      delete messageRefs.current[message.id];
                    }
                  }}
                  collapsable={false}
                  style={[
                    styles.messageMeasureWrapBubble,
                    isRightAligned
                      ? styles.messageMeasureAlignEnd
                      : styles.messageMeasureAlignStart,
                    isHighlighted && styles.messageHiddenWhileMenuOpen,
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.messageBubble,
                      message.isFromPlayer ? styles.playerBubble : styles.coachBubble,
                    ]}
                    onLongPress={() => handleMessageLongPress(message)}
                    delayLongPress={300}
                    activeOpacity={0.85}
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
                  </TouchableOpacity>
                </View>
              )}
            </View>
            );
          })}
        </ScrollView>

        {/* Message Input */}
        <View style={styles.inputContainer} {...inputBarPanResponder.panHandlers}>
          {isArchived ? (
            <View style={styles.readOnlyBanner}>
              <Ionicons name="lock-closed" size={16} color="#90A4AE" />
              <View style={styles.readOnlyTextContainer}>
                <Text style={styles.readOnlyText}>
                  This conversation is archived — you can't send new messages
                </Text>
              </View>
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

        <ChatProfileBottomSheet
          visible={showProfileSheet}
          onClose={() => setShowProfileSheet(false)}
          name={selectedConversation.otherPartyName || 'Unknown Player'}
          role={`${selectedConversation.sport} Student`}
          avatar={selectedConversation.avatar}
          onReport={handleReportUser}
          onBlock={handleBlockUser}
          onUnblock={handleUnblockUser}
          isBlocked={isOtherUserBlocked}
        />

        <MessageContextMenu
          visible={Boolean(messageContextMenu)}
          anchor={messageContextMenu?.anchor}
          showReport={!messageContextMenu?.isOwn}
          align={messageContextMenu?.isOwn ? 'right' : 'left'}
          onCopy={handleContextMenuCopy}
          onReport={handleContextMenuReport}
          onClose={closeMessageContextMenu}
          floatingMessage={renderFloatingContextMessage()}
        />
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

      {/* Filter Tabs */}
      <Animated.View
        style={[
          styles.filterTabsContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.filterTabs}>
          {LIST_FILTERS.map((filter) => {
            const isSelected = listFilter === filter.id;
            const totalUnread = getTotalUnreadCount();
            return (
              <TouchableOpacity
                key={filter.id}
                style={[styles.filterTab, isSelected && styles.filterTabActive]}
                onPress={() => setListFilter(filter.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterTabText, isSelected && styles.filterTabTextActive]}>
                  {filter.label}
                </Text>
                {filter.id === 'unread' && totalUnread > 0 && (
                  <View style={[styles.countBadge, isSelected && styles.countBadgeOnActiveTab]}>
                    <Text style={styles.countBadgeText}>
                      {totalUnread > 99 ? '99+' : totalUnread}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
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
          <View style={styles.conversationsCard}>
            {filteredConversations.map((conversation, index) => {
              const preview = getLastMessagePreview(conversation.lastMessage);
              const isLastRow = index === filteredConversations.length - 1;

              return (
                <Animated.View
                  key={conversation.id}
                  style={{
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  }}
                >
                  <Swipeable
                    ref={(ref) => {
                      if (ref) {
                        swipeableRefs.current[conversation.id] = ref;
                      } else {
                        delete swipeableRefs.current[conversation.id];
                      }
                    }}
                    renderRightActions={() => renderRightActions(conversation)}
                    overshootRight={false}
                    onSwipeableWillOpen={() => {
                      Object.entries(swipeableRefs.current).forEach(([id, ref]) => {
                        if (id !== conversation.id) {
                          ref?.close();
                        }
                      });
                    }}
                  >
                  <TouchableOpacity
                    style={styles.conversationRow}
                    onPress={() => handleConversationPress(conversation)}
                    onLongPress={() => markAsRead(conversation.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.rowInner}>
                      <View style={styles.listAvatar}>
                        {conversation.avatar ? (
                          <Image
                            source={{ uri: conversation.avatar }}
                            style={styles.listAvatarImage}
                            resizeMode="cover"
                            onError={() => {
                              console.log('Failed to load profile image for:', conversation.otherPartyName);
                            }}
                          />
                        ) : (
                          <Text style={styles.listAvatarText}>
                            {conversation.otherPartyName.charAt(0)}
                          </Text>
                        )}
                      </View>

                      <View style={styles.conversationInfo}>
                        <View style={styles.conversationHeader}>
                          <Text style={styles.studentName} numberOfLines={1}>
                            {conversation.otherPartyName}
                          </Text>
                          <Text style={styles.timestamp}>
                            {conversation.lastMessageAt
                              ? new Date(conversation.lastMessageAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </Text>
                        </View>

                        <View style={styles.previewRow}>
                          {preview.isVideo && (
                            <Ionicons
                              name="videocam"
                              size={14}
                              color="#64748B"
                              style={styles.previewVideoIcon}
                            />
                          )}
                          <Text
                            style={[
                              styles.lastMessage,
                              conversation.unreadCount > 0 && styles.unreadMessage,
                            ]}
                            numberOfLines={1}
                          >
                            {preview.text}
                          </Text>
                        </View>
                      </View>

                      {conversation.unreadCount > 0 && (
                        <View style={[styles.countBadge, styles.rowCountBadge]}>
                          <Text style={styles.countBadgeText}>
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                  </Swipeable>
                  {!isLastRow && <View style={styles.rowDivider} />}
                </Animated.View>
              );
            })}
          </View>
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
                {getEmptyStateSubtitle()}
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
  filterTabsContainer: {
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(12, 41, 92, 0.15)',
    backgroundColor: '#FFFFFF',
  },
  countBadge: {
    backgroundColor: '#0C295C',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeOnActiveTab: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: width * 0.032,
    fontFamily: 'Rubik-Medium',
  },
  rowCountBadge: {
    marginLeft: 8,
  },
  filterTabActive: {
    backgroundColor: '#0C295C',
    borderColor: '#0C295C',
  },
  filterTabText: {
    fontSize: width * 0.035,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  conversationsListContent: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 100,
  },
  conversationsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    paddingHorizontal: 16,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(12, 41, 92, 0.06)',
  },
  conversationRow: {
    backgroundColor: '#FFFFFF',
  },
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    marginLeft: 8,
    borderRadius: 10,
  },
  deleteActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Manrope-SemiBold',
    marginTop: 4,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  listAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0C295C',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginRight: 12,
  },
  listAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  listAvatarText: {
    fontSize: 18,
    fontFamily: 'Rubik-Bold',
    color: 'white',
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
    flex: 1,
    fontSize: width * 0.045,
    fontFamily: 'Rubik-Bold',
    color: '#0C295C',
    marginRight: 8,
  },
  timestamp: {
    fontSize: width * 0.032,
    fontFamily: 'Manrope-Medium',
    color: '#90A4AE',
    marginTop: 2,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  previewVideoIcon: {
    marginRight: 4,
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
    fontSize: width * 0.037,
    fontFamily: 'Manrope-Regular',
    color: '#64748B',
    lineHeight: 20,
  },
  unreadMessage: {
    fontFamily: 'Manrope-SemiBold',
    color: '#0C295C',
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
    paddingBottom: 15,
    backgroundColor: '#F8FAFF',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
    zIndex: 10,
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
  coachTextContainer: {
    flexShrink: 1,
  },
  coachNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    paddingVertical: 15,
    backgroundColor: '#F8FAFF',
  },
  messagesContent: {
    flexGrow: 1,
    paddingBottom: 10,
  },
  messageContainer: {
    marginBottom: 15,
  },
  playerMessage: {
    alignItems: 'flex-start',
  },
  coachMessage: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 20,
  },
  playerBubble: {
    backgroundColor: '#E3F2FD',
    borderBottomLeftRadius: 8,
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  coachBubble: {
    backgroundColor: '#0C295C',
    borderBottomRightRadius: 8,
  },
  messageMeasureWrapVideo: {
    maxWidth: '80%',
  },
  messageMeasureWrapBubble: {
    maxWidth: '74%',
  },
  messageMeasureAlignStart: {
    alignSelf: 'flex-start',
  },
  messageMeasureAlignEnd: {
    alignSelf: 'flex-end',
  },
  messageHiddenWhileMenuOpen: {
    opacity: 0,
  },
  messageSoftShadow: {
    shadowColor: '#0C295C',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 8,
  },
  videoShadowWrap: {
    borderRadius: 12,
    backgroundColor: '#000',
  },
  messageText: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Regular',
    lineHeight: 20,
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
    fontSize: width * 0.027,
    fontFamily: 'Manrope-Regular',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  playerTime: {
    color: '#90A4AE',
  },
  coachTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  inputContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    marginBottom: Platform.OS === 'ios' ? 18 : 10,
    backgroundColor: '#F8FAFF',
    borderTopWidth: 0,
    minHeight: 70,
    zIndex: 10,
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
  readOnlyTextContainer: {
    flex: 1,
    marginLeft: 8,
  },
  readOnlyText: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-Regular',
    color: '#E65100',
    lineHeight: 18,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 8,
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
