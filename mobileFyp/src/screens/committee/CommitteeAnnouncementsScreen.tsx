import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { DetailRow, SheetModal, sheetStyles } from '../../components/portal/SheetModal';
import {
  createCommitteeAnnouncement,
  deleteCommitteeAnnouncement,
  fetchCommitteeAnnouncementById,
  fetchCommitteeAnnouncements,
  updateCommitteeAnnouncement,
  type AdminAnnouncement,
  type CommitteeAnnouncementPayload,
  type CommitteeAnnouncementType,
} from '../../services/announcementService';

const TYPE_FILTERS = ['ALL', 'PROOF_SUBMISSION', 'OTHER'] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

const CREATE_TYPES: CommitteeAnnouncementType[] = ['PROOF_SUBMISSION', 'OTHER'];
const PRIORITIES = ['LOW', 'NORMAL', 'HIGH'] as const;

const emptyForm = {
  title: '',
  content: '',
  type: 'PROOF_SUBMISSION' as CommitteeAnnouncementType,
  priority: 'NORMAL' as const,
  deadlineDate: '',
  expiresAt: '',
  isActive: true,
};

function formatDate(dateValue?: string | null) {
  if (!dateValue) {
    return 'N/A';
  }
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleDateString();
}

function toIsoDate(value: string) {
  if (!value.trim()) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function getTypeLabel(type: CommitteeAnnouncementType | string) {
  if (type === 'PROOF_SUBMISSION') {
    return 'Proof Submission';
  }
  if (type === 'OTHER') {
    return 'General Announcement';
  }
  return 'Announcement';
}

function getTypeBadgeColor(type: CommitteeAnnouncementType | string) {
  if (type === 'PROOF_SUBMISSION') {
    return '#3b82f6';
  }
  return '#6b7280';
}

function getPriorityLabel(priority?: string) {
  if (priority === 'HIGH') {
    return 'High Priority';
  }
  if (priority === 'LOW') {
    return 'Low';
  }
  return 'Normal';
}

function getPriorityColor(priority?: string) {
  if (priority === 'HIGH') {
    return '#dc2626';
  }
  if (priority === 'LOW') {
    return '#6b7280';
  }
  return '#4b5563';
}

function getTypeIcon(type: CommitteeAnnouncementType | string) {
  if (type === 'PROOF_SUBMISSION') {
    return 'check-square';
  }
  return 'bell';
}

function getTypeDescription(type: CommitteeAnnouncementType) {
  if (type === 'PROOF_SUBMISSION') {
    return 'Students will upload proof of prerequisites completion or CGPA improvement. Committee will review and approve/reject submissions.';
  }
  return 'General announcement for committee communications, notifications, or updates that do not require proof submission.';
}

function getFilterLabel(filter: TypeFilter) {
  if (filter === 'ALL') {
    return 'All';
  }
  if (filter === 'PROOF_SUBMISSION') {
    return 'Proof Submission';
  }
  return 'General';
}

export function CommitteeAnnouncementsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [announcements, setAnnouncements] = useState<AdminAnnouncement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [viewItem, setViewItem] = useState<AdminAnnouncement | null>(null);
  const [deleteItem, setDeleteItem] = useState<AdminAnnouncement | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [priorityPickerOpen, setPriorityPickerOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchCommitteeAnnouncements();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch {
      setAnnouncements([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredAnnouncements = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return announcements.filter((ann) => {
      const matchesSearch =
        !q ||
        ann.title.toLowerCase().includes(q) ||
        ann.content.toLowerCase().includes(q);
      const matchesType = typeFilter === 'ALL' || ann.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [announcements, searchQuery, typeFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = async (item: AdminAnnouncement) => {
    try {
      const detail = await fetchCommitteeAnnouncementById(item.id);
      const editType =
        detail.type === 'PROOF_SUBMISSION' || detail.type === 'OTHER'
          ? detail.type
          : 'OTHER';
      setEditingId(item.id);
      setForm({
        title: detail.title,
        content: detail.content,
        type: editType as CommitteeAnnouncementType,
        priority: (detail.priority as typeof emptyForm.priority) || 'NORMAL',
        deadlineDate: detail.deadlineDate ? detail.deadlineDate.split('T')[0] : '',
        expiresAt: detail.expiresAt ? detail.expiresAt.split('T')[0] : '',
        isActive: detail.isActive !== false,
      });
      setFormOpen(true);
    } catch {
      Alert.alert('Error', 'Failed to load announcement details.');
    }
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      Alert.alert('Validation', 'Title and content are required.');
      return;
    }
    if (form.type === 'PROOF_SUBMISSION' && !form.deadlineDate.trim()) {
      Alert.alert('Validation', 'Submission deadline is required for proof submissions.');
      return;
    }

    const payload: CommitteeAnnouncementPayload = {
      title: form.title.trim(),
      content: form.content.trim(),
      type: form.type,
      priority: form.priority,
      deadlineDate: toIsoDate(form.deadlineDate),
      expiresAt: toIsoDate(form.expiresAt),
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (editingId) {
        await updateCommitteeAnnouncement(editingId, payload);
      } else {
        await createCommitteeAnnouncement(payload);
      }
      setFormOpen(false);
      setEditingId(null);
      await loadData();
    } catch {
      Alert.alert(
        'Error',
        editingId ? 'Failed to update announcement.' : 'Failed to create announcement.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItem) {
      return;
    }
    setSaving(true);
    try {
      await deleteCommitteeAnnouncement(deleteItem.id);
      setDeleteItem(null);
      if (viewItem?.id === deleteItem.id) {
        setViewItem(null);
      }
      await loadData();
    } catch {
      Alert.alert('Error', 'Failed to delete announcement.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingView message="Loading announcements..." />;
  }

  return (
    <PortalScreenLayout
      title="FYP Announcements"
      subtitle="Manage committee announcements"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
      <Pressable style={styles.newBtn} onPress={openCreate}>
        <FeatherIcon name="plus" size={18} color="#16a34a" />
        <Text style={styles.newBtnText}>New Announcement</Text>
      </Pressable>

      <View style={styles.searchWrap}>
        <FeatherIcon name="search" size={18} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search announcements..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}>
        {TYPE_FILTERS.map((filter) => (
          <Pressable
            key={filter}
            style={[styles.filterChip, typeFilter === filter && styles.filterChipActive]}
            onPress={() => setTypeFilter(filter)}>
            <Text
              style={[
                styles.filterChipText,
                typeFilter === filter && styles.filterChipTextActive,
              ]}>
              {getFilterLabel(filter)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {filteredAnnouncements.length === 0 ? (
        <View style={styles.emptyWrap}>
          <FeatherIcon name="bell" size={44} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No announcements found</Text>
          <Text style={styles.emptyMessage}>Create your first announcement to get started</Text>
          <Pressable style={styles.createBtn} onPress={openCreate}>
            <FeatherIcon name="plus" size={16} color="#fff" />
            <Text style={styles.createBtnText}>Create Announcement</Text>
          </Pressable>
        </View>
      ) : (
        filteredAnnouncements.map((announcement) => (
          <View key={announcement.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconWrap}>
                <FeatherIcon
                  name={getTypeIcon(announcement.type)}
                  size={18}
                  color="#16a34a"
                />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {announcement.title}
                </Text>
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: getTypeBadgeColor(announcement.type) },
                    ]}>
                    <Text style={styles.badgeText}>{getTypeLabel(announcement.type)}</Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: getPriorityColor(announcement.priority) },
                    ]}>
                    <Text style={styles.badgeText}>
                      {getPriorityLabel(announcement.priority)}
                    </Text>
                  </View>
                  {!announcement.isActive ? (
                    <View style={[styles.badge, styles.badgeInactive]}>
                      <Text style={styles.badgeTextInactive}>Inactive</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            <Text style={styles.cardContent} numberOfLines={3}>
              {announcement.content}
            </Text>

            <View style={styles.metaRow}>
              {announcement.deadlineDate ? (
                <View style={styles.metaItem}>
                  <FeatherIcon name="calendar" size={14} color="#6b7280" />
                  <Text style={styles.metaText}>
                    Deadline: {formatDate(announcement.deadlineDate)}
                  </Text>
                </View>
              ) : null}
              <View style={styles.metaItem}>
                <FeatherIcon name="clock" size={14} color="#6b7280" />
                <Text style={styles.metaText}>
                  Created: {formatDate(announcement.createdAt)}
                </Text>
              </View>
              {announcement._count && announcement.type === 'PROOF_SUBMISSION' ? (
                <View style={styles.metaItem}>
                  <FeatherIcon name="alert-circle" size={14} color="#6b7280" />
                  <Text style={styles.metaText}>
                    {announcement._count.proofSubmissions || 0} submissions
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.cardActions}>
              <Pressable style={styles.viewBtn} onPress={() => setViewItem(announcement)}>
                <FeatherIcon name="eye" size={16} color="#fff" />
                <Text style={styles.viewBtnText}>View Details</Text>
              </Pressable>
              <Pressable style={styles.iconBtn} onPress={() => openEdit(announcement)}>
                <FeatherIcon name="edit-2" size={16} color="#2563eb" />
              </Pressable>
              <Pressable
                style={[styles.iconBtn, styles.deleteIconBtn]}
                onPress={() => setDeleteItem(announcement)}>
                <FeatherIcon name="trash-2" size={16} color="#dc2626" />
              </Pressable>
            </View>
          </View>
        ))
      )}

      <SheetModal
        visible={!!viewItem}
        onClose={() => setViewItem(null)}
        title="Announcement Details"
        subtitle={viewItem ? getTypeLabel(viewItem.type) : undefined}
        footer={
          viewItem ? (
            <View style={sheetStyles.footerRow}>
              <Pressable
                style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
                onPress={() => setViewItem(null)}>
                <Text style={sheetStyles.footerBtnCancelText}>Close</Text>
              </Pressable>
              <Pressable
                style={[sheetStyles.footerBtn, { backgroundColor: '#2563eb' }]}
                onPress={() => {
                  const item = viewItem;
                  setViewItem(null);
                  if (item) {
                    openEdit(item);
                  }
                }}>
                <Text style={sheetStyles.footerBtnPrimaryText}>Edit</Text>
              </Pressable>
            </View>
          ) : undefined
        }>
        {viewItem ? (
          <>
            <Text style={styles.viewTitle}>{viewItem.title}</Text>
            <View style={styles.badgeRow}>
              <View
                style={[styles.badge, { backgroundColor: getTypeBadgeColor(viewItem.type) }]}>
                <Text style={styles.badgeText}>{getTypeLabel(viewItem.type)}</Text>
              </View>
              <View
                style={[styles.badge, { backgroundColor: getPriorityColor(viewItem.priority) }]}>
                <Text style={styles.badgeText}>{getPriorityLabel(viewItem.priority)}</Text>
              </View>
            </View>
            <Text style={styles.viewContent}>{viewItem.content}</Text>
            <DetailRow icon="calendar" label="Created" value={formatDate(viewItem.createdAt)} />
            {viewItem.deadlineDate ? (
              <DetailRow
                icon="clock"
                label="Deadline"
                value={formatDate(viewItem.deadlineDate)}
              />
            ) : null}
            {viewItem.expiresAt ? (
              <DetailRow icon="bell" label="Expires" value={formatDate(viewItem.expiresAt)} />
            ) : null}
            <DetailRow
              icon="activity"
              label="Status"
              value={viewItem.isActive ? 'Active' : 'Inactive'}
            />
            {viewItem._count && viewItem.type === 'PROOF_SUBMISSION' ? (
              <DetailRow
                icon="file-text"
                label="Submissions"
                value={`${viewItem._count.proofSubmissions || 0}`}
              />
            ) : null}
          </>
        ) : null}
      </SheetModal>

      <SheetModal
        visible={!!deleteItem}
        onClose={() => !saving && setDeleteItem(null)}
        title="Delete Announcement"
        subtitle="This action cannot be undone"
        footer={
          <View style={sheetStyles.footerRow}>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
              disabled={saving}
              onPress={() => setDeleteItem(null)}>
              <Text style={sheetStyles.footerBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnDanger]}
              disabled={saving}
              onPress={handleDeleteConfirm}>
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={sheetStyles.footerBtnDangerText}>Delete</Text>
              )}
            </Pressable>
          </View>
        }>
        <View style={sheetStyles.confirmIconWrap}>
          <FeatherIcon name="trash-2" size={28} color="#dc2626" />
        </View>
        <Text style={sheetStyles.confirmMessage}>
          Are you sure you want to delete this announcement? It will be permanently removed.
        </Text>
        {deleteItem ? (
          <View style={styles.deletePreview}>
            <Text style={styles.deletePreviewTitle} numberOfLines={1}>
              {deleteItem.title}
            </Text>
            <Text style={styles.deletePreviewContent} numberOfLines={2}>
              {deleteItem.content}
            </Text>
          </View>
        ) : null}
      </SheetModal>

      <SheetModal
        visible={formOpen}
        onClose={() => !saving && setFormOpen(false)}
        title={editingId ? 'Edit Announcement' : 'Create New Announcement'}
        subtitle={
          editingId ? 'Update announcement details' : 'Select announcement type and provide details'
        }
        footer={
          <View style={sheetStyles.footerRow}>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
              disabled={saving}
              onPress={() => setFormOpen(false)}>
              <Text style={sheetStyles.footerBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnPrimary]}
              disabled={saving}
              onPress={handleSave}>
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={sheetStyles.footerBtnPrimaryText}>
                  {editingId ? 'Save Changes' : 'Create Announcement'}
                </Text>
              )}
            </Pressable>
          </View>
        }>
        <Text style={styles.fieldLabel}>Announcement Type *</Text>
        <Pressable style={styles.picker} onPress={() => setTypePickerOpen(true)}>
          <Text style={styles.pickerText}>{getTypeLabel(form.type)}</Text>
          <FeatherIcon name="chevron-down" size={18} color="#6b7280" />
        </Pressable>
        <Text style={styles.typeHint}>{getTypeDescription(form.type)}</Text>

        <Text style={styles.fieldLabel}>Title *</Text>
        <TextInput
          style={styles.input}
          value={form.title}
          onChangeText={(title) => setForm((f) => ({ ...f, title }))}
          placeholder="e.g., FYP-I Defense Schedule - Fall 2024"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.fieldLabel}>Content *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={form.content}
          onChangeText={(content) => setForm((f) => ({ ...f, content }))}
          placeholder="Provide detailed information about the announcement..."
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />

        <Text style={styles.fieldLabel}>Priority Level</Text>
        <Pressable style={styles.picker} onPress={() => setPriorityPickerOpen(true)}>
          <Text style={styles.pickerText}>{getPriorityLabel(form.priority)}</Text>
          <FeatherIcon name="chevron-down" size={18} color="#6b7280" />
        </Pressable>

        <Text style={styles.fieldLabel}>
          {form.type === 'PROOF_SUBMISSION' ? 'Deadline Date *' : 'Deadline Date (optional)'}
        </Text>
        <TextInput
          style={styles.input}
          value={form.deadlineDate}
          onChangeText={(deadlineDate) => setForm((f) => ({ ...f, deadlineDate }))}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.fieldHint}>
          {form.type === 'PROOF_SUBMISSION'
            ? 'Last date for students to submit proofs'
            : 'Defense/evaluation date'}
        </Text>

        <Text style={styles.fieldLabel}>Announcement Expiry Date (optional)</Text>
        <TextInput
          style={styles.input}
          value={form.expiresAt}
          onChangeText={(expiresAt) => setForm((f) => ({ ...f, expiresAt }))}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.fieldHint}>
          Announcement will be automatically hidden after this date
        </Text>

        {editingId ? (
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Active</Text>
            <Switch
              value={form.isActive}
              onValueChange={(isActive) => setForm((f) => ({ ...f, isActive }))}
              trackColor={{ false: '#d1d5db', true: '#86efac' }}
              thumbColor={form.isActive ? '#16a34a' : '#f4f4f5'}
            />
          </View>
        ) : null}
      </SheetModal>

      <SheetModal
        visible={typePickerOpen}
        onClose={() => setTypePickerOpen(false)}
        title="Announcement Type">
        {CREATE_TYPES.map((type) => (
          <Pressable
            key={type}
            style={styles.optionRow}
            onPress={() => {
              setForm((f) => ({ ...f, type }));
              setTypePickerOpen(false);
            }}>
            <Text style={styles.optionText}>{getTypeLabel(type)}</Text>
            {form.type === type ? (
              <FeatherIcon name="check" size={18} color="#16a34a" />
            ) : null}
          </Pressable>
        ))}
      </SheetModal>

      <SheetModal
        visible={priorityPickerOpen}
        onClose={() => setPriorityPickerOpen(false)}
        title="Priority Level">
        {PRIORITIES.map((priority) => (
          <Pressable
            key={priority}
            style={styles.optionRow}
            onPress={() => {
              setForm((f) => ({ ...f, priority }));
              setPriorityPickerOpen(false);
            }}>
            <Text style={styles.optionText}>{getPriorityLabel(priority)}</Text>
            {form.priority === priority ? (
              <FeatherIcon name="check" size={18} color="#16a34a" />
            ) : null}
          </Pressable>
        ))}
      </SheetModal>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 14,
  },
  newBtnText: { color: '#16a34a', fontWeight: '700', fontSize: 14 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#111827' },
  filterRow: { gap: 8, paddingBottom: 14 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  filterChipTextActive: { color: '#fff' },
  emptyWrap: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 36,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  emptyMessage: {
    marginTop: 6,
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  createBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', marginBottom: 10 },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeInactive: { backgroundColor: '#f3f4f6' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  badgeTextInactive: { color: '#6b7280', fontSize: 10, fontWeight: '600' },
  cardContent: { fontSize: 13, color: '#4b5563', lineHeight: 20, marginBottom: 10 },
  metaRow: { gap: 6, marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: '#6b7280' },
  cardActions: { flexDirection: 'row', gap: 8 },
  viewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 10,
  },
  viewBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  deleteIconBtn: { borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  viewTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 10 },
  viewContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 16,
  },
  deletePreview: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  deletePreviewTitle: { fontWeight: '700', fontSize: 14, color: '#111827', marginBottom: 4 },
  deletePreviewContent: { fontSize: 13, color: '#6b7280' },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
    marginTop: 4,
  },
  fieldHint: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: -4,
    marginBottom: 8,
  },
  typeHint: {
    fontSize: 12,
    color: '#374151',
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  textArea: { minHeight: 120 },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  pickerText: { fontSize: 14, color: '#111827' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  switchLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  optionText: { fontSize: 15, color: '#111827' },
});
