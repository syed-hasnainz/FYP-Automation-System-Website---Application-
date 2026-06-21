import React from 'react';
import { PortalShell } from '../components/portal/PortalShell';
import type { PortalMenuItem } from '../components/portal/PortalDrawerContent';
import { StudentDashboardScreen } from '../screens/student/StudentDashboardScreen';
import { StudentGroupsScreen } from '../screens/student/StudentGroupsScreen';
import { StudentMessagesScreen } from '../screens/student/StudentMessagesScreen';
import { StudentProfileScreen } from '../screens/student/StudentProfileScreen';
import { StudentProjectsScreen } from '../screens/student/StudentProjectsScreen';
import { StudentProposalScreen } from '../screens/student/StudentProposalScreen';
import { StudentProposalFeedbackScreen } from '../screens/student/StudentProposalFeedbackScreen';
import { StudentProjectExecutionScreen } from '../screens/student/StudentProjectExecutionScreen';
import { StudentProofSubmissionScreen } from '../screens/student/StudentProofSubmissionScreen';
import { StudentScheduleMeetingScreen } from '../screens/student/StudentScheduleMeetingScreen';
import { StudentDocumentSubmissionScreen } from '../screens/student/StudentDocumentSubmissionScreen';
import { StudentFormsScreen } from '../screens/student/StudentFormsScreen';
import { StudentSupervisorScreen } from '../screens/student/StudentSupervisorScreen';

const STUDENT_MENU: PortalMenuItem[] = [
  { name: 'Dashboard', label: 'Dashboard', icon: 'home' },
  { name: 'ProjectIdeas', label: 'Project Ideas', icon: 'search' },
  { name: 'Groups', label: 'Groups Management', icon: 'users' },
  { name: 'Supervisor', label: 'Supervisor', icon: 'user-check' },
  { name: 'ProposalSubmission', label: 'Proposal Submission Form', icon: 'upload' },
  { name: 'ProposalFeedback', label: 'Proposal Feedback', icon: 'message-circle' },
  { name: 'ProjectExecution', label: 'Project Execution', icon: 'file-text' },
  { name: 'ProofSubmission', label: 'Proof Submission', icon: 'upload-cloud' },
  { name: 'DocumentSubmission', label: 'Document Submission', icon: 'file-plus' },
  { name: 'Forms', label: 'FYP Forms', icon: 'clipboard' },
  { name: 'Messages', label: 'Messages', icon: 'message-circle' },
  { name: 'Profile', label: 'Profile', icon: 'settings' },
];

const STUDENT_SCREENS = {
  Dashboard: StudentDashboardScreen,
  ProjectIdeas: StudentProjectsScreen,
  Groups: StudentGroupsScreen,
  Supervisor: StudentSupervisorScreen,
  ProposalSubmission: StudentProposalScreen,
  ProposalFeedback: StudentProposalFeedbackScreen,
  ProjectExecution: StudentProjectExecutionScreen,
  ProofSubmission: StudentProofSubmissionScreen,
  DocumentSubmission: StudentDocumentSubmissionScreen,
  Forms: StudentFormsScreen,
  Messages: StudentMessagesScreen,
  ScheduleMeeting: StudentScheduleMeetingScreen,
  Profile: StudentProfileScreen,
};

export function StudentNavigator() {
  return (
    <PortalShell
      menuItems={STUDENT_MENU}
      portalTitle="FYP Portal"
      portalSubtitle="Student Dashboard"
      accentColor="#2563eb"
      screens={STUDENT_SCREENS}
      initialRoute="Dashboard"
    />
  );
}
