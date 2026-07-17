import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reportUser } from '../../services/safetyService';

const REPORT_REASONS = [
  { key: 'harassment_bullying', label: 'Harassment / Bullying' },
  { key: 'impersonation', label: 'Impersonation' },
  { key: 'inappropriate_sexual_content', label: 'Inappropriate sexual content' },
  { key: 'hate_speech', label: 'Hate speech' },
  { key: 'spam_scam', label: 'Spam / Scam' },
  { key: 'threats_of_violence', label: 'Threats of violence' },
  { key: 'other', label: 'Other' },
];

export default function ReportReasonScreen({ navigation, route }) {
  const { reportedUserId, conversationId, messageId, otherPartyName } = route.params || {};
  const [selectedReason, setSelectedReason] = useState(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (reasonKey) => {
    if (!reportedUserId) {
      Alert.alert('Error', 'Unable to report this user. Please try again.');
      return;
    }

    if (reasonKey === 'other' && !details.trim()) {
      Alert.alert('Details required', 'Please describe the issue before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      await reportUser({
        reportedUserId,
        reason: reasonKey,
        conversationId,
        messageId,
        details: reasonKey === 'other' ? details.trim() : undefined,
      });
      Alert.alert(
        'Report Submitted',
        'Thanks for letting us know. We will review this report.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error?.message || 'Failed to submit report. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#0C295C" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.title}>Report User</Text>
          {otherPartyName ? (
            <Text style={styles.subtitle}>Reporting {otherPartyName}</Text>
          ) : null}
        </View>
      </View>

      <Text style={styles.prompt}>Why are you reporting this user?</Text>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      >
        {REPORT_REASONS.map((reason) => {
          const isSelected = selectedReason === reason.key;
          return (
            <TouchableOpacity
              key={reason.key}
              style={[styles.reasonRow, isSelected && styles.reasonRowSelected]}
              onPress={() => setSelectedReason(reason.key)}
              disabled={submitting}
              activeOpacity={0.7}
            >
              <Text style={styles.reasonLabel}>{reason.label}</Text>
              <Ionicons
                name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={isSelected ? '#0C295C' : '#90A4AE'}
              />
            </TouchableOpacity>
          );
        })}

        {selectedReason === 'other' ? (
          <View style={styles.detailsSection}>
            <Text style={styles.detailsLabel}>Please describe the issue</Text>
            <TextInput
              style={styles.detailsInput}
              value={details}
              onChangeText={setDetails}
              placeholder="Add details..."
              placeholderTextColor="#90A4AE"
              multiline
              maxLength={500}
              editable={!submitting}
            />
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.submitFooter}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!selectedReason || submitting) && styles.submitButtonDisabled,
          ]}
          onPress={() => handleSubmit(selectedReason)}
          disabled={!selectedReason || submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#F8FAFF',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Rubik-SemiBold',
    color: '#0C295C',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Manrope-Regular',
    color: '#90A4AE',
    marginTop: 2,
  },
  prompt: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    fontSize: 16,
    fontFamily: 'Manrope-Medium',
    color: '#0C295C',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E8F2FF',
  },
  reasonRowSelected: {
    borderColor: '#0C295C',
  },
  reasonLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Manrope-Medium',
    color: '#0C295C',
    marginRight: 12,
  },
  detailsSection: {
    marginTop: 8,
  },
  detailsLabel: {
    fontSize: 14,
    fontFamily: 'Manrope-Medium',
    color: '#0C295C',
    marginBottom: 8,
  },
  detailsInput: {
    minHeight: 100,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8F2FF',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 15,
    fontFamily: 'Manrope-Regular',
    color: '#0C295C',
    textAlignVertical: 'top',
  },
  submitFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: '#F8FAFF',
  },
  submitButton: {
    backgroundColor: '#0C295C',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Rubik-SemiBold',
    color: '#FFFFFF',
  },
});
