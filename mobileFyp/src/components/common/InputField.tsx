import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

type Props = TextInputProps & {
  label: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

export function InputField({
  label,
  leftIcon,
  rightIcon,
  style,
  ...rest
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}
        <TextInput
          style={[
            styles.input,
            leftIcon ? styles.inputPadLeft : null,
            rightIcon ? styles.inputPadRight : null,
            style,
          ]}
          placeholderTextColor="#9ca3af"
          {...rest}
        />
        {rightIcon ? <View style={styles.iconRight}>{rightIcon}</View> : null}
      </View>
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
  inputRow: { position: 'relative', justifyContent: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  inputPadLeft: { paddingLeft: 36 },
  inputPadRight: { paddingRight: 36 },
  iconLeft: { position: 'absolute', left: 10, zIndex: 1 },
  iconRight: { position: 'absolute', right: 10, zIndex: 1 },
});
