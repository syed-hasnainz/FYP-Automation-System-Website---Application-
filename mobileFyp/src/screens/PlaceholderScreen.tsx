import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { clearAuthSession } from '../utils/storage';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, keyof RootStackParamList>;

const TITLES: Record<string, string> = {
  SuperAdmin: 'Super Admin Dashboard',
  CommitteeHead: 'Committee Head Dashboard',
  Teacher: 'Teacher Dashboard',
  Student: 'Student Dashboard',
};

export function PlaceholderScreen({ navigation, route }: Props) {
  const title = TITLES[route.name] ?? 'Dashboard';

  const logout = async () => {
    await clearAuthSession();
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>
        Screen placeholder — convert role dashboards next.
      </Text>
      <Pressable style={styles.btn} onPress={logout}>
        <Text style={styles.btnText}>Logout</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  btn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
