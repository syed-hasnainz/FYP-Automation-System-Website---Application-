import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  SuperAdmin: undefined;
  CommitteeHead: undefined;
  Teacher: undefined;
  Student: undefined;
};

export type StudentDrawerParamList = {
  Dashboard: undefined;
  ProjectIdeas: undefined;
  Groups: undefined;
  Supervisor: undefined;
  ProposalSubmission: undefined;
  Messages: undefined;
  ScheduleMeeting: undefined;
  Profile: undefined;
};

export type TeacherDrawerParamList = {
  Dashboard: undefined;
  MyProjects: undefined;
  Students: undefined;
  SupervisionRequests: undefined;
  ScheduleMeeting: undefined;
  ProjectExecution: undefined;
  UploadedFiles: undefined;
  Messages: undefined;
  Profile: undefined;
};

export type AdminDrawerParamList = {
  Overview: undefined;
  ManageUsers: undefined;
  ReviewProjects: undefined;
  GroupApprovals: undefined;
};

export type CommitteeDrawerParamList = {
  Overview: undefined;
  ReviewProjects: undefined;
  GroupApprovals: undefined;
  Profile: undefined;
};

export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
