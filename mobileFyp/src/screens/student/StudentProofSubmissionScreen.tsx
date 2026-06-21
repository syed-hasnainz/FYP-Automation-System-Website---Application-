import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
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
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { SheetModal } from '../../components/portal/SheetModal';
import {
  deleteProofSubmission,
  fetchMyProofSubmissions,
  PROOF_DOCUMENT_TYPES,
  submitProofDocument,
  type ProofDocumentType,
  type ProofSubmissionRow,
} from '../../services/proofSubmissionService';
import { openDocumentFromUrl } from '../../services/documentService';
import { useAuthUser } from '../../hooks/useAuthUser';

const MAX_BYTES = 5 * 1024 * 1024;

type PickedFile = { name: string; uri: string; size: number };

function proofStatusStyle(status: string) {
  const upper = (status || 'PENDING').toUpperCase();
  if (upper === 'APPROVED') return { bg: '#16a34a', text: '#fff', label: 'Approved' };
  if (upper === 'REJECTED') return { bg: '#dc2626', text: '#fff', label: 'Rejected' };
  return { bg: '#6b7280', text: '#fff', label: 'Pending Review' };
}

export function StudentProofSubmissionScreen() {
  const { user } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<ProofSubmissionRow[]>([]);
  const [documentType, setDocumentType] = useState<ProofDocumentType>('TRANSCRIPT');
  const [docTypePickerOpen, setDocTypePickerOpen] = useState(false);
  const [pickedFile, setPickedFile] = useState<PickedFile | null>(null);

  const load = useCallback(
    async (showSpinner = false) => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      if (showSpinner) setLoading(true);
      try {
        const rows = await fetchMyProofSubmissions(user.id);
        setSubmissions(rows);
      } catch {
        setSubmissions([]);
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

  const pickPdf = async () => {
    try {
      const [file] = await pick({
        type: [types.pdf],
        allowMultiSelection: false,
      });
      if (!file?.uri) return;

      const copies = await keepLocalCopy({
        files: [{ uri: file.uri, fileName: file.name ?? 'proof.pdf' }],
        destination: 'cachesDirectory',
      });
      const local = copies[0];
      const size = file.size ?? 0;
      if (size > MAX_BYTES) {
        Toast.show({
          type: 'error',
          text1: 'File too large',
          text2: 'Please upload a PDF smaller than 5MB',
        });
        return;
      }

      setPickedFile({
        name: file.name ?? 'proof.pdf',
        uri: local?.uri ?? file.uri,
        size,
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
      Toast.show({ type: 'error', text1: 'Please select a proof document first' });
      return;
    }
    setSubmitting(true);
    try {
      await submitProofDocument({
        userId: user.id,
        userName: user.name ?? 'Student',
        fileUri: pickedFile.uri,
        fileName: pickedFile.name,
        fileSize: pickedFile.size,
        mimeType: 'application/pdf',
        documentType,
      });
      Toast.show({
        type: 'success',
        text1: 'Proof Submitted',
        text2: 'Your proof has been submitted for committee review',
      });
      setPickedFile(null);
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

  const confirmDelete = (row: ProofSubmissionRow) => {
    Alert.alert(
      'Delete submission?',
      'This will remove your pending proof submission.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(row.id);
            try {
              await deleteProofSubmission(row.id);
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

  const docLabel =
    PROOF_DOCUMENT_TYPES.find((d) => d.value === documentType)?.label ?? documentType;

  if (loading) {
    return <LoadingView message="Loading proof submission..." />;
  }

  return (
    <PortalScreenLayout
      title="Proof Submission"
      subtitle="Upload proof documents for conditional registration approval"
      refreshing={refreshing}
      onRefresh={refresh}>
      <View style={styles.infoCard}>
        <View style={styles.infoIcon}>
          <Text style={styles.infoIconText}>i</Text>
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Conditional Student Requirements</Text>
          <Text style={styles.infoBody}>
            As a conditional student, upload proof of eligibility (e.g., summer semester
            transcript or clearance certificate) for committee approval.
          </Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Upload Proof Document</Text>

        <Text style={styles.label}>Document Type</Text>
        <Pressable style={styles.selectBtn} onPress={() => setDocTypePickerOpen(true)}>
          <Text style={styles.selectBtnText}>{docLabel}</Text>
          <FeatherIcon name="chevron-down" size={18} color="#6b7280" />
        </Pressable>

        <Text style={styles.label}>Upload File (PDF, Max 5MB)</Text>
        <Pressable style={styles.chooseBtn} onPress={pickPdf}>
          <FeatherIcon name="upload" size={18} color="#374151" />
          <Text style={styles.chooseBtnText}>Choose File</Text>
        </Pressable>
        {pickedFile ? (
          <View style={styles.fileRow}>
            <Text style={styles.fileName} numberOfLines={1}>
              {pickedFile.name}
            </Text>
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
                <Text style={styles.submitBtnText}>Submit Proof</Text>
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
            const st = proofStatusStyle(row.status);
            return (
              <View key={row.id} style={styles.historyRow}>
                <View style={styles.historyMain}>
                  <View style={styles.historyTitleRow}>
                    <Text style={styles.historyFileName} numberOfLines={1}>
                      {row.proofFileName}
                    </Text>
                    <View style={[styles.badge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.historyMeta}>
                    Uploaded on {new Date(row.createdAt).toLocaleDateString()}
                  </Text>
                  <Text style={styles.historyMeta}>
                    Size: {((row.proofFileSize || 0) / 1024).toFixed(2)} KB
                  </Text>
                  {row.status?.toUpperCase() === 'APPROVED' ? (
                    <Text style={styles.approvedNote}>
                      Your proof has been approved by the committee head.
                    </Text>
                  ) : null}
                  {row.status?.toUpperCase() === 'REJECTED' ? (
                    <Text style={styles.rejectedNote}>
                      Your proof was rejected by the committee head.
                    </Text>
                  ) : null}
                  {row.reviewComments ? (
                    <Text style={styles.feedbackNote}>Feedback: {row.reviewComments}</Text>
                  ) : null}
                </View>
                <View style={styles.historyActions}>
                  <Pressable
                    onPress={async () => {
                      try {
                        await openDocumentFromUrl(row.proofFileUrl, {
                          fileName: row.proofFileName || 'proof.pdf',
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
        visible={docTypePickerOpen}
        onClose={() => setDocTypePickerOpen(false)}
        title="Document Type">
        {PROOF_DOCUMENT_TYPES.map((opt) => (
          <Pressable
            key={opt.value}
            style={styles.pickerOption}
            onPress={() => {
              setDocumentType(opt.value);
              setDocTypePickerOpen(false);
            }}>
            <Text style={styles.pickerOptionText}>{opt.label}</Text>
            {documentType === opt.value ? (
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
  infoIconText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  infoContent: { flex: 1 },
  infoTitle: { fontSize: 15, fontWeight: '700', color: '#1e3a8a', marginBottom: 4 },
  infoBody: { fontSize: 13, color: '#1e40af', lineHeight: 20 },
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
  fileName: { flex: 1, fontSize: 14, color: '#374151' },
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
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  historyMeta: { fontSize: 12, color: '#6b7280' },
  approvedNote: { fontSize: 12, color: '#15803d', fontWeight: '600', marginTop: 6 },
  rejectedNote: { fontSize: 12, color: '#dc2626', marginTop: 6 },
  feedbackNote: { fontSize: 12, color: '#dc2626', marginTop: 4 },
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
