export type UserRole = 'ADMIN' | 'COMMITTEE_HEAD' | 'TEACHER' | 'STUDENT';

export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONDITIONALLY_REGISTERED';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status?: UserStatus;
  rollNumber?: string;
  department?: string;
  profileImage?: string | null;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
  sessionExpiry?: number;
}

export interface RegisterResponse {
  message: string;
  user: AuthUser;
  eligibilityStatus?: 'ELIGIBLE' | 'CONDITIONAL' | 'INELIGIBLE';
  userId: string;
  cgpa?: number;
  prerequisitesPassed?: boolean;
}

export interface SystemSettings {
  general?: {
    maintenanceMode?: boolean;
    allowRegistration?: boolean;
  };
}
