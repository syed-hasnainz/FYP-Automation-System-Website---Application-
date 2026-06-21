import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { useNotifications } from '../../context/NotificationContext';
import {
  formatNotificationTime,
  getNotificationColors,
  getNotificationIconName,
} from '../../utils/notificationUi';
import { SheetModal } from './SheetModal';

export function NotificationsPanel() {
  const {
    notifications,
    unreadCount,
    loading,
    panelOpen,
    closePanel,
    markAsRead,
    deleteOne,
    clearAll,
    refresh,
  } = useNotifications();

  return (
    <SheetModal
      visible={panelOpen}
      onClose={closePanel}
      title="Notifications"
      subtitle={
        unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'
      }
      footer={
        <View style={styles.footerRow}>
          {unreadCount > 0 ? (
            <Pressable style={styles.footerBtn} onPress={() => markAsRead()}>
              <FeatherIcon name="check" size={16} color="#2563eb" />
              <Text style={styles.footerBtnText}>Mark all read</Text>
            </Pressable>
          ) : null}
          {notifications.length > 0 ? (
            <Pressable style={styles.footerBtn} onPress={clearAll}>
              <FeatherIcon name="trash-2" size={16} color="#dc2626" />
              <Text style={[styles.footerBtnText, styles.footerDanger]}>
                Clear all
              </Text>
            </Pressable>
          ) : null}
        </View>
      }>
      {loading && notifications.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#2563eb" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centered}>
          <FeatherIcon name="bell-off" size={32} color="#9ca3af" />
          <Text style={styles.emptyText}>No notifications yet</Text>
        </View>
      ) : (
        notifications.map((notification) => {
          const colors = getNotificationColors(notification.type);
          const iconName = getNotificationIconName(notification.type);
          return (
            <View
              key={notification.id}
              style={[
                styles.item,
                !notification.isRead && styles.itemUnread,
              ]}>
              <View style={[styles.iconWrap, { backgroundColor: colors.bg }]}>
                <FeatherIcon name={iconName} size={18} color={colors.fg} />
              </View>
              <View style={styles.itemBody}>
                <View style={styles.itemHeader}>
                  <Text
                    style={[
                      styles.itemTitle,
                      !notification.isRead && styles.itemTitleUnread,
                    ]}
                    numberOfLines={2}>
                    {notification.title}
                  </Text>
                  <View style={styles.itemActions}>
                    {!notification.isRead ? (
                      <Pressable
                        style={styles.iconBtn}
                        onPress={() => markAsRead([notification.id])}>
                        <FeatherIcon name="check" size={16} color="#2563eb" />
                      </Pressable>
                    ) : null}
                    <Pressable
                      style={styles.iconBtn}
                      onPress={() => deleteOne(notification.id)}>
                      <FeatherIcon name="trash-2" size={16} color="#9ca3af" />
                    </Pressable>
                  </View>
                </View>
                {notification.message ? (
                  <Text style={styles.itemMessage} numberOfLines={3}>
                    {notification.message}
                  </Text>
                ) : null}
                <Text style={styles.itemTime}>
                  {formatNotificationTime(notification.createdAt)}
                </Text>
              </View>
            </View>
          );
        })
      )}
      {notifications.length > 0 ? (
        <Pressable style={styles.refreshLink} onPress={refresh}>
          <Text style={styles.refreshText}>Refresh</Text>
        </Pressable>
      ) : null}
    </SheetModal>
  );
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#6b7280',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  item: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  itemUnread: {
    backgroundColor: '#eff6ff',
    marginHorizontal: -4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderBottomColor: '#eff6ff',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  itemTitleUnread: {
    color: '#111827',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconBtn: {
    padding: 4,
  },
  itemMessage: {
    marginTop: 4,
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
  itemTime: {
    marginTop: 6,
    fontSize: 11,
    color: '#9ca3af',
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  footerBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  footerDanger: {
    color: '#dc2626',
  },
  refreshLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  refreshText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
});
