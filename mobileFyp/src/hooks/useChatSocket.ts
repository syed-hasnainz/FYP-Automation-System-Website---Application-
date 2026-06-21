import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getResolvedApiBaseUrl } from '../services/apiClient';

export function useChatSocket(userId?: string, userRole?: string) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!userId) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    const baseUrl = getResolvedApiBaseUrl();
    const instance = io(baseUrl, {
      path: '/api/socketio',
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    socketRef.current = instance;

    const onConnect = () => {
      setConnected(true);
      instance.emit('join-user-room', userId);
      if (userRole) {
        instance.emit('join-role-room', userRole);
      }
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    instance.on('connect', onConnect);
    instance.on('disconnect', onDisconnect);
    if (instance.connected) {
      onConnect();
    }

    return () => {
      instance.off('connect', onConnect);
      instance.off('disconnect', onDisconnect);
      instance.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [userId, userRole]);

  const sendPrivateMessage = useCallback(
    (data: {
      toUserId: string;
      content: string;
      senderId: string;
      senderName?: string;
      clientTempId?: string;
      fileUrl?: string;
      fileName?: string;
      fileType?: string;
      fileSize?: number;
    }) => {
      socketRef.current?.emit('private-message', data);
    },
    [],
  );

  const markMessagesRead = useCallback((fromUserId: string, currentUserId: string) => {
    socketRef.current?.emit('mark-messages-read', {
      userId: currentUserId,
      fromUserId,
    });
  }, []);

  const joinGroup = useCallback((groupId: string) => {
    socketRef.current?.emit('join-group', { groupId });
  }, []);

  const leaveGroup = useCallback((groupId: string) => {
    socketRef.current?.emit('leave-group', { groupId });
  }, []);

  return {
    socketRef,
    connected,
    sendPrivateMessage,
    markMessagesRead,
    joinGroup,
    leaveGroup,
  };
}
