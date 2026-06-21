import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
} from '@react-native-documents/picker';
import FeatherIcon from 'react-native-vector-icons/Feather';
import Toast from 'react-native-toast-message';
import { EmptyState } from '../portal/EmptyState';
import { LoadingView } from '../portal/LoadingView';
import { PortalScreenLayout } from '../portal/PortalScreenLayout';
import { SheetModal } from '../portal/SheetModal';
import { useChatSocket } from '../../hooks/useChatSocket';
import { useAuthUser } from '../../hooks/useAuthUser';
import { searchStudents } from '../../services/groupService';
import {
  createMessageGroup,
  deleteChatMessage,
  deleteConversation,
  fetchChatConversations,
  fetchChatMessages,
  formatMessageTime,
  getInitials,
  downloadChatAttachment,
  openChatAttachment,
  mergeChatMessages,
  messagesFingerprint,
  openOrCreateConversation,
  sendChatMessage,
  uploadChatAttachment,
  type ChatMessage,
  type ChatUser,
} from '../../services/messageService';
import { searchTeachers } from '../../services/supervisorService';

export type PortalChatConfig = {
  listSubtitle: string;
  emptyListMessage: string;
  newChatTypes: Array<'students' | 'teachers'>;
  defaultNewChatType: 'students' | 'teachers';
  loadUserProfile: (userId: string) => Promise<Record<string, unknown>>;
};

type SearchUserRow = {
  id: string;
  name: string;
  role: 'student' | 'teacher';
  email?: string;
  rollNumber?: string;
  department?: string;
  profileImage?: string | null;
  isGroupMember?: boolean;
};

function formatMemberSubtitle(row: SearchUserRow) {
  if (row.role === 'student') {
    const parts: string[] = [];
    if (row.rollNumber) parts.push(row.rollNumber);
    if (row.department) parts.push(row.department);
    return parts.join(' • ') || 'Student';
  }
  return row.department || 'Teacher';
}

function RoleBadge({ role }: { role: 'student' | 'teacher' }) {
  const isTeacher = role === 'teacher';
  return (
    <View style={[styles.roleBadge, isTeacher ? styles.roleBadgeTeacher : styles.roleBadgeStudent]}>
      <Text
        style={[
          styles.roleBadgeText,
          isTeacher ? styles.roleBadgeTextTeacher : styles.roleBadgeTextStudent,
        ]}>
        {isTeacher ? 'Teacher' : 'Student'}
      </Text>
    </View>
  );
}

function AvatarCircle({
  name,
  size = 44,
  online,
}: {
  name: string;
  size?: number;
  online?: boolean;
}) {
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: size / 2 },
        ]}>
        <Text style={[styles.avatarText, { fontSize: size * 0.34 }]}>
          {getInitials(name)}
        </Text>
      </View>
      {online ? (
        <View
          style={[
            styles.onlineDot,
            { right: 0, bottom: 0, width: size * 0.28, height: size * 0.28 },
          ]}
        />
      ) : null}
    </View>
  );
}

function MemberSearchRow({
  row,
  selected,
  onPress,
  trailing,
}: {
  row: SearchUserRow;
  selected?: boolean;
  onPress: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <Pressable
      style={[styles.memberRow, selected && styles.memberRowSelected]}
      onPress={onPress}>
      <AvatarCircle name={row.name} size={44} />
      <View style={styles.memberRowContent}>
        <View style={styles.memberRowTop}>
          <Text style={styles.searchUserName} numberOfLines={1}>
            {row.name}
          </Text>
          <RoleBadge role={row.role} />
        </View>
        <Text style={styles.searchUserMeta}>{formatMemberSubtitle(row)}</Text>
      </View>
      {trailing}
    </Pressable>
  );
}

function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileTypeLabel(fileName?: string | null, fileType?: string | null) {
  if (fileType?.startsWith('image/')) return 'Image';
  if (fileType === 'application/pdf') return 'PDF Document';
  if (fileType?.includes('word')) return 'Word Document';
  if (fileType?.includes('sheet') || fileType?.includes('excel')) return 'Spreadsheet';
  if (fileType?.includes('presentation') || fileType?.includes('powerpoint')) return 'Presentation';
  const ext = fileName?.split('.').pop()?.toUpperCase();
  return ext ? `${ext} File` : 'Document';
}

