import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { supabase } from '../supabaseClient';
import { getConversations } from './conversationService';
import { subscribeToAppForeground } from '../utils/appForeground';

export const LIVE_SYNC_EVENT = 'liveSyncCatchUp';
export const UNREAD_BADGE_EVENT = 'liveSyncUnreadBadge';

const DEBOUNCE_MS = 400;
const RESUBSCRIBE_DELAY_MS = 1000;

let channel = null;
let channelGeneration = 0;
let currentUserId = null;
let currentRole = null;
let debounceTimer = null;
let resubscribeTimer = null;
let unsubscribeForeground = null;
let unreadByConversation = new Map();
let openConversationId = null;
let unreadRefreshGeneration = 0;
let pending = {
  conversations: false,
  sessions: false,
  conversationId: null,
};

function unreadCountKey(role) {
  return role === 'coach' ? 'coach_unread_count' : 'player_unread_count';
}

function isOpenConversation(conversationId) {
  return (
    openConversationId != null &&
    conversationId != null &&
    String(conversationId) === String(openConversationId)
  );
}

export function getUnreadBadgeTotal() {
  let total = 0;
  unreadByConversation.forEach((count, conversationId) => {
    if (isOpenConversation(conversationId)) return;
    total += count || 0;
  });
  return total;
}

function emitUnreadBadge() {
  DeviceEventEmitter.emit(UNREAD_BADGE_EVENT, getUnreadBadgeTotal());
}

function applyConversationUnread(row) {
  if (!currentRole || !row?.id) return;
  const key = unreadCountKey(currentRole);
  const count = Number(row[key] || 0);
  unreadByConversation.set(
    String(row.id),
    isOpenConversation(row.id) ? 0 : count
  );
  emitUnreadBadge();
}

async function refreshUnreadMap() {
  if (!currentUserId || !currentRole) return;

  const generation = ++unreadRefreshGeneration;
  try {
    const conversations = await getConversations(currentUserId, currentRole, {
      forceRefresh: true,
    });
    if (generation !== unreadRefreshGeneration) return;

    const key = unreadCountKey(currentRole);
    const next = new Map();
    (conversations || []).forEach((conv) => {
      if (!conv?.id) return;
      next.set(
        String(conv.id),
        isOpenConversation(conv.id) ? 0 : (conv[key] || 0)
      );
    });
    unreadByConversation = next;
    emitUnreadBadge();
  } catch (error) {
    console.warn('Failed to refresh unread badge map:', error?.message);
  }
}

export function setOpenConversationId(conversationId) {
  openConversationId = conversationId ? String(conversationId) : null;
  if (openConversationId) {
    unreadByConversation.set(openConversationId, 0);
  }
  emitUnreadBadge();
}

export function subscribeToUnreadBadge(callback) {
  callback(getUnreadBadgeTotal());
  const subscription = DeviceEventEmitter.addListener(UNREAD_BADGE_EVENT, callback);
  return () => subscription.remove();
}

export function useUnreadBadge() {
  const [total, setTotal] = useState(getUnreadBadgeTotal);

  useEffect(() => {
    return subscribeToUnreadBadge(setTotal);
  }, []);

  return total;
}

function resetPending() {
  pending = {
    conversations: false,
    sessions: false,
    conversationId: null,
  };
}

function emitCatchUp() {
  const payload = {
    conversations: pending.conversations,
    sessions: pending.sessions,
    conversationId: pending.conversationId,
  };
  resetPending();
  DeviceEventEmitter.emit(LIVE_SYNC_EVENT, payload);
}

function scheduleCatchUp(partial = {}) {
  if (partial.conversations) pending.conversations = true;
  if (partial.sessions) pending.sessions = true;
  if (partial.conversationId) {
    pending.conversationId = partial.conversationId;
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    emitCatchUp();
  }, DEBOUNCE_MS);
}

function clearResubscribeTimer() {
  if (resubscribeTimer) {
    clearTimeout(resubscribeTimer);
    resubscribeTimer = null;
  }
}

