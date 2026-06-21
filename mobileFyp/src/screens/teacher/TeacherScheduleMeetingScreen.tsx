import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import Toast from 'react-native-toast-message';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { SheetModal } from '../../components/portal/SheetModal';
import { useAuthUser } from '../../hooks/useAuthUser';
import {
  fetchSupervisedGroups,
  fetchTeacherUpcomingMeetings,
  scheduleTeacherMeeting,
  type SupervisedGroup,
  type SupervisedStudent,
} from '../../services/teacherService';

const TIME_SLOTS = Array.from({ length: 24 }, (_, hour) =>
  `${hour.toString().padStart(2, '0')}:00`,
);

const SCHEDULING_TIPS = [
  'Schedule meetings at least 24 hours in advance',
  'Prepare agenda items before the meeting',
  'Share meeting links with students in advance',
  'Keep meetings focused and time-bound',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getDaysInMonth(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  const days: Array<Date | null> = [];

  for (let i = 0; i < startingDayOfWeek; i += 1) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i += 1) {
    days.push(new Date(year, month, i));
  }
  return days;
}

function isDateSelectable(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDateObj = new Date(date);
  selectedDateObj.setHours(0, 0, 0, 0);
  if (selectedDateObj < today) {
    return false;
  }
  const day = selectedDateObj.getDay();
  return day !== 0 && day !== 6;
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatSelectedDateLabel(dateStr: string) {
  if (!dateStr) {
    return 'Select a date';
  }
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        {icon ? <FeatherIcon name={icon} size={18} color="#111827" /> : null}
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export function TeacherScheduleMeetingScreen() {
  const { user } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [groups, setGroups] = useState<SupervisedGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [upcomingMeetings, setUpcomingMeetings] = useState<
    Array<{ id: string | number; title: string; date: string; time: string }>
  >([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [meetingType, setMeetingType] = useState<'online' | 'offline'>('online');
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const loadData = useCallback(async () => {
    try {
      const [groupRows, meetings] = await Promise.all([
        fetchSupervisedGroups().catch(() => []),
        fetchTeacherUpcomingMeetings().catch(() => []),
      ]);
      setGroups(Array.isArray(groupRows) ? groupRows : []);
      setUpcomingMeetings(Array.isArray(meetings) ? meetings : []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedGroup = useMemo(
    () => groups.find((group) => group.id === selectedGroupId) ?? null,
    [groups, selectedGroupId],
  );

  const groupStudents: SupervisedStudent[] = useMemo(
    () => selectedGroup?.members ?? [],
    [selectedGroup],
  );

  const selectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setSelectedStudents([]);
    setGroupPickerOpen(false);
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    );
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedGroupId('');
    setSelectedStudents([]);
    setMeetingType('online');
    setLocation('');
    setMeetingLink('');
    setSelectedDate('');
    setSelectedTime('');
  };

  const canSubmit = useMemo(() => {
    if (!title.trim() || !selectedDate || !selectedTime || !selectedGroupId) {
      return false;
    }
    if (selectedStudents.length === 0) {
      return false;
    }
    if (meetingType === 'online') {
      return meetingLink.trim().length > 0;
    }
    return location.trim().length > 0;
  }, [
    title,
    selectedDate,
    selectedTime,
    selectedGroupId,
    selectedStudents.length,
    meetingType,
    meetingLink,
    location,
  ]);

  const handleSchedule = async () => {
    if (!user?.id) {
      Toast.show({ type: 'error', text1: 'You must be logged in to schedule a meeting' });
      return;
    }
    if (!title.trim()) {
      Toast.show({ type: 'error', text1: 'Please enter a meeting title' });
      return;
    }
    if (!selectedGroupId) {
      Toast.show({ type: 'error', text1: 'Please select a group first' });
      return;
    }
    if (selectedStudents.length === 0) {
      Toast.show({ type: 'error', text1: 'Please select at least one student' });
      return;
    }
    if (!selectedDate) {
      Toast.show({ type: 'error', text1: 'Please select a date' });
      return;
    }
    if (!selectedTime) {
      Toast.show({ type: 'error', text1: 'Please select a time slot' });
      return;
    }
    if (meetingType === 'online' && !meetingLink.trim()) {
      Toast.show({ type: 'error', text1: 'Please provide a meeting link for online meetings' });
      return;
    }
    if (meetingType === 'offline' && !location.trim()) {
      Toast.show({ type: 'error', text1: 'Please provide a location for offline meetings' });
      return;
    }

    setSubmitting(true);
    try {
      await scheduleTeacherMeeting({
        title: title.trim(),
        description: description.trim(),
        date: selectedDate,
        time: selectedTime,
        type: meetingType,
        location: location.trim(),
        meetingLink: meetingLink.trim(),
        participantIds: selectedStudents,
        organizerId: user.id,
      });
      Toast.show({
        type: 'success',
        text1: 'Meeting scheduled successfully',
        text2: `"${title.trim()}" with ${selectedStudents.length} student(s)`,
      });
      resetForm();
      await loadData();
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to schedule meeting' });
    } finally {
      setSubmitting(false);
    }
  };

  const calendarDays = useMemo(() => getDaysInMonth(currentMonth), [currentMonth]);

  if (loading) {
    return <LoadingView message="Loading schedule meeting..." />;
  }

  return (
    <PortalScreenLayout
      title="Schedule Meeting"
      subtitle="Book a meeting with your students"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
      <SectionCard title="Meeting Details" icon="calendar">
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
          placeholder="Describe what you want to discuss in this meeting"
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Select Group *</Text>
        <Pressable style={styles.picker} onPress={() => setGroupPickerOpen(true)}>
          <Text style={[styles.pickerText, !selectedGroup && styles.pickerPlaceholder]}>
            {selectedGroup?.name ?? 'Choose a supervised group'}
          </Text>
          <FeatherIcon name="chevron-down" size={18} color="#6b7280" />
        </Pressable>

        <Text style={styles.label}>Select Students *</Text>
        <View style={styles.studentList}>
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {!selectedGroup ? (
              <Text style={styles.emptyStudents}>Select a group first</Text>
            ) : groupStudents.length === 0 ? (
              <Text style={styles.emptyStudents}>No students in this group</Text>
            ) : (
              groupStudents.map((student) => {
                const selected = selectedStudents.includes(student.id);
                return (
                  <Pressable
                    key={student.id}
                    style={[styles.studentItem, selected && styles.studentItemSelected]}
                    onPress={() => toggleStudent(student.id)}>
                    <View style={styles.studentAvatar}>
                      <Text style={styles.studentAvatarText}>
                        {student.name?.charAt(0)?.toUpperCase() ?? '?'}
                      </Text>
                    </View>
                    <View style={styles.studentBody}>
                      <Text style={styles.studentName}>
                        {student.name}
                        {student.role?.toUpperCase() === 'LEADER' ? ' (Leader)' : ''}
                      </Text>
                      <Text style={styles.studentEmail}>{student.email}</Text>
                    </View>
                    {selected ? <FeatherIcon name="check" size={18} color="#2563eb" /> : null}
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
        {selectedStudents.length > 0 ? (
          <Text style={styles.selectedCount}>
            {selectedStudents.length} student(s) selected
          </Text>
        ) : null}
      </SectionCard>

      <SectionCard title="Upcoming Meetings" icon="calendar">
        {upcomingMeetings.length === 0 ? (
          <View style={styles.upcomingEmpty}>
            <Text style={styles.upcomingEmptyText}>No upcoming meetings scheduled</Text>
          </View>
        ) : (
          upcomingMeetings.slice(0, 5).map((meeting) => (
            <View key={String(meeting.id)} style={styles.upcomingItem}>
              <Text style={styles.upcomingTitle}>{meeting.title}</Text>
              <Text style={styles.upcomingMeta}>
                {new Date(meeting.date).toLocaleDateString()} at {meeting.time}
              </Text>
            </View>
          ))
        )}
      </SectionCard>

      <SectionCard title="Scheduling Tips">
        {SCHEDULING_TIPS.map((tip) => (
          <View key={tip} style={styles.tipRow}>
            <FeatherIcon name="check" size={16} color="#22c55e" style={styles.tipIcon} />
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Meeting Type">
        <View style={styles.typeRow}>
          <Pressable
            style={[styles.typeBtn, meetingType === 'online' && styles.typeBtnSelected]}
            onPress={() => setMeetingType('online')}>
            <FeatherIcon
              name="video"
              size={22}
              color={meetingType === 'online' ? '#fff' : '#111827'}
            />
            <Text
              style={[styles.typeBtnText, meetingType === 'online' && styles.typeBtnTextSelected]}>
              Online Meeting
            </Text>
          </Pressable>
          <Pressable
            style={[styles.typeBtn, meetingType === 'offline' && styles.typeBtnSelected]}
            onPress={() => setMeetingType('offline')}>
            <FeatherIcon
              name="map-pin"
              size={22}
              color={meetingType === 'offline' ? '#fff' : '#111827'}
            />
            <Text
              style={[
                styles.typeBtnText,
                meetingType === 'offline' && styles.typeBtnTextSelected,
              ]}>
              In-Person Meeting
            </Text>
          </Pressable>
        </View>

        {meetingType === 'online' ? (
          <>
            <Text style={styles.label}>Meeting Link</Text>
            <TextInput
              style={styles.input}
              value={meetingLink}
              onChangeText={setMeetingLink}
              placeholder="https://zoom.us/meeting/... or https://meet.google.com/..."
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
            />
            <Text style={styles.helperText}>
              Provide Zoom, Google Meet, or Microsoft Teams link
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g., Room 301, CS Department, Building A"
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.helperText}>Specify the exact location for in-person meeting</Text>
          </>
        )}
      </SectionCard>

      <SectionCard title="Select Date & Time" icon="clock">
        <Text style={styles.label}>Date</Text>
        <Pressable style={styles.dateBtn} onPress={() => setCalendarOpen(true)}>
          <FeatherIcon name="calendar" size={16} color="#6b7280" />
          <Text style={[styles.dateBtnText, !selectedDate && styles.dateBtnPlaceholder]}>
            {formatSelectedDateLabel(selectedDate)}
          </Text>
        </Pressable>

        <Text style={styles.label}>Time (24-hour format)</Text>
        <Pressable style={styles.picker} onPress={() => setTimePickerOpen(true)}>
          <Text style={[styles.pickerText, !selectedTime && styles.pickerPlaceholder]}>
            {selectedTime || 'Select time...'}
          </Text>
          <FeatherIcon name="chevron-down" size={18} color="#6b7280" />
        </Pressable>
      </SectionCard>

      <Pressable
        style={[styles.submitBtn, (!canSubmit || submitting) && styles.submitBtnDisabled]}
        disabled={!canSubmit || submitting}
        onPress={handleSchedule}>
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <FeatherIcon name="check" size={18} color="#fff" />
            <Text style={styles.submitBtnText}>Schedule Meeting</Text>
          </>
        )}
      </Pressable>

      <SheetModal
        visible={groupPickerOpen}
        onClose={() => setGroupPickerOpen(false)}
        title="Select Group"
        subtitle="Groups you supervise">
        {groups.length === 0 ? (
          <Text style={styles.emptyStudents}>
            No supervised groups yet. Accept supervision requests first.
          </Text>
        ) : (
          groups.map((group) => (
            <Pressable
              key={group.id}
              style={styles.optionRow}
              onPress={() => selectGroup(group.id)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionText}>{group.name}</Text>
                <Text style={styles.groupMeta}>
                  {group.members?.length ?? 0} member(s)
                </Text>
              </View>
              {selectedGroupId === group.id ? (
                <FeatherIcon name="check" size={18} color="#2563eb" />
              ) : null}
            </Pressable>
          ))
        )}
      </SheetModal>

      <SheetModal
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        title="Select Date"
        subtitle={currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}>
        <View style={styles.calendarHeader}>
          <Pressable
            style={styles.calendarNavBtn}
            onPress={() =>
              setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
            }>
            <FeatherIcon name="chevron-left" size={20} color="#374151" />
          </Pressable>
          <Text style={styles.calendarMonth}>
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <Pressable
            style={styles.calendarNavBtn}
            onPress={() =>
              setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
            }>
            <FeatherIcon name="chevron-right" size={20} color="#374151" />
          </Pressable>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((day) => (
            <Text key={day} style={styles.weekdayText}>
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.calendarGrid}>
          {calendarDays.map((date, index) => {
            if (!date) {
              return <View key={`empty-${index}`} style={styles.calendarCell} />;
            }
            const value = formatDateValue(date);
            const selectable = isDateSelectable(date);
            const selected = selectedDate === value;
            return (
              <Pressable
                key={value}
                style={[
                  styles.calendarCell,
                  selected && styles.calendarCellSelected,
                  !selectable && styles.calendarCellDisabled,
                ]}
                disabled={!selectable}
                onPress={() => {
                  setSelectedDate(value);
                  setCalendarOpen(false);
                }}>
                <Text
                  style={[
                    styles.calendarCellText,
                    selected && styles.calendarCellTextSelected,
                    !selectable && styles.calendarCellTextDisabled,
                  ]}>
                  {date.getDate()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </SheetModal>

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
                <FeatherIcon name="check" size={18} color="#2563eb" />
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
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  textArea: {
    minHeight: 88,
  },
  studentList: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    maxHeight: 220,
    overflow: 'hidden',
  },
  emptyStudents: {
    textAlign: 'center',
    paddingVertical: 24,
    fontSize: 13,
    color: '#6b7280',
  },
  studentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 10,
  },
  studentItemSelected: {
    backgroundColor: '#eff6ff',
  },
  studentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  studentBody: {
    flex: 1,
    minWidth: 0,
  },
  studentName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  studentEmail: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  selectedCount: {
    marginTop: 8,
    fontSize: 12,
    color: '#4b5563',
  },
  upcomingEmpty: {
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    padding: 12,
  },
  upcomingEmptyText: {
    fontSize: 13,
    color: '#4b5563',
  },
  upcomingItem: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  upcomingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  upcomingMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280',
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 8,
  },
  tipIcon: {
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 19,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  typeBtn: {
    flex: 1,
    minHeight: 88,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
  },
  typeBtnSelected: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  typeBtnTextSelected: {
    color: '#fff',
  },
  helperText: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  dateBtnText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  dateBtnPlaceholder: {
    color: '#6b7280',
  },
  picker: {
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
  pickerText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  pickerPlaceholder: {
    color: '#6b7280',
  },
  timePickerList: {
    maxHeight: 360,
  },
  groupMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
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
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calendarNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonth: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginBottom: 4,
  },
  calendarCellSelected: {
    backgroundColor: '#2563eb',
  },
  calendarCellDisabled: {
    opacity: 0.35,
  },
  calendarCellText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  calendarCellTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  calendarCellTextDisabled: {
    color: '#9ca3af',
  },
});