function getFileIconName(fileName?: string | null, fileType?: string | null) {
  if (fileType?.startsWith('image/')) return 'image';
  if (fileType === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf')) return 'file-text';
  if (fileType?.includes('zip') || fileName?.toLowerCase().endsWith('.zip')) return 'archive';
  return 'file';
}

function AttachmentActionSheet({
  message,
  loadingAction,
  onClose,
  onOpen,
  onDownload,
}: {
  message: ChatMessage;
  loadingAction: 'open' | 'download' | null;
  onClose: () => void;
  onOpen: () => void;
  onDownload: () => void;
}) {
  const fileName = message.fileName ?? 'Attachment';
  const fileType = getFileTypeLabel(message.fileName, message.fileType);
  const fileSize = formatFileSize(message.fileSize);
  const iconName = getFileIconName(message.fileName, message.fileType);

  return (
    <SheetModal
      visible
      onClose={onClose}
      title="Shared Document"
      subtitle="Open or save this file to your device">
      <View style={styles.attachmentCard}>
        <View style={styles.attachmentIconWrap}>
          <FeatherIcon name={iconName} size={28} color="#2563eb" />
        </View>
        <View style={styles.attachmentInfo}>
          <Text style={styles.attachmentName} numberOfLines={2}>
            {fileName}
          </Text>
          <Text style={styles.attachmentMeta}>
            {fileType} • {fileSize}
          </Text>
        </View>
      </View>

      <Pressable
        style={[styles.attachmentActionBtn, styles.attachmentActionPrimary]}
        onPress={onOpen}
        disabled={Boolean(loadingAction)}>
        {loadingAction === 'open' ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <FeatherIcon name="external-link" size={18} color="#fff" />
            <Text style={styles.attachmentActionPrimaryText}>Open File</Text>
          </>
        )}
      </Pressable>

      <Pressable
        style={[styles.attachmentActionBtn, styles.attachmentActionSecondary]}
        onPress={onDownload}
        disabled={Boolean(loadingAction)}>
        {loadingAction === 'download' ? (
          <ActivityIndicator color="#2563eb" size="small" />
        ) : (
          <>
            <FeatherIcon name="download" size={18} color="#2563eb" />
            <Text style={styles.attachmentActionSecondaryText}>Download</Text>
          </>
        )}
      </Pressable>

      <Pressable style={styles.attachmentCancelBtn} onPress={onClose} disabled={Boolean(loadingAction)}>
        <Text style={styles.attachmentCancelText}>Cancel</Text>
      </Pressable>
    </SheetModal>
  );
}

