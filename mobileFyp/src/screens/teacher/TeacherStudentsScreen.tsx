import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import Toast from 'react-native-toast-message';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { DetailRow, SheetModal, sheetStyles } from '../../components/portal/SheetModal';
import { usePortalNavigation } from '../../components/portal/portalNavigation';
import {
  fetchSupervisedGroups,
  type SupervisedGroup,
  type SupervisedStudent,
} from '../../services/teacherService';
import { getProfileImageUri } from '../../services/profileService';

function getUniqueStudents(groups: SupervisedGroup[]): SupervisedStudent[] {
  const allStudents =
    groups.flatMap((group) =>
      (group.members ?? []).map((student) => ({
        ...student,
        groupId: group.id,
        groupName: group.name,
      })),
    ) ?? [];

  return Array.from(new Map(allStudents.map((student) => [student.id, student])).values());
}

function matchesStudent(student: SupervisedStudent, query: string) {
  const q = query.toLowerCase();
  return (
    student.name?.toLowerCase().includes(q) ||
    student.email?.toLowerCase().includes(q) ||
    student.rollNumber?.toLowerCase().includes(q) ||
    student.department?.toLowerCase().includes(q)
  );
}

function filterSupervisedGroups(groups: SupervisedGroup[], query: string) {
  if (!query.trim()) {
    return groups;
  }

  const q = query.trim().toLowerCase();

  return groups
    .filter((group) => {
      const groupNameMatches = group.name?.toLowerCase().includes(q);
      const hasMatchingStudent = group.members?.some((student) => matchesStudent(student, q));
      return groupNameMatches || hasMatchingStudent;
    })
    .map((group) => ({
      ...group,
      members: group.members?.filter(
        (student) =>
          !q ||
          group.name?.toLowerCase().includes(q) ||
          matchesStudent(student, q),
      ),
    }));
}

function getProjectStatusStyle(status?: string) {
  switch (status) {
    case 'COMPLETED':
      return { backgroundColor: '#dcfce7', color: '#166534' };
    case 'IN_PROGRESS':
      return { backgroundColor: '#e5e7eb', color: '#374151' };
    case 'APPROVED':
      return { backgroundColor: '#dbeafe', color: '#1d4ed8' };
    default:
      return { backgroundColor: '#f3f4f6', color: '#374151' };
  }
}

function StudentAvatar({ student }: { student: SupervisedStudent }) {
  const uri = getProfileImageUri(student.profileImage, student.id);
  if (uri) {
    return <Image source={{ uri }} style={styles.studentAvatarImage} />;
  }
  return (
    <View style={styles.studentAvatarFallback}>
      <FeatherIcon name="user" size={16} color="#2563eb" />
    </View>
  );
}

function StudentRow({
  student,
  onView,
  onMessage,
}: {
  student: SupervisedStudent;
  onView: () => void;
  onMessage: () => void;
}) {
  const isApproved = student.status === 'APPROVED';

  return (
    <View style={styles.studentRow}>
      <StudentAvatar student={student} />
      <View style={styles.studentMain}>
        <Text style={styles.studentName}>{student.name}</Text>
        <Text style={styles.studentMeta} numberOfLines={1}>
          {student.rollNumber || 'N/A'} • {student.department || 'N/A'}
        </Text>
        <View style={styles.studentTags}>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{student.role || 'MEMBER'}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              isApproved ? styles.statusBadgeApproved : styles.statusBadgeDefault,
            ]}>
            <Text
              style={[
                styles.statusBadgeText,
                isApproved ? styles.statusBadgeTextApproved : styles.statusBadgeTextDefault,
              ]}>
              {student.status || 'Active'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.studentActions}>
        <Pressable style={styles.iconBtn} onPress={onView}>
          <FeatherIcon name="eye" size={16} color="#374151" />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={onMessage}>
          <FeatherIcon name="message-circle" size={16} color="#374151" />
        </Pressable>
      </View>
    </View>
  );
}

