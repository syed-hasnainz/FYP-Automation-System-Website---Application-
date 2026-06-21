import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

export type RoleValue = 'STUDENT' | 'TEACHER' | 'COMMITTEE_HEAD';

const ROLES: { label: string; value: RoleValue }[] = [
  { label: 'Student', value: 'STUDENT' },
  { label: 'Teacher', value: 'TEACHER' },
  { label: 'Committee Head', value: 'COMMITTEE_HEAD' },
];

type Props = {
  value: RoleValue;
  onChange: (value: RoleValue) => void;
  disabled?: boolean;
};

export function RoleDropdown({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const selected = ROLES.find(r => r.value === value) ?? ROLES[0];

  const handleSelect = (role: RoleValue) => {
    onChange(role);
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Role</Text>
      <Pressable
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}>
        <Text style={styles.triggerText}>{selected.label}</Text>
        <Icon name="chevron-down" size={18} color="#6b7280" />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select Role</Text>
            {ROLES.map(role => (
              <Pressable
                key={role.value}
                style={[
                  styles.option,
                  role.value === value && styles.optionSelected,
                ]}
                onPress={() => handleSelect(role.value)}>
                <Text
                  style={[
                    styles.optionText,
                    role.value === value && styles.optionTextSelected,
                  ]}>
                  {role.label}
                </Text>
                {role.value === value ? (
                  <Icon name="check" size={18} color="#16a34a" />
                ) : null}
              </Pressable>
            ))}
            <Pressable style={styles.cancelBtn} onPress={() => setOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 10 },
  label: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
    fontWeight: '500',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    backgroundColor: '#fff',
  },
  triggerDisabled: { opacity: 0.6 },
  triggerText: {
    fontSize: 14,
    color: '#111827',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  sheet: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 8,
    overflow: 'hidden',
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  optionSelected: { backgroundColor: '#f0fdf4' },
  optionText: { fontSize: 15, color: '#374151' },
  optionTextSelected: { color: '#16a34a', fontWeight: '600' },
  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '500',
  },
});
