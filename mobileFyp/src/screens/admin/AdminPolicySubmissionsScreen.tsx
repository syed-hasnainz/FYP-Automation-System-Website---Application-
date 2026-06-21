import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { usePortalNavigation } from '../../components/portal/portalNavigation';

export function AdminPolicySubmissionsScreen() {
  const { navigateTo } = usePortalNavigation();

  return (
    <PortalScreenLayout
      title="Policy & Submissions"
      subtitle="Review proof submissions and manage policies">
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Policy & Submissions</Text>
        <Text style={styles.cardDesc}>
          Review proof submissions and manage the policies students must acknowledge.
        </Text>

        <Pressable
          style={styles.primaryBtn}
          onPress={() => navigateTo('AdminSubmissions')}>
          <FeatherIcon name="file-text" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Open Submissions</Text>
        </Pressable>

        <Pressable
          style={styles.outlineBtn}
          onPress={() => navigateTo('Settings', { settingsTab: 'policies' })}>
          <FeatherIcon name="settings" size={18} color="#111827" />
          <Text style={styles.outlineBtnText}>Manage Policies</Text>
        </Pressable>

        <Text style={styles.note}>
          Submissions open the detailed view for policy acknowledgments and proof review.
          Policy configuration lives under the Settings → Policies tab.
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
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 8 },
  cardDesc: { fontSize: 14, color: '#6b7280', lineHeight: 21, marginBottom: 16 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 10,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 14,
  },
  outlineBtnText: { color: '#111827', fontWeight: '700', fontSize: 14 },
  note: { fontSize: 13, color: '#6b7280', lineHeight: 20 },
});
