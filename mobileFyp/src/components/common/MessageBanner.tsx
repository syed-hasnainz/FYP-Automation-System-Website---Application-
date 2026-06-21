import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  message: string;
  type: 'success' | 'error';
};

export function MessageBanner({ message, type }: Props) {
  if (!message) return null;
  return (
    <View
      style={[
        styles.banner,
        type === 'success' ? styles.success : styles.error,
      ]}>
      <Text
        style={[
          styles.text,
          type === 'success' ? styles.successText : styles.errorText,
        ]}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginBottom: 8,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  success: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  error: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
  },
  text: {
    fontSize: 12,
    textAlign: 'center',
  },
  successText: { color: '#166534' },
  errorText: { color: '#991b1b' },
});
