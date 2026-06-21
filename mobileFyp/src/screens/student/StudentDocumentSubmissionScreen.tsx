import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  types,
} from '@react-native-documents/picker';
import FeatherIcon from 'react-native-vector-icons/Feather';
import Toast from 'react-native-toast-message';
import { EmptyState } from '../../components/portal/EmptyState';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { SheetModal } from '../../components/portal/SheetModal';
import {
  DOCUMENT_CATEGORIES,
  DOCUMENT_CATEGORY_LABELS,
  deleteDocumentSubmission,
  ensureApprovedGroupForDocuments,
  fetchMyDocumentSubmissions,
  getDocumentStatusStyle,
  submitDocument,
  type DocumentCategory,
  type DocumentSubmissionRow,
} from '../../services/documentSubmissionService';
import { openDocumentFromUrl } from '../../services/documentService';
import { useAuthUser } from '../../hooks/useAuthUser';
import type { MyGroupDetails } from '../../services/groupService';

const MAX_BYTES = 10 * 1024 * 1024;

type PickedFile = { name: string; uri: string; size: number; mimeType?: string };

function formatFileSize(bytes: number) {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StudentDocumentSubmissionScreen() {
  const { user } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<DocumentSubmissionRow[]>([]);
  const [group, setGroup] = useState<MyGroupDetails | null>(null);
  const [groupBlocked, setGroupBlocked] = useState<string | null>(null);
  const [category, setCategory] = useState<DocumentCategory>('FYP_I');
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [documentTitle, setDocumentTitle] = useState('');
  const [remarks, setRemarks] = useState('');
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);

  const load = useCallback(
    async (showSpinner = false) => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      if (showSpinner) setLoading(true);
      try {
        const approvedGroup = await ensureApprovedGroupForDocuments();
        setGroup(approvedGroup);
        setGroupBlocked(null);
        const rows = await fetchMyDocumentSubmissions(user.id);
        setSubmissions(rows);
      } catch (e) {
        setGroup(null);
        setSubmissions([]);
        setGroupBlocked(
          e instanceof Error
            ? e.message
            : 'You must belong to an approved FYP group before submitting documents.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id],
  );

  React.useEffect(() => {
    load(true);
  }, [load]);

  const refresh = () => {
    setRefreshing(true);
    load(false);
  };

  const pickDocument = async () => {
    try {
      const [file] = await pick({
        type: [types.pdf, types.doc, types.docx, types.images],
        allowMultiSelection: false,
      });
      if (!file?.uri) return;

      const copies = await keepLocalCopy({
        files: [{ uri: file.uri, fileName: file.name ?? 'document' }],
        destination: 'cachesDirectory',
      });
      const local = copies[0];
      const size = file.size ?? 0;
      if (size > MAX_BYTES) {
        Toast.show({
          type: 'error',
          text1: 'File too large',
          text2: 'Please upload a file smaller than 10MB',
        });
        return;
      }

      setPickedFile({
        name: file.name ?? 'document',
        uri: local?.uri ?? file.uri,
        size,
        mimeType: file.type ?? undefined,
      });
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        return;
      }
      Toast.show({ type: 'error', text1: 'Could not pick file' });
    }
  };

  const handleSubmit = async () => {
    if (!pickedFile || !user?.id) {
      Toast.show({ type: 'error', text1: 'Please select a document first' });
      return;
    }
    setSubmitting(true);
    try {
      await submitDocument({
        userId: user.id,
        userName: user.name ?? 'Student',
        fileUri: pickedFile.uri,
        fileName: pickedFile.name,
        mimeType: pickedFile.mimeType,
        category,
        documentTitle: documentTitle.trim() || pickedFile.name,
        remarks: remarks.trim(),
        projectId: group?.project?.id,
        projectTitle: group?.project?.title,
      });
      Toast.show({
        type: 'success',
        text1: 'Document Submitted',
        text2: 'Your document has been sent for committee review',
      });
      setPickedFile(null);
      setDocumentTitle('');
      setRemarks('');
      await load(false);
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Submission Failed',
        text2: e instanceof Error ? e.message : 'Please try again',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (row: DocumentSubmissionRow) => {
    Alert.alert(
      'Delete submission?',
      'This will remove your pending document submission.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(row.id);
            try {
              await deleteDocumentSubmission(row.id);
              Toast.show({ type: 'success', text1: 'Submission deleted' });
              await load(false);
            } catch {
              Toast.show({ type: 'error', text1: 'Delete failed' });
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const categoryLabel = DOCUMENT_CATEGORY_LABELS[category] ?? category;

  if (loading) {
    return <LoadingView message="Loading document submission..." />;
  }

  if (groupBlocked) {
    return (
      <PortalScreenLayout
        title="Document Submission"
        subtitle="Submit FYP-I, FYP-II and other documents"
        refreshing={refreshing}
        onRefresh={refresh}>
        <EmptyState
          icon="users"
          title="Approved group required"
          message={groupBlocked}
        />
      </PortalScreenLayout>
    );
  }

  return (
    <PortalScreenLayout
      title="Document Submission"
      subtitle="Submit FYP-I, FYP-II and other documents for committee review"
      refreshing={refreshing}
      onRefresh={refresh}>
      <View style={styles.infoCard}>
        <View style={styles.infoIcon}>
          <FeatherIcon name="file-text" size={16} color="#fff" />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>FYP Document Upload</Text>
          <Text style={styles.infoBody}>
            Upload your FYP-I, FYP-II, or other required documents. Accepted formats:
            PDF, Word, and images (JPEG, PNG). Committee head and admin will review
            and approve or reject your submission.
          </Text>
          {group?.name ? (
            <Text style={styles.groupNote}>Group: {group.name}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Submit Document</Text>

        <Text style={styles.label}>Document Category</Text>
        <Pressable style={styles.selectBtn} onPress={() => setCategoryPickerOpen(true)}>
          <Text style={styles.selectBtnText}>{categoryLabel}</Text>
          <FeatherIcon name="chevron-down" size={18} color="#6b7280" />
        </Pressable>

        <Text style={styles.label}>Document Title (optional)</Text>
        <TextInput
          style={styles.input}
          value={documentTitle}
          onChangeText={setDocumentTitle}
          placeholder="e.g. FYP-I Progress Report"
          placeholderTextColor="#9ca3af"
        />

        <Text style={styles.label}>Remarks (optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={remarks}
          onChangeText={setRemarks}
          placeholder="Any notes for the reviewer"
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Upload File (PDF, Word, Image — Max 10MB)</Text>
        <Pressable style={styles.chooseBtn} onPress={pickDocument}>
          <FeatherIcon name="upload" size={18} color="#374151" />
          <Text style={styles.chooseBtnText}>Choose File</Text>
        </Pressable>
        {pickedFile ? (
          <View style={styles.fileRow}>
            <View style={styles.fileMeta}>
              <Text style={styles.fileName} numberOfLines={1}>
                {pickedFile.name}
              </Text>
              <Text style={styles.fileSize}>{formatFileSize(pickedFile.size)}</Text>
            </View>
            <Pressable onPress={() => setPickedFile(null)}>
              <FeatherIcon name="x" size={18} color="#6b7280" />
            </Pressable>
          </View>
        ) : null}

        {pickedFile ? (
          <Pressable
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <FeatherIcon name="upload" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>Submit Document</Text>
              </>
            )}
          </Pressable>
        ) : null}
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Submission History</Text>
        {submissions.length === 0 ? (
          <Text style={styles.emptyHistory}>No submissions yet</Text>
        ) : (
          submissions.map((row) => {
            const st = getDocumentStatusStyle(row.status);
            const feedback =
              row.reviewComments || row.adminRemarks || row.committeeRemarks;
            return (
              <View key={row.id} style={styles.historyRow}>
                <View style={styles.historyMain}>
                  <View style={styles.historyTitleRow}>
                    <Text style={styles.historyFileName} numberOfLines={1}>
                      {row.title || row.fileName}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.categoryTag}>
                    {DOCUMENT_CATEGORY_LABELS[row.fileType] ?? row.fileType}
                  </Text>
                  <Text style={styles.historyMeta}>
                    Uploaded on {new Date(row.createdAt).toLocaleDateString()}
                  </Text>
                  <Text style={styles.historyMeta}>File: {row.fileName}</Text>
                  {row.description ? (
                    <Text style={styles.historyMeta}>Remarks: {row.description}</Text>
                  ) : null}
                  {feedback ? (
                    <Text style={styles.feedbackNote}>Reviewer feedback: {feedback}</Text>
                  ) : null}
                </View>
                <View style={styles.historyActions}>
                  <Pressable
                    onPress={async () => {
                      try {
                        await openDocumentFromUrl(row.fileUrl, {
                          fileName: row.fileName,
                        });
                      } catch {
                        Toast.show({ type: 'error', text1: 'Could not open file' });
                      }
                    }}>
                    <FeatherIcon name="eye" size={20} color="#2563eb" />
                  </Pressable>
                  {row.status?.toUpperCase() === 'PENDING' ? (
                    <Pressable
                      onPress={() => confirmDelete(row)}
                      disabled={deletingId === row.id}>
                      {deletingId === row.id ? (
                        <ActivityIndicator size="small" color="#dc2626" />
                      ) : (
                        <FeatherIcon name="trash-2" size={20} color="#dc2626" />
                      )}
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </View>

      <SheetModal
        visible={categoryPickerOpen}
        onClose={() => setCategoryPickerOpen(false)}
        title="Document Category">
        {DOCUMENT_CATEGORIES.map((opt) => (
          <Pressable
            key={opt.value}
            style={styles.pickerOption}
            onPress={() => {
              setCategory(opt.value);
              setCategoryPickerOpen(false);
            }}>
            <Text style={styles.pickerOptionText}>{opt.label}</Text>
            {category === opt.value ? (
              <FeatherIcon name="check" size={18} color="#2563eb" />
            ) : null}
          </Pressable>
        ))}
      </SheetModal>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 14,
    marginBottom: 14,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 15, fontWeight: '700', color: '#1e3a8a', marginBottom: 4 },
  infoBody: { fontSize: 13, color: '#1e40af', lineHeight: 20 },
  groupNote: { fontSize: 12, color: '#1d4ed8', fontWeight: '600', marginTop: 8 },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    marginBottom: 14,
  },
  textArea: { minHeight: 80 },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 14,
  },
  selectBtnText: { fontSize: 15, color: '#111827' },
  chooseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chooseBtnText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  fileMeta: { flex: 1 },
  fileName: { fontSize: 14, color: '#374151', fontWeight: '600' },
  fileSize: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 14,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  emptyHistory: { textAlign: 'center', color: '#6b7280', paddingVertical: 24 },
  historyRow: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  historyMain: { flex: 1 },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  historyFileName: { flex: 1, fontWeight: '600', fontSize: 14, color: '#111827' },
  categoryTag: { fontSize: 12, color: '#2563eb', fontWeight: '600', marginBottom: 2 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  historyMeta: { fontSize: 12, color: '#6b7280' },
  feedbackNote: { fontSize: 12, color: '#dc2626', marginTop: 6 },
  historyActions: { justifyContent: 'center', gap: 12 },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerOptionText: { fontSize: 16, color: '#111827' },
});
