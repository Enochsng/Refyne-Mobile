import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabaseClient';

const { width } = Dimensions.get('window');

export default function ChangePasswordModal({ visible, onClose }) {
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      setNewPassword('');
      setIsSaving(false);
    }
  }, [visible]);

  const handleClose = () => {
    if (isSaving) return;
    setNewPassword('');
    onClose();
  };

  const handleConfirm = async () => {
    const password = newPassword.trim();

    if (!password) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.log('Error updating password:', error);
        Alert.alert('Error', error.message || 'Failed to update password. Please try again.');
        return;
      }

      setNewPassword('');
      onClose();
      Alert.alert('Success', 'Password updated successfully!');
    } catch (error) {
      console.log('Error updating password:', error);
      Alert.alert('Error', 'Failed to update password. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              disabled={isSaving}
            >
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Enter your new password:</Text>
            <TextInput
              style={styles.passwordInput}
              placeholder="New password"
              placeholderTextColor="#90A4AE"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus={true}
              editable={!isSaving}
              returnKeyType="done"
              onSubmitEditing={handleConfirm}
            />
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={handleClose}
              disabled={isSaving}
            >
              <Text style={styles.cancelModalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmModalButton, isSaving && styles.confirmModalButtonDisabled]}
              onPress={handleConfirm}
              disabled={isSaving}
            >
              <LinearGradient
                colors={['#0C295C', '#1A4A7A']}
                style={styles.confirmModalButtonGradient}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text
                    style={styles.confirmModalButtonText}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                  >
                    Confirm new password
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  passwordInput: {
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
    justifyContent: 'center',
  },
  cancelModalButtonText: {
    fontSize: width * 0.04,
    fontFamily: 'Manrope-SemiBold',
    color: '#64748B',
  },
  confirmModalButton: {
    flex: 1.6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  confirmModalButtonDisabled: {
    opacity: 0.7,
  },
  confirmModalButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  confirmModalButtonText: {
    fontSize: width * 0.035,
    fontFamily: 'Manrope-SemiBold',
    color: 'white',
    textAlign: 'center',
    lineHeight: width * 0.045,
  },
});
