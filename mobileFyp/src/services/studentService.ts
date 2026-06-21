import { authGet, authPost } from './apiClient';
import { fetchAllNotifications } from './notificationService';

export interface Announcement {
  id: string;
  title: string;
  content?: string;
  type?: string;
  createdAt?: string;
}

export interface ProjectIdea {
  id: string;
  title: string;
  description?: string;
  requirements?: string;
  status?: string;
  domain?: string;
  tools?: string;
  objectives?: string;
  abstract?: string;
  createdAt?: string;
  teacher?: {
    id?: string;
    name?: string;
    email?: string;
    department?: string;
  };
  supervisor?: {
    id?: string;
    name?: string;
    email?: string;
    department?: string;
  };
}

export interface GroupMember {
  role?: string;
  user?: {
    id: string;
    name: string;
    email?: string;
    rollNumber?: string;
    department?: string;
  };
}

export interface StudentGroup {
  id: string;
  name: string;
  status?: string;
  members?: GroupMember[];
  projects?: ProjectIdea[];
}

export interface SupervisionRequest {
  id: string;
  status: string;
  message?: string;
  createdAt?: string;
  teacher?: { id: string; name: string; department?: string };
  student?: { id: string; name: string; rollNumber?: string };
  project?: { title?: string };
}

export type { NotificationItem } from './notificationService';

export interface MeetingItem {
  id: number | string;
  title: string;
  description?: string;
  date: string;
  time: string;
  type?: 'online' | 'offline';
  location?: string;
  meetingLink?: string;
  supervisorName?: string;
  status?: string;
}

export interface ConversationParticipant {
  user?: {
    id: string;
    name: string;
    email?: string;
    role?: string;
    rollNumber?: string;
    department?: string;
    profileImage?: string;
  };
}

export interface ConversationItem {
  id: string;
  participants?: ConversationParticipant[];
  messages?: Array<{
    content?: string;
    createdAt?: string;
    sender?: { id?: string; name?: string };
  }>;
  unreadCount?: number;
}

export interface ProfileData {
  id: string;
  name: string;
  email: string;
  role?: string;
  rollNumber?: string;
  department?: string;
  phone?: string;
  bio?: string;
}

export async function fetchAnnouncements() {
  return authGet<Announcement[]>('/api/announcements');
}

export async function fetchProjectIdeas() {
  return authGet<ProjectIdea[]>('/api/faculty-ideas');
}

export async function fetchMyGroup() {
  return authGet<{ hasGroup: boolean; group: StudentGroup | null }>(
    '/api/groups/my-group',
  );
}

export async function fetchSupervisionRequests() {
  return authGet<SupervisionRequest[]>('/api/supervision/requests');
}

export async function fetchNotifications() {
  return fetchAllNotifications();
}

export async function fetchRecentActivities() {
  const notifications = await fetchAllNotifications();
  return notifications.slice(0, 5);
}

export async function fetchUpcomingMeetings() {
  return authGet<MeetingItem[]>('/api/meetings/upcoming');
}

export async function scheduleMeeting(payload: {
  title: string;
  description?: string;
  date: string;
  time: string;
  type: 'online' | 'offline';
  location?: string;
  meetingLink?: string;
  supervisorId: string;
  memberIds?: string[];
}) {
  return authPost<MeetingItem>('/api/meetings', payload);
}

export async function fetchConversations() {
  return authGet<ConversationItem[]>('/api/messages/conversations');
}

export async function fetchProfile(userId: string) {
  return authGet<ProfileData>('/api/profile', { userId });
}
