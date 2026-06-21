import React, { useCallback, useMemo, useState } from 'react';
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
import Toast from 'react-native-toast-message';
import { EmptyState } from '../../components/portal/EmptyState';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { SheetModal, sheetStyles } from '../../components/portal/SheetModal';
import {
  fetchCommitteeGroups,
  fetchCommitteeReportAnalytics,
  fetchCommitteeReports,
  generateCommitteeReport,
  type CommitteeGroup,
  type CommitteeReport,
  type CommitteeReportAnalytics,
  type CommitteeReportDateRange,
  type CommitteeReportPayload,
  type CommitteeReportType,
} from '../../services/committeeService';
import { authGet } from '../../services/apiClient';
import { openDocumentFromUrl } from '../../services/documentService';

const ACCENT = '#16a34a';

const REPORT_TYPES: { value: CommitteeReportType; label: string }[] = [
  { value: 'PROJECT_SUMMARY', label: 'Project Summary' },
  { value: 'GROUP_REPORT', label: 'Group Report (Complete Digital File)' },
  { value: 'PERFORMANCE', label: 'Committee Performance' },
  { value: 'REVIEW_ANALYSIS', label: 'Review Analysis' },
  { value: 'MEETING_SUMMARY', label: 'Meeting Summary' },
];

const DATE_RANGES: { value: CommitteeReportDateRange; label: string }[] = [
  { value: 'LAST_WEEK', label: 'Last Week' },
  { value: 'LAST_MONTH', label: 'Last Month' },
  { value: 'LAST_QUARTER', label: 'Last Quarter' },
  { value: 'LAST_YEAR', label: 'Last Year' },
  { value: 'ALL_TIME', label: 'All Time' },
];

const DEPARTMENTS = [
  { value: 'ALL', label: 'All Departments' },
  { value: 'CS', label: 'Computer Science' },
  { value: 'SE', label: 'Software Engineering' },
  { value: 'IT', label: 'Information Technology' },
];

const emptyForm: CommitteeReportPayload = {
  type: 'PROJECT_SUMMARY',
  dateRange: 'LAST_MONTH',
  department: 'ALL',
  groupId: '',
};

function formatDate(dateValue?: string) {
  if (!dateValue) {
    return 'N/A';
  }
  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? 'N/A' : parsed.toLocaleDateString();
}

function getGroupLabel(group: CommitteeGroup) {
  const projectTitle = group.projects?.[0]?.title;
  return projectTitle ? `${group.name} - ${projectTitle}` : group.name;
}

function AnalyticsCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  color: string;
}) {
  return (
    <View style={styles.analyticsCard}>
      <Text style={styles.analyticsTitle}>{title}</Text>
      <Text style={[styles.analyticsValue, { color }]}>{value}</Text>
      <Text style={styles.analyticsSubtitle}>{subtitle}</Text>
    </View>
  );
}

function DropdownField({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.formField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable style={styles.dropdownField} onPress={onPress}>
        <Text style={styles.dropdownText} numberOfLines={2}>
          {value}
        </Text>
        <FeatherIcon name="chevron-down" size={16} color="#6b7280" />
      </Pressable>
    </View>
  );
}

async function buildReportDownloadPath(report: CommitteeReport): Promise<string | null> {
  let groupId = report.groupId || report.data?.group?.id || null;

  if (!groupId && report.defenseScheduleId) {
    try {
      const schedule = await authGet<{
        juryAssignments?: Array<{ groupId?: string }>;
      }>(`/api/admin/jury/schedules/${report.defenseScheduleId}`);
      groupId = schedule.juryAssignments?.[0]?.groupId || null;
    } catch {
      // Defense schedule lookup is optional for download.
    }
  }

  const reportId = report.id || report.defenseScheduleId;
  if (!reportId) {
    return null;
  }

  let path = `/api/committee/reports/${reportId}/download`;
  if (groupId) {
    path += `?groupId=${groupId}`;
  }
  return path;
}

