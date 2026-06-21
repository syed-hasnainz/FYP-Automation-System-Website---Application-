import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { EmptyState } from '../../components/portal/EmptyState';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import {
  approveGroup,
  fetchCommitteeGroups,
  type CommitteeGroup,
  type CommitteeGroupMember,
} from '../../services/committeeService';

const STATUS_FILTERS = ['pending', 'approved', 'all'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const ACCENT = '#16a34a';

function formatDate(dateValue?: string | null) {
  if (!dateValue) {
    return 'N/A';
  }
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleDateString();
}

function getFilterLabel(filter: StatusFilter) {
  if (filter === 'pending') {
    return 'Pending Approval';
  }
  if (filter === 'approved') {
    return 'Approved';
  }
  return 'All Groups';
}

function getEmptyMessage(filter: StatusFilter) {
  if (filter === 'pending') {
    return 'No groups are pending approval';
  }
  if (filter === 'approved') {
    return 'No groups have been approved yet';
  }
  return 'No active groups in the system';
}

function getApproverRoleLabel(role?: string) {
  if (role === 'ADMIN') {
    return 'Super Admin';
  }
  if (role === 'COMMITTEE_HEAD') {
    return 'Committee Head';
  }
  return role?.replace(/_/g, ' ') || 'Approver';
}

function MemberRow({ member }: { member: CommitteeGroupMember }) {
  const initial = (member.user?.name || 'U').charAt(0).toUpperCase();
  const isLeader = member.role === 'LEADER';

  return (
    <View style={styles.memberRow}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberAvatarText}>{initial}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{member.user?.name || 'Unknown'}</Text>
        <Text style={styles.memberMeta} numberOfLines={1}>
          {[member.user?.rollNumber, member.user?.department].filter(Boolean).join(' • ') ||
            'No details'}
        </Text>
      </View>
      {isLeader ? (
        <View style={styles.leaderBadge}>
          <Text style={styles.leaderBadgeText}>Leader</Text>
        </View>
      ) : null}
    </View>
  );
}

