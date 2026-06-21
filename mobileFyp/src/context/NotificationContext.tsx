import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert, AppState, type AppStateStatus } from 'react-native';
import Toast from 'react-native-toast-message';
import {
  deleteNotifications as deleteNotificationsApi,
  fetchAllNotifications,
  markNotificationsRead,
  type NotificationItem,
} from '../services/notificationService';
import { useAuthUser } from '../hooks/useAuthUser';

const POLL_INTERVAL_MS = 30000;

type NotificationContextValue = {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  panelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  refresh: () => Promise<void>;
  markAsRead: (ids?: string[]) => Promise<void>;
  deleteOne: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

function showNotificationToast(item: NotificationItem) {
  Toast.show({
    type: 'info',
    text1: item.title,
    text2: item.message,
    visibilityTime: 4500,
    position: 'top',
  });
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuthUser();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const notifyNewItems = useCallback((items: NotificationItem[]) => {
    if (!initializedRef.current) {
      items.forEach((item) => knownIdsRef.current.add(item.id));
      initializedRef.current = true;
      return;
    }

    for (const item of items) {
      if (!knownIdsRef.current.has(item.id)) {
        knownIdsRef.current.add(item.id);
        showNotificationToast(item);
      }
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    setLoading(true);
    try {
      const list = await fetchAllNotifications();
      notifyNewItems(list);
      setNotifications(list);
    } catch {
      if (!initializedRef.current) {
        initializedRef.current = true;
      }
    } finally {
      setLoading(false);
    }
  }, [notifyNewItems, user?.id]);

  useEffect(() => {
    knownIdsRef.current.clear();
    initializedRef.current = false;
    setNotifications([]);
  }, [user?.id]);

  useEffect(() => {
    if (authLoading || !user?.id) {
      return;
    }
    refresh();
  }, [authLoading, refresh, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    const interval = setInterval(() => {
      refresh();
    }, POLL_INTERVAL_MS);

    const onAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        refresh();
      }
    };

    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [refresh, user?.id]);

  const markAsRead = useCallback(
    async (ids?: string[]) => {
      try {
        await markNotificationsRead(ids);
        await refresh();
      } catch {
        Alert.alert('Error', 'Could not mark notifications as read.');
      }
    },
    [refresh],
  );

  const deleteOne = useCallback(
    async (id: string) => {
      try {
        await deleteNotificationsApi([id]);
        knownIdsRef.current.delete(id);
        await refresh();
      } catch {
        Alert.alert('Error', 'Could not delete notification.');
      }
    },
    [refresh],
  );

  const clearAll = useCallback(() => {
    Alert.alert(
      'Clear all notifications?',
      'This will permanently remove all your notifications.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear all',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNotificationsApi();
              knownIdsRef.current.clear();
              initializedRef.current = true;
              await refresh();
              setPanelOpen(false);
            } catch {
              Alert.alert('Error', 'Could not clear notifications.');
            }
          },
        },
      ],
    );
  }, [refresh]);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications],
  );

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      loading,
      panelOpen,
      openPanel: () => setPanelOpen(true),
      closePanel: () => setPanelOpen(false),
      refresh,
      markAsRead,
      deleteOne,
      clearAll,
    }),
    [
      clearAll,
      deleteOne,
      loading,
      markAsRead,
      notifications,
      panelOpen,
      refresh,
      unreadCount,
    ],
  );

  return (
    <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return ctx;
}
