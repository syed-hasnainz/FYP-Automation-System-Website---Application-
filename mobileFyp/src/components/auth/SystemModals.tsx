import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type ModalProps = {
  visible: boolean;
  onClose: () => void;
};

export function MaintenanceModal({ visible, onClose }: ModalProps) {
  return (
    <CenteredModal visible={visible} onRequestClose={onClose}>
      <View style={[styles.iconCircle, styles.yellowBg]}>
        <Text style={styles.iconText}>!</Text>
      </View>
      <Text style={styles.title}>System Under Maintenance</Text>
      <Text style={styles.body}>
        The portal is currently under maintenance. Please try again later.
      </Text>
      <Pressable style={[styles.btn, styles.yellowBtn]} onPress={onClose}>
        <Text style={styles.btnText}>OK</Text>
      </Pressable>
    </CenteredModal>
  );
}

export function RegistrationDisabledModal({ visible, onClose }: ModalProps) {
  return (
    <CenteredModal visible={visible} onRequestClose={onClose}>
      <View style={[styles.iconCircle, styles.redBg]}>
        <Text style={[styles.iconText, styles.redIcon]}>×</Text>
      </View>
      <Text style={styles.title}>Registration Disabled</Text>
      <Text style={styles.body}>
        New user registration is currently disabled. Please contact the
        administrator.
      </Text>
      <Pressable style={[styles.btn, styles.redBtn]} onPress={onClose}>
        <Text style={styles.btnText}>OK</Text>
      </Pressable>
    </CenteredModal>
  );
}

function CenteredModal({
  visible,
  onRequestClose,
  children,
}: {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>{children}</View>
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
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  yellowBg: { backgroundColor: '#fef9c3' },
  redBg: { backgroundColor: '#fee2e2' },
  iconText: { fontSize: 24, fontWeight: '700', color: '#ca8a04' },
  redIcon: { color: '#dc2626' },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  btn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  yellowBtn: { backgroundColor: '#ca8a04' },
  redBtn: { backgroundColor: '#dc2626' },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
