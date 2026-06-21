import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import Toast from 'react-native-toast-message';
import { EmptyState } from '../../components/portal/EmptyState';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { SheetModal, sheetStyles } from '../../components/portal/SheetModal';
import {
  acceptGroupRequest,
  cancelGroupRequest,
  fetchMyGroupDetails,
  fetchReceivedGroupRequests,
  fetchSentGroupRequests,
  leaveGroup,
  rejectGroupRequest,
  searchStudents,
  sendGroupRequest,
  updateGroupName,
  type GroupRequestRow,
  type MyGroupDetails,
  type SearchStudent,
  type StudentSearchType,
} from '../../services/groupService';

type GroupTab = 'your-group' | 'search' | 'sent' | 'received';

const MIN_GROUP_MEMBERS = 2;
const MAX_GROUP_MEMBERS = 3;

const TABS: { key: GroupTab; label: string; shortLabel: string; icon: string }[] = [
  { key: 'your-group', label: 'Your Group', shortLabel: 'Group', icon: 'users' },
  { key: 'search', label: 'Find Members', shortLabel: 'Find', icon: 'search' },
  { key: 'sent', label: 'Sent Requests', shortLabel: 'Sent', icon: 'send' },
  { key: 'received', label: 'Received', shortLabel: 'Received', icon: 'user-plus' },
];

function statusColors(status: string) {
  const upper = status.toUpperCase();
  if (upper === 'ACCEPTED') {
    return { bg: '#dcfce7', text: '#15803d' };
  }
  if (upper === 'REJECTED') {
    return { bg: '#fee2e2', text: '#b91c1c' };
  }
  return { bg: '#f3f4f6', text: '#4b5563' };
}

