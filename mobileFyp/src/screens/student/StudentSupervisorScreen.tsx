import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { usePortalNavigation } from '../../components/portal/portalNavigation';
import { fetchMyGroupDetails, type GroupProjectInfo } from '../../services/groupService';
import {
  findCurrentSupervisor,
  mapSupervisionRequests,
  searchTeachers,
  sendSupervisionRequest,
  fetchSupervisionRequestsDetailed,
  type CurrentSupervisorInfo,
  type SearchTeacher,
  type SupervisionRequestRow,
} from '../../services/supervisorService';
import { useAuthUser } from '../../hooks/useAuthUser';

type SupervisorTab = 'find' | 'requests' | 'current';

const TABS: { key: SupervisorTab; label: string; icon: string }[] = [
  { key: 'find', label: 'Find Supervisor', icon: 'search' },
  { key: 'requests', label: 'My Requests', icon: 'send' },
  { key: 'current', label: 'Current Supervisor', icon: 'user' },
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

function getTeacherActionLabel(
  teacher: SearchTeacher,
  isGroupLeader: boolean,
  currentSupervisor: CurrentSupervisorInfo | null,
  requests: SupervisionRequestRow[],
) {
  if (!isGroupLeader) {
    return { label: 'Leader Only', disabled: true, locked: true };
  }
  const teacherRequests = requests.filter((req) => req.teacherId === teacher.id);
  const accepted = teacherRequests.some((req) => req.status === 'ACCEPTED');
  const pending = teacherRequests.some((req) => req.status === 'PENDING');

  if (currentSupervisor) {
    if (currentSupervisor.id === teacher.id || accepted) {
      return { label: 'Your Supervisor', disabled: true, locked: false };
    }
    return { label: 'Send Request', disabled: true, locked: false };
  }
  if (accepted) {
    return { label: 'Your Supervisor', disabled: true, locked: false };
  }
  if (pending) {
    return { label: 'Requested', disabled: true, locked: false };
  }
  if (!teacher.isAvailable) {
    return { label: 'Full Capacity', disabled: true, locked: false };
  }
  return { label: 'Send Request', disabled: false, locked: false };
}

export function StudentSupervisorScreen() {
  const { user } = useAuthUser();
  const { navigateTo } = usePortalNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<SupervisorTab>('find');
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [teachers, setTeachers] = useState<SearchTeacher[]>([]);
  const [requests, setRequests] = useState<SupervisionRequestRow[]>([]);
  const [currentSupervisor, setCurrentSupervisor] = useState<CurrentSupervisorInfo | null>(
    null,
  );
  const [isGroupLeader, setIsGroupLeader] = useState(false);
  const [groupProject, setGroupProject] = useState<GroupProjectInfo | null>(null);
  const [supervisorModalOpen, setSupervisorModalOpen] = useState(false);
  const [pendingTeacher, setPendingTeacher] = useState<SearchTeacher | null>(null);
  const [supervisorMessage, setSupervisorMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  const loadTeachers = useCallback(async (query = '') => {
    setSearching(true);
    try {
      const data = await searchTeachers(query);
      setTeachers(Array.isArray(data) ? data : []);
    } catch {
      setTeachers([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const loadCore = useCallback(async () => {
    const [groupRes, requestData] = await Promise.all([
      fetchMyGroupDetails().catch(() => ({ hasGroup: false, group: null })),
      fetchSupervisionRequestsDetailed().catch(() => []),
    ]);

    const list = Array.isArray(requestData) ? requestData : [];
    setRequests(mapSupervisionRequests(list));
    setCurrentSupervisor(findCurrentSupervisor(list));

    if (groupRes?.hasGroup && groupRes.group && user?.id) {
      const leader =
        groupRes.group.isLeader ||
        groupRes.group.members?.some((m) => m.id === user.id && m.isLeader);
      setIsGroupLeader(!!leader);
      setGroupProject(groupRes.group.project ?? null);
    } else {
      setIsGroupLeader(false);
      setGroupProject(null);
    }
  }, [user?.id]);

  const loadAll = useCallback(async () => {
    try {
      await loadCore();
      await loadTeachers('');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadCore, loadTeachers]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSearch = () => {
    loadTeachers(searchQuery);
  };

  const refresh = () => {
    setRefreshing(true);
    loadAll();
  };

  const openSupervisorRequestModal = (teacher: SearchTeacher) => {
    const action = getTeacherActionLabel(
      teacher,
      isGroupLeader,
      currentSupervisor,
      requests,
    );
    if (action.disabled) {
      if (action.locked) {
        Alert.alert(
          'Access denied',
          'Only the group leader can send supervisor requests.',
        );
      }
      return;
    }
    if (!groupProject) {
      Alert.alert(
        'Project details missing',
        'Your group must have project name, description, and requirements before requesting a supervisor. Form a group with project details first.',
      );
      return;
    }
    setPendingTeacher(teacher);
    setSupervisorMessage('');
    setSupervisorModalOpen(true);
  };

  const confirmSupervisorRequest = async () => {
    if (!pendingTeacher) {
      return;
    }
    if (!supervisorMessage.trim()) {
      Alert.alert('Error', 'Please write a message for the supervisor');
      return;
    }
    setSendingRequest(true);
    try {
      await sendSupervisionRequest(pendingTeacher.id, supervisorMessage.trim());
      setSupervisorModalOpen(false);
      setPendingTeacher(null);
      setSupervisorMessage('');
      await loadCore();
      Toast.show({
        type: 'success',
        text1: 'Request sent',
        text2: `Supervision request sent to ${pendingTeacher.name}`,
      });
    } catch (error: unknown) {
      const err = error as {
        response?: {
          data?: {
            error?: string;
            supervisor?: CurrentSupervisorInfo;
          };
        };
      };
      const data = err.response?.data;
      if (data?.supervisor) {
        setCurrentSupervisor({
          id: data.supervisor.id,
          name: data.supervisor.name,
          email: data.supervisor.email,
          department: data.supervisor.department,
          specialization: data.supervisor.specialization ?? 'N/A',
        });
        Alert.alert(
          'Cannot send request',
          `Your group already has a supervisor: ${data.supervisor.name}`,
        );
      } else {
        Alert.alert('Error', data?.error ?? 'Failed to send supervision request');
      }
    } finally {
      setSendingRequest(false);
    }
  };

  const handleSendRequest = (teacher: SearchTeacher) => {
    openSupervisorRequestModal(teacher);
  };

  const supervisionPercent = useMemo(
    () => (teacher: SearchTeacher) => {
      if (!teacher.maxSupervising) {
        return 0;
      }
      return Math.min(
        100,
        Math.round((teacher.currentSupervising / teacher.maxSupervising) * 100),
      );
    },
    [],
  );

  const renderFindSupervisor = () => (
    <View>
      {currentSupervisor ? (
        <View style={[styles.banner, styles.bannerWarning]}>
          <FeatherIcon name="user" size={18} color="#ca8a04" />
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerWarningTitle}>
              Your group already has a supervisor: {currentSupervisor.name}
            </Text>
            <Text style={styles.bannerWarningSub}>
              You cannot send requests to other supervisors.
            </Text>
          </View>
        </View>
      ) : null}

      <Text style={styles.sectionHeading}>
        {searching ? 'Loading...' : `Available Supervisors (${teachers.length})`}
      </Text>

      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <FeatherIcon name="search" size={18} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Enter supervisor name..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            editable={!currentSupervisor}
          />
        </View>
        <Pressable
          style={[
            styles.searchBtn,
            (searching || !!currentSupervisor) && styles.searchBtnDisabled,
          ]}
          onPress={handleSearch}
          disabled={searching || !!currentSupervisor}>
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

      {searching && teachers.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#16a34a" />
          <Text style={styles.loadingText}>Loading supervisors...</Text>
        </View>
      ) : teachers.length === 0 ? (
        <EmptyState
          icon="user"
          title="No supervisors found"
          message={
            searchQuery.trim()
              ? 'Try adjusting your search criteria.'
              : 'No supervisors are available at the moment.'
          }
        />
      ) : (
        teachers.map((teacher) => {
          const action = getTeacherActionLabel(
            teacher,
            isGroupLeader,
            currentSupervisor,
            requests,
          );
          const percent = supervisionPercent(teacher);
          const barFull = teacher.currentSupervising >= teacher.maxSupervising;

          return (
            <View key={teacher.id} style={styles.teacherCard}>
              <View style={styles.teacherCardTop}>
                <View style={styles.teacherInfo}>
                  <Text style={styles.teacherName}>{teacher.name}</Text>
                  <Text style={styles.teacherMeta}>{teacher.department}</Text>
                  <Text style={styles.teacherMeta}>
                    Specialization: {teacher.specialization || 'N/A'}
                  </Text>
                  <Text style={styles.teacherEmail}>{teacher.email}</Text>
                </View>
                <Pressable
                  style={[
                    styles.actionBtn,
                    action.disabled ? styles.actionBtnMuted : styles.actionBtnDark,
                  ]}
                  disabled={action.disabled}
                  onPress={() => handleSendRequest(teacher)}>
                  {action.locked ? (
                    <FeatherIcon name="lock" size={12} color="#6b7280" />
                  ) : null}
                  <Text
                    style={[
                      styles.actionBtnText,
                      action.disabled
                        ? styles.actionBtnTextMuted
                        : styles.actionBtnTextLight,
                    ]}>
                    {action.label}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.capacityWrap}>
                <Text style={styles.capacityText}>
                  Supervising: {teacher.currentSupervising}/{teacher.maxSupervising}{' '}
                  groups
                </Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${percent}%`,
                        backgroundColor: barFull ? '#ef4444' : '#3b82f6',
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  const renderRequests = () => {
    if (requests.length === 0) {
      return (
        <EmptyState
          icon="inbox"
          title="No requests"
          message="No supervision requests sent yet."
        />
      );
    }

    return (
      <>
        <Text style={styles.requestsHint}>
          All requests sent by your group members are shown here.
        </Text>
        {requests.map((request) => {
          const colors = statusColors(request.status);
          return (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestBody}>
                <Text style={styles.requestName}>{request.name}</Text>
                <Text style={styles.requestMeta}>
                  Requested by {request.studentName ?? 'You'} on {request.date}
                </Text>
                {request.department ? (
                  <Text style={styles.requestMeta}>{request.department}</Text>
                ) : null}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
                <Text style={[styles.statusBadgeText, { color: colors.text }]}>
                  {request.status}
                </Text>
              </View>
            </View>
          );
        })}
      </>
    );
  };

  const renderCurrent = () => {
    if (!currentSupervisor) {
      return (
        <View>
          <EmptyState
            icon="user-check"
            title="No supervisor yet"
            message="Find and request a supervisor for your group."
          />
          <Pressable style={styles.findLinkBtn} onPress={() => setActiveTab('find')}>
            <FeatherIcon name="search" size={16} color="#fff" />
            <Text style={styles.findLinkBtnText}>Find a Supervisor</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <View style={[styles.banner, styles.bannerSuccess]}>
          <FeatherIcon name="check-circle" size={18} color="#16a34a" />
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerSuccessTitle}>Supervision Confirmed</Text>
            <Text style={styles.bannerSuccessSub}>
              Your group has an assigned supervisor.
            </Text>
          </View>
        </View>

        <View style={styles.supervisorProfile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {currentSupervisor.name
                .split(' ')
                .map((part) => part[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileBody}>
            <Text style={styles.profileName}>{currentSupervisor.name}</Text>
            <Text style={styles.profileMeta}>
              {currentSupervisor.department ?? 'N/A'}
            </Text>
            {currentSupervisor.email ? (
              <Text style={styles.profileMeta}>{currentSupervisor.email}</Text>
            ) : null}
            {currentSupervisor.specialization &&
            currentSupervisor.specialization !== 'N/A' ? (
              <Text style={styles.profileMetaSmall}>
                Specialization: {currentSupervisor.specialization}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.currentActions}>
          <Pressable
            style={styles.currentBtn}
            onPress={() => navigateTo('Messages')}>
            <FeatherIcon name="mail" size={16} color="#fff" />
            <Text style={styles.currentBtnText}>Send Message</Text>
          </Pressable>
          <Pressable
            style={[styles.currentBtn, styles.currentBtnOutline]}
            onPress={() => navigateTo('ScheduleMeeting')}>
            <FeatherIcon name="calendar" size={16} color="#111827" />
            <Text style={styles.currentBtnTextDark}>Schedule Meeting</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  if (loading) {
    return <LoadingView message="Loading supervisor..." />;
  }

  return (
    <PortalScreenLayout
      title="Supervisor"
      subtitle="Find and manage your FYP supervisor"
      refreshing={refreshing}
      onRefresh={refresh}>
      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.key)}>
              <FeatherIcon
                name={tab.icon}
                size={14}
                color={active ? '#fff' : '#4b5563'}
              />
              <Text
                style={[styles.tabLabel, active && styles.tabLabelActive]}
                numberOfLines={1}>
                {tab.key === 'current' ? 'Current' : tab.key === 'requests' ? 'Requests' : 'Find'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === 'find' && renderFindSupervisor()}
      {activeTab === 'requests' && renderRequests()}
      {activeTab === 'current' && renderCurrent()}

      <SheetModal
        visible={supervisorModalOpen}
        onClose={() => !sendingRequest && setSupervisorModalOpen(false)}
        title="Supervision Request"
        subtitle={pendingTeacher ? `Request ${pendingTeacher.name} as supervisor` : undefined}
        footer={
          <View style={sheetStyles.footerRow}>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
              disabled={sendingRequest}
              onPress={() => setSupervisorModalOpen(false)}>
              <Text style={sheetStyles.footerBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnPrimary]}
              disabled={sendingRequest}
              onPress={confirmSupervisorRequest}>
              {sendingRequest ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={sheetStyles.footerBtnPrimaryText}>Send Request</Text>
              )}
            </Pressable>
          </View>
        }>
        <Text style={styles.modalSectionLabel}>Project Name</Text>
        <View style={styles.readOnlyBox}>
          <Text style={styles.readOnlyText}>{groupProject?.title || 'Not available'}</Text>
        </View>
        <Text style={styles.modalSectionLabel}>Requirements</Text>
        <View style={styles.readOnlyBox}>
          <Text style={styles.readOnlyText}>
            {groupProject?.requirements || 'Not available'}
          </Text>
        </View>
        <Text style={styles.modalSectionLabel}>Message to Supervisor *</Text>
        <TextInput
          style={[styles.messageInput, styles.messageTextArea]}
          value={supervisorMessage}
          onChangeText={setSupervisorMessage}
          placeholder="Write a personal message to the supervisor..."
          placeholderTextColor="#9ca3af"
          multiline
          textAlignVertical="top"
          editable={!sendingRequest}
        />
      </SheetModal>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
    backgroundColor: '#f3f4f6',
    padding: 6,
    borderRadius: 10,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  tabBtnActive: {
    backgroundColor: '#111827',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4b5563',
  },
  tabLabelActive: {
    color: '#fff',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
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
    opacity: 0.6,
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  bannerWarningTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#854d0e',
  },
  bannerWarningSub: {
    fontSize: 12,
    color: '#a16207',
    marginTop: 2,
  },
  bannerSuccess: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 16,
  },
  bannerSuccessTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#166534',
  },
  bannerSuccessSub: {
    fontSize: 12,
    color: '#15803d',
    marginTop: 2,
  },
  bannerTextWrap: {
    flex: 1,
  },
  teacherCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 10,
  },
  teacherCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  teacherInfo: {
    flex: 1,
    minWidth: 0,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  teacherMeta: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  teacherEmail: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  actionBtnDark: {
    backgroundColor: '#111827',
  },
  actionBtnMuted: {
    backgroundColor: '#e5e7eb',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  actionBtnTextLight: {
    color: '#fff',
  },
  actionBtnTextMuted: {
    color: '#6b7280',
  },
  capacityWrap: {
    marginTop: 4,
  },
  capacityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 6,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 4,
  },
  requestsHint: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 18,
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  requestBody: {
    flex: 1,
  },
  requestName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  requestMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  supervisorProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  profileBody: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  profileMeta: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 2,
  },
  profileMetaSmall: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  currentActions: {
    gap: 10,
  },
  currentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
  },
  currentBtnOutline: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  currentBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  currentBtnTextDark: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 14,
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
  findLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: -16,
    marginHorizontal: 16,
  },
  findLinkBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  modalSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
    marginTop: 8,
  },
  readOnlyBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  readOnlyText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  messageTextArea: {
    minHeight: 110,
  },
});
