import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import Toast from 'react-native-toast-message';
import { EmptyState } from '../../components/portal/EmptyState';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { openDocumentFromUrl } from '../../services/documentService';
import {
  getAssignmentForGroup,
  getDefenseTypeLabel,
  getEvaluationStatusBadge,
  isFyp1Accepted,
  loadProjectExecutionForStudent,
  type DefenseSchedule,
  type DefenseType,
} from '../../services/projectExecutionService';
import { useAuthUser } from '../../hooks/useAuthUser';

type ExecTab = 'overview' | 'proposal' | 'fyp1' | 'fyp2';

const TABS: { key: ExecTab; label: string; shortLabel: string }[] = [
  { key: 'overview', label: 'Overview', shortLabel: 'Overview' },
  { key: 'proposal', label: 'Proposal Defense', shortLabel: 'Proposal' },
  { key: 'fyp1', label: 'FYP-I Evaluation', shortLabel: 'FYP-I' },
  { key: 'fyp2', label: 'FYP-II Evaluation', shortLabel: 'FYP-II' },
];

function StatusBadge({ status, attempts }: { status: string; attempts?: number }) {
  const badge = getEvaluationStatusBadge(status, attempts ?? 0);
  return (
    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
      <Text style={[styles.badgeText, { color: badge.text }]} numberOfLines={2}>
        {badge.label}
      </Text>
    </View>
  );
}

