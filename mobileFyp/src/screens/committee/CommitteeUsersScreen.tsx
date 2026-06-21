import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { EmptyState } from '../../components/portal/EmptyState';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import {
  fetchPendingRegistrations,
  updatePendingRegistrationStatus,
  type PendingRegistrationUser,
} from '../../services/committeeService';

const roleColors: Record<string, string> = {
  TEACHER: '#2563eb',
  STUDENT: '#16a34a',
};

function formatRole(role: string) {
  return role.replace(/_/g, ' ');
}

function formatDate(dateValue?: string) {
  if (!dateValue) {
    return 'N/A';
  }
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleDateString();
}

function UserCard({
  user,
  busy,
  onApprove,
  onReject,
}: {
  user: PendingRegistrationUser;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const faculty =
    user.studentProfile?.faculty || user.teacherProfile?.faculty || 'N/A';
  const gpa =
    typeof user.gpa === 'number'
      ? user.gpa.toFixed(2)
      : user.studentProfile?.cgpa?.toFixed(2) || 'N/A';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle}>{user.name}</Text>
          <Text style={styles.cardEmail}>{user.email}</Text>
        </View>
        <View
          style={[
            styles.roleBadge,
            { backgroundColor: `${roleColors[user.role] || '#6b7280'}20` },
          ]}>
          <Text
            style={[
              styles.roleBadgeText,
              { color: roleColors[user.role] || '#6b7280' },
            ]}>
            {formatRole(user.role)}
          </Text>
        </View>
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Faculty</Text>
          <Text style={styles.metaValue}>{faculty}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Department</Text>
          <Text style={styles.metaValue}>{user.department || 'N/A'}</Text>
        </View>
        {user.role === 'STUDENT' ? (
          <>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Roll No.</Text>
              <Text style={styles.metaValue}>{user.rollNumber || 'N/A'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>CGPA</Text>
              <Text style={styles.metaValue}>{gpa}</Text>
            </View>
          </>
        ) : null}
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Registered</Text>
          <Text style={styles.metaValue}>{formatDate(user.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.rejectBtn, busy && styles.btnDisabled]}
          disabled={busy}
          onPress={onReject}>
          <FeatherIcon name="x" size={16} color="#dc2626" />
          <Text style={styles.rejectBtnText}>Reject</Text>
        </Pressable>
        <Pressable
          style={[styles.approveBtn, busy && styles.btnDisabled]}
          disabled={busy}
          onPress={onApprove}>
          {busy ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <FeatherIcon name="check" size={16} color="#fff" />
              <Text style={styles.approveBtnText}>Approve</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export function CommitteeUsersScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [users, setUsers] = useState<PendingRegistrationUser[]>([]);
  const [accessDenied, setAccessDenied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'STUDENT' | 'TEACHER'>(
    'ALL',
  );

  const loadData = useCallback(async () => {
    try {
      setAccessDenied(false);
      const data = await fetchPendingRegistrations();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setAccessDenied(true);
      } else {
        Alert.alert(
          'Load failed',
          'Could not load pending registrations. Check your connection and try again.',
        );
      }
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return users.filter(user => {
      const matchesSearch =
        !normalizedSearch ||
        user.name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch);
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [roleFilter, searchQuery, users]);

  const handleReview = async (userId: string, action: 'approve' | 'reject') => {
    setActionLoadingId(userId);
    try {
      await updatePendingRegistrationStatus(userId, action);
      await loadData();
      Alert.alert(
        'Success',
        `Registration ${action === 'approve' ? 'approved' : 'rejected'} successfully.`,
      );
    } catch {
      Alert.alert('Action failed', 'Unable to update registration status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const confirmReview = (
    user: PendingRegistrationUser,
    action: 'approve' | 'reject',
  ) => {
    Alert.alert(
      action === 'approve' ? 'Approve Registration' : 'Reject Registration',
      `${action === 'approve' ? 'Approve' : 'Reject'} ${user.name}'s registration?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'approve' ? 'Approve' : 'Reject',
          style: action === 'approve' ? 'default' : 'destructive',
          onPress: () => handleReview(user.id, action),
        },
      ],
    );
  };

  if (loading) {
    return <LoadingView message="Loading pending registrations..." />;
  }

  return (
    <PortalScreenLayout
      title="User Approvals"
      subtitle="Review pending student and teacher registrations"
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}
      refreshing={refreshing}>
      <View style={styles.searchWrap}>
        <FeatherIcon name="search" size={16} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name or email"
          placeholderTextColor="#9ca3af"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}>
        {(['ALL', 'STUDENT', 'TEACHER'] as const).map(option => (
          <Pressable
            key={option}
            style={[
              styles.filterChip,
              roleFilter === option && styles.filterChipActive,
            ]}
            onPress={() => setRoleFilter(option)}>
            <Text
              style={[
                styles.filterChipText,
                roleFilter === option && styles.filterChipTextActive,
              ]}>
              {option === 'ALL' ? 'All' : formatRole(option)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {accessDenied ? (
        <EmptyState
          title="Access restricted"
          message="Only committee heads and committee members can approve student and teacher registrations."
        />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          title="No pending registrations"
          message="Student and teacher registrations awaiting approval will appear here."
        />
      ) : (
        filteredUsers.map(user => (
          <UserCard
            key={user.id}
            user={user}
            busy={actionLoadingId === user.id}
            onApprove={() => confirmReview(user, 'approve')}
            onReject={() => confirmReview(user, 'reject')}
          />
        ))
      )}
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#111827',
  },
  filterRow: {
    gap: 8,
    paddingBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  filterChipActive: {
    backgroundColor: '#dcfce7',
  },
  filterChipText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#16a34a',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  cardTitleWrap: { flex: 1 },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  cardEmail: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  metaItem: {
    width: '47%',
  },
  metaLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 10,
  },
  approveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  rejectBtnText: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 13,
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
