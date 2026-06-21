import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { StatCard } from '../../components/portal/StatCard';
import { usePortalNavigation } from '../../components/portal/portalNavigation';
import {
  fetchAllUsers,
  fetchApprovedProjects,
  fetchCommittees,
} from '../../services/adminService';
import { fetchAdminFiles } from '../../services/submissionService';
import { fetchAnnouncements } from '../../services/studentService';

const QUICK_ACTIONS = [
  {
    key: 'manage-users',
    title: 'Manage Users',
    subtitle: 'View and approve accounts',
    route: 'ManageUsers',
    icon: 'users',
    color: '#2563eb',
  },
  {
    key: 'committees',
    title: 'Organization',
    subtitle: 'Faculties & committees',
    route: 'Committees',
    icon: 'layers',
    color: '#9333ea',
  },
  {
    key: 'review-projects',
    title: 'Review Projects',
    subtitle: 'Track project progress',
    route: 'ReviewProjects',
    icon: 'folder',
    color: '#16a34a',
  },
  {
    key: 'announcements',
    title: 'Announcements',
    subtitle: 'Manage FYP announcements',
    route: 'Announcements',
    icon: 'bell',
    color: '#f97316',
  },
] as const;

function countActiveProjects(
  approvedProjects: unknown[],
  adminFiles: Array<{ fileType?: string; status?: string; supervisorApprovalStatus?: string }>,
) {
  const fullyApproved = Array.isArray(approvedProjects) ? approvedProjects.length : 0;
  const supervisorApproved = Array.isArray(adminFiles)
    ? adminFiles.filter((file) => {
        const isProposal =
          file.fileType?.toUpperCase() === 'PROPOSAL' || file.fileType === 'proposal';
        if (!isProposal) {
          return false;
        }
        if (file.status === 'REJECTED' || file.status === 'ADMIN_REJECTED') {
          return false;
        }
        return (
          file.status === 'APPROVED' ||
          file.supervisorApprovalStatus === 'APPROVED' ||
          file.status === 'COMMITTEE_APPROVED' ||
          file.status === 'ADMIN_APPROVED'
        );
      }).length
    : 0;

  return Math.max(fullyApproved, supervisorApproved);
}

export function AdminOverviewScreen() {
  const { navigateTo } = usePortalNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    users: 0,
    activeProjects: 0,
    committees: 0,
    announcements: 0,
  });

  const loadData = useCallback(async () => {
    try {
      const [users, approvedProjects, adminFiles, committees, announcements] = await Promise.all([
        fetchAllUsers().catch(() => []),
        fetchApprovedProjects().catch(() => []),
        fetchAdminFiles().catch(() => []),
        fetchCommittees().catch(() => []),
        fetchAnnouncements().catch(() => []),
      ]);
      setStats({
        users: Array.isArray(users) ? users.length : 0,
        activeProjects: countActiveProjects(approvedProjects, adminFiles),
        committees: Array.isArray(committees) ? committees.length : 0,
        announcements: Array.isArray(announcements) ? announcements.length : 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return <LoadingView message="Loading overview..." />;
  }

  return (
    <PortalScreenLayout
      title="Overview"
      subtitle="Admin console snapshot"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
      <View style={styles.statsRow}>
        <StatCard label="Total Users" value={stats.users} icon="users" color="#2563eb" />
        <View style={styles.gap} />
        <StatCard
          label="Active Projects"
          value={stats.activeProjects}
          icon="folder"
          color="#16a34a"
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard label="Committees" value={stats.committees} icon="user-check" color="#9333ea" />
        <View style={styles.gap} />
        <StatCard
          label="Announcements"
          value={stats.announcements}
          icon="bell"
          color="#f97316"
        />
      </View>

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        {QUICK_ACTIONS.map((action) => (
          <View key={action.key} style={styles.actionCard}>
            <View style={[styles.actionIconWrap, { backgroundColor: `${action.color}18` }]}>
              <FeatherIcon name={action.icon} size={20} color={action.color} />
            </View>
            <Text style={styles.actionTitle}>{action.title}</Text>
            <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
            <Pressable style={styles.openBtn} onPress={() => navigateTo(action.route)}>
              <Text style={styles.openText}>Open</Text>
              <FeatherIcon name="chevron-right" size={14} color="#2563eb" />
            </Pressable>
          </View>
        ))}
      </View>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', marginBottom: 12 },
  gap: { width: 12 },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 12,
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  actionCard: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 12,
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
    marginBottom: 5,
  },
  actionSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: '#6b7280',
    marginBottom: 8,
  },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
});