function ScheduleBlock({
  schedule,
  groupId,
  userId,
  showArchive,
}: {
  schedule: DefenseSchedule;
  groupId: string;
  userId: string;
  showArchive?: boolean;
}) {
  const assignment = getAssignmentForGroup(schedule, groupId);
  const dateStr = new Date(schedule.defenseDate).toLocaleDateString();

  if (!assignment) {
    return (
      <View style={styles.mutedBox}>
        <Text style={styles.mutedText}>
          {getDefenseTypeLabel(schedule.defenseType)} has not been scheduled for your group yet.
        </Text>
      </View>
    );
  }

  const openArchive = async () => {
    try {
      await openDocumentFromUrl(`/api/projects/${groupId}/archive?userId=${userId}`, {
        fileName: 'project-archive.zip',
        mimeType: 'application/zip',
      });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not open archive' });
    }
  };

  return (
    <View style={styles.evalCard}>
      <View style={styles.evalHeader}>
        <Text style={styles.evalTitle}>Evaluation Status</Text>
        <StatusBadge
          status={assignment.evaluationStatus}
          attempts={assignment.defenseAttempts}
        />
      </View>

      {assignment.evaluationStatus === 'RE_EVALUATION_REQUIRED' ? (
        <View style={styles.reEvalBox}>
          <FeatherIcon name="refresh-cw" size={16} color="#2563eb" />
          <View style={styles.reEvalContent}>
            <Text style={styles.reEvalTitle}>Defense Rescheduled for Re-Evaluation</Text>
            <Text style={styles.reEvalLine}>
              Date: {dateStr} · Time: {schedule.defenseTime}
            </Text>
            <Text style={styles.reEvalLine}>Venue: {schedule.venue}</Text>
          </View>
        </View>
      ) : (
        <View style={styles.metaGrid}>
          <View>
            <Text style={styles.metaLabel}>Date & Time</Text>
            <Text style={styles.metaValue}>
              {dateStr} at {schedule.defenseTime}
            </Text>
          </View>
          <View>
            <Text style={styles.metaLabel}>Venue</Text>
            <Text style={styles.metaValue}>{schedule.venue}</Text>
          </View>
        </View>
      )}

      {assignment.marks != null && assignment.marks !== undefined ? (
        <Text style={styles.marks}>
          Marks: <Text style={styles.marksValue}>{assignment.marks}/100</Text>
        </Text>
      ) : null}

      {assignment.feedback ? (
        <View style={styles.feedbackBox}>
          <Text style={styles.feedbackLabel}>Remarks / Feedback</Text>
          <Text style={styles.feedbackBody}>{assignment.feedback}</Text>
        </View>
      ) : null}

      {assignment.evaluationStatus === 'PENDING' ? (
        <View style={styles.pendingBox}>
          <Text style={styles.pendingText}>
            Your {getDefenseTypeLabel(schedule.defenseType).toLowerCase()} is scheduled.
            Evaluation is pending.
          </Text>
        </View>
      ) : null}

      {assignment.evaluationStatus === 'ACCEPTED' && schedule.defenseType === 'FYP_II' ? (
        <View style={styles.congratsBox}>
          <Text style={styles.congratsTitle}>
            Congratulations! Your FYP-II has been accepted.
          </Text>
          <Text style={styles.congratsBody}>
            A full digital archive has been generated for your group.
          </Text>
        </View>
      ) : null}

      {showArchive &&
      (assignment.evaluationStatus === 'ACCEPTED' || assignment.evaluationStatus === 'PASSED') ? (
        <Pressable style={styles.archiveBtn} onPress={openArchive}>
          <FeatherIcon name="file-text" size={16} color="#fff" />
          <Text style={styles.archiveBtnText}>See Result</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function StudentProjectExecutionScreen() {
  const { user } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<DefenseSchedule[]>([]);
  const [activeTab, setActiveTab] = useState<ExecTab>('overview');

  const load = useCallback(
    async (showSpinner = false) => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      if (showSpinner) setLoading(true);
      try {
        const data = await loadProjectExecutionForStudent();
        setHasAccess(data.hasAccess);
        setGroupId(data.group?.id ?? null);
        setSchedules(data.schedules);
      } catch {
        setHasAccess(false);
        setSchedules([]);
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

  const fyp1Accepted = useMemo(
    () => (groupId ? isFyp1Accepted(schedules, groupId) : false),
    [schedules, groupId],
  );

  const hasFyp2Schedule = schedules.some((s) => s.defenseType === 'FYP_II');
  const fyp2Locked = !fyp1Accepted && !hasFyp2Schedule;

  const filterByType = (type: DefenseType) =>
    schedules.filter((s) => s.defenseType === type);

  if (loading) {
    return <LoadingView message="Loading project execution..." />;
  }

  if (!hasAccess || !groupId || !user?.id) {
    return (
      <PortalScreenLayout
        title="Project Execution"
        subtitle="Track your project defense progress and evaluation status">
        <EmptyState
          icon="lock"
          title="Access not available"
          message="This page is only for students whose groups are scheduled for defense."
        />
      </PortalScreenLayout>
    );
  }

  const refresh = () => {
    setRefreshing(true);
    load(false);
  };

  const renderOverview = () => (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Current Status</Text>
      <Text style={styles.sectionSubtitle}>Your project execution status overview</Text>
      {schedules.map((schedule) => {
        const assignment = getAssignmentForGroup(schedule, groupId);
        const dateStr = new Date(schedule.defenseDate).toLocaleDateString();
        return (
          <View key={schedule.id} style={styles.overviewItem}>
            <View style={styles.overviewHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.overviewType}>{getDefenseTypeLabel(schedule.defenseType)}</Text>
                <Text style={styles.overviewTitle}>{schedule.title}</Text>
              </View>
              {assignment ? (
                <StatusBadge
                  status={assignment.evaluationStatus}
                  attempts={assignment.defenseAttempts}
                />
              ) : null}
            </View>
            {assignment?.evaluationStatus === 'RE_EVALUATION_REQUIRED' ? (
              <View style={styles.reEvalBox}>
                <Text style={styles.reEvalTitle}>Rescheduled for Re-Evaluation</Text>
                <Text style={styles.reEvalLine}>
                  {dateStr} at {schedule.defenseTime} · {schedule.venue}
                </Text>
              </View>
            ) : (
              <Text style={styles.overviewMeta}>
                {dateStr} at {schedule.defenseTime} · {schedule.venue}
              </Text>
            )}
            {assignment?.marks != null && assignment.marks !== undefined ? (
              <Text style={styles.marks}>
                Marks: <Text style={styles.marksValue}>{assignment.marks}/100</Text>
              </Text>
            ) : null}
            {assignment?.feedback ? (
              <Text style={styles.overviewFeedback} numberOfLines={3}>
                {assignment.feedback}
              </Text>
            ) : null}
            {schedule.defenseType === 'FYP_II' &&
            assignment?.evaluationStatus === 'ACCEPTED' ? (
              <Pressable
                style={[styles.archiveBtn, { marginTop: 10 }]}
                onPress={async () => {
                  try {
                    await openDocumentFromUrl(
                      `/api/projects/${groupId}/archive?userId=${user.id}`,
                      {
                        fileName: 'project-archive.zip',
                        mimeType: 'application/zip',
                      },
                    );
                  } catch {
                    Toast.show({ type: 'error', text1: 'Could not open archive' });
                  }
                }}>
                <FeatherIcon name="file-text" size={16} color="#fff" />
                <Text style={styles.archiveBtnText}>See Result</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );

  const renderDefenseTab = (type: DefenseType, emptyTitle: string, showArchive?: boolean) => {
    const list = filterByType(type);
    if (list.length === 0) {
      return (
        <EmptyState icon="clock" title={emptyTitle} message="Check back when your group is scheduled." />
      );
    }
    return list.map((schedule) => (
      <View key={schedule.id} style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{getDefenseTypeLabel(schedule.defenseType)}</Text>
        <Text style={styles.sectionSubtitle}>
          {new Date(schedule.defenseDate).toLocaleDateString()} at {schedule.defenseTime} —{' '}
          {schedule.venue}
        </Text>
        <ScheduleBlock
          schedule={schedule}
          groupId={groupId}
          userId={user.id}
          showArchive={showArchive}
        />
      </View>
    ));
  };

  return (
    <PortalScreenLayout
      title="Project Execution"
      subtitle="Track your project defense progress and evaluation status"
      refreshing={refreshing}
      onRefresh={refresh}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
        <View style={styles.tabRow}>
          {TABS.map((tab) => {
            const disabled = tab.key === 'fyp2' && fyp2Locked;
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[
                  styles.tabChip,
                  active && styles.tabChipActive,
                  disabled && styles.tabChipDisabled,
                ]}
                onPress={() => !disabled && setActiveTab(tab.key)}
                disabled={disabled}>
                <Text
                  style={[
                    styles.tabChipText,
                    active && styles.tabChipTextActive,
                    disabled && styles.tabChipTextDisabled,
                  ]}>
                  {tab.shortLabel}
                  {disabled ? ' (Locked)' : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'proposal' && renderDefenseTab('PROPOSAL', 'Proposal Defense Not Scheduled')}
      {activeTab === 'fyp1' && renderDefenseTab('FYP_I', 'FYP-I Not Scheduled')}
      {activeTab === 'fyp2' &&
        (fyp2Locked ? (
          <EmptyState
            icon="alert-circle"
            title="FYP-II Not Available"
            message="You must complete and pass FYP-I evaluation before FYP-II becomes available."
          />
        ) : (
          renderDefenseTab('FYP_II', 'FYP-II Not Scheduled', true)
        ))}
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  tabScroll: { marginBottom: 12, maxHeight: 44 },
  tabRow: { flexDirection: 'row', gap: 8, paddingRight: 8 },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tabChipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  tabChipDisabled: { opacity: 0.5 },
  tabChipText: { fontSize: 13, fontWeight: '600', color: '#4b5563' },
  tabChipTextActive: { color: '#fff' },
  tabChipTextDisabled: { color: '#9ca3af' },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  sectionSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 4, marginBottom: 14 },
  overviewItem: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 14,
    marginTop: 10,
  },
  overviewHeader: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  overviewType: { fontSize: 15, fontWeight: '700', color: '#111827' },
  overviewTitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  overviewMeta: { fontSize: 13, color: '#6b7280', marginTop: 8 },
  overviewFeedback: { fontSize: 13, color: '#4b5563', marginTop: 8 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, maxWidth: 160 },
  badgeText: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  evalCard: { gap: 12 },
  evalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  evalTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  metaGrid: { gap: 10 },
  metaLabel: { fontSize: 12, color: '#6b7280' },
  metaValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  marks: { fontSize: 14, color: '#374151', marginTop: 4 },
  marksValue: { fontSize: 18, fontWeight: '800', color: '#16a34a' },
  feedbackBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
  },
  feedbackLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  feedbackBody: { fontSize: 13, color: '#4b5563', lineHeight: 20 },
  pendingBox: {
    backgroundColor: '#fefce8',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fde047',
  },
  pendingText: { fontSize: 13, color: '#854d0e' },
  reEvalBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  reEvalContent: { flex: 1 },
  reEvalTitle: { fontSize: 13, fontWeight: '700', color: '#1e40af', marginBottom: 4 },
  reEvalLine: { fontSize: 12, color: '#1d4ed8' },
  mutedBox: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  mutedText: { fontSize: 13, color: '#6b7280' },
  congratsBox: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  congratsTitle: { fontSize: 14, fontWeight: '700', color: '#166534' },
  congratsBody: { fontSize: 12, color: '#15803d', marginTop: 4 },
  archiveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  archiveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