function GroupCard({
  group,
  actionId,
  onApprove,
  onReject,
}: {
  group: CommitteeGroup;
  actionId: string | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isPending = !group.isApproved;
  const isBusy = actionId === group.id;

  return (
    <View style={styles.groupCard}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupName} numberOfLines={2}>
          {group.name}
        </Text>
        <View style={[styles.statusBadge, isPending ? styles.pendingBadge : styles.approvedBadge]}>
          <Text style={[styles.statusBadgeText, isPending ? styles.pendingBadgeText : styles.approvedBadgeText]}>
            {isPending ? 'Pending' : 'Approved'}
          </Text>
        </View>
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Members</Text>
          <Text style={styles.metaValue}>{group.members?.length || 0}/3</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Created</Text>
          <Text style={styles.metaValue}>{formatDate(group.createdAt)}</Text>
        </View>
        {group.isApproved && group.approvedAt ? (
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Approved On</Text>
            <Text style={styles.metaValue}>{formatDate(group.approvedAt)}</Text>
          </View>
        ) : null}
      </View>

      {group.isApproved && group.approver ? (
        <View style={styles.approverBox}>
          <Text style={styles.approverLabel}>Approved By</Text>
          <View style={styles.approverRow}>
            <FeatherIcon name="check-circle" size={16} color={ACCENT} />
            <Text style={styles.approverName} numberOfLines={1}>
              {group.approver.name}
            </Text>
            <View style={styles.approverRoleBadge}>
              <Text style={styles.approverRoleText}>
                {getApproverRoleLabel(group.approver.role)}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      <Text style={styles.membersHeading}>Group Members</Text>
      {(group.members?.length ?? 0) === 0 ? (
        <Text style={styles.noMembersText}>No members listed.</Text>
      ) : (
        group.members?.map((member) => (
          <MemberRow key={member.id || member.user?.id || member.user?.name} member={member} />
        ))
      )}

      {isPending ? (
        <View style={styles.actionsRow}>
          <Pressable
            style={[styles.approveBtn, isBusy && styles.btnDisabled]}
            disabled={isBusy}
            onPress={onApprove}>
            {isBusy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <FeatherIcon name="check-circle" size={16} color="#fff" />
                <Text style={styles.approveBtnText}>Approve</Text>
              </>
            )}
          </Pressable>
          <Pressable
            style={[styles.rejectBtn, isBusy && styles.btnDisabled]}
            disabled={isBusy}
            onPress={onReject}>
            {isBusy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <FeatherIcon name="x-circle" size={16} color="#fff" />
                <Text style={styles.rejectBtnText}>Reject</Text>
              </>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function CommitteeGroupsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groups, setGroups] = useState<CommitteeGroup[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [filterPickerOpen, setFilterPickerOpen] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchCommitteeGroups(statusFilter);
      setGroups(Array.isArray(data) ? data : []);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  React.useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const handleReview = async (groupId: string, approve: boolean) => {
    setActionId(groupId);
    try {
      await approveGroup(groupId, approve);
      await loadData();
      Alert.alert('Success', `Group ${approve ? 'approved' : 'rejected'} successfully.`);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : `Failed to ${approve ? 'approve' : 'reject'} group.`;
      Alert.alert('Error', message);
    } finally {
      setActionId(null);
    }
  };

  const confirmReview = (group: CommitteeGroup, approve: boolean) => {
    const action = approve ? 'approve' : 'reject';
    Alert.alert(
      approve ? 'Approve Group' : 'Reject Group',
      `${approve ? 'Approve' : 'Reject'} "${group.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: approve ? 'Approve' : 'Reject',
          style: approve ? 'default' : 'destructive',
          onPress: () => handleReview(group.id, approve),
        },
      ],
    );
  };

  if (loading) {
    return <LoadingView message="Loading groups..." />;
  }

  return (
    <PortalScreenLayout
      title="Group Approvals"
      subtitle="Review and approve student groups for FYP projects"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle}>Group Approvals</Text>
            <Text style={styles.sectionSub}>
              Review and approve student groups for FYP projects
            </Text>
          </View>
        </View>

        <Pressable style={styles.filterChip} onPress={() => setFilterPickerOpen(true)}>
          <Text style={styles.filterText}>{getFilterLabel(statusFilter)}</Text>
          <FeatherIcon name="chevron-down" size={14} color="#6b7280" />
        </Pressable>

        {groups.length === 0 ? (
          <EmptyState
            icon="users"
            title="No Groups Found"
            message={getEmptyMessage(statusFilter)}
          />
        ) : (
          groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              actionId={actionId}
              onApprove={() => confirmReview(group, true)}
              onReject={() => confirmReview(group, false)}
            />
          ))
        )}
      </View>

      <Modal
        visible={filterPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterPickerOpen(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setFilterPickerOpen(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Filter by status</Text>
            {STATUS_FILTERS.map((option) => (
              <Pressable
                key={option}
                style={styles.pickerOption}
                onPress={() => {
                  setFilterPickerOpen(false);
                  setStatusFilter(option);
                  setLoading(true);
                }}>
                <Text
                  style={[
                    styles.pickerOptionText,
                    statusFilter === option && styles.pickerOptionTextActive,
                  ]}>
                  {getFilterLabel(option)}
                </Text>
                {statusFilter === option ? (
                  <FeatherIcon name="check" size={16} color={ACCENT} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSub: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  filterText: {
    fontSize: 13,
    color: '#374151',
  },
  groupCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 12,
  },
  groupName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pendingBadge: {
    backgroundColor: '#eab308',
  },
  approvedBadge: {
    backgroundColor: ACCENT,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pendingBadgeText: {
    color: '#fff',
  },
  approvedBadgeText: {
    color: '#fff',
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  metaItem: {
    minWidth: '28%',
    flexGrow: 1,
  },
  metaLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  approverBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  approverLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803d',
    marginBottom: 6,
  },
  approverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  approverName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#14532d',
  },
  approverRoleBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  approverRoleText: {
    fontSize: 11,
    color: '#166534',
    fontWeight: '500',
  },
  membersHeading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  noMembersText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  memberMeta: {
    marginTop: 2,
    fontSize: 12,
    color: '#6b7280',
  },
  leaderBadge: {
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  leaderBadgeText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 11,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 11,
  },
  approveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  rejectBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerOptionText: {
    fontSize: 15,
    color: '#374151',
  },
  pickerOptionTextActive: {
    color: ACCENT,
    fontWeight: '600',
  },
});
