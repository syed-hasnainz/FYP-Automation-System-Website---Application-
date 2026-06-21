import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../components/portal/EmptyState';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { fetchCommittees } from '../../services/adminService';

type CommitteeItem = {
  id: string;
  name: string;
};

export function AdminCommitteesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [committees, setCommittees] = useState<CommitteeItem[]>([]);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchCommittees();
      setCommittees(Array.isArray(data) ? data : []);
    } catch {
      setCommittees([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <LoadingView message="Loading committees..." />;
  }

  return (
    <PortalScreenLayout
      title="Committees"
      subtitle="Configure committees"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
      {committees.length === 0 ? (
        <EmptyState title="No committees" message="No committees available in the system." />
      ) : (
        committees.map((committee) => (
          <View key={committee.id} style={styles.card}>
            <Text style={styles.name}>{committee.name}</Text>
            <Text style={styles.meta}>Committee ID: {committee.id}</Text>
          </View>
        ))
      )}
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  meta: { marginTop: 6, fontSize: 12, color: '#6b7280' },
});
