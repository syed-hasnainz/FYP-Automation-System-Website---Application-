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
import { fetchMyGroupDetails } from '../../services/groupService';
import {
  createEmptyProposalForm,
  fetchGroupUploads,
  PROJECT_TRACK_OPTIONS,
  uploadStudentFile,
  UPLOAD_TYPE_OPTIONS,
  type ProposalFormData,
  type ProposalMember,
  type ReportFormData,
  type UploadType,
} from '../../services/proposalService';
import { useAuthUser } from '../../hooks/useAuthUser';

type PickedFile = {
  name: string;
  uri: string;
  type: string;
};

const REQUIRED_MEMBER_INDICES = [0, 1];

function isRequiredMemberIndex(index: number) {
  return REQUIRED_MEMBER_INDICES.includes(index);
}

function isValidGmailEmail(email: string) {
  return /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email.trim());
}

function FormLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <Text style={styles.label}>
      {children}
      {required ? ' *' : ''}
    </Text>
  );
}

function FormInput({
  value,
  onChangeText,
  placeholder,
  editable = true,
  keyboardType,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  editable?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
}) {
  return (
    <TextInput
      style={[styles.input, !editable && styles.inputDisabled]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      editable={editable}
      keyboardType={keyboardType}
      autoCapitalize="none"
    />
  );
}

export function StudentProposalScreen() {
  const { user } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasGroup, setHasGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [isGroupLeader, setIsGroupLeader] = useState(false);
  const [groupMemberIds, setGroupMemberIds] = useState<string[]>([]);
  const [uploadType, setUploadType] = useState<UploadType>('proposal');
  const [uploadTypePickerOpen, setUploadTypePickerOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<PickedFile | null>(null);
  const [proposalData, setProposalData] = useState<ProposalFormData>(createEmptyProposalForm);
  const [reportData, setReportData] = useState<ReportFormData>({
    title: '',
    description: '',
  });
  const [recentUploads, setRecentUploads] = useState<
    Awaited<ReturnType<typeof fetchGroupUploads>>
  >([]);

  const loadData = useCallback(async () => {
    try {
      const groupRes = await fetchMyGroupDetails();
      if (groupRes?.hasGroup && groupRes.group) {
        setHasGroup(true);
        setGroupName(groupRes.group.name);
        setIsGroupLeader(!!groupRes.group.isLeader);
        const memberIds = groupRes.group.members?.map((m) => m.id) ?? [];
        setGroupMemberIds(memberIds);
        if (memberIds.length) {
          const uploads = await fetchGroupUploads(memberIds).catch(() => []);
          setRecentUploads(uploads);
        }
      } else {
        setHasGroup(false);
        setGroupName('');
        setIsGroupLeader(false);
        setGroupMemberIds([]);
        setRecentUploads([]);
      }
    } catch {
      setHasGroup(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const pickFile = async () => {
    if (!isGroupLeader) {
      Alert.alert('Access denied', 'Only the group leader can upload proposals.');
      return;
    }
    try {
      const [file] = await pick({
        type: [types.pdf, types.doc, types.docx],
      });
      if (!file?.uri || !file.name) {
        return;
      }
      const [localCopy] = await keepLocalCopy({
        files: [{ uri: file.uri, fileName: file.name }],
        destination: 'cachesDirectory',
      });
      const uri =
        localCopy?.status === 'success' ? localCopy.localUri : file.uri;
      setSelectedFile({
        name: file.name,
        uri,
        type: file.type ?? 'application/pdf',
      });
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        return;
      }
      Alert.alert('Error', 'Could not pick file');
    }
  };

  const updateMember = (index: number, field: keyof ProposalMember, value: string) => {
    setProposalData((prev) => {
      const members = prev.members.map((member, i) =>
        i === index ? { ...member, [field]: value } : member,
      );
      return { ...prev, members };
    });
  };

  const validateAndSubmit = async () => {
    if (!isGroupLeader) {
      Alert.alert('Access denied', 'Only the group leader can upload files.');
      return;
    }
    if (!selectedFile) {
      Alert.alert('No file', 'Please select a file to upload.');
      return;
    }
    if (!user?.id || !user.name) {
      Alert.alert('Error', 'User session not found.');
      return;
    }

    if (uploadType === 'proposal') {
      if (
        !proposalData.title.trim() ||
        !proposalData.programOfStudy.trim() ||
        !proposalData.session.trim() ||
        !proposalData.domain.trim()
      ) {
        Alert.alert(
          'Missing information',
          'Please fill Title, Program of Study, Session, and Domain.',
        );
        return;
      }
      const lead = proposalData.members[0];
      const memberTwo = proposalData.members[1];
      if (!lead.name.trim() || !lead.cmsId.trim() || !lead.email.trim()) {
        Alert.alert(
          'Missing information',
          "Please fill team lead's Name, CMS ID, and Email (Student #1).",
        );
        return;
      }
      if (
        !memberTwo.name.trim() ||
        !memberTwo.cmsId.trim() ||
        !memberTwo.email.trim()
      ) {
        Alert.alert(
          'Missing information',
          "Please fill Student #2's Name, CMS ID, and Email.",
        );
        return;
      }
      if (!isValidGmailEmail(lead.email)) {
        Alert.alert(
          'Invalid email',
          'Student #1 must use a valid @gmail.com email address.',
        );
        return;
      }
      if (!isValidGmailEmail(memberTwo.email)) {
        Alert.alert(
          'Invalid email',
          'Student #2 must use a valid @gmail.com email address.',
        );
        return;
      }
      const optionalMember = proposalData.members[2];
      if (optionalMember.email.trim() && !isValidGmailEmail(optionalMember.email)) {
        Alert.alert(
          'Invalid email',
          'Student #3 email must be a valid @gmail.com address if provided.',
        );
        return;
      }
    } else if (!reportData.title.trim() || !reportData.description.trim()) {
      Alert.alert('Missing information', 'Please provide a title and description.');
      return;
    }

    setSubmitting(true);
    try {
      if (uploadType === 'proposal') {
        const proposalFormPayload = {
          projectTrack: proposalData.projectTrack,
          programOfStudy: proposalData.programOfStudy.trim(),
          session: proposalData.session.trim(),
          domain: proposalData.domain.trim(),
          date: proposalData.date,
          members: proposalData.members.filter(
            (m) => m.name.trim() || m.cmsId.trim() || m.email.trim(),
          ),
        };
        await uploadStudentFile({
          fileUri: selectedFile.uri,
          fileName: selectedFile.name,
          mimeType: selectedFile.type,
          uploadType: 'proposal',
          userId: user.id,
          userName: user.name,
          projectTitle: proposalData.title.trim(),
          description: JSON.stringify(proposalFormPayload),
          fileType: 'PROPOSAL',
          type: 'proposal',
        });
      } else if (uploadType === 'report') {
        await uploadStudentFile({
          fileUri: selectedFile.uri,
          fileName: selectedFile.name,
          mimeType: selectedFile.type,
          uploadType: 'report',
          userId: user.id,
          userName: user.name,
          projectTitle: reportData.title.trim(),
          description: reportData.description.trim(),
          fileType: 'REPORT',
          type: 'report',
        });
      } else {
        await uploadStudentFile({
          fileUri: selectedFile.uri,
          fileName: selectedFile.name,
          mimeType: selectedFile.type,
          uploadType: 'documentation',
          userId: user.id,
          userName: user.name,
          projectTitle: reportData.title.trim(),
          description: reportData.description.trim(),
          fileType: 'DOCUMENTATION',
          type: 'documentation',
        });
      }

      Toast.show({
        type: 'success',
        text1: 'Upload successful',
        text2: `${selectedFile.name} has been uploaded.`,
      });

      setSelectedFile(null);
      setUploadType('proposal');
      setProposalData(createEmptyProposalForm());
      setReportData({ title: '', description: '' });
      await loadData();
    } catch (error) {
      Alert.alert(
        'Upload failed',
        error instanceof Error ? error.message : 'Failed to upload file.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const uploadTypeLabel =
    UPLOAD_TYPE_OPTIONS.find((o) => o.value === uploadType)?.label ?? 'Proposal Submission Form';

  if (loading) {
    return <LoadingView message="Loading proposal form..." />;
  }

  return (
    <PortalScreenLayout
      title="Proposal Submission Form"
      subtitle="Department of Computing - FYP proposal submission"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
      {!hasGroup ? (
        <EmptyState
          icon="users"
          title="No group found"
          message="You need to be part of a group to upload proposals."
        />
      ) : (
        <>
          <Text style={styles.pageTitle}>Proposal Submission Form</Text>
          <Text style={styles.pageSub}>
            Department of Computing - Final Year Project Proposal Submission Form
          </Text>
          <Text style={styles.groupLine}>Group: {groupName}</Text>

          {!isGroupLeader ? (
            <View style={[styles.banner, styles.bannerWarning]}>
              <FeatherIcon name="alert-circle" size={18} color="#ca8a04" />
              <Text style={styles.bannerWarningText}>
                Only the group leader can upload proposals.
              </Text>
            </View>
          ) : null}

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <FeatherIcon name="upload" size={18} color="#111827" />
              <Text style={styles.cardTitle}>{uploadTypeLabel}</Text>
            </View>

            <FormLabel required>Upload Type</FormLabel>
            <Pressable
              style={[styles.pickerBtn, !isGroupLeader && styles.disabled]}
              onPress={() => isGroupLeader && setUploadTypePickerOpen(true)}
              disabled={!isGroupLeader}>
              <Text style={styles.pickerBtnText}>{uploadTypeLabel}</Text>
              <FeatherIcon name="chevron-down" size={18} color="#6b7280" />
            </Pressable>

            <FormLabel required>File</FormLabel>
            <Pressable
              style={[styles.fileDrop, !isGroupLeader && styles.disabled]}
              onPress={pickFile}
              disabled={!isGroupLeader}>
              <FeatherIcon name="upload-cloud" size={32} color="#9ca3af" />
              <Text style={styles.fileDropTitle}>
                {selectedFile
                  ? selectedFile.name
                  : 'Tap to browse PDF, DOC, or DOCX (max 10MB)'}
              </Text>
              {selectedFile ? (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation?.();
                    setSelectedFile(null);
                  }}
                  hitSlop={8}>
                  <Text style={styles.clearFile}>Remove file</Text>
                </Pressable>
              ) : null}
            </Pressable>

            {uploadType === 'proposal' ? (
              <View style={styles.section}>
                <View style={styles.sectionBanner}>
                  <Text style={styles.sectionBannerText}>
                    Project Details (to be filled-in by student)
                  </Text>
                </View>

                <FormLabel required>Project Title</FormLabel>
                <FormInput
                  value={proposalData.title}
                  onChangeText={(text) =>
                    setProposalData((prev) => ({ ...prev, title: text }))
                  }
                  placeholder="Enter project title"
                  editable={isGroupLeader}
                />

                <FormLabel required>Project Track</FormLabel>
                <View style={styles.trackRow}>
                  {PROJECT_TRACK_OPTIONS.map((track) => {
                    const selected = proposalData.projectTrack === track;
                    return (
                      <Pressable
                        key={track}
                        style={[styles.trackChip, selected && styles.trackChipActive]}
                        onPress={() =>
                          isGroupLeader &&
                          setProposalData((prev) => ({ ...prev, projectTrack: track }))
                        }
                        disabled={!isGroupLeader}>
                        <View
                          style={[styles.radioOuter, selected && styles.radioOuterActive]}>
                          {selected ? <View style={styles.radioInner} /> : null}
                        </View>
                        <Text
                          style={[
                            styles.trackChipText,
                            selected && styles.trackChipTextActive,
                          ]}>
                          {track}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <FormLabel required>Program of Study</FormLabel>
                <FormInput
                  value={proposalData.programOfStudy}
                  onChangeText={(text) =>
                    setProposalData((prev) => ({ ...prev, programOfStudy: text }))
                  }
                  placeholder="e.g., BS Computer Science"
                  editable={isGroupLeader}
                />

                <FormLabel required>Session</FormLabel>
                <FormInput
                  value={proposalData.session}
                  onChangeText={(text) =>
                    setProposalData((prev) => ({ ...prev, session: text }))
                  }
                  placeholder="e.g., Fall 2025"
                  editable={isGroupLeader}
                />

                <FormLabel required>Domain / Area of Project</FormLabel>
                <FormInput
                  value={proposalData.domain}
                  onChangeText={(text) =>
                    setProposalData((prev) => ({ ...prev, domain: text }))
                  }
                  placeholder="e.g., Web Development, AI, Mobile Apps"
                  editable={isGroupLeader}
                />

                <FormLabel required>Date</FormLabel>
                <FormInput
                  value={proposalData.date}
                  onChangeText={(text) =>
                    setProposalData((prev) => ({ ...prev, date: text }))
                  }
                  placeholder="YYYY-MM-DD"
                  editable={isGroupLeader}
                />

                <Text style={styles.membersHeading}>
                  Project Member(s)
                </Text>
                {proposalData.members.map((member, index) => (
                  <View key={`member-${index}`} style={styles.memberCard}>
                    <Text style={styles.memberTitle}>
                      Student #{index + 1}
                      {index === 0 ? ' (Team Lead)' : ''}
                      {isRequiredMemberIndex(index) ? ' *' : ''}
                    </Text>
                    <FormLabel required={isRequiredMemberIndex(index)}>Name</FormLabel>
                    <FormInput
                      value={member.name}
                      onChangeText={(text) => updateMember(index, 'name', text)}
                      placeholder="Full name"
                      editable={isGroupLeader}
                    />
                    <FormLabel required={isRequiredMemberIndex(index)}>CMS ID</FormLabel>
                    <FormInput
                      value={member.cmsId}
                      onChangeText={(text) => updateMember(index, 'cmsId', text)}
                      placeholder="CMS ID"
                      editable={isGroupLeader}
                    />
                    <FormLabel>Cell #</FormLabel>
                    <FormInput
                      value={member.cellNumber}
                      onChangeText={(text) => updateMember(index, 'cellNumber', text)}
                      placeholder="Phone number"
                      editable={isGroupLeader}
                      keyboardType="phone-pad"
                    />
                    <FormLabel required={isRequiredMemberIndex(index)}>E-mail ID</FormLabel>
                    <FormInput
                      value={member.email}
                      onChangeText={(text) => updateMember(index, 'email', text)}
                      placeholder="name@gmail.com"
                      editable={isGroupLeader}
                      keyboardType="email-address"
                    />
                  </View>
                ))}

                <View style={styles.supervisorNote}>
                  <Text style={styles.supervisorNoteTitle}>Supervisor Recommendation</Text>
                  <Text style={styles.supervisorNoteText}>
                    This section will be filled by the supervisor after reviewing your
                    proposal.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.section}>
                <FormLabel required>Project Title</FormLabel>
                <FormInput
                  value={reportData.title}
                  onChangeText={(text) =>
                    setReportData((prev) => ({ ...prev, title: text }))
                  }
                  placeholder="Enter project title"
                  editable={isGroupLeader}
                />
                <FormLabel required>Description</FormLabel>
                <TextInput
                  style={[styles.input, styles.textArea, !isGroupLeader && styles.inputDisabled]}
                  value={reportData.description}
                  onChangeText={(text) =>
                    setReportData((prev) => ({ ...prev, description: text }))
                  }
                  placeholder={`Enter description for ${uploadType}`}
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  editable={isGroupLeader}
                />
              </View>
            )}

            <Pressable
              style={[
                styles.submitBtn,
                (!isGroupLeader || submitting || !selectedFile) && styles.submitBtnDisabled,
              ]}
              onPress={validateAndSubmit}
              disabled={!isGroupLeader || submitting || !selectedFile}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <FeatherIcon name="upload" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>
                    {uploadType === 'proposal'
                      ? 'Submit Proposal Form'
                      : uploadType === 'report'
                        ? 'Upload Report'
                        : 'Upload Documentation'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {recentUploads.length > 0 ? (
            <View style={styles.recentSection}>
              <Text style={styles.recentTitle}>Recent Uploads</Text>
              {recentUploads.slice(0, 5).map((file) => (
                <View key={file.id} style={styles.recentRow}>
                  <FeatherIcon name="file-text" size={16} color="#2563eb" />
                  <View style={styles.recentBody}>
                    <Text style={styles.recentName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text style={styles.recentMeta}>
                      {[file.fileType, file.status, file.studentName]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </>
      )}

      <SheetModal
        visible={uploadTypePickerOpen}
        onClose={() => setUploadTypePickerOpen(false)}
        title="Upload Type">
        {UPLOAD_TYPE_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            style={styles.pickerOption}
            onPress={() => {
              setUploadType(option.value);
              setSelectedFile(null);
              setUploadTypePickerOpen(false);
            }}>
            <Text style={styles.pickerOptionText}>{option.label}</Text>
            {uploadType === option.value ? (
              <FeatherIcon name="check" size={18} color="#2563eb" />
            ) : null}
          </Pressable>
        ))}
      </SheetModal>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  pageSub: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
    lineHeight: 18,
  },
  groupLine: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  bannerWarning: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde047',
  },
  bannerWarningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#854d0e',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  inputDisabled: {
    backgroundColor: '#f9fafb',
    color: '#9ca3af',
  },
  textArea: {
    minHeight: 100,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  pickerBtnText: {
    fontSize: 14,
    color: '#111827',
  },
  fileDrop: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  fileDropTitle: {
    marginTop: 10,
    fontSize: 13,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 18,
  },
  clearFile: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#dc2626',
  },
  section: {
    marginTop: 8,
  },
  sectionBanner: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  sectionBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e40af',
  },
  trackRow: {
    gap: 8,
    marginBottom: 4,
  },
  trackChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  trackChipActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  trackChipText: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  trackChipTextActive: {
    color: '#1d4ed8',
    fontWeight: '600',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: '#2563eb',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
  },
  membersHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 10,
    lineHeight: 20,
  },
  memberCard: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  memberTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  supervisorNote: {
    backgroundColor: '#fefce8',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  supervisorNoteTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  supervisorNoteText: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 17,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 16,
  },
  submitBtnDisabled: {
    opacity: 0.55,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.55,
  },
  recentSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
  },
  recentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  recentBody: {
    flex: 1,
  },
  recentName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  recentMeta: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
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
    color: '#111827',
  },
});
