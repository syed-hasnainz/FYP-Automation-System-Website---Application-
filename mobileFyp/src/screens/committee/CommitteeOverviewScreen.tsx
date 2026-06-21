import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { usePortalNavigation } from '../../components/portal/portalNavigation';
import { useAuthUser } from '../../hooks/useAuthUser';
import type { NotificationItem } from '../../services/notificationService';
import {
  computeCommitteeOverviewStats,
  fetchCommitteeFiles,
  fetchCommitteeProjects,
  fetchRecentActivities,
} from '../../services/committeeService';
import { formatActivityTime, getActivityStyle } from '../../utils/activityHelpers';

const QUICK_ACTIONS = [
  {
    key: 'review-projects',
    title: 'Review Projects',
    description: 'Evaluate FYP projects',
    route: 'ReviewProjects',
    icon: 'file-text',
    color: '#3b82f6',
  },
  {
    key: 'announcements',
    title: 'Make Announcement',
    description: 'Create FYP announcements',
    route: 'Announcements',
    icon: 'bell',
    color: '#a855f7',
  },
  {
    key: 'group-approvals',
    title: 'Group Approvals',
    description: 'Review student groups',
    route: 'GroupApprovals',
    icon: 'users',
    color: '#14b8a6',
  },
] as const;

type OverviewStats = {
  totalProjects: number;
  pendingReviews: number;
  completedReviews: number;
  filesUploaded: number;
};

function OverviewStatCard({
  title,
  value,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.statCard, pressed && onPress && styles.statCardPressed]}
      onPress={onPress}
      disabled={!onPress}>
      <View style={styles.statHeader}>
        <Text style={styles.statTitle}>{title}</Text>
        <FeatherIcon name={icon} size={14} color="#9ca3af" />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </Pressable>
  );
}

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
      <View style={[styles.actionAccent, { backgroundColor: '#3b82f6' }]} />
      <View style={[styles.actionIconWrap, { backgroundColor: action.color }]}>
        <FeatherIcon name={action.icon} size={18} color="#fff" />
      </View>
      <Text style={styles.actionTitle}>{action.title}</Text>
      <Text style={styles.actionDescription}>{action.description}</Text>
    </Pressable>
  );
}

export function CommitteeOverviewScreen() {
  const { user, loading: authLoading } = useAuthUser();
  const { navigateTo } = usePortalNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [stats, setStats] = useState<OverviewStats>({
    totalProjects: 0,
    pendingReviews: 0,
    completedReviews: 0,
    filesUploaded: 0,
  });
  const [recentActivities, setRecentActivities] = useState<NotificationItem[]>([]);
  const refreshTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      const [projects, files] = await Promise.all([
        fetchCommitteeProjects().catch(() => []),
        fetchCommitteeFiles().catch(() => []),
      ]);
      setStats(computeCommitteeOverviewStats(projects, files));
    } catch {
      setStats({
        totalProjects: 0,
        pendingReviews: 0,
        completedReviews: 0,
        filesUploaded: 0,
      });
    }
  }, []);

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
      }
    },
    [user?.id],
  );

  const loadData = useCallback(
    async (showActivitySpinner = false) => {
      await Promise.all([loadOverview(), loadActivities(showActivitySpinner)]);
      setLoading(false);
      setRefreshing(false);
    },
    [loadActivities, loadOverview],
  );

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user?.id) {
      setLoading(false);
      return;
    }
    loadData(true);
  }, [authLoading, user?.id, loadData]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    refreshTimer.current = setInterval(() => {
      loadData(false);
    }, 30000);
    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
      }
    };
  }, [user?.id, loadData]);

  const handleQuickAction = (action: (typeof QUICK_ACTIONS)[number]) => {
    if (action.route) {
      navigateTo(action.route);
    }
  };

  if (loading || authLoading) {
    return <LoadingView message="Loading overview..." />;
  }

  return (
    <PortalScreenLayout
      title="Overview"
      subtitle="Committee head dashboard"
      refreshing={refreshing}
      onRefresh={() => {
        if (!user?.id) {
          return;
        }
        setRefreshing(true);
        loadData(false);
      }}>
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <OverviewStatCard
            title="Total Projects"
            value={stats.totalProjects}
            subtitle="Assigned for review"
            icon="folder"
            onPress={() => navigateTo('ReviewProjects')}
          />
          <View style={styles.gap} />
          <OverviewStatCard
            title="Pending Reviews"
            value={stats.pendingReviews}
            subtitle="Awaiting evaluation"
            icon="clock"
            onPress={() => navigateTo('ReviewProjects')}
          />
        </View>
        <View style={styles.statsRow}>
          <OverviewStatCard
            title="Completed Reviews"
            value={stats.completedReviews}
            subtitle="Evaluated projects"
            icon="check-circle"
            onPress={() => navigateTo('ReviewProjects')}
          />
          <View style={styles.gap} />
          <OverviewStatCard
            title="Files Uploaded"
            value={stats.filesUploaded}
            subtitle="Student submissions"
            icon="folder"
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsList}>
        {QUICK_ACTIONS.map((action) => (
          <QuickActionCard
            key={action.key}
            action={action}
            onPress={() => handleQuickAction(action)}
          />
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
                  style={[styles.activityBadge, { backgroundColor: style.badgeBackground }]}>
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
  statsGrid: {
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  gap: {
    width: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    minHeight: 96,
  },
  statCardPressed: {
    opacity: 0.92,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statTitle: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginRight: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  statSubtitle: {
    marginTop: 4,
    fontSize: 10,
    color: '#6b7280',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  quickActionsList: {
    marginBottom: 20,
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    paddingVertical: 14,
    paddingHorizontal: 14,
    overflow: 'hidden',
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
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  actionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    lineHeight: 18,
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