export function StudentGroupsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<GroupTab>('your-group');
  const [myGroup, setMyGroup] = useState<MyGroupDetails | null>(null);
  const [hasGroup, setHasGroup] = useState(false);
  const [sentRequests, setSentRequests] = useState<GroupRequestRow[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<GroupRequestRow[]>([]);
  const [students, setStudents] = useState<SearchStudent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<StudentSearchType>('name');
  const [searching, setSearching] = useState(false);
  const [searchTypePickerOpen, setSearchTypePickerOpen] = useState(false);
  const [projectRequestModalOpen, setProjectRequestModalOpen] = useState(false);
  const [projectTitleInput, setProjectTitleInput] = useState('');
  const [projectDescriptionInput, setProjectDescriptionInput] = useState('');
  const [projectRequirementsInput, setProjectRequirementsInput] = useState('');
  const [pendingStudent, setPendingStudent] = useState<SearchStudent | null>(null);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editNameInput, setEditNameInput] = useState('');

  const loadCore = useCallback(async () => {
    const [groupRes, sent, received] = await Promise.all([
      fetchMyGroupDetails().catch(() => ({ hasGroup: false, group: null })),
      fetchSentGroupRequests().catch(() => []),
      fetchReceivedGroupRequests().catch(() => []),
    ]);
    setHasGroup(!!groupRes?.hasGroup);
    setMyGroup(groupRes?.group ?? null);
    setSentRequests(sent);
    setReceivedRequests(received);
  }, []);

  const loadStudents = useCallback(async (query = '', type: StudentSearchType = 'name') => {
    setSearching(true);
    try {
      const data = await searchStudents(query, type);
      setStudents(Array.isArray(data) ? data : []);
    } catch {
      setStudents([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    try {
      await loadCore();
      await loadStudents('', 'name');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadCore, loadStudents]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSearch = () => {
    loadStudents(searchQuery, searchType);
  };

  const refresh = () => {
    setRefreshing(true);
    loadAll();
  };

  const sendRequestDirect = async (
    student: SearchStudent,
    payload?: {
      projectTitle?: string;
      projectDescription?: string;
      projectRequirements?: string;
    },
  ) => {
    try {
      await sendGroupRequest(student.id, payload);
      await loadCore();
      Toast.show({
        type: 'success',
        text1: 'Request sent',
        text2: `Group request sent to ${student.name}`,
      });
    } catch (error: unknown) {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? ((error as { response?: { data?: { error?: string } } }).response?.data
              ?.error ?? 'Failed to send group request')
          : 'Failed to send group request';
      Alert.alert('Error', message);
    }
  };

  const handleSendRequest = (student: SearchStudent) => {
    if (hasGroup) {
      sendRequestDirect(student);
      return;
    }
    if (sentRequests.length > 0) {
      const sourceRequest =
        sentRequests.find(
          (request) =>
            request.projectTitle?.trim() &&
            request.projectDescription?.trim() &&
            request.projectRequirements?.trim(),
        ) ?? sentRequests[0];

      if (sourceRequest?.projectTitle?.trim()) {
        sendRequestDirect(student, {
          projectTitle: sourceRequest.projectTitle.trim(),
          projectDescription: sourceRequest.projectDescription?.trim() ?? '',
          projectRequirements: sourceRequest.projectRequirements?.trim() ?? '',
        });
        return;
      }
    }
    setPendingStudent(student);
    setProjectTitleInput('');
    setProjectDescriptionInput('');
    setProjectRequirementsInput('');
    setProjectRequestModalOpen(true);
  };

  const confirmSendProjectRequest = async () => {
    if (!projectTitleInput.trim()) {
      Alert.alert('Error', 'Please enter the project name');
      return;
    }
    if (!projectDescriptionInput.trim()) {
      Alert.alert('Error', 'Please enter the project description');
      return;
    }
    if (!projectRequirementsInput.trim()) {
      Alert.alert('Error', 'Please enter the project requirements');
      return;
    }
    if (!pendingStudent) {
      return;
    }
    setProjectRequestModalOpen(false);
    await sendRequestDirect(pendingStudent, {
      projectTitle: projectTitleInput.trim(),
      projectDescription: projectDescriptionInput.trim(),
      projectRequirements: projectRequirementsInput.trim(),
    });
    setPendingStudent(null);
    setProjectTitleInput('');
    setProjectDescriptionInput('');
    setProjectRequirementsInput('');
  };

  const handleAccept = async (requestId: string) => {
    try {
      const result = await acceptGroupRequest(requestId);
      await loadCore();
      Toast.show({
        type: 'success',
        text1: 'Request accepted',
        text2: result?.groupName
          ? `You joined "${result.groupName}"`
          : 'You joined the group successfully',
      });
    } catch {
      Alert.alert('Error', 'Failed to accept group request');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await rejectGroupRequest(requestId);
      await loadCore();
      Toast.show({ type: 'success', text1: 'Request rejected' });
    } catch {
      Alert.alert('Error', 'Failed to reject group request');
    }
  };

  const handleCancel = async (requestId: string) => {
    try {
      await cancelGroupRequest(requestId);
      await loadCore();
      await loadStudents(searchQuery, searchType);
      Toast.show({ type: 'success', text1: 'Request cancelled' });
    } catch {
      Alert.alert('Error', 'Failed to cancel request');
    }
  };

  const handleLeaveGroup = () => {
    if (!myGroup) {
      return;
    }
    Alert.alert(
      'Leave Group',
      myGroup.memberCount <= 2
        ? 'Are you sure? The group may be deactivated if fewer than 2 members remain.'
        : 'Are you sure you want to leave this group?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveGroup(myGroup.id);
              await loadCore();
              await loadStudents(searchQuery, searchType);
              Toast.show({ type: 'success', text1: 'Left group successfully' });
            } catch {
              Alert.alert('Error', 'Failed to leave group');
            }
          },
        },
      ],
    );
  };

  const saveGroupName = async () => {
    if (!editNameInput.trim()) {
      Alert.alert('Error', 'Group name cannot be empty');
      return;
    }
    try {
      await updateGroupName(editNameInput.trim());
      setEditNameOpen(false);
      await loadCore();
      Toast.show({ type: 'success', text1: 'Group name updated' });
    } catch {
      Alert.alert('Error', 'Failed to update group name');
    }
  };

  const renderYourGroup = () => {
    if (!hasGroup || !myGroup) {
      return (
        <EmptyState
          icon="users"
          title="No group yet"
          message='Use "Find Members" to search students and send group requests.'
        />
      );
    }

    return (
      <View>
        {!myGroup.isApproved ? (
          <View style={[styles.banner, styles.bannerWarning]}>
            <FeatherIcon name="alert-circle" size={18} color="#ca8a04" />
            <Text style={styles.bannerWarningText}>
              Group pending committee approval before proposal submission.
            </Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{myGroup.name}</Text>
            {myGroup.isApproved ? (
              <View style={[styles.badge, styles.badgeGreen]}>
                <Text style={styles.badgeGreenText}>Approved</Text>
              </View>
            ) : null}
          </View>
          {myGroup.isLeader ? (
            <Pressable
              style={styles.linkBtn}
              onPress={() => {
                setEditNameInput(myGroup.name);
                setEditNameOpen(true);
              }}>
              <FeatherIcon name="edit-2" size={14} color="#2563eb" />
              <Text style={styles.linkBtnText}>Edit group name</Text>
            </Pressable>
          ) : null}
          <Text style={styles.metaLine}>
            {myGroup.isLeader ? 'You are the Group Leader' : 'You are a Group Member'} ·{' '}
            {myGroup.memberCount}/{MAX_GROUP_MEMBERS} members
          </Text>

          {myGroup.supervisor ? (
            <>
              <Text style={styles.sectionLabel}>Supervisor</Text>
              <View style={[styles.memberCard, styles.supervisorCard]}>
                <Text style={styles.memberName}>{myGroup.supervisor.name}</Text>
                {myGroup.supervisor.email ? (
                  <Text style={styles.memberMeta}>{myGroup.supervisor.email}</Text>
                ) : null}
              </View>
            </>
          ) : null}

          {myGroup.project ? (
            <>
              <Text style={styles.sectionLabel}>Project Details</Text>
              <View style={styles.projectCard}>
                <Text style={styles.projectFieldLabel}>Project Name</Text>
                <Text style={styles.projectFieldValue}>{myGroup.project.title}</Text>
                <Text style={styles.projectFieldLabel}>Description</Text>
                <Text style={styles.projectFieldValue}>{myGroup.project.description}</Text>
                {myGroup.project.requirements ? (
                  <>
                    <Text style={styles.projectFieldLabel}>Requirements</Text>
                    <Text style={styles.projectFieldValue}>
                      {myGroup.project.requirements}
                    </Text>
                  </>
                ) : null}
              </View>
            </>
          ) : null}

          <Text style={styles.sectionLabel}>
            Group Members ({myGroup.memberCount}/{MAX_GROUP_MEMBERS})
          </Text>
          {myGroup.members.map((member) => (
            <View key={member.id} style={styles.memberCard}>
              <View style={styles.memberBody}>
                <Text style={styles.memberName}>{member.name}</Text>
                <Text style={styles.memberMeta}>
                  Roll: {member.rollNumber ?? 'N/A'} · {member.department ?? 'N/A'}
                </Text>
              </View>
              {member.isLeader ? (
                <View style={styles.leaderPill}>
                  <Text style={styles.leaderPillText}>Leader</Text>
                </View>
              ) : null}
            </View>
          ))}

          {myGroup.memberCount < MIN_GROUP_MEMBERS ? (
            <View style={[styles.banner, styles.bannerInfo]}>
              <Text style={styles.bannerInfoText}>
                Your group needs {MIN_GROUP_MEMBERS - myGroup.memberCount} more member(s). Use Find
                Members to send requests.
              </Text>
            </View>
          ) : null}

          <Pressable style={styles.leaveBtn} onPress={handleLeaveGroup}>
            <FeatherIcon name="user-minus" size={16} color="#fff" />
            <Text style={styles.leaveBtnText}>Leave Group</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const renderStudentAction = (student: SearchStudent) => {
    const pending = sentRequests.find(
      (req) => req.toUserId === student.id && req.status === 'PENDING',
    );
    const accepted = sentRequests.find(
      (req) => req.toUserId === student.id && req.status === 'ACCEPTED',
    );
    const isInGroup = student.isInGroup;
    const canSend = !isInGroup && !pending;
    const showResend = !isInGroup && !!accepted;

    let label = 'Send Request';
    let disabled = false;
    let dark = true;

    if (isInGroup) {
      label = 'Already in Group';
      disabled = true;
      dark = false;
    } else if (showResend) {
      label = 'Send New Request';
    } else if (pending) {
      label = 'Requested';
      disabled = true;
      dark = false;
    }

    return (
      <Pressable
        style={[
          styles.studentActionBtn,
          dark ? styles.studentActionDark : styles.studentActionMuted,
          disabled && styles.studentActionDisabled,
        ]}
        disabled={disabled}
        onPress={() => canSend && handleSendRequest(student)}>
        <Text
          style={[
            styles.studentActionText,
            dark ? styles.studentActionTextLight : styles.studentActionTextMuted,
          ]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  const renderFindMembers = () => (
    <View>
      <Text style={styles.sectionHeading}>
        {searching ? 'Loading...' : `Available Students (${students.length})`}
      </Text>

      <Pressable style={styles.pickerBtn} onPress={() => setSearchTypePickerOpen(true)}>
        <Text style={styles.pickerBtnText}>
          {searchType === 'name' ? 'Search by Name' : 'Search by Roll Number'}
        </Text>
        <FeatherIcon name="chevron-down" size={18} color="#6b7280" />
      </Pressable>

      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <FeatherIcon name="search" size={18} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder={
              searchType === 'name' ? 'Enter student name...' : 'Enter roll number...'
            }
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            autoCapitalize="none"
          />
        </View>
        <Pressable
          style={[styles.searchBtn, searching && styles.searchBtnDisabled]}
          onPress={handleSearch}
          disabled={searching}>
          {searching ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <FeatherIcon name="search" size={16} color="#fff" />
              <Text style={styles.searchBtnText}>Search</Text>
            </>
          )}
        </Pressable>
      </View>

      {searching && students.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#16a34a" />
          <Text style={styles.loadingText}>Loading students...</Text>
        </View>
      ) : students.length === 0 ? (
        <EmptyState
          icon="users"
          title="No students found"
          message={
            searchQuery.trim()
              ? 'Try adjusting your search criteria.'
              : 'No students are available at the moment.'
          }
        />
      ) : (
        students.map((student) => (
          <View key={student.id} style={styles.studentCard}>
            <View style={styles.studentCardTop}>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{student.name}</Text>
                <Text style={styles.studentMeta}>Roll: {student.rollNumber}</Text>
                <Text style={styles.studentMeta}>{student.department}</Text>
                <Text style={styles.studentMeta}>GPA: {student.gpa}</Text>
                {student.isInGroup && student.currentGroup ? (
                  <Text style={styles.groupPin}>📌 {student.currentGroup.name}</Text>
                ) : null}
              </View>
              {renderStudentAction(student)}
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderRequestList = (
    items: GroupRequestRow[],
    emptyMessage: string,
    mode: 'sent' | 'received',
  ) => {
    if (items.length === 0) {
      return <EmptyState icon="inbox" title="Nothing here" message={emptyMessage} />;
    }

    return items.map((request) => {
      const colors = statusColors(request.status);
      return (
        <View key={request.id} style={styles.requestCard}>
          <View style={styles.requestBody}>
            <Text style={styles.requestName}>{request.name}</Text>
            <Text style={styles.requestMeta}>Roll: {request.rollNumber}</Text>
            {request.projectTitle ? (
              <>
                <Text style={styles.requestProjectTitle}>{request.projectTitle}</Text>
                {request.projectDescription ? (
                  <Text style={styles.requestMeta} numberOfLines={2}>
                    {request.projectDescription}
                  </Text>
                ) : null}
                {request.projectRequirements ? (
                  <Text style={styles.requestMeta} numberOfLines={2}>
                    Requirements: {request.projectRequirements}
                  </Text>
                ) : null}
              </>
            ) : null}
            <Text style={styles.requestMeta}>
              {mode === 'sent' ? 'Sent' : 'Received'} on {request.date}
            </Text>
          </View>
          <View style={styles.requestActions}>
            <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
              <Text style={[styles.statusBadgeText, { color: colors.text }]}>
                {request.status}
              </Text>
            </View>
            {mode === 'sent' &&
            (request.status === 'PENDING' || request.status === 'ACCEPTED') ? (
              <Pressable style={styles.outlineBtn} onPress={() => handleCancel(request.id)}>
                <Text style={styles.outlineBtnText}>Cancel</Text>
              </Pressable>
            ) : null}
            {mode === 'received' && request.status === 'PENDING' ? (
              <>
                <Pressable style={styles.acceptBtn} onPress={() => handleAccept(request.id)}>
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </Pressable>
                <Pressable style={styles.outlineBtn} onPress={() => handleReject(request.id)}>
                  <Text style={styles.outlineBtnText}>Reject</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      );
    });
  };

  if (loading) {
    return <LoadingView message="Loading groups..." />;
  }

  return (
    <PortalScreenLayout
      title="Groups Management"
      subtitle="Manage your FYP group"
      refreshing={refreshing}
      onRefresh={refresh}>
      <View style={styles.tabGrid}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.key)}>
              <FeatherIcon
                name={tab.icon}
                size={15}
                color={active ? '#fff' : '#4b5563'}
              />
              <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
                {tab.shortLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === 'your-group' && renderYourGroup()}
      {activeTab === 'search' && renderFindMembers()}
      {activeTab === 'sent' &&
        renderRequestList(sentRequests, 'No group requests sent yet.', 'sent')}
      {activeTab === 'received' &&
        renderRequestList(
          receivedRequests,
          'No group requests received yet.',
          'received',
        )}

      <SheetModal
        visible={searchTypePickerOpen}
        onClose={() => setSearchTypePickerOpen(false)}
        title="Search filter">
        {(['name', 'rollNumber'] as StudentSearchType[]).map((type) => (
          <Pressable
            key={type}
            style={styles.pickerOption}
            onPress={() => {
              setSearchType(type);
              setSearchTypePickerOpen(false);
            }}>
            <Text style={styles.pickerOptionText}>
              {type === 'name' ? 'Search by Name' : 'Search by Roll Number'}
            </Text>
            {searchType === type ? (
              <FeatherIcon name="check" size={18} color="#2563eb" />
            ) : null}
          </Pressable>
        ))}
      </SheetModal>

      <SheetModal
        visible={projectRequestModalOpen}
        onClose={() => {
          setProjectRequestModalOpen(false);
          setPendingStudent(null);
        }}
        title="Project Group Request"
        subtitle={`Send project details to ${pendingStudent?.name ?? 'student'}`}
        footer={
          <View style={sheetStyles.footerRow}>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
              onPress={() => {
                setProjectRequestModalOpen(false);
                setPendingStudent(null);
              }}>
              <Text style={sheetStyles.footerBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnPrimary]}
              onPress={confirmSendProjectRequest}>
              <Text style={sheetStyles.footerBtnPrimaryText}>Send Request</Text>
            </Pressable>
          </View>
        }>
        <Text style={styles.modalHint}>
          Share your project idea so the other student can review before joining.
        </Text>
        <Text style={styles.modalFieldLabel}>Project Name *</Text>
        <TextInput
          style={styles.modalInput}
          value={projectTitleInput}
          onChangeText={setProjectTitleInput}
          placeholder="e.g. Smart Attendance System"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.modalFieldLabel}>Description *</Text>
        <TextInput
          style={[styles.modalInput, styles.modalTextArea]}
          value={projectDescriptionInput}
          onChangeText={setProjectDescriptionInput}
          placeholder="Briefly describe the project"
          placeholderTextColor="#9ca3af"
          multiline
          textAlignVertical="top"
        />
        <Text style={styles.modalFieldLabel}>Requirements *</Text>
        <TextInput
          style={[styles.modalInput, styles.modalTextArea]}
          value={projectRequirementsInput}
          onChangeText={setProjectRequirementsInput}
          placeholder="Skills, tools, or technologies needed"
          placeholderTextColor="#9ca3af"
          multiline
          textAlignVertical="top"
        />
      </SheetModal>

      <SheetModal
        visible={editNameOpen}
        onClose={() => setEditNameOpen(false)}
        title="Edit Group Name"
        footer={
          <View style={sheetStyles.footerRow}>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
              onPress={() => setEditNameOpen(false)}>
              <Text style={sheetStyles.footerBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnPrimary]}
              onPress={saveGroupName}>
              <Text style={sheetStyles.footerBtnPrimaryText}>Save</Text>
            </Pressable>
          </View>
        }>
        <TextInput
          style={styles.modalInput}
          value={editNameInput}
          onChangeText={setEditNameInput}
          placeholder="Group name"
          placeholderTextColor="#9ca3af"
        />
      </SheetModal>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  tabGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
    backgroundColor: '#f3f4f6',
    padding: 6,
    borderRadius: 10,
  },
  tabBtn: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#111827',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
  },
  tabBtnTextActive: {
    color: '#fff',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  pickerBtnText: {
    fontSize: 14,
    color: '#111827',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 8,
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    minHeight: 44,
  },
  searchBtnDisabled: {
    opacity: 0.7,
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  studentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 10,
  },
  studentCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  studentInfo: {
    flex: 1,
    minWidth: 0,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  studentMeta: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  groupPin: {
    marginTop: 6,
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
  },
  studentActionBtn: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 108,
    alignItems: 'center',
  },
  studentActionDark: {
    backgroundColor: '#111827',
  },
  studentActionMuted: {
    backgroundColor: '#e5e7eb',
  },
  studentActionDisabled: {
    opacity: 0.85,
  },
  studentActionText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  studentActionTextLight: {
    color: '#fff',
  },
  studentActionTextMuted: {
    color: '#6b7280',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeGreen: {
    backgroundColor: '#dcfce7',
  },
  badgeGreenText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  linkBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  metaLine: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    marginTop: 4,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  supervisorCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  projectCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
  },
  projectFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 4,
  },
  projectFieldValue: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  requestProjectTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 4,
  },
  modalFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
    marginTop: 10,
  },
  modalTextArea: {
    minHeight: 88,
  },
  memberBody: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  memberMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  leaderPill: {
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  leaderPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  bannerWarning: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fde047',
  },
  bannerWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#854d0e',
    lineHeight: 18,
  },
  bannerInfo: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  bannerInfoText: {
    flex: 1,
    fontSize: 12,
    color: '#92400e',
    lineHeight: 18,
  },
  leaveBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    borderRadius: 10,
    paddingVertical: 12,
  },
  leaveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 10,
  },
  requestBody: {
    marginBottom: 10,
  },
  requestName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  requestMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
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
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  outlineBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  acceptBtn: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  acceptBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  centered: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#6b7280',
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
  modalHint: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 10,
    lineHeight: 18,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
});
