import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
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
  createAdminUser,
  deleteAdminUser,
  fetchAllUsers,
  type AdminUser,
  updateAdminUserStatus,
} from '../../services/adminService';

const statusColors: Record<string, string> = {
  APPROVED: '#16a34a',
  PENDING: '#ca8a04',
  REJECTED: '#dc2626',
};

const roleColors: Record<string, string> = {
  ADMIN: '#dc2626',
  COMMITTEE_HEAD: '#9333ea',
  TEACHER: '#2563eb',
  STUDENT: '#16a34a',
};

const roleOptions = ['ALL', 'ADMIN', 'COMMITTEE_HEAD', 'TEACHER', 'STUDENT'] as const;
const statusOptions = ['ALL', 'APPROVED', 'PENDING', 'REJECTED'] as const;

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

function getUserGpa(user: AdminUser) {
  const value = typeof user.gpa === 'number' ? user.gpa : user.cgpa;
  return typeof value === 'number' ? value.toFixed(2) : 'N/A';
}

export function AdminUsersScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<(typeof roleOptions)[number]>('ALL');
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [filterModal, setFilterModal] = useState<null | 'role' | 'status' | 'department'>(null);
  const [addRoleModalOpen, setAddRoleModalOpen] = useState(false);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'STUDENT',
    department: 'Computer Science',
    password: '',
  });

  const loadData = useCallback(async () => {
    try {
      const data = await fetchAllUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert(
        'Load failed',
        'Could not load users. Check your internet connection and try again.',
      );
      setUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const departments = useMemo(() => {
    const source = users
      .map((user) => user.department?.trim())
      .filter((dept): dept is string => !!dept);
    return ['ALL', ...Array.from(new Set(source))];
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        user.name.toLowerCase().includes(normalizedSearch) ||
        user.email.toLowerCase().includes(normalizedSearch);
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' || (user.status || 'PENDING') === statusFilter;
      const matchesDepartment =
        departmentFilter === 'ALL' || (user.department || '').trim() === departmentFilter;
      return matchesSearch && matchesRole && matchesStatus && matchesDepartment;
    });
  }, [departmentFilter, roleFilter, searchQuery, statusFilter, users]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUserStatusChange = async (action: 'approve' | 'reject') => {
    if (!selectedUser) {
      return;
    }
    setActionLoading(true);
    try {
      await updateAdminUserStatus(selectedUser.id, action);
      await loadData();
      setActionMenuOpen(false);
      setSelectedUser(null);
    } catch {
      Alert.alert('Action failed', 'Unable to update user status right now.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) {
      return;
    }
    Alert.alert('Delete User', 'Are you sure you want to delete this user?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await deleteAdminUser(selectedUser.id);
            await loadData();
            setActionMenuOpen(false);
            setSelectedUser(null);
          } catch {
            Alert.alert('Delete failed', 'Unable to delete user right now.');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleAddUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim()) {
      Alert.alert('Missing fields', 'Name and email are required.');
      return;
    }
    setActionLoading(true);
    try {
      await createAdminUser({
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        role: newUser.role,
        department: newUser.department.trim() || undefined,
        password: newUser.password.trim() || 'changeme',
      });
      setAddModalOpen(false);
      setNewUser({
        name: '',
        email: '',
        role: 'STUDENT',
        department: 'Computer Science',
        password: '',
      });
      await loadData();
    } catch {
      Alert.alert('Create failed', 'Unable to create user. Check fields and try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const renderFilterModal = (
    title: string,
    options: readonly string[],
    selectedValue: string,
    onSelect: (value: string) => void,
  ) => (
    <Modal visible={!!filterModal} transparent animationType="fade" onRequestClose={() => setFilterModal(null)}>
      <Pressable style={styles.modalBackdrop} onPress={() => setFilterModal(null)}>
        <View style={styles.optionModal}>
          <Text style={styles.optionTitle}>{title}</Text>
          {options.map((option) => (
            <Pressable
              key={option}
              style={styles.optionRow}
              onPress={() => {
                onSelect(option);
                setFilterModal(null);
              }}>
              <Text style={[styles.optionText, option === selectedValue && styles.optionTextActive]}>
                {option === 'ALL' ? `All ${title}` : formatRole(option)}
              </Text>
              {option === selectedValue ? <FeatherIcon name="check" size={16} color="#16a34a" /> : null}
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );

  if (loading) {
    return <LoadingView message="Loading users..." />;
  }

  return (
    <PortalScreenLayout
      title="Manage Users"
      subtitle="Accounts and approvals"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>User Management</Text>
          <Text style={styles.headerSub}>Manage all system users and permissions</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => setAddModalOpen(true)}>
          <FeatherIcon name="plus" size={14} color="#fff" />
          <Text style={styles.addBtnText}>Add User</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <FeatherIcon name="search" size={16} color="#9ca3af" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search users by name or email..."
          placeholderTextColor="#9ca3af"
          style={styles.searchInput}
        />
      </View>

      <View style={styles.filtersRow}>
        <Pressable style={styles.filterChip} onPress={() => setFilterModal('role')}>
          <Text style={styles.filterText}>
            {roleFilter === 'ALL' ? 'All Roles' : formatRole(roleFilter)}
          </Text>
          <FeatherIcon name="chevron-down" size={14} color="#6b7280" />
        </Pressable>
        <Pressable style={styles.filterChip} onPress={() => setFilterModal('status')}>
          <Text style={styles.filterText}>{statusFilter === 'ALL' ? 'All Status' : statusFilter}</Text>
          <FeatherIcon name="chevron-down" size={14} color="#6b7280" />
        </Pressable>
        <Pressable style={styles.filterChip} onPress={() => setFilterModal('department')}>
          <Text style={styles.filterText}>
            {departmentFilter === 'ALL' ? 'All Departments' : departmentFilter}
          </Text>
          <FeatherIcon name="chevron-down" size={14} color="#6b7280" />
        </Pressable>
      </View>

      {filteredUsers.length === 0 ? (
        <EmptyState title="No users" message="No users found in the system." />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableWrap}>
          <View>
            <View style={[styles.tableRow, styles.tableHeaderRow]}>
              <Text style={[styles.cell, styles.userCell, styles.headerCell]}>User</Text>
              <Text style={[styles.cell, styles.roleCell, styles.headerCell]}>Role</Text>
              <Text style={[styles.cell, styles.statusCell, styles.headerCell]}>Status</Text>
              <Text style={[styles.cell, styles.gpaCell, styles.headerCell]}>GPA</Text>
              <Text style={[styles.cell, styles.deptCell, styles.headerCell]}>Department</Text>
              <Text style={[styles.cell, styles.dateCell, styles.headerCell]}>Joined Date</Text>
              <Text style={[styles.cell, styles.actionCell, styles.headerCell]}>Actions</Text>
            </View>
            {filteredUsers.map((user) => (
              <View key={user.id} style={styles.tableRow}>
                <View style={[styles.cell, styles.userCell]}>
                  <Text style={styles.name}>{user.name}</Text>
                  <Text style={styles.email}>{user.email}</Text>
                </View>
                <View style={[styles.cell, styles.roleCell]}>
                  <View style={[styles.badge, { backgroundColor: `${roleColors[user.role] ?? '#6b7280'}22` }]}>
                    <Text style={[styles.badgeText, { color: roleColors[user.role] ?? '#6b7280' }]}>
                      {formatRole(user.role)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.cell, styles.statusCell]}>
                  <View style={[styles.badge, { backgroundColor: `${statusColors[user.status] ?? '#6b7280'}22` }]}>
                    <Text style={[styles.badgeText, { color: statusColors[user.status] ?? '#6b7280' }]}>
                      {user.status || 'PENDING'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.cell, styles.gpaCell, styles.valueText]}>{getUserGpa(user)}</Text>
                <Text style={[styles.cell, styles.deptCell, styles.valueText]}>{user.department || 'N/A'}</Text>
                <Text style={[styles.cell, styles.dateCell, styles.valueText]}>{formatDate(user.createdAt)}</Text>
                <View style={[styles.cell, styles.actionCell]}>
                  <Pressable
                    style={styles.moreBtn}
                    onPress={() => {
                      setSelectedUser(user);
                      setActionMenuOpen(true);
                    }}>
                    <FeatherIcon name="more-vertical" size={16} color="#374151" />
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {filterModal === 'role'
        ? renderFilterModal('Roles', roleOptions, roleFilter, (value) => setRoleFilter(value as (typeof roleOptions)[number]))
        : null}
      {filterModal === 'status'
        ? renderFilterModal('Status', statusOptions, statusFilter, (value) => setStatusFilter(value as (typeof statusOptions)[number]))
        : null}
      {filterModal === 'department'
        ? renderFilterModal('Departments', departments, departmentFilter, setDepartmentFilter)
        : null}

      <Modal visible={actionMenuOpen} transparent animationType="fade" onRequestClose={() => setActionMenuOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setActionMenuOpen(false)}>
          <View style={styles.actionModal}>
            <Text style={styles.actionTitle}>{selectedUser?.name || 'User Actions'}</Text>
            <Pressable
              style={styles.actionOption}
              onPress={() => {
                if (selectedUser) {
                  Alert.alert(
                    selectedUser.name,
                    [
                      `Email: ${selectedUser.email}`,
                      `Role: ${formatRole(selectedUser.role)}`,
                      `Status: ${selectedUser.status || 'PENDING'}`,
                      `Department: ${selectedUser.department || 'N/A'}`,
                      `GPA: ${getUserGpa(selectedUser)}`,
                      `Joined: ${formatDate(selectedUser.createdAt)}`,
                    ].join('\n'),
                  );
                }
                setActionMenuOpen(false);
              }}>
              <FeatherIcon name="eye" size={16} color="#2563eb" />
              <Text style={styles.actionText}>View Details</Text>
            </Pressable>
            {selectedUser?.status !== 'APPROVED' ? (
              <Pressable
                style={styles.actionOption}
                onPress={() => handleUserStatusChange('approve')}
                disabled={actionLoading}>
                <FeatherIcon name="user-check" size={16} color="#16a34a" />
                <Text style={styles.actionText}>Activate Account</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.actionOption}
                onPress={() => handleUserStatusChange('reject')}
                disabled={actionLoading}>
                <FeatherIcon name="user-x" size={16} color="#d97706" />
                <Text style={styles.actionText}>Deactivate Account</Text>
              </Pressable>
            )}
            <Pressable style={styles.actionOption} onPress={handleDeleteUser} disabled={actionLoading}>
              <FeatherIcon name="trash-2" size={16} color="#dc2626" />
              <Text style={[styles.actionText, { color: '#dc2626' }]}>Delete User</Text>
            </Pressable>
            {actionLoading ? <ActivityIndicator color="#16a34a" style={styles.modalLoader} /> : null}
          </View>
        </Pressable>
      </Modal>

      <Modal visible={addModalOpen} transparent animationType="slide" onRequestClose={() => setAddModalOpen(false)}>
        <View style={styles.modalBackdropStrong}>
          <View style={styles.addModal}>
            <Text style={styles.actionTitle}>Add User</Text>
            <TextInput
              value={newUser.name}
              onChangeText={(value) => setNewUser((prev) => ({ ...prev, name: value }))}
              placeholder="Full Name"
              style={styles.formInput}
              placeholderTextColor="#9ca3af"
            />
            <TextInput
              value={newUser.email}
              onChangeText={(value) => setNewUser((prev) => ({ ...prev, email: value }))}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.formInput}
              placeholderTextColor="#9ca3af"
            />
            <Pressable style={styles.formSelect} onPress={() => setAddRoleModalOpen(true)}>
              <Text style={styles.formSelectText}>Role: {formatRole(newUser.role)}</Text>
              <FeatherIcon name="chevron-down" size={14} color="#6b7280" />
            </Pressable>
            <TextInput
              value={newUser.department}
              onChangeText={(value) => setNewUser((prev) => ({ ...prev, department: value }))}
              placeholder="Department"
              style={styles.formInput}
              placeholderTextColor="#9ca3af"
            />
            <TextInput
              value={newUser.password}
              onChangeText={(value) => setNewUser((prev) => ({ ...prev, password: value }))}
              placeholder="Password (optional)"
              secureTextEntry
              style={styles.formInput}
              placeholderTextColor="#9ca3af"
            />
            <View style={styles.formActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setAddModalOpen(false)} disabled={actionLoading}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleAddUser} disabled={actionLoading}>
                {actionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveText}>Create User</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={addRoleModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAddRoleModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAddRoleModalOpen(false)}>
          <View style={styles.optionModal}>
            <Text style={styles.optionTitle}>Select Role</Text>
            {roleOptions
              .filter((option) => option !== 'ALL')
              .map((option) => (
                <Pressable
                  key={option}
                  style={styles.optionRow}
                  onPress={() => {
                    setNewUser((prev) => ({ ...prev, role: option }));
                    setAddRoleModalOpen(false);
                  }}>
                  <Text
                    style={[
                      styles.optionText,
                      option === newUser.role && styles.optionTextActive,
                    ]}>
                    {formatRole(option)}
                  </Text>
                  {option === newUser.role ? (
                    <FeatherIcon name="check" size={16} color="#16a34a" />
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  headerSub: {
    marginTop: 2,
    fontSize: 12,
    color: '#6b7280',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    color: '#111827',
    fontSize: 13,
    paddingVertical: 11,
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterText: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
    marginRight: 6,
  },
  tableWrap: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    minWidth: 860,
  },
  tableHeaderRow: {
    backgroundColor: '#f9fafb',
  },
  cell: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  userCell: { width: 230 },
  roleCell: { width: 130, alignItems: 'flex-start' },
  statusCell: { width: 130, alignItems: 'flex-start' },
  gpaCell: { width: 80 },
  deptCell: { width: 130 },
  dateCell: { width: 110 },
  actionCell: { width: 80, alignItems: 'center' },
  headerCell: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  name: { fontSize: 14, fontWeight: '700', color: '#111827' },
  email: { marginTop: 3, fontSize: 12, color: '#6b7280' },
  valueText: { fontSize: 12, color: '#374151' },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  moreBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBackdropStrong: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 16,
  },
  optionModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    maxWidth: 360,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  optionText: {
    fontSize: 14,
    color: '#374151',
  },
  optionTextActive: {
    color: '#16a34a',
    fontWeight: '700',
  },
  actionModal: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  actionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  actionText: {
    fontSize: 14,
    color: '#374151',
  },
  modalLoader: {
    marginTop: 8,
  },
  addModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    marginBottom: 10,
  },
  formSelect: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  formSelectText: {
    fontSize: 14,
    color: '#374151',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 96,
    alignItems: 'center',
  },
  saveText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
  },
});