function scheduleResubscribe(userId, role) {
  if (resubscribeTimer) return;
  resubscribeTimer = setTimeout(() => {
    resubscribeTimer = null;
    if (currentUserId === userId && currentRole === role) {
      subscribeChannel(userId, role);
    }
  }, RESUBSCRIBE_DELAY_MS);
}

function removeCurrentChannel() {
  if (!channel) return;
  const existing = channel;
  channel = null;
  supabase.removeChannel(existing);
}

function subscribeChannel(userId, role) {
  const generation = ++channelGeneration;
  removeCurrentChannel();

  const conversationsFilter =
    role === 'coach' ? `coach_id=eq.${userId}` : `player_id=eq.${userId}`;

  let nextChannel = supabase
    .channel(`inbox:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        const conversationId = payload?.new?.conversation_id || null;
        scheduleCatchUp({
          conversations: true,
          conversationId,
        });
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: conversationsFilter,
      },
      (payload) => {
        applyConversationUnread(payload?.new);
        scheduleCatchUp({ conversations: true });
      }
    );

  if (role === 'coach') {
    nextChannel = nextChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'coaching_sessions',
        filter: `coach_id=eq.${userId}`,
      },
      () => {
        scheduleCatchUp({ sessions: true });
      }
    );
  } else {
    nextChannel = nextChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'coaching_sessions',
      },
      () => {
        scheduleCatchUp({ sessions: true });
      }
    );
  }

  channel = nextChannel.subscribe((status) => {
    if (generation !== channelGeneration) return;
    if (currentUserId !== userId || currentRole !== role) return;
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      scheduleResubscribe(userId, role);
    }
  });
}

export function startLiveSync(userId, role) {
  if (!userId) return;

  const normalizedRole = role === 'coach' ? 'coach' : 'player';
  if (
    currentUserId === userId &&
    currentRole === normalizedRole &&
    channel
  ) {
    return;
  }

  stopLiveSync();
  currentUserId = userId;
  currentRole = normalizedRole;
  subscribeChannel(userId, normalizedRole);
  refreshUnreadMap();

  unsubscribeForeground = subscribeToAppForeground(() => {
    if (!currentUserId || !currentRole) return;
    if (!channel || channel.state !== 'joined') {
      subscribeChannel(currentUserId, currentRole);
    }
    scheduleCatchUp({ conversations: true, sessions: true });
    refreshUnreadMap();
  });
}

export function stopLiveSync() {
  currentUserId = null;
  currentRole = null;
  channelGeneration += 1;
  unreadRefreshGeneration += 1;
  unreadByConversation = new Map();
  openConversationId = null;
  emitUnreadBadge();

  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  clearResubscribeTimer();
  resetPending();

  if (unsubscribeForeground) {
    unsubscribeForeground();
    unsubscribeForeground = null;
  }

  removeCurrentChannel();
}

export function subscribeToLiveSync(callback) {
  const subscription = DeviceEventEmitter.addListener(LIVE_SYNC_EVENT, callback);
  return () => subscription.remove();
}

/**
 * Run onCatchUp only while this screen is focused. Otherwise remember the
 * screen is stale so the caller can reload on the next focus.
 */
export function useLiveSyncCatchUp(onCatchUp) {
  const isFocused = useIsFocused();
  const isFocusedRef = useRef(isFocused);
  isFocusedRef.current = isFocused;
  const staleRef = useRef(false);
  const callbackRef = useRef(onCatchUp);
  callbackRef.current = onCatchUp;

  useEffect(() => {
    return subscribeToLiveSync((payload) => {
      if (isFocusedRef.current) {
        callbackRef.current(payload);
      } else {
        staleRef.current = true;
      }
    });
  }, []);

  const consumeStale = useCallback(() => {
    if (!staleRef.current) return false;
    staleRef.current = false;
    return true;
  }, []);

  return consumeStale;
}
