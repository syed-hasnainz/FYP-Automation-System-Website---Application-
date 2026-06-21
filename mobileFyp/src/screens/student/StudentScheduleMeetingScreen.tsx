import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { EmptyState } from '../../components/portal/EmptyState';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { SheetModal } from '../../components/portal/SheetModal';
import { fetchMyGroupDetails, type MyGroupMember } from '../../services/groupService';
import { useAuthUser } from '../../hooks/useAuthUser';
import {
  fetchUpcomingMeetings,
  scheduleMeeting,
  type MeetingItem,
} from '../../services/studentService';

const TIME_SLOTS = Array.from({ length: 24 }, (_, hour) =>
  `${hour.toString().padStart(2, '0')}:00`,
);

export function StudentScheduleMeetingScreen() {
  const { user } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [upcomingMeetings, setUpcomingMeetings] = useState<MeetingItem[]>([]);
  const [supervisor, setSupervisor] = useState<{
    id: string;
    name: string;
    department?: string;
  } | null>(null);
  const [groupMembers, setGroupMembers] = useState<MyGroupMember[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [meetingType, setMeetingType] = useState<'online' | 'offline'>('online');
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [meetings, groupRes] = await Promise.all([
        fetchUpcomingMeetings().catch(() => []),
        fetchMyGroupDetails().catch(() => ({ hasGroup: false, group: null })),
      ]);
      setUpcomingMeetings(Array.isArray(meetings) ? meetings : []);
      const groupSupervisor = groupRes?.group?.supervisor ?? null;
      setSupervisor(
        groupSupervisor?.id
          ? {
              id: groupSupervisor.id,
              name: groupSupervisor.name,
              department: groupSupervisor.department,
            }
          : null,
      );
      const members = groupRes?.group?.members ?? [];
      setGroupMembers(members);
      const otherMemberIds = members
        .map((member) => member.id)
        .filter((id) => id && id !== user?.id);
      setSelectedMemberIds(otherMemberIds);
    } catch {
      setUpcomingMeetings([]);
      setSupervisor(null);
      setGroupMembers([]);
      setSelectedMemberIds([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  const selectableMembers = groupMembers.filter((member) => member.id !== user?.id);

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    );
  };

  const toggleAllMembers = () => {
    const allIds = selectableMembers.map((member) => member.id);
    setSelectedMemberIds((prev) =>
      prev.length === allIds.length && allIds.every((id) => prev.includes(id)) ? [] : allIds,
    );
  };

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedDate('');
    setSelectedTime('');
    setMeetingType('online');
    setLocation('');
    setMeetingLink('');
    setSelectedMemberIds(
      selectableMembers.map((member) => member.id).filter((id) => Boolean(id)),
    );
  };

  const handleSchedule = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Please enter a meeting title');
      return;
    }
    if (!supervisor?.id) {
      Alert.alert('Validation', 'No supervisor assigned to your group yet');
      return;
    }
    if (!selectedDate.trim()) {
      Alert.alert('Validation', 'Please enter a date (YYYY-MM-DD)');
      return;
    }
    if (!selectedTime) {
      Alert.alert('Validation', 'Please select a time slot');
      return;
    }
    if (meetingType === 'online' && !meetingLink.trim()) {
      Alert.alert('Validation', 'Please provide a meeting link for online meetings');
      return;
    }
    if (meetingType === 'offline' && !location.trim()) {
      Alert.alert('Validation', 'Please provide a location for offline meetings');
      return;
    }

    setSubmitting(true);
    try {
      await scheduleMeeting({
        title: title.trim(),
        description: description.trim(),
        date: selectedDate.trim(),
        time: selectedTime,
        type: meetingType,
        location: location.trim(),
        meetingLink: meetingLink.trim(),
        supervisorId: supervisor.id,
        memberIds: selectedMemberIds,
      });
      const memberCount = selectedMemberIds.length;
      Alert.alert(
        'Meeting Scheduled',
        `Your meeting "${title.trim()}" has been scheduled with ${supervisor.name}${
          memberCount > 0 ? ` and ${memberCount} group member(s)` : ''
        }.`,
      );
      resetForm();
      await loadData();
    } catch {
      Alert.alert('Error', 'Failed to schedule meeting. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingView message="Loading meetings..." />;
  }

  return (
    <PortalScreenLayout
      title="Schedule Meeting"
      subtitle="Book a meeting with your supervisor"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Meeting Details</Text>
        <Text style={styles.label}>Meeting Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g., Project Progress Discussion"
          placeholderTextColor="#9ca3af"
        />
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="What do you want to discuss?"
          placeholderTextColor="#9ca3af"
          multiline
        />
        <Text style={styles.label}>Supervisor</Text>
        {supervisor ? (
          <View style={styles.supervisorCard}>
            <Text style={styles.supervisorName}>{supervisor.name}</Text>
            {supervisor.department ? (
              <Text style={styles.supervisorMeta}>{supervisor.department}</Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.supervisorEmpty}>
            <Text style={styles.supervisorEmptyText}>
              No supervisor assigned yet. Request and confirm a supervisor from the Supervisor
              page first.
            </Text>
          </View>
        )}
        <Text style={styles.label}>Group Members</Text>
        {selectableMembers.length === 0 ? (
          <View style={styles.membersEmpty}>
            <Text style={styles.membersEmptyText}>
              {groupMembers.length === 0
                ? 'No group members found. Join or create a group first.'
                : 'No other group members to invite.'}
            </Text>
          </View>
        ) : (
          <>
            <Pressable style={styles.selectAllRow} onPress={toggleAllMembers}>
              <Text style={styles.selectAllText}>
                {selectedMemberIds.length === selectableMembers.length
                  ? 'Deselect all'
                  : 'Select all members'}
              </Text>
            </Pressable>
            <View style={styles.memberList}>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {selectableMembers.map((member) => {
                  const selected = selectedMemberIds.includes(member.id);
                  return (
                    <Pressable
                      key={member.id}
                      style={[styles.memberItem, selected && styles.memberItemSelected]}
                      onPress={() => toggleMember(member.id)}>
                      <View style={styles.memberAvatar}>
                        <Text style={styles.memberAvatarText}>
                          {member.name?.charAt(0)?.toUpperCase() ?? '?'}
                        </Text>
                      </View>
                      <View style={styles.memberBody}>
                        <Text style={styles.memberName}>
                          {member.name}
                          {member.isLeader ? ' (Leader)' : ''}
                        </Text>
                        {member.email ? (
                          <Text style={styles.memberEmail}>{member.email}</Text>
                        ) : null}
                      </View>
                      {selected ? (
                        <FeatherIcon name="check" size={18} color="#16a34a" />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
            {selectedMemberIds.length > 0 ? (
              <Text style={styles.selectedCount}>
                {selectedMemberIds.length} member(s) will receive meeting info
              </Text>
            ) : (
              <Text style={styles.membersHint}>
                Select members to include them in the meeting and send them the link
              </Text>
            )}
          </>
        )}
        <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={selectedDate}
          onChangeText={setSelectedDate}
          placeholder="2026-05-30"
          placeholderTextColor="#9ca3af"
          autoCapitalize="none"
        />
        <Text style={styles.label}>Time</Text>
        <Pressable style={styles.picker} onPress={() => setTimePickerOpen(true)}>
          <Text style={[styles.pickerText, !selectedTime && styles.pickerPlaceholder]}>
            {selectedTime || 'Select time...'}
          </Text>
          <FeatherIcon name="chevron-down" size={18} color="#6b7280" />
        </Pressable>
        <Text style={styles.label}>Meeting Type</Text>
        <View style={styles.typeRow}>
          {(['online', 'offline'] as const).map((type) => {
            const selected = meetingType === type;
            return (
              <Pressable
                key={type}
                style={[styles.typeBtn, selected && styles.typeBtnSelected]}
                onPress={() => setMeetingType(type)}>
                <Text style={[styles.typeBtnText, selected && styles.typeBtnTextSelected]}>
                  {type === 'online' ? 'Online' : 'Offline'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {meetingType === 'online' ? (
          <>
            <Text style={styles.label}>Meeting Link</Text>
            <TextInput
              style={styles.input}
              value={meetingLink}
              onChangeText={setMeetingLink}
              placeholder="https://zoom.us/..."
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Room 301, CS Department"
              placeholderTextColor="#9ca3af"
            />
          </>
        )}
        <Pressable
          style={[
            styles.submitBtn,
            (submitting || !supervisor) && styles.submitBtnDisabled,
          ]}
          disabled={submitting || !supervisor}
          onPress={handleSchedule}>
          <Text style={styles.submitText}>
            {submitting ? 'Scheduling...' : 'Schedule Meeting'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>Upcoming Meetings</Text>
      {upcomingMeetings.length === 0 ? (
        <EmptyState
          icon="calendar"
          title="No upcoming meetings"
          message="Scheduled meetings will appear here."
        />
      ) : (
        upcomingMeetings.map((meeting) => (
          <View key={String(meeting.id)} style={styles.meetingCard}>
            <Text style={styles.meetingTitle}>{meeting.title}</Text>
            <Text style={styles.meetingMeta}>
              {[meeting.date, meeting.time, meeting.supervisorName].filter(Boolean).join(' • ')}
            </Text>
            {meeting.type ? (
              <Text style={styles.meetingType}>
                {meeting.type === 'online' ? 'Online' : 'Offline'}
                {meeting.type === 'online' && meeting.meetingLink
                  ? ` · ${meeting.meetingLink}`
                  : ''}
                {meeting.type === 'offline' && meeting.location
                  ? ` · ${meeting.location}`
                  : ''}
              </Text>
            ) : null}
          </View>
        ))
      )}

      <SheetModal
        visible={timePickerOpen}
        onClose={() => setTimePickerOpen(false)}
        title="Select Time"
        subtitle="24-hour format">
        <ScrollView showsVerticalScrollIndicator={false} style={styles.timePickerList}>
          {TIME_SLOTS.map((slot) => (
            <Pressable
              key={slot}
              style={styles.optionRow}
              onPress={() => {
                setSelectedTime(slot);
                setTimePickerOpen(false);
              }}>
              <Text style={styles.optionText}>{slot}</Text>
              {selectedTime === slot ? (
                <FeatherIcon name="check" size={18} color="#16a34a" />
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      </SheetModal>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  supervisorCard: {
    borderWidth: 1,
    borderColor: '#111827',
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  supervisorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  supervisorMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#d1d5db',
  },
  supervisorEmpty: {
    borderWidth: 1,
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb',
    borderRadius: 10,
    padding: 12,
  },
  supervisorEmptyText: {
    fontSize: 13,
    color: '#92400e',
    lineHeight: 18,
  },
  membersEmpty: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  membersEmptyText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  selectAllRow: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  memberList: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    maxHeight: 180,
    overflow: 'hidden',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 10,
  },
  memberItemSelected: {
    backgroundColor: '#f0fdf4',
  },
  memberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  memberBody: {
    flex: 1,
    minWidth: 0,
  },
  memberName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  memberEmail: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  selectedCount: {
    marginTop: 8,
    fontSize: 12,
    color: '#166534',
  },
  membersHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  pickerText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  pickerPlaceholder: {
    color: '#6b7280',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  typeBtnSelected: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  typeBtnText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  typeBtnTextSelected: {
    color: '#fff',
  },
  submitBtn: {
    marginTop: 16,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  meetingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 10,
  },
  meetingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  meetingMeta: {
    fontSize: 13,
    color: '#4b5563',
  },
  meetingType: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  timePickerList: {
    maxHeight: 360,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  optionText: {
    fontSize: 15,
    color: '#111827',
  },
});
