import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../components/portal/EmptyState';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { approveGroup, fetchGroups, type AdminGroup } from '../../services/adminService';

type GroupStatusFilter = 'pending' | 'approved' | 'all';

const STATUS_TABS: Array<{ value: GroupStatusFilter; label: string }> = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'all', label: 'All' },
];

function getGroupStatusLabel(group: AdminGroup) {
  if (group.isApproved) {
    return 'Approved';
  }
  return 'Pending approval';
}

export function AdminGroupsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [statusFilter, setStatusFilter] = useState<GroupStatusFilter>('pending');
  const [actionId, setActionId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchGroups(statusFilter);
      setGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      setGroups([]);
      Alert.alert(
        'Load failed',
        error instanceof Error
          ? error.message
          : 'Could not load groups. Check your connection and try again.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const handleApprove = async (groupId: string) => {
    setActionId(groupId);
    try {
      await approveGroup(groupId);
      await loadData();
    } finally {
      setActionId(null);
    }
  };

  const emptyTitle =
    statusFilter === 'pending'
      ? 'No pending groups'
      : statusFilter === 'approved'
        ? 'No approved groups'
        : 'No groups found';

  const emptyMessage =
    statusFilter === 'pending'
      ? 'All groups are reviewed.'
      : statusFilter === 'approved'
        ? 'Approved groups will appear here.'
        : 'No active groups in the system.';

  if (loading) {
    return <LoadingView message="Loading groups..." />;
  }

  return (
    <PortalScreenLayout
      title="Group Approvals"
      subtitle="Review and track student groups"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
      <View style={styles.tabRow}>
        {STATUS_TABS.map((tab) => {
          const active = statusFilter === tab.value;
          return (
            <Pressable
              key={tab.value}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setStatusFilter(tab.value)}>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {groups.length === 0 ? (
        <EmptyState title={emptyTitle} message={emptyMessage} />
      ) : (
        groups.map((group) => (
          <View key={group.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>{group.name}</Text>
              <View
                style={[
                  styles.statusBadge,
                  group.isApproved ? styles.statusApproved : styles.statusPending,
                ]}>
                <Text
                  style={[
                    styles.statusBadgeText,
                    group.isApproved ? styles.statusApprovedText : styles.statusPendingText,
                  ]}>
                  {getGroupStatusLabel(group)}
                </Text>
              </View>
            </View>
            <Text style={styles.meta}>
              {group.members?.length ?? 0} member(s)
              {group.approver?.name ? ` · Approved by ${group.approver.name}` : ''}
            </Text>
            {(group.members ?? []).slice(0, 4).map((m, i) => (
              <Text key={i} style={styles.member}>
                • {m.user?.name ?? 'Member'}
              </Text>
            ))}
            {!group.isApproved ? (
              <Pressable
                style={styles.btn}
                disabled={actionId === group.id}
                onPress={() => handleApprove(group.id)}>
                <Text style={styles.btnText}>
                  {actionId === group.id ? 'Approving...' : 'Approve Group'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ))
      )}
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  tabTextActive: {
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusPending: {
    backgroundColor: '#fef3c7',
  },
  statusApproved: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusPendingText: {
    color: '#92400e',
  },
  statusApprovedText: {
    color: '#166534',
  },
  meta: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  member: { fontSize: 13, color: '#4b5563', marginBottom: 2 },
  btn: {
    marginTop: 12,
    backgroundColor: '#16a34a',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
});
