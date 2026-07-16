import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ChatProfileBottomSheet({
  visible,
  onClose,
  name,
  role,
  avatar,
  onReport,
  onBlock,
  onUnblock,
  isBlocked = false,
}) {
  const initial = name ? name.charAt(0).toUpperCase() : '?';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.profileSection}>
            <View style={styles.avatar}>
              {avatar ? (
                <Image
                  source={{ uri: avatar }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Text style={styles.avatarInitial}>{initial}</Text>
              )}
            </View>
            <Text style={styles.name}>{name || 'Unknown'}</Text>
            {role ? <Text style={styles.role}>{role}</Text> : null}
          </View>

          <View style={styles.divider} />

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={onReport}
              activeOpacity={0.7}
            >
              <Ionicons name="flag-outline" size={20} color="#FF6B35" />
              <Text style={styles.actionText}>Report User</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionRow}
              onPress={isBlocked ? onUnblock : onBlock}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isBlocked ? 'lock-open-outline' : 'ban-outline'}
                size={20}
                color="#FF6B35"
              />
              <Text style={styles.actionText}>
                {isBlocked ? 'Unblock User' : 'Block User'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D0D5DD',
    marginBottom: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0C295C',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  avatarImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  avatarInitial: {
    fontSize: 28,
    fontFamily: 'Rubik-SemiBold',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 20,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
    color: '#90A4AE',
  },
  divider: {
    height: 1,
    backgroundColor: '#E8F2FF',
    marginBottom: 8,
  },
  actions: {
    paddingVertical: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  actionText: {
    fontSize: 16,
    fontFamily: 'Manrope-Medium',
    color: '#FF6B35',
    marginLeft: 12,
  },
  closeButton: {
    marginTop: 8,
    backgroundColor: '#F0F2F5',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
  },
});
