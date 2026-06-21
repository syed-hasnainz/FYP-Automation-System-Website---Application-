import React from 'react';
import { PortalShell } from '../components/portal/PortalShell';
import type { PortalMenuItem } from '../components/portal/PortalDrawerContent';
import { AdminOrganizationScreen } from '../screens/admin/AdminOrganizationScreen';
import { AdminAnnouncementsScreen } from '../screens/admin/AdminAnnouncementsScreen';
import { AdminFormSubmissionsScreen } from '../screens/admin/AdminFormSubmissionsScreen';
import { AdminPolicySubmissionsScreen } from '../screens/admin/AdminPolicySubmissionsScreen';
import { AdminSettingsScreen } from '../screens/admin/AdminSettingsScreen';
import { AdminGroupsScreen } from '../screens/admin/AdminGroupsScreen';
import { AdminOverviewScreen } from '../screens/admin/AdminOverviewScreen';
import { AdminProjectsScreen } from '../screens/admin/AdminProjectsScreen';
import { AdminProjectIdeasScreen } from '../screens/admin/AdminProjectIdeasScreen';
import { AdminJuryManagementScreen } from '../screens/admin/AdminJuryManagementScreen';
import { AdminProfileScreen } from '../screens/admin/AdminProfileScreen';
import { AdminUsersScreen } from '../screens/admin/AdminUsersScreen';
import { CommitteeFilesScreen } from '../screens/committee/CommitteeFilesScreen';
import { CommitteeReportsScreen } from '../screens/committee/CommitteeReportsScreen';

const PORTAL_MENU: PortalMenuItem[] = [
  { name: 'Overview', label: 'Overview', description: 'System snapshot', icon: 'bar-chart-2' },
  { name: 'ManageUsers', label: 'Manage Users', description: 'Accounts & approvals', icon: 'users' },
  { name: 'ProjectIdeas', label: 'Project Ideas', description: 'Publish FYP ideas', icon: 'book-open' },
  { name: 'JuryManagement', label: 'Jury Management', description: 'Defense schedules & panels', icon: 'calendar' },
  { name: 'ReviewProjects', label: 'Review Projects', description: 'Track progress', icon: 'folder' },
  { name: 'FileTracking', label: 'File Tracking', description: 'Approve student submissions', icon: 'file' },
  { name: 'Committees', label: 'Organization', description: 'Faculties & committees', icon: 'building-2' },
  { name: 'GroupApprovals', label: 'Group Approvals', description: 'Review student groups', icon: 'user-check' },
  { name: 'Announcements', label: 'Announcements', description: 'Create & manage announcements', icon: 'bell' },
  { name: 'FormSubmissions', label: 'Form Submissions', description: 'Review form responses', icon: 'file-text' },
  { name: 'PolicySubmissions', label: 'Policy & Submissions', description: 'Policies and proof submissions', icon: 'check-square' },
  { name: 'Reports', label: 'Reports', description: 'Generate committee reports', icon: 'pie-chart' },
  { name: 'Settings', label: 'Settings', description: 'Platform controls', icon: 'settings' },
  { name: 'Profile', label: 'Profile', description: 'Account & security', icon: 'user' },
];

const PORTAL_SCREENS = {
  Overview: AdminOverviewScreen,
  ManageUsers: AdminUsersScreen,
  ProjectIdeas: AdminProjectIdeasScreen,
  Committees: AdminOrganizationScreen,
  ReviewProjects: AdminProjectsScreen,
  FileTracking: CommitteeFilesScreen,
  JuryManagement: AdminJuryManagementScreen,
  GroupApprovals: AdminGroupsScreen,
  Announcements: AdminAnnouncementsScreen,
  FormSubmissions: AdminFormSubmissionsScreen,
  PolicySubmissions: AdminPolicySubmissionsScreen,
  Reports: CommitteeReportsScreen,
  Settings: AdminSettingsScreen,
  Profile: AdminProfileScreen,
};

type Props = {
  portalSubtitle?: string;
  accentColor?: string;
};

export function AdminNavigator({
  portalSubtitle = 'Admin Console',
  accentColor = '#2563eb',
}: Props) {
  return (
    <PortalShell
      menuItems={PORTAL_MENU}
      portalTitle="FYP Portal"
      portalSubtitle={portalSubtitle}
      accentColor={accentColor}
      screens={PORTAL_SCREENS}
      initialRoute="Overview"
    />
  );
}
