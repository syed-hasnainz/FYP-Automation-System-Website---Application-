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

export type DepartmentOption = {
  label: string;
  value: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: DepartmentOption[];
  disabled?: boolean;
  placeholder?: string;
};

export function DepartmentDropdown({
  value,
  onChange,
  options,
  disabled,
  placeholder = 'Select department',
}: Props) {
  const [open, setOpen] = useState(false);
  const selected = options.find(d => d.value === value);

  const handleSelect = (department: string) => {
    onChange(department);
    setOpen(false);
  };

  const isDisabled = disabled || options.length === 0;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Department *</Text>
      <Pressable
        style={[styles.trigger, isDisabled && styles.triggerDisabled]}
        onPress={() => !isDisabled && setOpen(true)}
        disabled={isDisabled}>
        <Text
          style={[styles.triggerText, !selected && styles.triggerPlaceholder]}>
          {selected?.label ??
            (options.length === 0
              ? 'Select a faculty first'
              : placeholder)}
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
            <Text style={styles.sheetTitle}>Select Department</Text>
            <ScrollView style={styles.scroll}>
              {options.map(dept => (
                <Pressable
                  key={dept.value}
                  style={[
                    styles.option,
                    dept.value === value && styles.optionSelected,
                  ]}
                  onPress={() => handleSelect(dept.value)}>
                  <Text
                    style={[
                      styles.optionText,
                      dept.value === value && styles.optionTextSelected,
                    ]}>
                    {dept.label}
                  </Text>
                  {dept.value === value ? (
                    <Icon name="check" size={18} color="#16a34a" />
                  ) : null}
                </Pressable>
              ))}
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
