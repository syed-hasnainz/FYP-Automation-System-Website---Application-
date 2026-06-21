import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { usePortalNavigation } from '../../components/portal/portalNavigation';
import { fetchRecentActivities } from '../../services/studentService';
import type { NotificationItem } from '../../services/studentService';
import { useAuthUser } from '../../hooks/useAuthUser';
import { formatActivityTime, getActivityStyle } from '../../utils/activityHelpers';

const QUICK_ACTIONS = [
  {
    key: 'schedule-meeting',
    title: 'Schedule Meeting',
    description: 'Book a meeting with your supervisor',
    route: 'ScheduleMeeting',
    icon: 'calendar',
    color: '#3b82f6',
  },
  {
    key: 'messages',
    title: 'Start New Conversation',
    description: 'Chat with group members or teachers',
    route: 'Messages',
    icon: 'message-circle',
    color: '#22c55e',
  },
  {
    key: 'proposal',
    title: 'Proposal Submission Form',
    description: 'Submit your proposal submission form',
    route: 'ProposalSubmission',
    icon: 'upload',
    color: '#a855f7',
  },
  {
    key: 'groups',
    title: 'Find Group Members',
    description: 'Search and connect with classmates',
    route: 'Groups',
    icon: 'users',
    color: '#f97316',
  },
] as const;

const QUICK_ACTION_ROWS = [
  QUICK_ACTIONS.slice(0, 2),
  QUICK_ACTIONS.slice(2, 4),
] as const;

function QuickActionCard({
  action,
  onPress,
}: {
  action: (typeof QUICK_ACTIONS)[number];
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionCard, pressed && styles.actionCardPressed]}
      onPress={onPress}>
      <View style={[styles.actionAccent, { backgroundColor: action.color }]} />
      <View style={[styles.actionIconWrap, { backgroundColor: action.color }]}>
        <FeatherIcon name={action.icon} size={18} color="#fff" />
      </View>
      <Text style={styles.actionTitle}>{action.title}</Text>
      <Text style={styles.actionDescription}>{action.description}</Text>
    </Pressable>
  );
}

export function StudentDashboardScreen() {
  const { user, loading: authLoading } = useAuthUser();
  const { navigateTo } = usePortalNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [recentActivities, setRecentActivities] = useState<NotificationItem[]>([]);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadActivities = useCallback(
    async (showSpinner = false) => {
      if (!user?.id) {
        return;
      }

      if (showSpinner) {
        setLoadingActivities(true);
      }
      try {
        const activities = await fetchRecentActivities();
        setRecentActivities(activities);
      } catch {
        setRecentActivities([]);
      } finally {
        setLoadingActivities(false);
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id],
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user?.id) {
      setLoading(false);
      return;
    }
    loadActivities(true);
  }, [authLoading, user?.id, loadActivities]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    refreshTimer.current = setInterval(() => {
      loadActivities(false);
    }, 30000);
    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
      }
    };
  }, [user?.id, loadActivities]);

  if (loading || authLoading) {
    return <LoadingView message="Loading dashboard..." />;
  }

  return (
    <PortalScreenLayout
      title="Dashboard"
      subtitle={`Welcome back, ${user?.name ?? 'Student'}!`}
      refreshing={refreshing}
      onRefresh={() => {
        if (!user?.id) {
          return;
        }
        setRefreshing(true);
        loadActivities(false);
      }}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        {QUICK_ACTION_ROWS.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.quickActionsRow}>
            {row.map((action) => (
              <QuickActionCard
                key={action.key}
                action={action}
                onPress={() => navigateTo(action.route)}
              />
            ))}
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Recent Activity</Text>
      <View style={styles.activityCard}>
        {loadingActivities ? (
          <View style={styles.activityLoading}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={styles.activityLoadingText}>Loading activities...</Text>
          </View>
        ) : recentActivities.length === 0 ? (
          <Text style={styles.emptyActivity}>No recent activity yet</Text>
        ) : (
          recentActivities.map((activity) => {
            const style = getActivityStyle(activity.type);
            return (
              <View
                key={activity.id}
                style={[styles.activityRow, { backgroundColor: style.backgroundColor }]}>
                <View style={[styles.activityDot, { backgroundColor: style.dotColor }]} />
                <View style={styles.activityBody}>
                  <Text style={styles.activityTitle} numberOfLines={1}>
                    {activity.title}
                  </Text>
                  <Text style={styles.activityTime}>
                    {formatActivityTime(activity.createdAt)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.activityBadge,
                    { backgroundColor: style.badgeBackground },
                  ]}>
                  <Text style={[styles.activityBadgeText, { color: style.badgeColor }]}>
                    {style.badge}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  quickActionsGrid: {
    marginBottom: 20,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    paddingVertical: 12,
    paddingHorizontal: 12,
    overflow: 'hidden',
    minHeight: 118,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  actionCardPressed: {
    opacity: 0.92,
  },
  actionAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 11,
    lineHeight: 16,
    color: '#6b7280',
  },
  activityCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
  },
  activityLoading: {
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  activityLoadingText: {
    fontSize: 12,
    color: '#6b7280',
  },
  emptyActivity: {
    textAlign: 'center',
    paddingVertical: 16,
    fontSize: 13,
    color: '#6b7280',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  activityBody: {
    flex: 1,
    minWidth: 0,
  },
  activityTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  activityTime: {
    marginTop: 2,
    fontSize: 11,
    color: '#6b7280',
  },
  activityBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  activityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
