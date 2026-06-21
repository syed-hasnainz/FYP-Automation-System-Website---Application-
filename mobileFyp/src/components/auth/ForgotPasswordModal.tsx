import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { InputField } from '../common/InputField';

type Props = {
  visible: boolean;
  step: 'email' | 'code';
  email: string;
  verificationCode: string;
  newPassword: string;
  confirmPassword: string;
  loading: boolean;
  onEmailChange: (v: string) => void;
  onCodeChange: (v: string) => void;
  onNewPasswordChange: (v: string) => void;
  onConfirmPasswordChange: (v: string) => void;
  onClose: () => void;
  onBack: () => void;
  onSubmit: () => void;
};

export function ForgotPasswordModal({
  visible,
  step,
  email,
  verificationCode,
  newPassword,
  confirmPassword,
  loading,
  onEmailChange,
  onCodeChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onClose,
  onBack,
  onSubmit,
}: Props) {
  const canSubmitEmail = !!email.trim();
  const canSubmitReset =
    !!verificationCode.trim() &&
    !!newPassword.trim() &&
    !!confirmPassword.trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.desc}>
            {step === 'email'
              ? "Enter your email address and we'll send you a verification code."
              : 'Enter the verification code sent to your email and your new password.'}
          </Text>

          {step === 'email' ? (
            <InputField
              label="Email Address"
              value={email}
              onChangeText={onEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Enter your email"
              editable={!loading}
            />
          ) : (
            <>
              <InputField
                label="Verification Code"
                value={verificationCode}
                onChangeText={onCodeChange}
                placeholder="Enter 6-digit code"
                maxLength={6}
                editable={!loading}
              />
              <InputField
                label="New Password"
                value={newPassword}
                onChangeText={onNewPasswordChange}
                secureTextEntry
                placeholder="Enter new password (min 8 characters)"
                editable={!loading}
              />
              <InputField
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={onConfirmPasswordChange}
                secureTextEntry
                placeholder="Confirm new password"
                editable={!loading}
              />
            </>
          )}

          <View style={styles.footer}>
            {step === 'code' && (
              <Pressable
                style={[styles.footerBtn, styles.outline]}
                onPress={onBack}
                disabled={loading}>
                <Text style={styles.outlineText}>Back</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.footerBtn, styles.outline]}
              onPress={onClose}
              disabled={loading}>
              <Text style={styles.outlineText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.footerBtn, styles.primary]}
              onPress={onSubmit}
              disabled={
                loading ||
                (step === 'email' ? !canSubmitEmail : !canSubmitReset)
              }>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryText}>
                  {step === 'email' ? 'Send Code' : 'Reset Password'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  desc: { fontSize: 14, color: '#6b7280', marginBottom: 16 },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  footerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  outline: {
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  primary: { backgroundColor: '#16a34a', flex: 1 },
  outlineText: { color: '#374151', fontWeight: '500' },
  primaryText: { color: '#fff', fontWeight: '600' },
});
