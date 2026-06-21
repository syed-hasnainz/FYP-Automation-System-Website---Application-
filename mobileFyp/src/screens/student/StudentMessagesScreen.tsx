import { PortalChatScreen } from '../../components/chat/PortalChatScreen';
import { fetchProfile } from '../../services/studentService';

const STUDENT_CHAT_CONFIG = {
  listSubtitle: 'Chat with group members or teachers',
  emptyListMessage: 'Tap + Chat to message a teacher or classmate.',
  newChatTypes: ['teachers', 'students'] as const,
  defaultNewChatType: 'teachers' as const,
  loadUserProfile: async (userId: string) => fetchProfile(userId) as Promise<Record<string, unknown>>,
};

export function StudentMessagesScreen() {
  return <PortalChatScreen config={STUDENT_CHAT_CONFIG} />;
}
