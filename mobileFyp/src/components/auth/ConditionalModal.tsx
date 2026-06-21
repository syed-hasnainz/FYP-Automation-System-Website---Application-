import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { RegisterResponse } from '../../types/auth';

type Props = {
  visible: boolean;
  registrationResult: RegisterResponse | null;
  onClose: () => void;
  onSubmit: (data: {
    unpassedCourses?: string;
    conditionalCommitment: string;
  }) => Promise<void>;
};

export function ConditionalModal({
  visible,
  registrationResult,
  onClose,
  onSubmit,
}: Props) {
  const [unpassedCourses, setUnpassedCourses] = useState('');
  const [conditionalCommitment, setConditionalCommitment] = useState('');
  const [loading, setLoading] = useState(false);

  const needsUnpassed =
    registrationResult && !registrationResult.prerequisitesPassed;

  const handleSubmit = async () => {
    if (needsUnpassed && !unpassedCourses.trim()) return;
    if (!conditionalCommitment.trim()) return;

    setLoading(true);
    try {
      await onSubmit({
        unpassedCourses: needsUnpassed ? unpassedCourses.trim() : undefined,
        conditionalCommitment: conditionalCommitment.trim(),
      });
      setUnpassedCourses('');
      setConditionalCommitment('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <View style={styles.iconCircle}>
                <Text style={styles.iconText}>!</Text>
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>Conditional Registration</Text>
                <Text style={styles.subtitle}>Additional information required</Text>
              </View>
            </View>

            <View style={styles.alertBox}>
              <Text style={styles.alertText}>
                Based on your eligibility assessment, your registration is{' '}
                <Text style={styles.bold}>conditional</Text>. This means you
                need to complete certain requirements before full approval.
              </Text>
            </View>

            {registrationResult && (
              <View style={styles.warnings}>
                {(registrationResult.cgpa ?? 0) < 2.5 && (
                  <Text style={styles.warningLine}>
                    ⚠ Your CGPA ({registrationResult.cgpa}) is below the minimum
                    requirement of 2.5
                  </Text>
                )}
                {!registrationResult.prerequisitesPassed && (
                  <Text style={styles.warningLine}>
                    ⚠ You have not completed all prerequisite courses
                  </Text>
                )}
              </View>
            )}

            {needsUnpassed && (
              <View style={styles.field}>
                <Text style={styles.label}>
                  List Unpassed Prerequisite Courses *
                </Text>
                <TextInput
                  style={[styles.textArea, styles.input]}
                  multiline
                  numberOfLines={3}
                  placeholder="e.g., Database Systems, Software Engineering"
                  value={unpassedCourses}
                  onChangeText={setUnpassedCourses}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Commitment Statement *</Text>
              <TextInput
                style={[styles.textArea, styles.input]}
                multiline
                numberOfLines={4}
                placeholder="I commit to completing all missing prerequisites..."
                value={conditionalCommitment}
                onChangeText={setConditionalCommitment}
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.hint}>
                Please write your commitment to complete requirements during the
                summer semester
              </Text>
            </View>

            <View style={styles.actions}>
              <Pressable
                style={[styles.btn, styles.primaryBtn]}
                onPress={handleSubmit}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Submit & Complete Registration</Text>
                )}
              </Pressable>
              <Pressable
                style={[styles.btn, styles.outlineBtn]}
                onPress={onClose}
                disabled={loading}>
                <Text style={styles.outlineText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef9c3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: { fontSize: 22, fontWeight: '700', color: '#ca8a04' },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  alertBox: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde047',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  alertText: { fontSize: 13, color: '#374151' },
  bold: { fontWeight: '700' },
  warnings: { marginBottom: 12 },
  warningLine: { fontSize: 13, color: '#374151', marginBottom: 6 },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
  },
  textArea: { minHeight: 80 },
  hint: { fontSize: 11, color: '#6b7280', marginTop: 4 },
  actions: { gap: 10, marginTop: 8 },
  btn: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryBtn: { backgroundColor: '#16a34a' },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  outlineText: { color: '#374151', fontWeight: '500', fontSize: 15 },
});