export function CommitteeReportsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [reports, setReports] = useState<CommitteeReport[]>([]);
  const [analytics, setAnalytics] = useState<CommitteeReportAnalytics>({
    projectCompletionRate: 0,
    averageReviewScore: 0,
    committeeEfficiency: 0,
  });
  const [availableGroups, setAvailableGroups] = useState<CommitteeGroup[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<CommitteeReportPayload>(emptyForm);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [departmentPickerOpen, setDepartmentPickerOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [reportData, analyticsData] = await Promise.all([
        fetchCommitteeReports().catch(() => []),
        fetchCommitteeReportAnalytics().catch(() => ({
          projectCompletionRate: 0,
          averageReviewScore: 0,
          committeeEfficiency: 0,
        })),
      ]);
      setReports(Array.isArray(reportData) ? reportData : []);
      setAnalytics(analyticsData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadGroups = useCallback(async () => {
    try {
      const data = await fetchCommitteeGroups('all');
      setAvailableGroups(Array.isArray(data) ? data : []);
    } catch {
      setAvailableGroups([]);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const openGenerateForm = useCallback(async () => {
    setForm(emptyForm);
    setFormOpen(true);
    await loadGroups();
  }, [loadGroups]);

  const showGroupField =
    form.type === 'GROUP_REPORT' || form.type === 'PROJECT_SUMMARY';

  const selectedTypeLabel =
    REPORT_TYPES.find((item) => item.value === form.type)?.label || form.type;
  const selectedDateLabel =
    DATE_RANGES.find((item) => item.value === form.dateRange)?.label || form.dateRange;
  const selectedDepartmentLabel =
    DEPARTMENTS.find((item) => item.value === form.department)?.label || form.department;
  const selectedGroupLabel = useMemo(() => {
    if (!form.groupId) {
      return 'Select a group';
    }
    const group = availableGroups.find((item) => item.id === form.groupId);
    return group ? getGroupLabel(group) : 'Select a group';
  }, [availableGroups, form.groupId]);

  const canGenerate =
    !generating && !(form.type === 'GROUP_REPORT' && !form.groupId?.trim());

  const handleGenerate = async () => {
    if (form.type === 'GROUP_REPORT' && !form.groupId?.trim()) {
      Alert.alert('Validation', 'Please select a group for the group report.');
      return;
    }

    setGenerating(true);
    try {
      const payload: CommitteeReportPayload = {
        type: form.type,
        dateRange: form.dateRange,
        department: form.department,
        groupId: form.groupId?.trim() || undefined,
      };
      const newReport = await generateCommitteeReport(payload);
      setReports((prev) => [newReport, ...prev]);
      setFormOpen(false);
      setForm(emptyForm);
      Alert.alert('Success', 'Report generated successfully.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to generate report.';
      Alert.alert('Error', message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async (report: CommitteeReport) => {
    setDownloadingId(report.id);
    try {
      const path = await buildReportDownloadPath(report);
      if (!path) {
        Alert.alert('Error', 'Report ID not found.');
        return;
      }
      await openDocumentFromUrl(path, {
        fileName: `${report.title || 'report'}.pdf`,
        mimeType: 'application/pdf',
      });
    } catch {
      Alert.alert('Error', 'Failed to open report.');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return <LoadingView message="Loading reports..." />;
  }

  return (
    <PortalScreenLayout
      title="Reports & Analytics"
      subtitle="Generate reports and view analytics"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.pageTitle}>Reports & Analytics</Text>
          <Text style={styles.pageSub}>Generate reports and view analytics</Text>
        </View>
        <Pressable style={styles.generateBtn} onPress={openGenerateForm}>
          <FeatherIcon name="plus" size={16} color="#fff" />
          <Text style={styles.generateBtnText}>Generate Report</Text>
        </Pressable>
      </View>

      <View style={styles.analyticsGrid}>
        <AnalyticsCard
          title="Project Completion Rate"
          value={`${analytics.projectCompletionRate}%`}
          subtitle="Last 30 days"
          color={ACCENT}
        />
        <AnalyticsCard
          title="Average Review Score"
          value={String(analytics.averageReviewScore)}
          subtitle="Out of 100"
          color="#2563eb"
        />
        <AnalyticsCard
          title="Committee Efficiency"
          value={`${analytics.committeeEfficiency}%`}
          subtitle="Defense completion"
          color="#9333ea"
        />
      </View>

      <View style={styles.reportsSection}>
        <Text style={styles.reportsTitle}>Generated Reports</Text>
        <Text style={styles.reportsSub}>Download and manage committee reports</Text>

        {reports.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="bar-chart-2"
              title="No Reports Generated"
              message="Generate your first report to get started"
            />
            <Pressable style={styles.emptyGenerateBtn} onPress={openGenerateForm}>
              <FeatherIcon name="plus" size={16} color="#fff" />
              <Text style={styles.generateBtnText}>Generate Report</Text>
            </Pressable>
          </View>
        ) : (
          reports.map((report) => (
            <View key={report.id} style={styles.reportCard}>
              <View style={styles.reportIconWrap}>
                <FeatherIcon name="file-text" size={20} color={ACCENT} />
              </View>
              <View style={styles.reportBody}>
                <Text style={styles.reportTitle} numberOfLines={2}>
                  {report.title}
                </Text>
                <Text style={styles.reportDate}>
                  Generated on {formatDate(report.generatedDate)}
                </Text>
                <View style={styles.reportFooter}>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{report.status}</Text>
                  </View>
                  <Pressable
                    style={styles.downloadBtn}
                    disabled={downloadingId === report.id}
                    onPress={() => handleDownload(report)}>
                    {downloadingId === report.id ? (
                      <ActivityIndicator size="small" color="#374151" />
                    ) : (
                      <>
                        <FeatherIcon name="download" size={14} color="#374151" />
                        <Text style={styles.downloadBtnText}>Download</Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <SheetModal
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title="Generate Report"
        subtitle="Generate a new committee report with complete project data"
        footer={
          <View style={sheetStyles.footerRow}>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
              onPress={() => setFormOpen(false)}
              disabled={generating}>
              <Text style={sheetStyles.footerBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                sheetStyles.footerBtn,
                sheetStyles.footerBtnPrimary,
                !canGenerate && styles.btnDisabled,
              ]}
              onPress={handleGenerate}
              disabled={!canGenerate}>
              {generating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={sheetStyles.footerBtnPrimaryText}>Generate Report</Text>
              )}
            </Pressable>
          </View>
        }>
        <DropdownField
          label="Report Type"
          value={selectedTypeLabel}
          onPress={() => setTypePickerOpen(true)}
        />
        {showGroupField ? (
          <DropdownField
            label="Select Group"
            value={selectedGroupLabel}
            onPress={() => setGroupPickerOpen(true)}
          />
        ) : null}
        <DropdownField
          label="Date Range"
          value={selectedDateLabel}
          onPress={() => setDatePickerOpen(true)}
        />
        <DropdownField
          label="Department"
          value={selectedDepartmentLabel}
          onPress={() => setDepartmentPickerOpen(true)}
        />
      </SheetModal>

      <PickerModal
        visible={typePickerOpen}
        title="Report Type"
        onClose={() => setTypePickerOpen(false)}
        options={REPORT_TYPES.map((item) => ({ value: item.value, label: item.label }))}
        selected={form.type}
        onSelect={(value) => {
          setForm((prev) => ({
            ...prev,
            type: value as CommitteeReportType,
            groupId: value === 'GROUP_REPORT' || value === 'PROJECT_SUMMARY' ? prev.groupId : '',
          }));
          setTypePickerOpen(false);
        }}
      />

      <PickerModal
        visible={groupPickerOpen}
        title="Select Group"
        onClose={() => setGroupPickerOpen(false)}
        options={availableGroups.map((group) => ({
          value: group.id,
          label: getGroupLabel(group),
        }))}
        selected={form.groupId || ''}
        onSelect={(value) => {
          setForm((prev) => ({ ...prev, groupId: value }));
          setGroupPickerOpen(false);
        }}
        emptyMessage="No groups available"
      />

      <PickerModal
        visible={datePickerOpen}
        title="Date Range"
        onClose={() => setDatePickerOpen(false)}
        options={DATE_RANGES.map((item) => ({ value: item.value, label: item.label }))}
        selected={form.dateRange}
        onSelect={(value) => {
          setForm((prev) => ({ ...prev, dateRange: value as CommitteeReportDateRange }));
          setDatePickerOpen(false);
        }}
      />

      <PickerModal
        visible={departmentPickerOpen}
        title="Department"
        onClose={() => setDepartmentPickerOpen(false)}
        options={DEPARTMENTS.map((item) => ({ value: item.value, label: item.label }))}
        selected={form.department}
        onSelect={(value) => {
          setForm((prev) => ({ ...prev, department: value }));
          setDepartmentPickerOpen(false);
        }}
      />
    </PortalScreenLayout>
  );
}

function PickerModal({
  visible,
  title,
  onClose,
  options,
  selected,
  onSelect,
  emptyMessage,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  options: Array<{ value: string; label: string }>;
  selected: string;
  onSelect: (value: string) => void;
  emptyMessage?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <View style={styles.pickerSheet}>
          <Text style={styles.pickerTitle}>{title}</Text>
          {options.length === 0 ? (
            <Text style={styles.pickerEmpty}>{emptyMessage || 'No options available'}</Text>
          ) : (
            options.map((option) => (
              <Pressable
                key={option.value}
                style={styles.pickerOption}
                onPress={() => onSelect(option.value)}>
                <Text
                  style={[
                    styles.pickerOptionText,
                    selected === option.value && styles.pickerOptionTextActive,
                  ]}
                  numberOfLines={2}>
                  {option.label}
                </Text>
                {selected === option.value ? (
                  <FeatherIcon name="check" size={16} color={ACCENT} />
                ) : null}
              </Pressable>
            ))
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    marginBottom: 14,
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  pageSub: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  generateBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  analyticsGrid: {
    gap: 10,
    marginBottom: 14,
  },
  analyticsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  analyticsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  analyticsValue: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  analyticsSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  reportsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  reportsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  reportsSub: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  emptyWrap: {
    alignItems: 'center',
  },
  emptyGenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  reportCard: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  reportIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportBody: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  reportDate: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 10,
  },
  reportFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusBadge: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '600',
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 110,
    justifyContent: 'center',
  },
  downloadBtnText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  formField: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  dropdownField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  btnDisabled: {
    opacity: 0.6,
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
    maxHeight: '70%',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  pickerEmpty: {
    fontSize: 14,
    color: '#6b7280',
    paddingVertical: 16,
    textAlign: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerOptionText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
  },
  pickerOptionTextActive: {
    color: ACCENT,
    fontWeight: '600',
  },
});