function GroupCard({
  group,
  onViewStudent,
  onMessageStudent,
}: {
  group: SupervisedGroup;
  onViewStudent: (student: SupervisedStudent, groupName: string) => void;
  onMessageStudent: (student: SupervisedStudent) => void;
}) {
  const memberCount = group.members?.length ?? group.memberCount ?? 0;
  const projectCount = group.projects?.length ?? 0;

  return (
    <View style={styles.groupCard}>
      <View style={styles.groupHeader}>
        <View style={styles.groupHeaderTop}>
          <View style={styles.groupTitleRow}>
            <View style={styles.groupIconWrap}>
              <FeatherIcon name="users" size={20} color="#fff" />
            </View>
            <View style={styles.groupTitleBody}>
              <Text style={styles.groupName}>{group.name}</Text>
              {group.description ? (
                <Text style={styles.groupDescription} numberOfLines={2}>
                  {group.description}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.groupBadges}>
          <View style={styles.groupBadge}>
            <Text style={styles.groupBadgeText}>
              {memberCount} {memberCount === 1 ? 'Member' : 'Members'}
            </Text>
          </View>
          {projectCount > 0 ? (
            <View style={styles.groupBadge}>
              <Text style={styles.groupBadgeText}>
                {projectCount} {projectCount === 1 ? 'Project' : 'Projects'}
              </Text>
            </View>
          ) : null}
          {group.isApproved ? (
            <View style={[styles.groupBadge, styles.approvedBadge]}>
              <Text style={styles.approvedBadgeText}>Approved</Text>
            </View>
          ) : null}
        </View>

        {projectCount > 0 ? (
          <View style={styles.projectsSection}>
            <Text style={styles.projectsSectionTitle}>PROJECTS</Text>
            {group.projects?.map((project) => {
              const statusStyle = getProjectStatusStyle(project.status);
              return (
                <View key={project.id} style={styles.projectItem}>
                  <View style={styles.projectItemBody}>
                    <Text style={styles.projectTitle}>{project.title}</Text>
                    {project.description ? (
                      <Text style={styles.projectDescription} numberOfLines={2}>
                        {project.description}
                      </Text>
                    ) : null}
                  </View>
                  {project.status ? (
                    <View
                      style={[
                        styles.projectStatusBadge,
                        { backgroundColor: statusStyle.backgroundColor },
                      ]}>
                      <Text style={[styles.projectStatusText, { color: statusStyle.color }]}>
                        {project.status}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}
      </View>

      <View style={styles.membersSection}>
        {!group.members || group.members.length === 0 ? (
          <Text style={styles.noMembersText}>No students in this group</Text>
        ) : (
          group.members.map((student, index) => (
            <View key={student.id}>
              <StudentRow
                student={student}
                onView={() => onViewStudent(student, group.name)}
                onMessage={() => onMessageStudent(student)}
              />
              {index < group.members!.length - 1 ? <View style={styles.studentDivider} /> : null}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

export function TeacherStudentsScreen() {
  const { navigateTo } = usePortalNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groups, setGroups] = useState<SupervisedGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewStudent, setViewStudent] = useState<{
    student: SupervisedStudent;
    groupName: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchSupervisedGroups();
      setGroups(Array.isArray(data) ? data : []);
    } catch {
      setGroups([]);
      Toast.show({ type: 'error', text1: 'Failed to load students' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const uniqueStudents = useMemo(() => getUniqueStudents(groups), [groups]);
  const filteredGroups = useMemo(
    () => filterSupervisedGroups(groups, searchQuery),
    [groups, searchQuery],
  );

  const handleMessageStudent = useCallback(
    (student: SupervisedStudent) => {
      navigateTo('Messages');
    },
    [navigateTo],
  );

  if (loading) {
    return <LoadingView message="Loading students..." />;
  }

  return (
    <PortalScreenLayout
      title="Students"
      subtitle="Groups you supervise"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>Supervised Students</Text>
          <Text style={styles.sectionStats}>
            {groups.length} {groups.length === 1 ? 'Group' : 'Groups'} • {uniqueStudents.length}{' '}
            {uniqueStudents.length === 1 ? 'Student' : 'Students'}
          </Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <FeatherIcon name="search" size={18} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search students..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 ? (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <FeatherIcon name="x-circle" size={18} color="#9ca3af" />
          </Pressable>
        ) : null}
      </View>

      {filteredGroups.length === 0 ? (
        <View style={styles.emptyCard}>
          <FeatherIcon name="users" size={48} color="#9ca3af" />
          <Text style={styles.emptyTitle}>
            {searchQuery.trim() ? 'No Results Found' : 'No Supervised Groups'}
          </Text>
          <Text style={styles.emptyMessage}>
            {searchQuery.trim()
              ? 'No groups or students match your search criteria'
              : 'You are not currently supervising any groups'}
          </Text>
        </View>
      ) : (
        filteredGroups.map((group) => (
          <GroupCard
            key={group.id}
            group={group}
            onViewStudent={(student, groupName) => setViewStudent({ student, groupName })}
            onMessageStudent={handleMessageStudent}
          />
        ))
      )}

      <SheetModal
        visible={!!viewStudent}
        onClose={() => setViewStudent(null)}
        title={viewStudent?.student.name ?? 'Student Profile'}
        subtitle={viewStudent?.groupName}
        footer={
          viewStudent ? (
            <View style={sheetStyles.footerRow}>
              <Pressable
                style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
                onPress={() => setViewStudent(null)}>
                <Text style={sheetStyles.footerBtnCancelText}>Close</Text>
              </Pressable>
              <Pressable
                style={[sheetStyles.footerBtn, styles.messageFooterBtn]}
                onPress={() => {
                  const student = viewStudent.student;
                  setViewStudent(null);
                  handleMessageStudent(student);
                }}>
                <FeatherIcon name="message-circle" size={16} color="#fff" />
                <Text style={sheetStyles.footerBtnPrimaryText}>Send Message</Text>
              </Pressable>
            </View>
          ) : null
        }>
        {viewStudent ? (
          <>
            <View style={styles.profileHeader}>
              <StudentAvatar student={viewStudent.student} />
              <View style={styles.profileHeaderText}>
                <Text style={styles.profileName}>{viewStudent.student.name}</Text>
                <Text style={styles.profileGroup}>{viewStudent.groupName}</Text>
              </View>
            </View>

            <DetailRow
              icon="hash"
              label="Roll Number"
              value={viewStudent.student.rollNumber || 'N/A'}
            />
            <DetailRow icon="mail" label="Email" value={viewStudent.student.email || 'N/A'} />
            <DetailRow
              icon="briefcase"
              label="Department"
              value={viewStudent.student.department || 'N/A'}
            />
            <DetailRow
              icon="bar-chart-2"
              label="GPA"
              value={
                viewStudent.student.gpa != null
                  ? viewStudent.student.gpa.toFixed(2)
                  : 'N/A'
              }
            />
            <DetailRow icon="shield" label="Role" value={viewStudent.student.role || 'MEMBER'} />
            <DetailRow
              icon="activity"
              label="Status"
              value={viewStudent.student.status || 'Active'}
            />
          </>
        ) : null}
      </SheetModal>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    marginBottom: 12,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  sectionStats: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    minHeight: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 10,
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
  groupCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  groupHeader: {
    backgroundColor: '#eff6ff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
    padding: 16,
  },
  groupHeaderTop: {
    marginBottom: 12,
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  groupIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupTitleBody: {
    flex: 1,
    minWidth: 0,
  },
  groupName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  groupDescription: {
    marginTop: 4,
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
  groupBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  groupBadge: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  groupBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  approvedBadge: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  approvedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  projectsSection: {
    marginTop: 14,
    gap: 8,
  },
  projectsSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    letterSpacing: 0.5,
  },
  projectItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  projectItemBody: {
    flex: 1,
    minWidth: 0,
  },
  projectTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  projectDescription: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 17,
  },
  projectStatusBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  projectStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  membersSection: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  noMembersText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 13,
    color: '#6b7280',
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  studentAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
  },
  studentAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentMain: {
    flex: 1,
    minWidth: 0,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  studentMeta: {
    marginTop: 2,
    fontSize: 12,
    color: '#6b7280',
  },
  studentTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  roleBadge: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusBadgeApproved: {
    backgroundColor: '#22c55e',
  },
  statusBadgeDefault: {
    backgroundColor: '#e5e7eb',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadgeTextApproved: {
    color: '#fff',
  },
  statusBadgeTextDefault: {
    color: '#374151',
  },
  studentActions: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  studentDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  profileHeaderText: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  profileGroup: {
    marginTop: 4,
    fontSize: 13,
    color: '#6b7280',
  },
  messageFooterBtn: {
    flex: 1.2,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#2563eb',
  },
});
