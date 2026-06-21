import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { EmptyState } from '../../components/portal/EmptyState';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { SheetModal, sheetStyles } from '../../components/portal/SheetModal';
import { useAuthUser } from '../../hooks/useAuthUser';
import {
  fetchMyCommittee,
  removeCommitteeMember,
  updateCommitteeMember,
  type CommitteeMember,
  type MyCommittee,
} from '../../services/committeeService';
import { getProfileImageUri } from '../../services/profileService';

const ACCENT = '#16a34a';

function formatRole(role?: string) {
  if (!role) {
    return null;
  }
  return role
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
}

function MemberAvatar({ member }: { member: CommitteeMember }) {
  const uri = getProfileImageUri(member.profileImage, member.id);
  const initial = (member.name || 'U').charAt(0).toUpperCase();

  if (uri) {
    return <Image source={{ uri }} style={styles.memberAvatarImage} />;
  }

  return (
    <View style={styles.memberAvatarFallback}>
      <Text style={styles.memberAvatarInitial}>{initial}</Text>
    </View>
  );
}

function DetailLine({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return (
    <View style={styles.detailLine}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function MemberCard({
  member,
  canManage,
  onEdit,
  onRemove,
}: {
  member: CommitteeMember;
  canManage: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const roleLabel = formatRole(member.role);

  return (
    <View style={styles.memberCard}>
      <View style={styles.memberCardTop}>
        <MemberAvatar member={member} />
        <View style={styles.memberMain}>
          <Text style={styles.memberName}>{member.name || 'Unknown'}</Text>
          {member.designation ? (
            <Text style={styles.memberDesignation}>{member.designation}</Text>
          ) : null}
        </View>
        {canManage ? (
          <Pressable style={styles.menuBtn} onPress={() => setMenuOpen(true)}>
            <FeatherIcon name="more-vertical" size={18} color="#6b7280" />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.memberDetails}>
        <DetailLine label="Email" value={member.email} />
        <DetailLine label="Department" value={member.department} />
        <DetailLine label="Employee ID" value={member.employeeId} />
        <DetailLine label="Office Hours" value={member.officeHours} />
        {member.supervisionCapacity != null ? (
          <DetailLine
            label="Supervision Capacity"
            value={`${member.supervisionCapacity} students`}
          />
        ) : null}
        {roleLabel ? (
          <View style={styles.roleRow}>
            <Text style={styles.detailLabel}>Role</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{roleLabel}</Text>
            </View>
          </View>
        ) : null}
      </View>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <View style={styles.menuSheet}>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                onEdit();
              }}>
              <FeatherIcon name="edit-2" size={16} color="#374151" />
              <Text style={styles.menuItemText}>Edit Member</Text>
            </Pressable>
            <Pressable
              style={[styles.menuItem, styles.menuItemDanger]}
              onPress={() => {
                setMenuOpen(false);
                onRemove();
              }}>
              <FeatherIcon name="trash-2" size={16} color="#dc2626" />
              <Text style={[styles.menuItemText, styles.menuItemDangerText]}>Remove Member</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export function CommitteeOrganizationScreen() {
  const { user } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [committee, setCommittee] = useState<MyCommittee | null>(null);
  const [editMember, setEditMember] = useState<CommitteeMember | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    department: '',
    supervisionCapacity: '',
  });

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setCommittee(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await fetchMyCommittee(user.id);
      setCommittee(data);
    } catch {
      setCommittee(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const openEditMember = (member: CommitteeMember) => {
    setEditMember(member);
    setEditForm({
      name: member.name || '',
      email: member.email || '',
      department: member.department || '',
      supervisionCapacity:
        member.supervisionCapacity != null ? String(member.supervisionCapacity) : '',
    });
  };

  const handleSaveMember = async () => {
    if (!editMember?.id) {
      return;
    }
    if (!editForm.name.trim() || !editForm.email.trim()) {
      Alert.alert('Validation', 'Name and email are required.');
      return;
    }

    setSaving(true);
    try {
      await updateCommitteeMember(editMember.id, {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        department: editForm.department.trim() || undefined,
        role: editMember.role,
        supervisionCapacity: editForm.supervisionCapacity
          ? Number.parseInt(editForm.supervisionCapacity, 10)
          : undefined,
      });
      setEditMember(null);
      await loadData();
      Alert.alert('Success', 'Member updated successfully.');
    } catch {
      Alert.alert('Error', 'Failed to update member.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = (member: CommitteeMember) => {
    if (!committee?.id || !member.id) {
      return;
    }
    Alert.alert(
      'Remove Member',
      `Remove ${member.name || 'this member'} from the committee?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeCommitteeMember(committee, member.id!);
              await loadData();
              Alert.alert('Success', 'Member removed.');
            } catch {
              Alert.alert('Error', 'Failed to remove member.');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return <LoadingView message="Loading committee..." />;
  }

  const department =
    committee?.headDetails?.department ||
    committee?.members?.find((member) => member.id === user?.id)?.department ||
    '—';

  return (
    <PortalScreenLayout
      title="Organization"
      subtitle="Manage your committee members (view and edit only)"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>My Committee</Text>
        <Text style={styles.sectionSub}>
          Manage your committee members (view and edit only - cannot create new committees)
        </Text>

        {!committee ? (
          <EmptyState
            icon="home"
            title="No Committee Assigned"
            message="You are not currently assigned as head of any committee."
          />
        ) : (
          <>
            <View style={styles.committeeBanner}>
              <Text style={styles.committeeName}>{committee.name}</Text>
              {committee.description ? (
                <Text style={styles.committeeDescription}>{committee.description}</Text>
              ) : null}
              <View style={styles.committeeMetaRow}>
                <View style={styles.committeeMetaItem}>
                  <Text style={styles.committeeMetaLabel}>Department</Text>
                  <Text style={styles.committeeMetaValue}>{department}</Text>
                </View>
                <View style={styles.committeeMetaItem}>
                  <Text style={styles.committeeMetaLabel}>Members</Text>
                  <Text style={styles.committeeMetaValue}>{committee.members?.length || 0}</Text>
                </View>
              </View>
            </View>

            <Text style={styles.membersHeading}>Committee Members</Text>
            {(committee.members?.length ?? 0) === 0 ? (
              <Text style={styles.noMembersText}>No members in this committee yet.</Text>
            ) : (
              committee.members?.map((member) => (
                <MemberCard
                  key={member.id || member.email || member.name}
                  member={member}
                  canManage={Boolean(member.id && member.id !== user?.id)}
                  onEdit={() => openEditMember(member)}
                  onRemove={() => handleRemoveMember(member)}
                />
              ))
            )}
          </>
        )}
      </View>

      <SheetModal
        visible={Boolean(editMember)}
        onClose={() => setEditMember(null)}
        title="Edit Member"
        subtitle={editMember?.name || undefined}
        footer={
          <View style={sheetStyles.footerRow}>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
              onPress={() => setEditMember(null)}
              disabled={saving}>
              <Text style={sheetStyles.footerBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnPrimary]}
              onPress={handleSaveMember}
              disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={sheetStyles.footerBtnPrimaryText}>Save</Text>
              )}
            </Pressable>
          </View>
        }>
        <Text style={styles.fieldLabel}>Name</Text>
        <TextInput
          style={styles.input}
          value={editForm.name}
          onChangeText={(name) => setEditForm((prev) => ({ ...prev, name }))}
          placeholder="Member name"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput
          style={styles.input}
          value={editForm.email}
          onChangeText={(email) => setEditForm((prev) => ({ ...prev, email }))}
          placeholder="Member email"
          placeholderTextColor="#9ca3af"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.fieldLabel}>Department</Text>
        <TextInput
          style={styles.input}
          value={editForm.department}
          onChangeText={(department) => setEditForm((prev) => ({ ...prev, department }))}
          placeholder="Department"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.fieldLabel}>Supervision Capacity</Text>
        <TextInput
          style={styles.input}
          value={editForm.supervisionCapacity}
          onChangeText={(supervisionCapacity) =>
            setEditForm((prev) => ({ ...prev, supervisionCapacity }))
          }
          placeholder="e.g. 4"
          placeholderTextColor="#9ca3af"
          keyboardType="number-pad"
        />

        {editMember?.designation ? (
          <>
            <Text style={styles.fieldLabel}>Designation</Text>
            <Text style={styles.readOnlyValue}>{editMember.designation}</Text>
          </>
        ) : null}

        {editMember?.officeHours ? (
          <>
            <Text style={styles.fieldLabel}>Office Hours</Text>
            <Text style={styles.readOnlyValue}>{editMember.officeHours}</Text>
          </>
        ) : null}
      </SheetModal>
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
    marginBottom: 8,
  },
  committeeBanner: {
    marginTop: 12,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 16,
  },
  committeeName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  committeeDescription: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  committeeMetaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  committeeMetaItem: {
    flex: 1,
  },
  committeeMetaLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  committeeMetaValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  membersHeading: {
    marginTop: 20,
    marginBottom: 12,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  noMembersText: {
    fontSize: 14,
    color: '#6b7280',
  },
  memberCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  memberCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  memberAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#bbf7d0',
  },
  memberAvatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#bbf7d0',
  },
  memberAvatarInitial: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  memberMain: {
    flex: 1,
  },
  memberName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  memberDesignation: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '600',
    color: ACCENT,
  },
  menuBtn: {
    padding: 6,
  },
  memberDetails: {
    marginTop: 12,
    gap: 6,
  },
  detailLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roleBadgeText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  menuItemText: {
    fontSize: 16,
    color: '#374151',
  },
  menuItemDanger: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  menuItemDangerText: {
    color: '#dc2626',
  },
  readOnlyValue: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
    paddingVertical: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
    marginBottom: 12,
  },
});
