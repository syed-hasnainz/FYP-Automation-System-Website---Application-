import React from 'react';
import { PortalShell } from '../components/portal/PortalShell';
import type { PortalMenuItem } from '../components/portal/PortalDrawerContent';
import { TeacherDashboardScreen } from '../screens/teacher/TeacherDashboardScreen';
import { TeacherFilesScreen } from '../screens/teacher/TeacherFilesScreen';
import { TeacherMessagesScreen } from '../screens/teacher/TeacherMessagesScreen';
import { TeacherProfileScreen } from '../screens/teacher/TeacherProfileScreen';
import { TeacherProjectExecutionScreen } from '../screens/teacher/TeacherProjectExecutionScreen';
import { TeacherProjectsScreen } from '../screens/teacher/TeacherProjectsScreen';
import { TeacherStudentsScreen } from '../screens/teacher/TeacherStudentsScreen';
import { TeacherScheduleMeetingScreen } from '../screens/teacher/TeacherScheduleMeetingScreen';
import { TeacherSupervisionScreen } from '../screens/teacher/TeacherSupervisionScreen';
import { CommitteeUsersScreen } from '../screens/committee/CommitteeUsersScreen';

const TEACHER_MENU: PortalMenuItem[] = [
  { name: 'Dashboard', label: 'Dashboard', icon: 'bar-chart-2' },
  { name: 'MyProjects', label: 'My Projects', icon: 'book-open' },
  { name: 'Students', label: 'Students', icon: 'users' },
  { name: 'SupervisionRequests', label: 'Supervision Requests', icon: 'user-check' },
  { name: 'UserApprovals', label: 'User Approvals', icon: 'user-plus' },
  { name: 'ScheduleMeeting', label: 'Schedule Meeting', icon: 'calendar' },
  { name: 'ProjectExecution', label: 'Project Execution', icon: 'file-text' },
  { name: 'UploadedFiles', label: 'Uploaded Files', icon: 'file' },
  { name: 'Messages', label: 'Messages', icon: 'message-circle' },
  { name: 'Profile', label: 'Profile', icon: 'settings' },
];

const TEACHER_SCREENS = {
  Dashboard: TeacherDashboardScreen,
  MyProjects: TeacherProjectsScreen,
  Students: TeacherStudentsScreen,
  SupervisionRequests: TeacherSupervisionScreen,
  UserApprovals: CommitteeUsersScreen,
  ScheduleMeeting: TeacherScheduleMeetingScreen,
  ProjectExecution: TeacherProjectExecutionScreen,
  UploadedFiles: TeacherFilesScreen,
  Messages: TeacherMessagesScreen,
  Profile: TeacherProfileScreen,
};

export function TeacherNavigator() {
  return (
    <PortalShell
      menuItems={TEACHER_MENU}
      portalTitle="FYP Portal"
      portalSubtitle="Teacher Dashboard"
      accentColor="#2563eb"
      screens={TEACHER_SCREENS}
      initialRoute="Dashboard"
    />
  );
}
