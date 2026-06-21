import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import Toast from 'react-native-toast-message';
import { isAxiosError } from 'axios';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { SheetModal, sheetStyles } from '../../components/portal/SheetModal';
import { openDocumentFromUrl } from '../../services/documentService';
import {
  fetchSupervisionRequests,
  formatSupervisionRequests,
  requestSupervisionChanges,
  updateSupervisionRequest,
  type FormattedSupervisionRequest,
  type SupervisionCapacityError,
} from '../../services/teacherService';

function getStatusStyle(status: string) {
  switch (status) {
    case 'ACCEPTED':
      return { backgroundColor: '#22c55e', color: '#fff' };
    case 'REJECTED':
      return { backgroundColor: '#ef4444', color: '#fff' };
    default:
      return { backgroundColor: '#e5e7eb', color: '#374151' };
  }
}

function RequestCard({
  request,
  loading,
  onAccept,
  onReject,
  onRequestChanges,
}: {
  request: FormattedSupervisionRequest;
  loading: boolean;
  onAccept: () => void;
  onReject: () => void;
  onRequestChanges: () => void;
}) {
  const statusStyle = getStatusStyle(request.status);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.studentInfo}>
          <Text style={styles.studentName}>{request.student.name}</Text>
          {request.student.email ? (
            <Text style={styles.studentEmail}>{request.student.email}</Text>
          ) : null}
          <Text style={styles.studentRoll}>
            Roll Number: {request.student.rollNumber}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.backgroundColor }]}>
          <Text style={[styles.statusBadgeText, { color: statusStyle.color }]}>
            {request.status}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Group:</Text>
        <Text style={styles.sectionValue}>{request.groupName}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Leader:</Text>
        <Text style={styles.sectionValue}>{request.leaderName}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Members:</Text>
        <Text style={styles.sectionValue}>{request.memberNames}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Project Name:</Text>
        <Text style={styles.sectionValue}>{request.projectName}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Requirements:</Text>
        <Text style={styles.sectionValue}>{request.requirements}</Text>
      </View>

      {request.message ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Message:</Text>
          <Text style={styles.sectionValue}>{request.message}</Text>
        </View>
      ) : null}

      {request.proposalFileUrl ? (
        <Pressable
          style={styles.proposalLink}
          onPress={async () => {
            try {
              await openDocumentFromUrl(request.proposalFileUrl, {
                fileName: request.proposalFileName || 'proposal.pdf',
              });
            } catch {
              Toast.show({ type: 'error', text1: 'Could not open proposal file' });
            }
          }}>
          <FeatherIcon name="file-text" size={16} color="#2563eb" />
          <Text style={styles.proposalLinkText}>
            View Proposal: {request.proposalFileName || 'Proposal file'}
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.cardFooter}>
        {request.date ? <Text style={styles.dateText}>{request.date}</Text> : <View />}
        {request.status === 'PENDING' ? (
          <View style={styles.actions}>
            <Pressable
              style={[styles.actionBtn, styles.acceptBtn]}
              disabled={loading}
              onPress={onAccept}>
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <FeatherIcon name="check" size={14} color="#fff" />
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.changesBtn]}
              disabled={loading}
              onPress={onRequestChanges}>
              <Text style={styles.changesBtnText}>Request Changes</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, styles.rejectBtn]}
              disabled={loading}
              onPress={onReject}>
              <FeatherIcon name="x" size={14} color="#fff" />
              <Text style={styles.rejectBtnText}>Reject</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export function TeacherSupervisionScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<FormattedSupervisionRequest[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);
  const [capacityError, setCapacityError] = useState<SupervisionCapacityError | null>(null);
  const [changesOpen, setChangesOpen] = useState(false);
  const [changesRequestId, setChangesRequestId] = useState('');
  const [changesFeedback, setChangesFeedback] = useState('');
  const [savingChanges, setSavingChanges] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchSupervisionRequests();
      setRequests(formatSupervisionRequests(Array.isArray(data) ? data : []));
    } catch {
      setRequests([]);
      Toast.show({ type: 'error', text1: 'Failed to load supervision requests' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const pendingCount = useMemo(
    () => requests.filter((req) => req.status === 'PENDING').length,
    [requests],
  );

  const handleAction = async (id: string, action: 'accept' | 'reject') => {
    setActionId(id);
    try {
      await updateSupervisionRequest(id, action);
      Toast.show({
        type: 'success',
        text1: `Request ${action === 'accept' ? 'accepted' : 'rejected'} successfully`,
      });
      await loadData();
    } catch (error) {
      if (
        isAxiosError(error) &&
        error.response?.status === 400 &&
        (error.response.data as { error?: string })?.error === 'Supervision capacity exceeded'
      ) {
        const data = error.response.data as SupervisionCapacityError & { error: string };
        setCapacityError({
          message: data.message,
          capacity: data.capacity,
          currentCount: data.currentCount,
        });
        return;
      }
      Toast.show({
        type: 'error',
        text1: 'Failed to update supervision request',
      });
    } finally {
      setActionId(null);
    }
  };

  const openRequestChanges = (requestId: string) => {
    setChangesRequestId(requestId);
    setChangesFeedback('');
    setChangesOpen(true);
  };

  const handleRequestChanges = async () => {
    if (!changesFeedback.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Please provide feedback for the requested changes',
      });
      return;
    }

    setSavingChanges(true);
    try {
      await requestSupervisionChanges(changesRequestId, changesFeedback.trim());
      Toast.show({
        type: 'success',
        text1: 'Changes requested',
        text2: 'Student has been notified to revise their proposal',
      });
      setChangesOpen(false);
      setChangesRequestId('');
      setChangesFeedback('');
      await loadData();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to request changes' });
    } finally {
      setSavingChanges(false);
    }
  };

  if (loading) {
    return <LoadingView message="Loading supervision requests..." />;
  }

  return (
    <PortalScreenLayout
      title="Supervision Requests"
      subtitle="Approve or reject student requests"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Supervision Requests</Text>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingBadgeText}>{pendingCount} Pending</Text>
        </View>
      </View>

      {requests.length === 0 ? (
        <View style={styles.emptyCard}>
          <FeatherIcon name="user-check" size={48} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No Supervision Requests</Text>
          <Text style={styles.emptyMessage}>
            No students have requested your supervision yet
          </Text>
        </View>
      ) : (
        requests.map((request) => (
          <RequestCard
            key={request.id}
            request={request}
            loading={actionId === request.id}
            onAccept={() => handleAction(request.id, 'accept')}
            onReject={() => handleAction(request.id, 'reject')}
            onRequestChanges={() => openRequestChanges(request.id)}
          />
        ))
      )}

      <SheetModal
        visible={!!capacityError}
        onClose={() => setCapacityError(null)}
        title="Supervision Limit Exceeded"
        subtitle="You cannot accept more requests right now"
        footer={
          <Pressable
            style={[sheetStyles.footerBtn, styles.primaryBtnFull]}
            onPress={() => setCapacityError(null)}>
            <Text style={sheetStyles.footerBtnPrimaryText}>Understood</Text>
          </Pressable>
        }>
        <View style={styles.capacityIconWrap}>
          <FeatherIcon name="x-circle" size={28} color="#dc2626" />
        </View>
        <Text style={sheetStyles.confirmMessage}>{capacityError?.message}</Text>
        <View style={styles.capacityBox}>
          <View style={styles.capacityRow}>
            <Text style={styles.capacityLabel}>Maximum Capacity:</Text>
            <Text style={styles.capacityValue}>{capacityError?.capacity} projects</Text>
          </View>
          <View style={styles.capacityRow}>
            <Text style={styles.capacityLabel}>Currently Supervising:</Text>
            <Text style={styles.capacityValueDanger}>
              {capacityError?.currentCount} projects
            </Text>
          </View>
        </View>
        <Text style={styles.capacityHint}>
          Please complete or reduce your current supervision commitments before accepting new
          requests.
        </Text>
      </SheetModal>

      <SheetModal
        visible={changesOpen}
        onClose={() => !savingChanges && setChangesOpen(false)}
        title="Request Changes"
        subtitle="Provide feedback for the student to revise their proposal"
        footer={
          <View style={sheetStyles.footerRow}>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
              disabled={savingChanges}
              onPress={() => setChangesOpen(false)}>
              <Text style={sheetStyles.footerBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnPrimary]}
              disabled={savingChanges}
              onPress={handleRequestChanges}>
              {savingChanges ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={sheetStyles.footerBtnPrimaryText}>Send Feedback</Text>
              )}
            </Pressable>
          </View>
        }>
        <Text style={styles.fieldLabel}>Feedback</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={changesFeedback}
          onChangeText={setChangesFeedback}
          placeholder="Explain what changes are needed..."
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </SheetModal>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  pendingBadge: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  emptyMessage: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  studentInfo: {
    flex: 1,
    minWidth: 0,
  },
  studentName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  studentEmail: {
    marginTop: 4,
    fontSize: 13,
    color: '#4b5563',
  },
  studentRoll: {
    marginTop: 2,
    fontSize: 12,
    color: '#6b7280',
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  section: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  sectionValue: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 19,
  },
  proposalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  proposalLinkText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  cardFooter: {
    gap: 12,
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    minHeight: 36,
  },
  acceptBtn: {
    backgroundColor: '#16a34a',
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  changesBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  changesBtnText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  rejectBtn: {
    backgroundColor: '#dc2626',
  },
  rejectBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  capacityIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 14,
  },
  capacityBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 14,
    gap: 8,
    marginBottom: 12,
  },
  capacityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capacityLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  capacityValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  capacityValueDanger: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
  },
  capacityHint: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 20,
  },
  primaryBtnFull: {
    backgroundColor: '#2563eb',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  textArea: {
    minHeight: 110,
  },
});
