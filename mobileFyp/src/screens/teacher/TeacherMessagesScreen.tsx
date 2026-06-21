import { PortalChatScreen } from '../../components/chat/PortalChatScreen';
import { fetchProfile } from '../../services/teacherService';

const TEACHER_CHAT_CONFIG = {
  listSubtitle: 'Chat with your supervised students and colleagues',
  emptyListMessage: 'Tap + Chat to message a student.',
  newChatTypes: ['students'] as const,
  defaultNewChatType: 'students' as const,
  loadUserProfile: async (userId: string) => fetchProfile(userId) as Promise<Record<string, unknown>>,
};

export function TeacherMessagesScreen() {
  return <PortalChatScreen config={TEACHER_CHAT_CONFIG} />;
}
