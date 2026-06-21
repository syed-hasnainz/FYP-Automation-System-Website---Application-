import React, { useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

type Props = {
  tags: string[];
  onChangeTags: (tags: string[]) => void;
  placeholder?: string;
  label?: string;
  hint?: string;
  maxTags?: number;
  disabled?: boolean;
};

function normalizeTag(value: string) {
  return value.trim().replace(/,+$/, '').trim();
}

export function TagInput({
  tags,
  onChangeTags,
  placeholder = 'Type and press enter',
  label = 'Departments *',
  hint = 'Press enter or add a comma after each department',
  maxTags = 20,
  disabled = false,
}: Props) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<TextInput>(null);

  const addTag = (raw: string) => {
    const value = normalizeTag(raw);
    if (!value) return;

    const exists = tags.some(
      tag => tag.toLowerCase() === value.toLowerCase(),
    );
    if (exists || tags.length >= maxTags) return;

    onChangeTags([...tags, value]);
    setInputValue('');
  };

  const removeTag = (index: number) => {
    onChangeTags(tags.filter((_, i) => i !== index));
  };

  const handleChangeText = (text: string) => {
    if (text.includes(',')) {
      const parts = text.split(',');
      parts.slice(0, -1).forEach(part => addTag(part));
      setInputValue(normalizeTag(parts[parts.length - 1] ?? ''));
      return;
    }
    setInputValue(text);
  };

  const handleSubmit = () => {
    addTag(inputValue);
  };

  const remaining = maxTags - tags.length;

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}

      <Pressable
        style={[styles.container, disabled && styles.containerDisabled]}
        onPress={() => inputRef.current?.focus()}
        disabled={disabled}>
        <View style={styles.tagsRow}>
          {tags.map((tag, index) => (
            <View key={`${tag}-${index}`} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
              {!disabled ? (
                <Pressable
                  hitSlop={8}
                  onPress={() => removeTag(index)}
                  style={styles.tagRemove}>
                  <Icon name="x" size={12} color="#6b7280" />
                </Pressable>
              ) : null}
            </View>
          ))}
          {!disabled && tags.length < maxTags ? (
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={inputValue}
              onChangeText={handleChangeText}
              onSubmitEditing={handleSubmit}
              placeholder={tags.length === 0 ? placeholder : ''}
              placeholderTextColor="#9ca3af"
              blurOnSubmit={false}
              returnKeyType="done"
              onBlur={() => {
                if (inputValue.trim()) addTag(inputValue);
              }}
            />
          ) : null}
        </View>
      </Pressable>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>
          {tags.length === 0
            ? `Add up to ${maxTags} departments`
            : `${remaining} more can be added`}
        </Text>
        {tags.length > 0 && !disabled ? (
          <Pressable onPress={() => onChangeTags([])}>
            <Text style={styles.removeAll}>Remove All</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 10 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  container: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 48,
    backgroundColor: '#fff',
  },
  containerDisabled: { opacity: 0.6 },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 5,
    gap: 4,
  },
  tagText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  tagRemove: {
    width: 18,
    height: 18,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e5e7eb',
  },
  input: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 100,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
  },
  removeAll: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
});

export function tagsToDepartmentsString(tags: string[]) {
  return tags.map(tag => tag.trim()).filter(Boolean).join(', ');
}

export function departmentsStringToTags(departments?: string | null) {
  if (!departments?.trim()) return [];
  return departments
    .split(',')
    .map(dept => dept.trim())
    .filter(Boolean);
}
