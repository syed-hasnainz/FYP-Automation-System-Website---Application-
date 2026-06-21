import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

export type FacultyOption = {
  id: string;
  name: string;
  departments?: string | null;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  faculties: FacultyOption[];
  disabled?: boolean;
};

export function FacultyDropdown({
  value,
  onChange,
  faculties,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = faculties.find(
    faculty => faculty.name === value || faculty.id === value,
  );

  const handleSelect = (facultyName: string) => {
    onChange(facultyName);
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Faculty *</Text>
      <Pressable
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}>
        <Text
          style={[styles.triggerText, !selected && styles.triggerPlaceholder]}>
          {selected?.name ?? 'Select faculty'}
        </Text>
        <Icon name="chevron-down" size={18} color="#6b7280" />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Select Faculty</Text>
            <ScrollView style={styles.scroll}>
              {faculties.length === 0 ? (
                <Text style={styles.emptyText}>
                  No faculties available. Please contact the administrator.
                </Text>
              ) : (
                faculties.map(faculty => (
                  <Pressable
                    key={faculty.id}
                    style={[
                      styles.option,
                      faculty.name === value && styles.optionSelected,
                    ]}
                    onPress={() => handleSelect(faculty.name)}>
                    <Text
                      style={[
                        styles.optionText,
                        faculty.name === value && styles.optionTextSelected,
                      ]}>
                      {faculty.name}
                    </Text>
                    {faculty.name === value ? (
                      <Icon name="check" size={18} color="#16a34a" />
                    ) : null}
                  </Pressable>
                ))
              )}
            </ScrollView>
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
    flex: 1,
  },
  triggerPlaceholder: {
    color: '#9ca3af',
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
    maxHeight: '70%',
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
  scroll: {
    maxHeight: 320,
  },
  emptyText: {
    padding: 16,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
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
  optionText: { fontSize: 15, color: '#374151', flex: 1 },
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

export function parseDepartments(departments?: string | null): string[] {
  if (!departments?.trim()) {
    return [];
  }
  return departments
    .split(',')
    .map(dept => dept.trim())
    .filter(Boolean);
}