function MessageBubble({
  message,
  isMine,
  onLongPress,
  onFilePress,
}: {
  message: ChatMessage;
  isMine: boolean;
  onLongPress?: () => void;
  onFilePress?: () => void;
}) {
  const deleted = Boolean(message.deletedAt) || message.content === '[Message deleted]';
  const hasFile = !deleted && message.fileUrl;

  return (
    <Pressable
      onLongPress={onLongPress}
      style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowOther]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
        {deleted ? (
          <Text style={[styles.bubbleText, styles.deletedText]}>[Message deleted]</Text>
        ) : (
          <>
            {message.content ? (
              <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
                {message.content}
              </Text>
            ) : null}
            {hasFile ? (
              <Pressable style={styles.fileAttach} onPress={onFilePress}>
                <FeatherIcon name="paperclip" size={14} color={isMine ? '#fff' : '#2563eb'} />
                <Text
                  style={[styles.fileAttachText, isMine && styles.bubbleTextMine]}
                  numberOfLines={1}>
                  {message.fileName ?? 'Attachment'}
                </Text>
              </Pressable>
            ) : null}
          </>
        )}
        <View style={styles.bubbleMeta}>
          <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
            {formatMessageTime(message.createdAt)}
          </Text>
          {isMine && !message.failed ? (
            <FeatherIcon
              name={message.read ? 'check-circle' : message.delivered ? 'check' : 'check'}
              size={12}
              color="rgba(255,255,255,0.85)"
            />
          ) : null}
          {message.failed ? (
            <FeatherIcon name="alert-circle" size={12} color="#fecaca" />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function patchChatUserList(
  prev: ChatUser[],
  userId: string,
  patch: Partial<ChatUser>,
): ChatUser[] {
  const idx = prev.findIndex((u) => u.id === userId);
  if (idx === -1) return prev;
  const current = prev[idx];
  const hasChange = (Object.keys(patch) as (keyof ChatUser)[]).some(
    (key) => patch[key] !== current[key],
  );
  if (!hasChange) return prev;
  return prev.map((u) => (u.id === userId ? { ...u, ...patch } : u));
}

export function PortalChatScreen({ config }: { config: PortalChatConfig }) {
  const { user } = useAuthUser();
  const { socketRef, connected, sendPrivateMessage, markMessagesRead, joinGroup, leaveGroup } =
    useChatSocket(user?.id, user?.role);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChat, setSelectedChat] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  } | null>(null);

  const [newChatOpen, setNewChatOpen] = useState(false);
  const [newChatQuery, setNewChatQuery] = useState('');
  const [newChatType, setNewChatType] = useState<'teachers' | 'students'>(config.defaultNewChatType);
  const [searchResults, setSearchResults] = useState<SearchUserRow[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupMemberQuery, setGroupMemberQuery] = useState('');
  const [groupMemberType, setGroupMemberType] = useState<'students' | 'teachers'>('students');
  const [groupCandidates, setGroupCandidates] = useState<SearchUserRow[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<ChatMessage | null>(null);
  const [attachmentLoading, setAttachmentLoading] = useState<'open' | 'download' | null>(null);

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const shouldScrollToEnd = useRef(true);
  const activeChatIdRef = useRef<string | null>(null);
  const selectedChatRef = useRef<ChatUser | null>(null);
  const connectedRef = useRef(connected);
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;
  connectedRef.current = connected;

  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  const loadConversations = useCallback(async () => {
    try {
      const rows = await fetchChatConversations();
      setChatUsers(rows);
    } catch {
      setChatUsers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const applyMessagesFromServer = useCallback((rows: ChatMessage[]) => {
    setMessages((prev) => {
      const merged = mergeChatMessages(prev, rows);
      if (messagesFingerprint(prev) === messagesFingerprint(merged)) {
        return prev;
      }
      return merged;
    });
  }, []);

  const selectedChatId = selectedChat?.id;

  const refreshOpenChatMessages = useCallback(async () => {
    const chat = selectedChatRef.current;
    const chatId = activeChatIdRef.current;
    if (!chat || !chatId || chat.id !== chatId) return;

    try {
      const rows = await fetchChatMessages(chat);
      if (activeChatIdRef.current !== chatId) return;
      applyMessagesFromServer(rows);
    } catch {
      // keep existing messages on background refresh failure
    }
  }, [applyMessagesFromServer]);

  // Load messages when opening a chat (depends only on chat id)
  useEffect(() => {
    if (!selectedChatId) {
      activeChatIdRef.current = null;
      setMessages([]);
      return;
    }

    const chat = selectedChatRef.current;
    if (!chat || chat.id !== selectedChatId) return;

    activeChatIdRef.current = selectedChatId;
    shouldScrollToEnd.current = true;
    setMessages([]);
    setLoadingMessages(true);

    let cancelled = false;

    (async () => {
      try {
        const rows = await fetchChatMessages(chat);
        if (cancelled || activeChatIdRef.current !== selectedChatId) return;
        applyMessagesFromServer(rows);
        const uid = userIdRef.current;
        if (!chat.isGroup && chat.role !== 'group' && uid) {
          markMessagesRead(chat.id, uid);
        }
        setChatUsers((prev) => patchChatUserList(prev, chat.id, { unreadCount: 0 }));
      } catch {
        if (!cancelled && activeChatIdRef.current === selectedChatId) {
          setMessages([]);
        }
      } finally {
        if (!cancelled && activeChatIdRef.current === selectedChatId) {
          setLoadingMessages(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedChatId, applyMessagesFromServer, markMessagesRead]);

  // Fallback poll only when socket is disconnected
  useEffect(() => {
    if (!selectedChatId) return;

    const interval = setInterval(() => {
      if (!connectedRef.current && activeChatIdRef.current === selectedChatId) {
        refreshOpenChatMessages();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [selectedChatId, refreshOpenChatMessages]);

  useEffect(() => {
    if (!connected || !selectedChatId || !userIdRef.current) return;

    const chat = selectedChatRef.current;
    if (!chat) return;

    const isGroup = chat.isGroup || chat.role === 'group';
    if (isGroup) {
      joinGroup(chat.id);
      return () => leaveGroup(chat.id);
    }
    return undefined;
  }, [connected, selectedChatId, joinGroup, leaveGroup]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !connected || !userIdRef.current) return;

    const onPrivate = (msg: ChatMessage & { receiverId?: string }) => {
      const uid = userIdRef.current;
      if (!uid || (msg.receiverId !== uid && msg.senderId !== uid)) return;

      const activeChat = selectedChatRef.current;
      if (activeChat && msg.senderId === activeChat.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          shouldScrollToEnd.current = true;
          return [...prev, { ...msg, createdAt: String(msg.createdAt) }];
        });
      } else {
        setChatUsers((prev) => {
          const existing = prev.find((u) => u.id === msg.senderId);
          const nextUnread = (existing?.unreadCount ?? 0) + 1;
          return patchChatUserList(prev, msg.senderId, {
            lastMessage: msg.content,
            lastMessageTime: 'Just now',
            unreadCount: nextUnread,
          });
        });
      }
    };

    const onGroup = (msg: {
      id: string;
      groupId: string;
      message: string;
      senderId: string;
      senderName: string;
      timestamp: string;
    }) => {
      const activeChat = selectedChatRef.current;
      if (activeChat?.id === msg.groupId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          shouldScrollToEnd.current = true;
          return [
            ...prev,
            {
              id: msg.id,
              content: msg.message,
              senderId: msg.senderId,
              createdAt: msg.timestamp,
              sender: { name: msg.senderName },
            },
          ];
        });
      } else {
        setChatUsers((prev) => {
          const existing = prev.find((u) => u.id === msg.groupId);
          const nextUnread = (existing?.unreadCount ?? 0) + 1;
          return patchChatUserList(prev, msg.groupId, {
            lastMessage: msg.message,
            lastMessageTime: 'Just now',
            unreadCount: nextUnread,
          });
        });
      }
    };

    const onPresence = (p: { userId: string; online: boolean }) => {
      setChatUsers((prev) => patchChatUserList(prev, p.userId, { isOnline: p.online }));
    };

    const onPrivateSent = (payload: ChatMessage & { clientTempId?: string }) => {
      if (!payload.clientTempId) return;
      setMessages((prev) => {
        const optimistic = prev.find((m) => m.clientTempId === payload.clientTempId);
        const rest = prev.filter((m) => m.clientTempId !== payload.clientTempId);
        if (rest.some((m) => m.id === payload.id)) return rest;
        shouldScrollToEnd.current = true;
        return [
          ...rest,
          {
            ...payload,
            fileUrl: payload.fileUrl ?? optimistic?.fileUrl,
            fileName: payload.fileName ?? optimistic?.fileName,
            fileType: payload.fileType ?? optimistic?.fileType,
            fileSize: payload.fileSize ?? optimistic?.fileSize,
            createdAt: String(payload.createdAt),
            delivered: true,
          },
        ];
      });
    };

    socket.on('private-message', onPrivate);
    socket.on('group-message', onGroup);
    socket.on('presence-update', onPresence);
    socket.on('private-message-sent', onPrivateSent);

    return () => {
      socket.off('private-message', onPrivate);
      socket.off('group-message', onGroup);
      socket.off('presence-update', onPresence);
      socket.off('private-message-sent', onPrivateSent);
    };
  }, [connected, socketRef]);

  const filteredUsers = chatUsers.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const openChat = (chat: ChatUser) => {
    shouldScrollToEnd.current = true;
    setSelectedChat(chat);
    setMessageText('');
    setPendingFile(null);
  };

  const closeChat = () => {
    activeChatIdRef.current = null;
    setSelectedChat(null);
    setMessages([]);
    loadConversations();
  };

  const confirmDeleteConversation = (chat: ChatUser) => {
    if (!chat.conversationId) return;
    Alert.alert('Delete conversation?', `Remove chat with ${chat.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteConversation(chat.conversationId!);
            setChatUsers((prev) => prev.filter((u) => u.conversationId !== chat.conversationId));
            if (selectedChat?.conversationId === chat.conversationId) {
              closeChat();
            }
            Toast.show({ type: 'success', text1: 'Conversation deleted' });
          } catch {
            Toast.show({ type: 'error', text1: 'Delete failed' });
          }
        },
      },
    ]);
  };

  const pickAttachment = async () => {
    try {
      const [file] = await pick({ allowMultiSelection: false });
      if (!file?.uri) return;
      if ((file.size ?? 0) > 10 * 1024 * 1024) {
        Toast.show({ type: 'error', text1: 'File must be under 10MB' });
        return;
      }
      const copies = await keepLocalCopy({
        files: [{ uri: file.uri, fileName: file.name ?? 'file' }],
        destination: 'cachesDirectory',
      });
      const localUri = copies[0]?.uri ?? file.uri;
      const uploaded = await uploadChatAttachment(
        localUri,
        file.name ?? 'file',
        file.type ?? 'application/octet-stream',
      );
      setPendingFile(uploaded);
      Toast.show({ type: 'success', text1: 'File ready to send' });
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return;
      Toast.show({ type: 'error', text1: 'Upload failed' });
    }
  };

  const handleAttachmentPress = (message: ChatMessage) => {
    if (!message.fileUrl) return;
    setSelectedAttachment(message);
  };

  const runAttachmentAction = async (action: 'open' | 'download') => {
    if (!selectedAttachment?.fileUrl) return;
    setAttachmentLoading(action);
    try {
      if (action === 'open') {
        await openChatAttachment(
          selectedAttachment.fileUrl,
          selectedAttachment.fileName,
          selectedAttachment.fileType,
        );
        setSelectedAttachment(null);
      } else {
        await downloadChatAttachment(
          selectedAttachment.fileUrl,
          selectedAttachment.fileName,
          selectedAttachment.fileType,
        );
        Toast.show({
          type: 'success',
          text1: Platform.OS === 'android' ? 'Download started' : 'File saved',
          text2: Platform.OS === 'android' ? 'Check your Downloads folder' : undefined,
        });
        setSelectedAttachment(null);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: action === 'open' ? 'Could not open file' : 'Could not download file',
        text2: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setAttachmentLoading(null);
    }
  };

  const handleSend = async () => {
    if (!selectedChat || !user?.id) return;
    if (!messageText.trim() && !pendingFile) return;

    const content = messageText.trim() || '📎 File attachment';
    const tempId = `temp-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: tempId,
      clientTempId: tempId,
      content,
      senderId: user.id,
      receiverId: selectedChat.id,
      createdAt: new Date().toISOString(),
      sender: { name: user.name ?? 'You' },
      fileUrl: pendingFile?.fileUrl,
      fileName: pendingFile?.fileName,
      fileType: pendingFile?.fileType,
      fileSize: pendingFile?.fileSize,
      delivered: false,
    };

    shouldScrollToEnd.current = true;
    setMessages((prev) => [...prev, optimistic]);
    setMessageText('');
    const filePayload = pendingFile;
    setPendingFile(null);
    setSending(true);

    const isGroup = selectedChat.isGroup || selectedChat.role === 'group';

    try {
      if (isGroup || !socketRef.current || !connected) {
        const sent = await sendChatMessage(selectedChat, {
          content,
          fileUrl: filePayload?.fileUrl,
          fileName: filePayload?.fileName,
          fileType: filePayload?.fileType,
          fileSize: filePayload?.fileSize,
        });
        setMessages((prev) => {
          const rest = prev.filter((m) => m.clientTempId !== tempId);
          if (rest.some((m) => m.id === sent.id)) return rest;
          return [
            ...rest,
            { ...sent, createdAt: String(sent.createdAt), delivered: true },
          ];
        });
      } else {
        sendPrivateMessage({
          toUserId: selectedChat.id,
          content,
          senderId: user.id,
          senderName: user.name,
          clientTempId: tempId,
          fileUrl: filePayload?.fileUrl,
          fileName: filePayload?.fileName,
          fileType: filePayload?.fileType,
          fileSize: filePayload?.fileSize,
        });
      }
      setChatUsers((prev) =>
        prev.map((u) =>
          u.id === selectedChat.id
            ? { ...u, lastMessage: content, lastMessageTime: 'Just now' }
            : u,
        ),
      );
      loadConversations();
    } catch {
      setMessages((prev) =>
        prev.map((m) => (m.clientTempId === tempId ? { ...m, failed: true } : m)),
      );
      Toast.show({ type: 'error', text1: 'Failed to send message' });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = (message: ChatMessage) => {
    if (!user?.id || message.senderId !== user.id) return;
    Alert.alert('Delete message?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteChatMessage(message.id);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === message.id
                  ? { ...m, content: '[Message deleted]', deletedAt: new Date().toISOString() }
                  : m,
              ),
            );
          } catch {
            Toast.show({ type: 'error', text1: 'Delete failed' });
          }
        },
      },
    ]);
  };

  const loadNewChatSearch = useCallback(async () => {
    setSearchingUsers(true);
    try {
      const currentUserId = userIdRef.current;
      if (newChatType === 'teachers') {
        const teachers = await searchTeachers(newChatQuery);
        setSearchResults(
          (Array.isArray(teachers) ? teachers : [])
            .filter((t) => t.id !== currentUserId)
            .map((t) => ({
              id: t.id,
              name: t.name,
              role: 'teacher' as const,
              email: t.email,
              department: t.department,
              profileImage: t.profileImage,
            })),
        );
      } else {
        const students = await searchStudents(newChatQuery, 'name');
        setSearchResults(
          (Array.isArray(students) ? students : [])
            .filter((s) => s.id !== currentUserId)
            .map((s) => ({
              id: s.id,
              name: s.name,
              role: 'student' as const,
              email: s.email,
              rollNumber: s.rollNumber,
              department: s.department,
              isGroupMember: s.isInGroup,
            })),
        );
      }
    } catch {
      setSearchResults([]);
    } finally {
      setSearchingUsers(false);
    }
  }, [newChatQuery, newChatType]);

  useEffect(() => {
    if (!newChatOpen) return;
    const t = setTimeout(loadNewChatSearch, 300);
    return () => clearTimeout(t);
  }, [newChatOpen, loadNewChatSearch]);

  const startChatWithUser = async (row: SearchUserRow) => {
    if (!user?.id) return;
    try {
      await openOrCreateConversation(row.id);
      const chat: ChatUser = {
        id: row.id,
        name: row.name,
        role: row.role,
        profileImage: row.profileImage,
        isOnline: true,
        unreadCount: 0,
      };
      setNewChatOpen(false);
      await loadConversations();
      const refreshed = (await fetchChatConversations()).find((c) => c.id === row.id);
      openChat(refreshed ?? chat);
    } catch {
      Toast.show({ type: 'error', text1: 'Could not start conversation' });
    }
  };

  const loadGroupCandidates = useCallback(async () => {
    try {
      const currentUserId = userIdRef.current;
      if (groupMemberType === 'teachers') {
        const teachers = await searchTeachers(groupMemberQuery);
        setGroupCandidates(
          (Array.isArray(teachers) ? teachers : [])
            .filter((t) => t.id !== currentUserId)
            .map((t) => ({
              id: t.id,
              name: t.name,
              role: 'teacher' as const,
              email: t.email,
              department: t.department,
              profileImage: t.profileImage,
            })),
        );
      } else {
        const students = await searchStudents(groupMemberQuery, 'name');
        setGroupCandidates(
          (Array.isArray(students) ? students : [])
            .filter((s) => s.id !== currentUserId)
            .map((s) => ({
              id: s.id,
              name: s.name,
              role: 'student' as const,
              email: s.email,
              rollNumber: s.rollNumber,
              department: s.department,
              profileImage: s.profileImage,
            })),
        );
      }
    } catch {
      setGroupCandidates([]);
    }
  }, [groupMemberQuery, groupMemberType]);

  useEffect(() => {
    if (!groupOpen) return;
    const t = setTimeout(loadGroupCandidates, 300);
    return () => clearTimeout(t);
  }, [groupOpen, loadGroupCandidates]);

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMemberIds.length === 0) {
      Toast.show({ type: 'error', text1: 'Enter group name and select members' });
      return;
    }
    setCreatingGroup(true);
    try {
      await createMessageGroup(groupName.trim(), selectedMemberIds);
      Toast.show({ type: 'success', text1: 'Group created' });
      setGroupOpen(false);
      setGroupName('');
      setSelectedMemberIds([]);
      await loadConversations();
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Failed to create group',
        text2: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setCreatingGroup(false);
    }
  };

  const openProfile = async (chat: ChatUser) => {
    if (chat.isGroup || chat.role === 'group') return;
    setProfileOpen(true);
    setProfileLoading(true);
    try {
      const data = await config.loadUserProfile(chat.id);
      setProfileData(data as Record<string, unknown>);
    } catch {
      setProfileData({ name: chat.name, role: chat.role });
    } finally {
      setProfileLoading(false);
    }
  };

  if (loading) {
    return <LoadingView message="Loading messages..." />;
  }

  if (selectedChat) {
    const isGroup = selectedChat.isGroup || selectedChat.role === 'group';
    return (
      <SafeAreaView style={styles.chatSafe} edges={['top', 'left', 'right']}>
        <View style={styles.chatHeader}>
          <Pressable style={styles.backBtn} onPress={closeChat}>
            <FeatherIcon name="arrow-left" size={22} color="#111827" />
          </Pressable>
          <Pressable style={styles.chatHeaderCenter} onPress={() => openProfile(selectedChat)}>
            <AvatarCircle name={selectedChat.name} size={40} online={selectedChat.isOnline} />
            <View style={styles.chatHeaderText}>
              <View style={styles.chatHeaderNameRow}>
                <Text style={styles.chatHeaderName} numberOfLines={1}>
                  {selectedChat.name}
                </Text>
                {!isGroup ? (
                  <RoleBadge role={selectedChat.role === 'teacher' ? 'teacher' : 'student'} />
                ) : null}
              </View>
              <Text style={styles.chatHeaderSub}>
                {isGroup
                  ? `${selectedChat.participantCount ?? ''} members`
                  : `${selectedChat.isOnline ? 'Online' : 'Offline'} • Click to view profile`}
              </Text>
            </View>
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={styles.chatBody}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
          {loadingMessages && messages.length === 0 ? (
            <ActivityIndicator style={{ marginTop: 24 }} color="#2563eb" />
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(item) => item.clientTempId ?? item.id}
              contentContainerStyle={styles.messagesList}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => {
                if (shouldScrollToEnd.current) {
                  listRef.current?.scrollToEnd({ animated: false });
                  shouldScrollToEnd.current = false;
                }
              }}
              renderItem={({ item }) => (
                <MessageBubble
                  message={item}
                  isMine={item.senderId === user?.id}
                  onLongPress={
                    item.senderId === user?.id ? () => handleDeleteMessage(item) : undefined
                  }
                  onFilePress={
                    item.fileUrl ? () => handleAttachmentPress(item) : undefined
                  }
                />
              )}
              ListEmptyComponent={
                <EmptyState icon="message-circle" title="No messages yet" message="Say hello!" />
              }
            />
          )}

          {pendingFile ? (
            <View style={styles.pendingFile}>
              <FeatherIcon name="paperclip" size={16} color="#2563eb" />
              <Text style={styles.pendingFileText} numberOfLines={1}>
                {pendingFile.fileName}
              </Text>
              <Pressable onPress={() => setPendingFile(null)}>
                <FeatherIcon name="x" size={18} color="#6b7280" />
              </Pressable>
            </View>
          ) : null}

          <View style={styles.inputBar}>
            <Pressable style={styles.attachBtn} onPress={pickAttachment}>
              <FeatherIcon name="paperclip" size={22} color="#6b7280" />
            </Pressable>
            <TextInput
              style={styles.messageInput}
              placeholder="Type a message..."
              placeholderTextColor="#9ca3af"
              value={messageText}
              onChangeText={setMessageText}
              multiline
            />
            <Pressable
              style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={sending}>
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <FeatherIcon name="send" size={18} color="#fff" />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>

        <SheetModal visible={profileOpen} onClose={() => setProfileOpen(false)} title="Profile">
          {profileLoading ? (
            <ActivityIndicator color="#2563eb" />
          ) : profileData ? (
            <View style={styles.profileBody}>
              <Text style={styles.profileName}>{String(profileData.name ?? '')}</Text>
              {profileData.email ? (
                <Text style={styles.profileRow}>Email: {String(profileData.email)}</Text>
              ) : null}
              {profileData.rollNumber ? (
                <Text style={styles.profileRow}>Roll: {String(profileData.rollNumber)}</Text>
              ) : null}
              {profileData.department ? (
                <Text style={styles.profileRow}>Dept: {String(profileData.department)}</Text>
              ) : null}
            </View>
          ) : null}
        </SheetModal>

        {selectedAttachment ? (
          <AttachmentActionSheet
            message={selectedAttachment}
            loadingAction={attachmentLoading}
            onClose={() => {
              if (!attachmentLoading) setSelectedAttachment(null);
            }}
            onOpen={() => runAttachmentAction('open')}
            onDownload={() => runAttachmentAction('download')}
          />
        ) : null}
      </SafeAreaView>
    );
  }

  return (
    <PortalScreenLayout
      title="Messages"
      subtitle={config.listSubtitle}
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadConversations();
      }}>
      <View style={styles.listToolbar}>
        <Pressable
          style={styles.newChatBtn}
          onPress={() => {
            setNewChatType(config.defaultNewChatType);
            setNewChatQuery('');
            setSearchResults([]);
            setNewChatOpen(true);
          }}>
          <FeatherIcon name="plus" size={18} color="#fff" />
          <Text style={styles.newChatBtnText}>Chat</Text>
        </Pressable>
        <Pressable
          style={styles.groupBtn}
          onPress={() => {
            setGroupOpen(true);
            setSelectedMemberIds([]);
            setGroupName('');
          }}>
          <FeatherIcon name="users" size={18} color="#2563eb" />
          <Text style={styles.groupBtnText}>Group</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <FeatherIcon name="search" size={18} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {filteredUsers.length === 0 ? (
        <EmptyState
          icon="message-circle"
          title="No conversations yet"
          message={config.emptyListMessage}
        />
      ) : (
        filteredUsers.map((chat) => (
            <Pressable
              key={chat.conversationId ?? chat.id}
              style={styles.convRow}
              onPress={() => openChat(chat)}>
              <AvatarCircle name={chat.name} online={chat.isOnline} />
              <View style={styles.convContent}>
                <View style={styles.convTop}>
                  <Text style={styles.convName} numberOfLines={1}>
                    {chat.name}
                  </Text>
                  <Text style={styles.convTime}>{chat.lastMessageTime}</Text>
                </View>
                <View style={styles.convBottom}>
                  <Text style={styles.convPreview} numberOfLines={1}>
                    {chat.lastMessage || 'No messages yet'}
                  </Text>
                  {(chat.unreadCount ?? 0) > 0 ? (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{chat.unreadCount}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <Pressable hitSlop={12} onPress={() => confirmDeleteConversation(chat)}>
                <FeatherIcon name="trash-2" size={18} color="#ef4444" />
              </Pressable>
            </Pressable>
        ))
      )}

      <SheetModal
        visible={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        title="Start New Chat"
        subtitle={
          config.newChatTypes.length === 1 && config.newChatTypes[0] === 'students'
            ? 'Search for students to start a conversation'
            : 'Search for users to start a conversation'
        }>
        {config.newChatTypes.length > 1 ? (
          <View style={styles.toggleRow}>
            {config.newChatTypes.includes('teachers') ? (
              <Pressable
                style={[styles.toggleChip, newChatType === 'teachers' && styles.toggleChipActive]}
                onPress={() => setNewChatType('teachers')}>
                <Text
                  style={[
                    styles.toggleChipText,
                    newChatType === 'teachers' && styles.toggleChipTextActive,
                  ]}>
                  Teachers
                </Text>
              </Pressable>
            ) : null}
            {config.newChatTypes.includes('students') ? (
              <Pressable
                style={[styles.toggleChip, newChatType === 'students' && styles.toggleChipActive]}
                onPress={() => setNewChatType('students')}>
                <Text
                  style={[
                    styles.toggleChipText,
                    newChatType === 'students' && styles.toggleChipTextActive,
                  ]}>
                  Students
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        <TextInput
          style={styles.modalSearch}
          placeholder={
            newChatType === 'teachers'
              ? 'Search teachers by name...'
              : 'Search students by name...'
          }
          placeholderTextColor="#9ca3af"
          value={newChatQuery}
          onChangeText={setNewChatQuery}
        />
        {searchingUsers ? <ActivityIndicator color="#111827" style={{ marginVertical: 12 }} /> : null}
        {searchResults.length === 0 && !searchingUsers ? (
          <Text style={styles.modalEmptyHint}>
            {newChatQuery.trim() ? 'No users found. Try a different search.' : 'Start typing to search...'}
          </Text>
        ) : null}
        {searchResults.map((row) => (
          <MemberSearchRow
            key={row.id}
            row={row}
            onPress={() => startChatWithUser(row)}
            trailing={<FeatherIcon name="message-circle" size={20} color="#111827" />}
          />
        ))}
      </SheetModal>

      <SheetModal
        visible={groupOpen}
        onClose={() => setGroupOpen(false)}
        title="Create Group Chat"
        subtitle="Create a group with students and teachers">
        <Text style={styles.label}>Group Name</Text>
        <TextInput
          style={styles.modalSearch}
          placeholder="Enter group name..."
          placeholderTextColor="#9ca3af"
          value={groupName}
          onChangeText={setGroupName}
        />
        <Text style={styles.label}>Add Members</Text>
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggleChip, groupMemberType === 'students' && styles.toggleChipActive]}
            onPress={() => setGroupMemberType('students')}>
            <Text
              style={[
                styles.toggleChipText,
                groupMemberType === 'students' && styles.toggleChipTextActive,
              ]}>
              Students
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleChip, groupMemberType === 'teachers' && styles.toggleChipActive]}
            onPress={() => setGroupMemberType('teachers')}>
            <Text
              style={[
                styles.toggleChipText,
                groupMemberType === 'teachers' && styles.toggleChipTextActive,
              ]}>
              Teachers
            </Text>
          </Pressable>
        </View>
        <TextInput
          style={styles.modalSearch}
          placeholder={
            groupMemberType === 'students'
              ? 'Search students by name...'
              : 'Search teachers by name...'
          }
          placeholderTextColor="#9ca3af"
          value={groupMemberQuery}
          onChangeText={setGroupMemberQuery}
        />
        <Text style={styles.label}>Selected Members ({selectedMemberIds.length})</Text>
        <View style={styles.membersListBox}>
          {groupCandidates.length === 0 ? (
            <Text style={styles.modalEmptyHint}>
              {groupMemberQuery.trim()
                ? `No ${groupMemberType} found.`
                : 'Start typing to search...'}
            </Text>
          ) : (
            groupCandidates.map((row) => {
              const selected = selectedMemberIds.includes(row.id);
              return (
                <MemberSearchRow
                  key={row.id}
                  row={row}
                  selected={selected}
                  onPress={() =>
                    setSelectedMemberIds((prev) =>
                      selected ? prev.filter((id) => id !== row.id) : [...prev, row.id],
                    )
                  }
                  trailing={
                    selected ? (
                      <View style={styles.selectedPill}>
                        <Text style={styles.selectedPillText}>Selected</Text>
                      </View>
                    ) : (
                      <View style={styles.selectPill}>
                        <Text style={styles.selectPillText}>Select</Text>
                      </View>
                    )
                  }
                />
              );
            })
          )}
        </View>
        <Pressable
          style={[styles.submitGroupBtn, creatingGroup && styles.sendBtnDisabled]}
          onPress={handleCreateGroup}
          disabled={creatingGroup}>
          {creatingGroup ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitGroupText}>Create Group</Text>
          )}
        </Pressable>
      </SheetModal>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  listToolbar: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  newChatBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 12,
  },
  newChatBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  groupBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingVertical: 12,
  },
  groupBtnText: { color: '#2563eb', fontWeight: '700', fontSize: 15 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: '#111827' },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  convRowActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
    borderLeftWidth: 4,
  },
  convContent: { flex: 1, minWidth: 0 },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  convName: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  convTime: { fontSize: 11, color: '#9ca3af' },
  convBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  convPreview: { flex: 1, fontSize: 13, color: '#6b7280' },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  avatar: {
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '700', color: '#ffffff' },
  onlineDot: {
    position: 'absolute',
    backgroundColor: '#22c55e',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatSafe: { flex: 1, backgroundColor: '#f3f4f6' },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  chatHeaderCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  chatHeaderText: { flex: 1 },
  chatHeaderNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  chatHeaderName: { fontSize: 16, fontWeight: '700', color: '#111827', flexShrink: 1 },
  chatHeaderSub: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  chatBody: { flex: 1 },
  messagesList: { padding: 12, paddingBottom: 8 },
  bubbleRow: { marginBottom: 10, flexDirection: 'row' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: '#2563eb', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#e5e7eb' },
  bubbleText: { fontSize: 15, color: '#111827', lineHeight: 21 },
  bubbleTextMine: { color: '#fff' },
  deletedText: { fontStyle: 'italic', opacity: 0.7 },
  fileAttach: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  fileAttachText: { fontSize: 13, color: '#2563eb', flex: 1 },
  bubbleMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, alignSelf: 'flex-end' },
  bubbleTime: { fontSize: 10, color: '#9ca3af' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.8)' },
  pendingFile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 6,
    padding: 10,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  pendingFileText: { flex: 1, fontSize: 13, color: '#1e40af' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  attachBtn: { padding: 8 },
  messageInput: {
    flex: 1,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#f9fafb',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.6 },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  toggleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  toggleChipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  toggleChipText: { fontWeight: '600', color: '#4b5563' },
  toggleChipTextActive: { color: '#fff' },
  modalSearch: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
  },
  searchUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  searchUserRowSelected: { backgroundColor: '#eff6ff' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  memberRowSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
  },
  memberRowContent: { flex: 1, minWidth: 0 },
  memberRowTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  roleBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleBadgeTeacher: { backgroundColor: '#111827' },
  roleBadgeStudent: { backgroundColor: '#e5e7eb' },
  roleBadgeText: { fontSize: 11, fontWeight: '700' },
  roleBadgeTextTeacher: { color: '#ffffff' },
  roleBadgeTextStudent: { color: '#374151' },
  membersListBox: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 8,
    maxHeight: 320,
  },
  modalEmptyHint: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 16,
  },
  selectedPill: {
    backgroundColor: '#2563eb',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  selectedPillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  selectPill: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#fff',
  },
  selectPillText: { color: '#374151', fontSize: 11, fontWeight: '600' },
  searchUserName: { fontSize: 15, fontWeight: '600', color: '#111827', flexShrink: 1 },
  searchUserMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  submitGroupBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  submitGroupText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  profileBody: { paddingVertical: 8 },
  profileName: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  profileRow: { fontSize: 14, color: '#4b5563', marginBottom: 4 },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 16,
  },
  attachmentIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentInfo: { flex: 1, minWidth: 0 },
  attachmentName: { fontSize: 15, fontWeight: '700', color: '#111827', lineHeight: 21 },
  attachmentMeta: { marginTop: 4, fontSize: 12, color: '#6b7280' },
  attachmentActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 10,
  },
  attachmentActionPrimary: { backgroundColor: '#2563eb' },
  attachmentActionPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  attachmentActionSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#2563eb',
  },
  attachmentActionSecondaryText: { color: '#2563eb', fontWeight: '700', fontSize: 15 },
  attachmentCancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  attachmentCancelText: { color: '#6b7280', fontWeight: '600', fontSize: 14 },
});
