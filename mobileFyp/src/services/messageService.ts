import ReactNativeBlobUtil from 'react-native-blob-util';
import {
  authDelete,
  authGet,
  authPost,
  ensureApiReady,
  getAuthHeaders,
} from './apiClient';
import { getResolvedApiBaseUrl } from './apiClient';
import {
  downloadDocumentFromUrl,
  openDocumentFromUrl,
} from './documentService';
import { resolveBackendFileUrl } from './proofSubmissionService';

export interface ChatUser {
  id: string;
  name: string;
  role: 'student' | 'teacher' | 'group';
  profileImage?: string | null;
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageTimeRaw?: string;
  unreadCount?: number;
  isOnline?: boolean;
  conversationId?: string;
  isGroup?: boolean;
  groupName?: string;
  participantCount?: number;
  email?: string;
  rollNumber?: string;
  department?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  receiverId?: string;
  isRead?: boolean;
  createdAt: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  deletedAt?: string | null;
  sender?: { id?: string; name?: string; profileImage?: string | null };
  clientTempId?: string;
  delivered?: boolean;
  read?: boolean;
  failed?: boolean;
}

export function formatLastMessageTime(dateString?: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function messagesFingerprint(msgs: ChatMessage[]) {
  return msgs
    .map(
      (m) =>
        `${m.id}|${m.content}|${m.senderId}|${m.deletedAt ?? ''}|${m.fileUrl ?? ''}`,
    )
    .join(';;');
}

/** Keep optimistic pending messages while merging server data. */
export function mergeChatMessages(prev: ChatMessage[], incoming: ChatMessage[]) {
  const sorted = [...incoming].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const pending = prev.filter(
    (m) => m.clientTempId && (m.id.startsWith('temp-') || m.failed),
  );
  if (pending.length === 0) {
    return sorted;
  }
  const merged = [...sorted];
  for (const p of pending) {
    const duplicate = sorted.some(
      (m) =>
        m.senderId === p.senderId &&
        m.content === p.content &&
        Math.abs(new Date(m.createdAt).getTime() - new Date(p.createdAt).getTime()) < 60000,
    );
    if (!duplicate) {
      merged.push(p);
    }
  }
  return merged.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export function formatMessageTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export async function fetchChatConversations(): Promise<ChatUser[]> {
  const data = await authGet<Array<Record<string, unknown>>>('/api/messages/conversations');
  const rows = Array.isArray(data) ? data : [];
  return rows.map((c) => {
    const isGroup = Boolean(c.isGroup);
    const roleRaw = String(c.participantRole ?? 'student').toLowerCase();
    return {
      id: isGroup ? String(c.id) : String(c.participantId ?? c.id),
      name: isGroup
        ? String(c.groupName ?? c.participantName ?? 'Group Chat')
        : String(c.participantName ?? 'Unknown'),
      role: isGroup ? 'group' : (roleRaw === 'teacher' ? 'teacher' : 'student'),
      profileImage: (c.profileImage as string | null) ?? null,
      lastMessage: String(c.lastMessage ?? ''),
      lastMessageTime: formatLastMessageTime(String(c.lastMessageTime ?? '')),
      lastMessageTimeRaw: String(c.lastMessageTime ?? ''),
      unreadCount: Number(c.unreadCount ?? 0),
      isOnline: Boolean(c.isOnline ?? true),
      conversationId: String(c.id),
      isGroup,
      groupName: c.groupName ? String(c.groupName) : undefined,
      participantCount: c.participantCount ? Number(c.participantCount) : undefined,
    };
  });
}

export async function fetchChatMessages(chat: ChatUser): Promise<ChatMessage[]> {
  const url = chat.isGroup || chat.role === 'group'
    ? `/api/messages/groups/${chat.id}/messages`
    : `/api/messages/${chat.id}`;
  const data = await authGet<ChatMessage[]>(url);
  return Array.isArray(data) ? data : [];
}

export async function sendChatMessage(
  chat: ChatUser,
  payload: {
    content: string;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
  },
) {
  const url =
    chat.isGroup || chat.role === 'group'
      ? `/api/messages/groups/${chat.id}/messages`
      : `/api/messages/${chat.id}`;
  return authPost<ChatMessage>(url, payload);
}

export async function uploadChatAttachment(fileUri: string, fileName: string, mimeType: string) {
  await ensureApiReady();
  const baseUrl = getResolvedApiBaseUrl();
  const path = fileUri.replace('file://', '');
  const authHeaders = await getAuthHeaders();
  const headers: Record<string, string> = {
    'Content-Type': 'multipart/form-data',
    ...(authHeaders as Record<string, string>),
  };
  const response = await ReactNativeBlobUtil.fetch(
    'POST',
    `${baseUrl}/api/messages/upload`,
    headers,
    [
      {
        name: 'file',
        filename: fileName,
        type: mimeType,
        data: ReactNativeBlobUtil.wrap(path),
      },
    ],
  );
  const status = response.info().status;
  const bodyText = await response.text();
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(bodyText);
  } catch {
    body = {};
  }
  if (status < 200 || status >= 300) {
    throw new Error(String(body.error ?? 'Upload failed'));
  }
  return body as {
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  };
}

export async function deleteChatMessage(messageId: string) {
  return authDelete(`/api/messages/delete/${messageId}`);
}

export async function deleteConversation(conversationId: string) {
  return authDelete(`/api/messages/conversations/${conversationId}`);
}

export async function openOrCreateConversation(participantId: string) {
  return authGet<ChatMessage[]>(`/api/messages/${participantId}`);
}

export async function createMessageGroup(groupName: string, memberIds: string[]) {
  return authPost<{ id?: string }>('/api/messages/groups', { groupName, memberIds });
}

export function getMessageFileUrl(fileUrl?: string | null) {
  if (!fileUrl) return '';
  return resolveBackendFileUrl(fileUrl);
}

function normalizeAttachmentPath(fileUrl: string) {
  if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
    try {
      const parsed = new URL(fileUrl);
      return parsed.pathname;
    } catch {
      return fileUrl;
    }
  }
  return fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
}

/** Fetch via backend API — works on Render where runtime uploads aren't always static-served. */
export function getChatAttachmentFetchUrl(fileUrl: string) {
  const path = normalizeAttachmentPath(fileUrl);
  const base = getResolvedApiBaseUrl().replace(/\/$/, '');
  return `${base}/api/messages/file?path=${encodeURIComponent(path)}`;
}

export async function openChatAttachment(
  fileUrl?: string | null,
  fileName?: string | null,
  fileType?: string | null,
) {
  return openDocumentFromUrl(fileUrl, {
    fileName,
    mimeType: fileType,
    urls: fileUrl ? [getChatAttachmentFetchUrl(fileUrl)] : [],
  });
}

export async function downloadChatAttachment(
  fileUrl?: string | null,
  fileName?: string | null,
  fileType?: string | null,
) {
  return downloadDocumentFromUrl(fileUrl, {
    fileName,
    mimeType: fileType,
    urls: fileUrl ? [getChatAttachmentFetchUrl(fileUrl)] : [],
  });
}
