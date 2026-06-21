import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';

export function AdminDatabaseBackupScreen() {
  return (
    <PortalScreenLayout title="Database Backup" subtitle="Secure your data">
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <FeatherIcon name="database" size={20} color="#f97316" />
        </View>
        <Text style={styles.title}>Backup Center</Text>
        <Text style={styles.text}>
          Backup management will be connected to backend jobs. This screen is now linked from
          Admin Overview Quick Actions.
        </Text>
      </View>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff7ed',
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  text: {
    marginTop: 8,
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 20,
  },
});
