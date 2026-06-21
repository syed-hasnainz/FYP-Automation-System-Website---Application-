'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionTimeout } from '@/hooks/use-session-timeout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Switch } from '@/components/ui/switch'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { 
  Users, 
  FolderOpen, 
  Users2, 
  Activity, 
  Settings, 
  Database, 
  Shield, 
  Bell,
  Search,
  Download,
  Trash2,
  Edit,
  Eye,
  Plus,
  LogOut,
  BarChart3,
  Calendar,
  X,
  Check,
  AlertCircle,
  Info,
  Building2,
  CheckCircle,
  XCircle,
  Menu,
  MoreVertical,
  UserCheck,
  UserX,
  FileCheck,
  ChevronDown,
  Check as CheckIcon,
  User,
  FileText
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import NotificationsPanel from '@/components/notifications-panel'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// Component to display student details
function StudentDetailsContent({ student }: { student: any }) {
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/profile?userId=${student.id}`, {
          headers: {
            'x-user-id': student.id
          }
        });
        if (response.ok) {
          const data = await response.json();
          setProfileData(data);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (student?.id) {
      fetchProfile();
    }
  }, [student]);

  if (loading) {
    return <div className="text-sm text-gray-500 py-4">Loading profile details...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-2xl font-medium text-blue-700">
            {student.name?.charAt(0) || 'U'}
          </span>
        </div>
        <div>
          <h3 className="text-lg font-semibold">{student.name}</h3>
          <p className="text-sm text-gray-500">{student.email}</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs text-gray-500">Roll Number</Label>
          <p className="text-sm font-medium">{student.rollNumber || 'N/A'}</p>
        </div>
        <div>
          <Label className="text-xs text-gray-500">Department</Label>
          <p className="text-sm font-medium">{student.department || 'N/A'}</p>
        </div>
        <div>
          <Label className="text-xs text-gray-500">Role</Label>
          <p className="text-sm font-medium">{student.role || 'STUDENT'}</p>
        </div>
        <div>
          <Label className="text-xs text-gray-500">Email</Label>
          <p className="text-sm font-medium">{student.email || 'N/A'}</p>
        </div>
      </div>

      {profileData && (
        <div className="space-y-4 border-t pt-4">
          <h4 className="font-medium text-sm">Additional Profile Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profileData.gpa !== null && profileData.gpa !== undefined && (
              <div>
                <Label className="text-xs text-gray-500">GPA</Label>
                <p className="text-sm font-medium">{profileData.gpa}</p>
              </div>
            )}
            {profileData.semester !== null && profileData.semester !== undefined && (
              <div>
                <Label className="text-xs text-gray-500">Semester</Label>
                <p className="text-sm font-medium">{profileData.semester}</p>
              </div>
            )}
            {profileData.contactInfo && (
              <div>
                <Label className="text-xs text-gray-500">Contact Info</Label>
                <p className="text-sm font-medium">{profileData.contactInfo}</p>
              </div>
            )}
            {profileData.studentProfile?.cgpa !== null && profileData.studentProfile?.cgpa !== undefined && (
              <div>
                <Label className="text-xs text-gray-500">CGPA</Label>
                <p className="text-sm font-medium">{profileData.studentProfile.cgpa}</p>
              </div>
            )}
            {profileData.studentProfile?.batch && (
              <div>
                <Label className="text-xs text-gray-500">Batch</Label>
                <p className="text-sm font-medium">{profileData.studentProfile.batch}</p>
              </div>
            )}
            {profileData.studentProfile?.eligibilityStatus && (
              <div>
                <Label className="text-xs text-gray-500">Eligibility Status</Label>
                <Badge variant={profileData.studentProfile.eligibilityStatus === 'ELIGIBLE' ? 'default' : 'destructive'}>
                  {profileData.studentProfile.eligibilityStatus}
                </Badge>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Optional: provide manual values for dashboard metrics. Update these to control what
// appears inside the overview cards when live metrics are disabled.
type StatKey = 'totalUsers' | 'activeProjects' | 'committees' | 'announcements'
const manualMetrics: Record<StatKey, string | number | null> = {
  totalUsers: null,
  activeProjects: null,
  committees: null,
  announcements: null
}

// Toggle to true when you want the cards to use live counts from the database.
const liveMetricsEnabled = true

const sidebarItems = [
  { id: 'overview', label: 'Overview', description: 'System snapshot', icon: BarChart3 },
  { id: 'users', label: 'Manage Users', description: 'Accounts & approvals', icon: Users },
  { id: 'jury', label: 'Jury Management', description: 'Defense schedules & panels', icon: Users2 },
  { id: 'projects', label: 'Review Projects', description: 'Track progress', icon: FolderOpen },
  { id: 'organization', label: 'Organization', description: 'Faculties & Committees', icon: Building2 },
  { id: 'groups', label: 'Group Approvals', description: 'Review student groups', icon: Users2 },
  { id: 'announcements', label: 'Announcements', description: 'Create & manage announcements', icon: Bell },
  { id: 'policy-submissions', label: 'Submissions', description: 'Review proof submissions', icon: FileCheck },
  { id: 'settings', label: 'Settings', description: 'Platform controls', icon: Settings }
]

export default function AdminDashboard() {
  useSessionTimeout()
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const router = useRouter()
  
  // Notifications State
  const [notifications, setNotifications] = useState<any[]>([])
  
  const [stats, setStats] = useState<Record<StatKey, number | null>>({
    totalUsers: null,
    activeProjects: null,
    committees: null,
    announcements: null
  })

  const getMetricValue = (key: StatKey) => {
    if (manualMetrics[key] !== null && manualMetrics[key] !== undefined) {
      return manualMetrics[key]
    }
    if (liveMetricsEnabled) {
      return stats[key]
    }
    return '—'
  }

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!userData || !token) {
      window.location.href = '/';
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'ADMIN') {
      window.location.href = '/';
      return;
    }
    
    setUser(parsedUser);
    
    // Load user profile picture if available
    const loadUserProfile = async () => {
      try {
        if (parsedUser?.id) {
          const response = await fetch(`/api/profile?userId=${parsedUser.id}`, {
            headers: {
              'x-user-id': parsedUser.id,
            },
          });
          if (response.ok) {
            const profileData = await response.json();
            if (profileData.profileImage) {
              parsedUser.profileImage = profileData.profileImage;
              setUser(parsedUser);
              localStorage.setItem('user', JSON.stringify(parsedUser));
              localStorage.setItem('userProfilePicture', profileData.profileImage);
            }
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }
    };
    loadUserProfile();
    loadAvailableBackups();
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setSettings({
          systemName: data.general?.systemName || 'FYP Automation System',
          universityName: data.general?.universityName || 'Hamdard University',
          contactEmail: data.general?.contactEmail || 'admin@hamdard.edu.pk',
          maintenanceMode: data.general?.maintenanceMode || false,
          allowRegistration: data.general?.allowRegistration !== false,
          emailNotifications: data.notifications?.emailNotifications !== false,
          smsNotifications: data.notifications?.smsNotifications || false,
          pushNotifications: data.notifications?.pushNotifications !== false,
          deadlineReminders: data.notifications?.deadlineReminders !== false,
          approvalNotifications: data.notifications?.approvalNotifications !== false,
          automaticBackup: data.backup?.automaticBackup !== false,
          backupFrequency: data.backup?.backupFrequency || 'Daily',
          retentionDays: data.backup?.retentionDays || 30,
          minPasswordLength: data.security?.minPasswordLength || 8,
          sessionTimeout: data.security?.sessionTimeout || 24,
          maxLoginAttempts: data.security?.maxLoginAttempts || 5,
          requireEmailVerification: data.security?.requireEmailVerification || false,
          enableTwoFactorAuth: data.security?.enableTwoFactor || false
        })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  const handleSaveSettings = async () => {
    try {
      const settingsData = {
        general: {
          systemName: settings.systemName,
          universityName: settings.universityName,
          contactEmail: settings.contactEmail,
          maintenanceMode: settings.maintenanceMode,
          allowRegistration: settings.allowRegistration
        },
        security: {
          minPasswordLength: settings.minPasswordLength,
          sessionTimeout: settings.sessionTimeout,
          maxLoginAttempts: settings.maxLoginAttempts,
          requireEmailVerification: settings.requireEmailVerification,
          enableTwoFactor: settings.enableTwoFactorAuth
        },
        notifications: {
          emailNotifications: settings.emailNotifications,
          smsNotifications: settings.smsNotifications,
          pushNotifications: settings.pushNotifications,
          deadlineReminders: settings.deadlineReminders,
          approvalNotifications: settings.approvalNotifications
        },
        backup: {
          automaticBackup: settings.automaticBackup,
          backupFrequency: settings.backupFrequency,
          retentionDays: settings.retentionDays
        }
      }

      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData)
      })

      if (response.ok) {
        // Request notification permission if push notifications enabled
        if (settings.pushNotifications && 'Notification' in window) {
          const permission = await Notification.requestPermission()
          if (permission === 'granted') {
            toast({
              title: 'Success',
              description: 'Settings saved and browser notifications enabled'
            })
          } else if (permission === 'denied') {
            toast({
              title: 'Settings Saved',
              description: 'Settings saved but browser notifications were blocked. Please enable them in your browser settings.',
              variant: 'default'
            })
          } else {
            toast({
              title: 'Success',
              description: 'Settings saved successfully'
            })
          }
        } else {
          toast({
            title: 'Success',
            description: 'Settings saved successfully'
          })
        }

        // Store notification settings in localStorage for quick access
        localStorage.setItem('notificationSettings', JSON.stringify(settingsData.notifications))
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
        variant: 'destructive'
      })
    }
  }

  const [systemInfo] = useState({
    version: '1.0.0',
    environment: 'Development',
    database: 'SQLite',
    uptime: '99.9%'
  })

  // User Management State
  const [users, setUsers] = useState([])
  const [searchUserQuery, setSearchUserQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [departmentFilter, setDepartmentFilter] = useState('ALL')
  const [selectedUser, setSelectedUser] = useState(null)
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false)
  const [isViewUserDialogOpen, setIsViewUserDialogOpen] = useState(false)
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false)

  // Committee Management State
  const [committees, setCommittees] = useState([])
  const [selectedCommittee, setSelectedCommittee] = useState<any>({
    name: '',
    head: '',
    headId: '',
    faculty: '',
    department: '',
    members: []
  })
  const [isEditCommitteeDialogOpen, setIsEditCommitteeDialogOpen] = useState(false)
  const [isViewCommitteeDialogOpen, setIsViewCommitteeDialogOpen] = useState(false)
  const [isAddCommitteeDialogOpen, setIsAddCommitteeDialogOpen] = useState(false)
  
  // Committee creation autocomplete state
  const [committeeHeads, setCommitteeHeads] = useState([])
  const [teachers, setTeachers] = useState([])
  const [isCommitteeHeadOpen, setIsCommitteeHeadOpen] = useState(false)
  const [isMembersOpen, setIsMembersOpen] = useState(false)
  const [selectedMemberIds, setSelectedMemberIds] = useState([])

  // Faculty Management State
  const [faculties, setFaculties] = useState([])
  const [selectedFaculty, setSelectedFaculty] = useState(null)
  const [isAddFacultyDialogOpen, setIsAddFacultyDialogOpen] = useState(false)
  const [isEditFacultyDialogOpen, setIsEditFacultyDialogOpen] = useState(false)
  const [isDeleteFacultyDialogOpen, setIsDeleteFacultyDialogOpen] = useState(false)
  const [facultyToDelete, setFacultyToDelete] = useState<string | null>(null)
  const [facultyFormData, setFacultyFormData] = useState({
    name: '',
    description: '',
    code: '',
    departments: ''
  })

  // Backup Management State
  const [isRestoreBackupDialogOpen, setIsRestoreBackupDialogOpen] = useState(false)
  const [backupToRestore, setBackupToRestore] = useState<string | null>(null)

  // Group Approvals State
  const [groups, setGroups] = useState([])
  const [groupStatusFilter, setGroupStatusFilter] = useState('pending')
  const [loadingGroups, setLoadingGroups] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [isStudentDetailsOpen, setIsStudentDetailsOpen] = useState(false)
  const [removingStudentId, setRemovingStudentId] = useState<string | null>(null)
  const [studentToRemove, setStudentToRemove] = useState<{groupId: string, studentId: string, student: any} | null>(null)
  const [isRemoveStudentDialogOpen, setIsRemoveStudentDialogOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<any>(null)
  const [isDeleteGroupDialogOpen, setIsDeleteGroupDialogOpen] = useState(false)
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null)

  // Projects State
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [projectSearchQuery, setProjectSearchQuery] = useState('')
  const [projectStatusFilter, setProjectStatusFilter] = useState('ALL')
  const [teacherComposedProjects, setTeacherComposedProjects] = useState([])
  const [loadingTeacherProjects, setLoadingTeacherProjects] = useState(false)
  const [studentProposedProjects, setStudentProposedProjects] = useState([])
  const [loadingStudentProjects, setLoadingStudentProjects] = useState(false)
  const [isDeleteProjectDialogOpen, setIsDeleteProjectDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<any>(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false)
  const [projectEditMode, setProjectEditMode] = useState(false)
  const [projectFormData, setProjectFormData] = useState({
    title: '',
    description: '',
    status: 'PROPOSED'
  })

  // File Tracking State
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [fileSearchQuery, setFileSearchQuery] = useState('')
  const [fileTypeFilter, setFileTypeFilter] = useState('ALL')
  const [fileDepartmentFilter, setFileDepartmentFilter] = useState('ALL')
  const [selectedFile, setSelectedFile] = useState<any>(null)

  // Settings State
  const [settings, setSettings] = useState({
    systemName: 'FYP Automation System',
    universityName: 'Hamdard University',
    contactEmail: 'admin@hamdard.edu.pk',
    maintenanceMode: false,
    allowRegistration: true,
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    deadlineReminders: true,
    approvalNotifications: true,
    automaticBackup: true,
    backupFrequency: 'Daily',
    retentionDays: 30,
    minPasswordLength: 8,
    sessionTimeout: 24,
    maxLoginAttempts: 5,
    requireEmailVerification: false,
    enableTwoFactorAuth: false
  })
  const [activeSettingsTab, setActiveSettingsTab] = useState('account')
  const { toast } = useToast()
  
  // Account settings state
  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    currentPassword: ''
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    window.location.href = '/'
  }

  // Account Settings Handlers
  const handleUpdateEmail = async () => {
    if (!emailForm.newEmail || !emailForm.currentPassword) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive'
      })
      return
    }

    if (emailForm.newEmail === user?.email) {
      toast({
        title: 'Error',
        description: 'New email must be different from current email',
        variant: 'destructive'
      })
      return
    }

    setIsUpdatingEmail(true)
    try {
      const userId = user?.id
      if (!userId) {
        throw new Error('User not found')
      }

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          updateType: 'email',
          newEmail: emailForm.newEmail,
          currentPassword: emailForm.currentPassword
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Success',
          description: data.message || 'Email updated successfully. Please log in again with your new email.'
        })
        setEmailForm({ newEmail: '', currentPassword: '' })
        // Logout after 2 seconds to allow user to see the success message
        setTimeout(() => {
          handleLogout()
        }, 2000)
      } else {
        throw new Error(data.error || 'Failed to update email')
      }
    } catch (error: any) {
      console.error('Error updating email:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update email. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsUpdatingEmail(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive'
      })
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: 'Error',
        description: 'New password and confirm password do not match',
        variant: 'destructive'
      })
      return
    }

    if (passwordForm.newPassword.length < 8) {
      toast({
        title: 'Error',
        description: 'Password must be at least 8 characters long',
        variant: 'destructive'
      })
      return
    }

    setIsUpdatingPassword(true)
    try {
      const userId = user?.id
      if (!userId) {
        throw new Error('User not found')
      }

      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          updateType: 'password',
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Success',
          description: data.message || 'Password updated successfully. Please log in again with your new password.'
        })
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
        // Logout after 2 seconds to allow user to see the success message
        setTimeout(() => {
          handleLogout()
        }, 2000)
      } else {
        throw new Error(data.error || 'Failed to update password')
      }
    } catch (error: any) {
      console.error('Error updating password:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update password. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  // Notification Handlers
  const markAsRead = (notificationId) => {
    setNotifications(notifications.map(notif => 
      notif.id === notificationId ? { ...notif, read: true } : notif
    ))
  }

  const markAllAsRead = () => {
    setNotifications(notifications.map(notif => ({ ...notif, read: true })))
  }

  const clearNotification = (notificationId) => {
    setNotifications(notifications.filter(notif => notif.id !== notificationId))
  }

  const clearAllNotifications = () => {
    setNotifications([])
  }

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'success': return <Check className="h-4 w-4 text-green-500" />
      case 'warning': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'error': return <X className="h-4 w-4 text-red-500" />
      default: return <Info className="h-4 w-4 text-blue-500" />
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  // User Management Functions
  const handleViewUser = (user) => {
    setSelectedUser(user)
    setIsViewUserDialogOpen(true)
  }

  const handleEditUser = (user) => {
    setSelectedUser({...user})
    setIsEditUserDialogOpen(true)
  }

  const handleDeleteUser = async (userId) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        // Remove from local state
        setUsers(users.filter(user => user.id !== userId))
        setStats(prev => ({ 
          ...prev, 
          totalUsers: prev.totalUsers ? prev.totalUsers - 1 : null 
        }))
        toast({ title: 'Success', description: 'User deleted successfully' })
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete user' }))
        throw new Error(errorData.error || 'Failed to delete user')
      }
    } catch (error: any) {
      console.error('Error deleting user:', error)
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to delete user. Please try again.', 
        variant: 'destructive' 
      })
    }
  }

  const handleSaveUser = async () => {
    try {
      // Validate password if provided
      if (selectedUser.newPassword && selectedUser.newPassword.trim() !== '') {
        if (selectedUser.newPassword.length < 8) {
          toast({ 
            title: 'Validation Error', 
            description: 'Password must be at least 8 characters long', 
            variant: 'destructive' 
          })
          return
        }
      }
      
      // Prepare the data to send
      const updateData: any = {
        ...selectedUser,
      }
      
      // Handle password - send only if newPassword is set
      if (selectedUser.newPassword && selectedUser.newPassword.trim() !== '') {
        updateData.password = selectedUser.newPassword
      }
      delete updateData.newPassword
      
      // Include employeeId if it's a teacher or committee head
      if ((selectedUser.role === 'TEACHER' || selectedUser.role === 'COMMITTEE_HEAD') && selectedUser.teacherProfile?.employeeId) {
        updateData.employeeId = selectedUser.teacherProfile.employeeId
      }
      
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })
      
      if (response.ok) {
        const { user: updatedUser } = await response.json()
        // Refresh users list to get updated data
        const usersResponse = await fetch('/api/admin/users')
        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          setUsers(usersData)
        }
        setIsEditUserDialogOpen(false)
        setSelectedUser(null)
        toast({ title: 'Success', description: 'User updated successfully' })
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update user' }))
        throw new Error(errorData.error || 'Failed to update user')
      }
    } catch (error: any) {
      console.error('Error saving user:', error)
      toast({ title: 'Error', description: error.message || 'Failed to save user. Please try again.', variant: 'destructive' })
    }
  }

  const handleApproveRejectUser = async (userId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      
      if (response.ok) {
        const result = await response.json()
        const updatedUser = result.user || result
        
        // Update local state
        setUsers(users.map(user => 
          user.id === updatedUser.id ? { ...user, status: updatedUser.status } : user
        ))
        
        // Reload users to ensure we have the latest data
        const usersResponse = await fetch('/api/admin/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData);
        }
        toast({ title: 'Success', description: `User ${action === 'approve' ? 'approved' : 'rejected'} successfully!` })
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `Failed to ${action} user`)
      }
    } catch (error: any) {
      console.error(`Error ${action}ing user:`, error)
      toast({ title: 'Error', description: error.message || `Failed to ${action} user. Please try again.`, variant: 'destructive' })
    }
  }

  const handleAddUser = async () => {
    if (!selectedUser) return
    try {
      const payload = { ...selectedUser, password: (selectedUser.password || 'changeme') }
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const result = await response.json().catch(() => ({}))
      if (response.ok) {
        setUsers(prev => [...prev, result])
        setIsAddUserDialogOpen(false)
        setSelectedUser(null)
        toast({ title: 'Success', description: 'User created successfully' })
      } else {
        throw new Error(result?.error || result?.details || 'Failed to create user')
      }
    } catch (error: any) {
      console.error('Error creating user:', error)
      toast({ title: 'Error', description: error.message || 'Failed to create user', variant: 'destructive' })
    }
  }

  // Handler to open Create Committee dialog
  const handleOpenCreateCommitteeDialog = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSelectedCommittee({
      name: '',
      head: '',
      headId: '',
      faculty: '',
      department: '',
      members: []
    });
    setSelectedMemberIds([]);
    setIsAddCommitteeDialogOpen(true);
  };

  // Committee Management Functions
  const handleViewCommittee = (committee) => {
    setSelectedCommittee(committee)
    setIsViewCommitteeDialogOpen(true)
  }

  const handleEditCommittee = (committee) => {
    // Ensure members array is properly structured
    const formattedCommittee = {
      ...committee,
      members: committee.members && Array.isArray(committee.members) 
        ? committee.members 
        : [],
      memberIds: committee.memberIds || (committee.members && Array.isArray(committee.members)
        ? committee.members.map((m: any) => typeof m === 'string' ? m : m?.id).filter(Boolean)
        : [])
    }
    setSelectedCommittee(formattedCommittee)
    setIsEditCommitteeDialogOpen(true)
  }

  const handleDeleteCommittee = (committeeId) => {
    // Call backend to delete committee and update UI on success
    (async () => {
      try {
        const response = await fetch(`/api/admin/committees/${committeeId}`, { method: 'DELETE' })
        if (response.ok) {
          setCommittees(committees.filter(committee => committee.id !== committeeId))
          setStats(prev => ({ ...prev, committees: (prev.committees ? prev.committees - 1 : (committees.length - 1)) }))
          toast({ title: 'Success', description: 'Committee deleted successfully' })
        } else {
          const err = await response.json().catch(() => ({ error: 'Failed to delete committee' }))
          throw new Error(err.error || 'Failed to delete committee')
        }
      } catch (error) {
        console.error('Error deleting committee:', error)
        toast({ title: 'Error', description: 'Failed to delete committee. Please try again.', variant: 'destructive' })
      }
    })()
  }

  const handleSaveCommittee = async () => {
    if (!selectedCommittee || !selectedCommittee.id) return
    try {
      // Extract member IDs from members array (handle both object and string formats)
      const memberIds = selectedCommittee.members && Array.isArray(selectedCommittee.members)
        ? selectedCommittee.members.map((member: any) => 
            typeof member === 'string' ? member : member?.id || member
          ).filter(Boolean)
        : selectedCommittee.memberIds || []

      const updateData = {
        name: selectedCommittee.name,
        description: selectedCommittee.description,
        headId: selectedCommittee.headId,
        memberIds: memberIds
      }

      const response = await fetch(`/api/admin/committees/${selectedCommittee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (response.ok) {
        const updated = await response.json().catch(() => selectedCommittee)
        const updatedCommittee = updated.committee || updated
        setCommittees(committees.map(committee => committee.id === updatedCommittee.id ? updatedCommittee : committee))
        setIsEditCommitteeDialogOpen(false)
        setSelectedCommittee(null)
        toast({ title: 'Success', description: 'Committee updated successfully' })
      } else {
        const err = await response.json().catch(() => ({ error: 'Failed to update committee' }))
        throw new Error(err.error || 'Failed to update committee')
      }
    } catch (error) {
      console.error('Error saving committee:', error)
      toast({ title: 'Error', description: 'Failed to save committee. Please try again.', variant: 'destructive' })
    }
  }

  const handleAddCommittee = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      console.log('Creating committee with data:', {
        selectedCommittee,
        selectedMemberIds
      });

      if (!selectedCommittee.name || !selectedCommittee.name.trim()) {
        toast({ title: 'Validation Error', description: 'Please fill in committee name', variant: 'destructive' })
        return;
      }
      if (!selectedCommittee.headId) {
        toast({ title: 'Validation Error', description: 'Please select a committee head', variant: 'destructive' })
        return;
      }

      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const requestBody = {
        name: selectedCommittee.name.trim(),
        head: selectedCommittee.head || '',
        headId: selectedCommittee.headId,
        faculty: selectedCommittee.faculty || '',
        department: selectedCommittee.department || '',
        members: selectedCommittee.members || [],
        memberIds: selectedMemberIds || [],
      };

      console.log('Sending request:', requestBody);

      const response = await fetch('/api/admin/committees', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const result = await response.json().catch(() => ({}));
        const newCommittee = result.committee || result

        // Reload committees to ensure consistent server state
        const committeesResponse = await fetch('/api/admin/committees');
        if (committeesResponse.ok) {
          const committeesData = await committeesResponse.json();
          setCommittees(committeesData);
          setStats(prev => ({ ...prev, committees: committeesData.length }));
        } else {
          setCommittees(prev => [...prev, newCommittee])
          setStats(prev => ({ ...prev, committees: (prev.committees ? prev.committees + 1 : committees.length + 1) }))
        }

        setIsAddCommitteeDialogOpen(false);
        setSelectedCommittee({ name: '', head: '', headId: '', faculty: '', department: '', members: [] });
        setSelectedMemberIds([]);
        toast({ title: 'Success', description: 'Committee created successfully' })
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error Response:', errorData);
        const errorMessage = errorData.error || errorData.details || `Failed to create committee (Status: ${response.status})`;
        toast({ 
          title: 'Error', 
          description: errorMessage, 
          variant: 'destructive' 
        });
      }
    } catch (error) {
      console.error('Error creating committee:', error);
      toast({ 
        title: 'Error', 
        description: (error instanceof Error ? error.message : 'Failed to create committee. Please check the console for details.'), 
        variant: 'destructive' 
      });
    }
  }

  // Backup & Restore Handlers
  const [backupInProgress, setBackupInProgress] = useState(false)
  const [restoreInProgress, setRestoreInProgress] = useState(false)
  const [availableBackups, setAvailableBackups] = useState<any[]>([])

  const handleBackupNow = async () => {
    if (backupInProgress) return
    
    try {
      setBackupInProgress(true)
      toast({ title: 'Backup Started', description: 'Creating system backup...' })
      
      const response = await fetch('/api/admin/backup', {
        method: 'POST'
      })
      
      if (response.ok) {
        const result = await response.json()
        
        if (result.success) {
          toast({
            title: 'Backup Complete',
            description: `Backup created successfully. Size: ${result.backup.size}, Records: ${result.backup.records}`
          })
          
          // Download the backup file automatically
          const downloadResponse = await fetch(`/api/admin/backup?file=${result.backup.filename}`)
          if (downloadResponse.ok) {
            const blob = await downloadResponse.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = result.backup.filename
            document.body.appendChild(a)
            a.click()
            a.remove()
            window.URL.revokeObjectURL(url)
          }
          
          // Refresh available backups list
          loadAvailableBackups()
        } else {
          throw new Error(result.message || 'Backup failed')
        }
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(error.error || error.message || 'Backup failed')
      }
    } catch (error) {
      console.error('Backup error:', error)
      toast({
        title: 'Backup Failed',
        description: error instanceof Error ? error.message : 'Failed to create backup',
        variant: 'destructive'
      })
    } finally {
      setBackupInProgress(false)
    }
  }

  const loadAvailableBackups = async () => {
    try {
      const response = await fetch('/api/admin/backup')
      if (response.ok) {
        const result = await response.json()
        setAvailableBackups(result.backups || [])
      }
    } catch (error) {
      console.error('Error loading backups:', error)
    }
  }

  const handleRestoreBackup = async (filename?: string) => {
    if (restoreInProgress) return
    
    try {
      setRestoreInProgress(true)
      setIsRestoreBackupDialogOpen(false)
      
      toast({ title: 'Restore Started', description: 'Restoring backup data...' })
      
      const response = await fetch('/api/admin/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: filename || availableBackups[0]?.filename })
      })
      
      if (response.ok) {
        const result = await response.json()
        
        if (result.success) {
          toast({
            title: 'Restore Complete',
            description: result.message || 'Backup restored successfully'
          })
          
          // Reload all data
          setTimeout(() => {
            window.location.reload()
          }, 2000)
        } else {
          throw new Error(result.message || 'Restore failed')
        }
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(error.error || error.message || 'Restore failed')
      }
    } catch (error) {
      console.error('Restore error:', error)
      toast({
        title: 'Restore Failed',
        description: error instanceof Error ? error.message : 'Failed to restore backup',
        variant: 'destructive'
      })
    } finally {
      setRestoreInProgress(false)
    }
  }

  // Load approved projects for Review Projects tab
  const loadApprovedProjects = async () => {
    setLoadingProjects(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user?.id) {
        console.error('User not authenticated');
        setProjects([]);
        return;
      }

      const response = await fetch('/api/admin/student-projects', {
        headers: {
          'x-user-id': user.id
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // API already returns data in correct format, just ensure compatibility
        const transformedProjects = (data || []).map((project: any) => ({
          ...project,
          proposalTitle: project.proposalTitle || project.title || 'Untitled',
          projectTitle: project.projectTitle || project.title,
          projectStatus: project.projectStatus || project.status,
          submittedDate: project.submittedDate || project.createdAt,
          group: project.group || (project.groupName ? {
            name: project.groupName,
            members: project.studentNames ? project.studentNames.split(', ').map((name: string) => ({
              name,
              user: { name }
            })) : []
          } : null),
          supervisor: project.supervisor ? (typeof project.supervisor === 'string' ? { name: project.supervisor } : project.supervisor) : null
        }));
        setProjects(transformedProjects);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to load approved projects:', response.status, errorData);
        setProjects([]);
        toast({
          title: "Error",
          description: errorData.error || "Failed to load approved projects",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error loading approved projects:', error);
      setProjects([]);
      toast({
        title: "Error",
        description: "Failed to load approved projects",
        variant: "destructive"
      });
    } finally {
      setLoadingProjects(false);
    }
  };

  // Project Functions
  // Load teacher-composed projects
  const loadTeacherComposedProjects = async () => {
    setLoadingTeacherProjects(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch('/api/faculty-ideas', {
        headers: {
          'x-user-role': user.role || 'ADMIN'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTeacherComposedProjects(data || []);
      } else {
        console.error('Failed to load teacher-composed projects');
        setTeacherComposedProjects([]);
      }
    } catch (error) {
      console.error('Error loading teacher-composed projects:', error);
      setTeacherComposedProjects([]);
    } finally {
      setLoadingTeacherProjects(false);
    }
  }

  // Load student-proposed projects
  const loadStudentProposedProjects = async () => {
    setLoadingStudentProjects(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch('/api/student-ideas', {
        headers: {
          'x-user-role': user.role || 'ADMIN'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStudentProposedProjects(data || []);
      } else {
        console.error('Failed to load student-proposed projects');
        setStudentProposedProjects([]);
      }
    } catch (error) {
      console.error('Error loading student-proposed projects:', error);
      setStudentProposedProjects([]);
    } finally {
      setLoadingStudentProjects(false);
    }
  }

  // Handle delete project
  const handleDeleteProject = async (projectId: string) => {
    try {
      const response = await fetch(`/api/admin/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        // Remove from local state
        setProjects(projects.filter(project => project.id !== projectId));
        setTeacherComposedProjects(teacherComposedProjects.filter(project => project.id !== projectId));
        setIsDeleteProjectDialogOpen(false);
        setProjectToDelete(null);
        toast({ title: 'Success', description: 'Project deleted successfully' });
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete project' }));
        throw new Error(errorData.error || 'Failed to delete project');
      }
    } catch (error: any) {
      console.error('Error deleting project:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to delete project. Please try again.', 
        variant: 'destructive' 
      });
    }
  }

  const handleViewProject = (project: any) => {
    setSelectedProject(project);
    setProjectEditMode(false);
    setProjectFormData({
      title: project.proposalTitle || project.title || '',
      description: project.proposalDescription || project.description || '',
      status: project.projectStatus || project.status || 'PROPOSED'
    });
    setIsProjectDialogOpen(true);
  }

  const handleEditProject = (project: any) => {
    setSelectedProject(project);
    setProjectEditMode(true);
    setProjectFormData({
      title: project.proposalTitle || project.title || '',
      description: project.proposalDescription || project.description || '',
      status: project.projectStatus || project.status || 'PROPOSED'
    });
    setIsProjectDialogOpen(true);
  }

  const handleUpdateProject = async () => {
    try {
      const response = await fetch(`/api/admin/projects/${selectedProject.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectFormData)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Project updated successfully"
        });
        setIsProjectDialogOpen(false);
        // Reload approved projects
        if (activeTab === 'projects') {
          loadApprovedProjects();
          loadTeacherComposedProjects();
          loadStudentProposedProjects();
        }
        const projectsResponse = await fetch('/api/admin/projects');
        if (projectsResponse.ok) {
          const projectsData = await projectsResponse.json();
          setProjects(projectsData || []);
        }
      } else {
        throw new Error('Failed to update project');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update project",
        variant: "destructive"
      });
    }
  }

  // Quick Actions Handlers
  const handleQuickAction = (action) => {
    switch(action) {
      case 'manageUsers':
        setActiveTab('users')
        break
      case 'committeeManagement':
        setActiveTab('organization')
        break
      case 'reviewProjects':
        setActiveTab('projects')
        break
      case 'databaseBackup':
        setActiveTab('settings')
        setActiveSettingsTab('backup')
        break
      default:
        break
    }
  }

  // Faculty Management Handlers
  const loadFaculties = async () => {
    try {
      const response = await fetch('/api/admin/faculties');
      if (response.ok) {
        const data = await response.json();
        setFaculties(data);
      }
    } catch (error) {
      console.error('Error loading faculties:', error);
      toast({
        title: "Error",
        description: "Failed to load faculties",
        variant: "destructive"
      });
    }
  };


  const loadCommitteeHeads = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setCommitteeHeads(data.filter((u: any) => u.role === 'COMMITTEE_HEAD' && u.status === 'APPROVED'));
      }
    } catch (error) {
      console.error('Error loading committee heads:', error);
    }
  };

  const loadTeachers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setTeachers(data.filter((u: any) => u.role === 'TEACHER' && u.status === 'APPROVED'));
      }
    } catch (error) {
      console.error('Error loading teachers:', error);
    }
  };

  const handleAddFaculty = async () => {
    if (!facultyFormData.name.trim()) {
      toast({
        title: "Error",
        description: "Faculty name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/faculties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify(facultyFormData)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Faculty added successfully"
        });
        setIsAddFacultyDialogOpen(false);
        setFacultyFormData({ name: '', description: '', code: '' });
        loadFaculties();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add faculty');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add faculty",
        variant: "destructive"
      });
    }
  };

  const handleEditFaculty = async () => {
    if (!selectedFaculty || !facultyFormData.name.trim()) {
      toast({
        title: "Error",
        description: "Faculty name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/admin/faculties/${selectedFaculty.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify(facultyFormData)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Faculty updated successfully"
        });
        setIsEditFacultyDialogOpen(false);
        setSelectedFaculty(null);
        setFacultyFormData({ name: '', description: '', code: '' });
        loadFaculties();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update faculty');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update faculty",
        variant: "destructive"
      });
    }
  };

  const handleDeleteFaculty = async (facultyId: string) => {
    setIsDeleteFacultyDialogOpen(false);
    
    try {
      const response = await fetch(`/api/admin/faculties/${facultyId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user?.id || ''
        }
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Faculty deleted successfully"
        });
        loadFaculties();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete faculty');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete faculty",
        variant: "destructive"
      });
    }
  };

  // Group Approval Handlers
  const loadGroups = async () => {
    setLoadingGroups(true);
    try {
      const response = await fetch(`/api/admin/groups?status=${groupStatusFilter}`, {
        headers: {
          'x-user-id': user?.id || ''
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      toast({
        title: "Error",
        description: "Failed to load groups",
        variant: "destructive"
      });
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleRemoveStudentClick = (groupId: string, student: any) => {
    setStudentToRemove({ groupId, studentId: student.id, student });
    setIsRemoveStudentDialogOpen(true);
  };

  const handleRemoveStudent = async () => {
    if (!studentToRemove) return;

    const { groupId, studentId, student } = studentToRemove;
    setRemovingStudentId(studentId);
    setIsRemoveStudentDialogOpen(false);
    
    try {
      const response = await fetch(`/api/admin/groups/${groupId}/members/${studentId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user?.id || ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Success",
          description: data.message || `${student.name} has been removed from the group`
        });
        if (data.groupDeactivated) {
          toast({
            title: "Group Deactivated",
            description: "The group has been deactivated due to insufficient members.",
            variant: "destructive"
          });
        }
        loadGroups();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to remove student from group');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to remove student from group',
        variant: "destructive"
      });
    } finally {
      setRemovingStudentId(null);
      setStudentToRemove(null);
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupToDelete) return;

    setDeletingGroupId(groupToDelete.id);
    setIsDeleteGroupDialogOpen(false);
    
    try {
      const response = await fetch(`/api/admin/groups/${groupToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user?.id || ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Success",
          description: data.message || `Group "${groupToDelete.name}" has been deleted successfully`
        });
        loadGroups();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete group');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || 'Failed to delete group',
        variant: "destructive"
      });
    } finally {
      setDeletingGroupId(null);
      setGroupToDelete(null);
    }
  };

  // File Tracking Functions
  const loadFiles = async () => {
    setLoadingFiles(true)
    try {
      const response = await fetch('/api/admin/files')
      if (response.ok) {
        const filesData = await response.json()
        const validFiles = (filesData || []).filter((file: any) => file && file.id)
        setUploadedFiles(validFiles)
      } else {
        setUploadedFiles([])
      }
    } catch (error) {
      console.error('Error loading files:', error)
      setUploadedFiles([])
    } finally {
      setLoadingFiles(false)
    }
  }

  const handleViewFile = async (file: any) => {
    try {
      // For PDFs and images, try to open directly using the file URL if it's a public path
      if (file.fileUrl && file.fileUrl.startsWith('/')) {
        const fileExtension = file.fileUrl.toLowerCase().split('.').pop()
        const viewableTypes = ['pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp']
        
        if (viewableTypes.includes(fileExtension)) {
          window.open(file.fileUrl, '_blank')
          return
        }
      }
      
      // For all files, use the download endpoint with inline=1 parameter
      const viewUrl = `/api/admin/files/${encodeURIComponent(String(file.id))}/download?inline=1`
      const newWindow = window.open(viewUrl, '_blank')
      
      if (!newWindow) {
        toast({ 
          title: 'Popup blocked', 
          description: 'Please allow popups for this site to view files, or use the download button.', 
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error viewing file:', error)
      toast({ 
        title: 'Error', 
        description: 'Failed to open file. Please try downloading.', 
        variant: 'destructive' 
      })
    }
  }

  const handleApproveFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/admin/files/${fileId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({ status: 'ADMIN_APPROVED' }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Proposal approved! Student has been notified.',
        });
        loadFiles();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to approve file',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error approving file:', error);
      toast({
        title: 'Error',
        description: 'Failed to approve file',
        variant: 'destructive',
      });
    }
  };

  const handleRejectFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/admin/files/${fileId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({ status: 'ADMIN_REJECTED' }),
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'File rejected',
        });
        loadFiles();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to reject file',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error rejecting file:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject file',
        variant: 'destructive',
      });
    }
  };

  const handleApproveGroup = async (groupId: string, approve: boolean) => {
    try {
      const response = await fetch(`/api/admin/groups/${groupId}/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user?.id || ''
        },
        body: JSON.stringify({ approve })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: `Group ${approve ? 'approved' : 'rejected'} successfully`
        });
        loadGroups();
      } else {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${approve ? 'approve' : 'reject'} group`);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${approve ? 'approve' : 'reject'} group`,
        variant: "destructive"
      });
    }
  };

  // Load faculties and groups when organization or groups tab is active
  useEffect(() => {
    if (activeTab === 'organization' && user) {
      loadFaculties();
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (activeTab === 'groups' && user) {
      loadGroups();
    }
  }, [activeTab, groupStatusFilter, user]);

  useEffect(() => {
    if (activeTab === 'files' && user) {
      loadFiles();
    }
  }, [activeTab, user]);

  useEffect(() => {
    if (!liveMetricsEnabled) {
      return
    }

    // Fetch real stats from API
    const loadStats = async () => {
      try {
        const usersResponse = await fetch('/api/admin/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData);
          setStats(prev => ({ ...prev, totalUsers: usersData.length }));
        }
        
        // Load approved proposals for stats
        const approvedProjectsResponse = await fetch('/api/admin/projects/approved');
        if (approvedProjectsResponse.ok) {
          const approvedProjectsData = await approvedProjectsResponse.json();
          setStats(prev => ({ ...prev, activeProjects: approvedProjectsData.length || 0 }));
        }
        
        // Load all projects for general stats (keep existing logic)
        const projectsResponse = await fetch('/api/admin/projects');
        if (projectsResponse.ok) {
          const projectsData = await projectsResponse.json();
          // Don't set projects here - only load when projects tab is active
        } else {
          console.error('Failed to load projects');
        }
        
        const committeesResponse = await fetch('/api/admin/committees');
        if (committeesResponse.ok) {
          const committeesData = await committeesResponse.json();
          setCommittees(committeesData);
          setStats(prev => ({ ...prev, committees: committeesData.length }));
        }
        
        const announcementsResponse = await fetch('/api/announcements');
        if (announcementsResponse.ok) {
          const announcementsData = await announcementsResponse.json();
          setStats(prev => ({ ...prev, announcements: announcementsData.length }));
        }
      } catch (error) {
        console.error('Error loading stats:', error);
        setStats({
          totalUsers: null,
          activeProjects: null,
          committees: null,
          announcements: null
        });
        setUsers([]);
        setCommittees([]);
      }
    };
    
    loadStats();
  }, [liveMetricsEnabled])

  // Load approved projects when projects tab is active
  useEffect(() => {
    if (activeTab === 'projects' && user) {
      loadApprovedProjects();
      loadTeacherComposedProjects();
      loadStudentProposedProjects();
    }
  }, [activeTab, user])

  // Load committee heads and teachers when dialog opens
  useEffect(() => {
    if (isAddCommitteeDialogOpen) {
      loadCommitteeHeads();
      loadTeachers();
      if (faculties.length === 0) {
        loadFaculties();
      }
    }
  }, [isAddCommitteeDialogOpen])

  // Filter users based on search and multiple filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchUserQuery.toLowerCase())
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter
    const matchesStatus = statusFilter === 'ALL' || (user.status || 'PENDING') === statusFilter
    const matchesDepartment = departmentFilter === 'ALL' || user.department === departmentFilter
    return matchesSearch && matchesRole && matchesStatus && matchesDepartment
  })

  const getRoleBadge = (role: string) => {
    const roleColors = {
      'ADMIN': 'bg-red-500',
      'COMMITTEE_HEAD': 'bg-purple-500',
      'TEACHER': 'bg-blue-500',
      'STUDENT': 'bg-green-500'
    }
    return (
      <Badge className={roleColors[role as keyof typeof roleColors] || 'bg-gray-500'}>
        {role.replace('_', ' ')}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: string, className: string }> = {
      'APPROVED': { variant: 'default', className: 'bg-green-500' },
      'PENDING': { variant: 'secondary', className: 'bg-yellow-500' },
      'REJECTED': { variant: 'destructive', className: 'bg-red-500' }
    }
    const statusConfig = statusMap[status] || statusMap['PENDING']
    return (
      <Badge variant={statusConfig.variant as any} className={statusConfig.className}>
        {status}
      </Badge>
    )
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const activeSidebarItem = sidebarItems.find(item => item.id === activeTab)

  // Sidebar content component for reuse in both desktop sidebar and mobile drawer
  const SidebarContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header Section */}
      <div className="p-3 sm:p-4 flex-shrink-0">
        <div className="flex items-center space-x-2 mb-4 sm:mb-5">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-200">
            <img src="/hamdard-logo.png" alt="Hamdard" className="w-6 h-6 object-contain" />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-gray-900">FYP Portal</h1>
            <p className="text-xs text-gray-500">Admin Console</p>
          </div>
        </div>
      </div>

      {/* Scrollable Navigation */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <nav className="space-y-1 px-3 sm:px-4 pb-2">
          {sidebarItems.map(item => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'jury') {
                    window.location.href = '/admin/jury-management'
                  } else if (item.id === 'announcements') {
                    window.location.href = '/super-admin/announcements'
                  } else {
                    setActiveTab(item.id)
                  }
                  onItemClick?.()
                }}
                className={`w-full flex items-center space-x-2 px-2 sm:px-3 py-2 rounded-lg transition-colors text-left ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs sm:text-sm">{item.label}</p>
                  <p className="text-xs text-gray-500 truncate">{item.description}</p>
                </div>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Fixed Footer */}
      <div className="p-3 sm:p-4 border-t border-gray-200 flex-shrink-0 bg-white">
        <div className="flex items-center space-x-2 px-2 sm:px-3 py-2">
          <div className="w-8 h-8 bg-gray-300 rounded-full overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
            {user?.profileImage ? (
              <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Users className="w-4 h-4 text-gray-500" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{user?.name || 'Admin'}</p>
            <p className="text-xs text-gray-500">Administrator</p>
          </div>
        </div>
        <Button 
          className="w-full mt-2 sm:mt-3 flex items-center justify-center space-x-2 h-8 sm:h-9 text-xs sm:text-sm"
          variant="outline"
          onClick={handleLogout}
        >
          <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white shadow-lg flex-col h-screen sticky top-0 overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* Main Area */}
      <div className="flex-1 w-full min-w-0 flex flex-col min-h-screen">
        <header className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0 sticky top-0 z-30">
          <div className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 flex items-center justify-between">
            {/* Mobile Menu Button */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden mr-2 h-8 w-8">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SidebarContent onItemClick={() => {
                  // Close the sheet after clicking an item
                  const closeButton = document.querySelector('[data-sheet-close]') as HTMLButtonElement
                  closeButton?.click()
                }} />
              </SheetContent>
            </Sheet>

            <div className="flex-1 min-w-0">
              <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900 truncate">
                {activeSidebarItem?.label || 'Admin Dashboard'}
              </h2>
              <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 hidden sm:block truncate">
                {activeSidebarItem?.description || 'System administration and oversight'}
              </p>
            </div>
            <div className="flex items-center space-x-2 relative z-40">
              <NotificationsPanel />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-5 pb-6">
          <Tabs value={activeTab} onValueChange={(value) => {
            if (value === 'jury') {
              window.location.href = '/admin/jury-management'
            } else if (value === 'announcements') {
              window.location.href = '/super-admin/announcements'
            } else {
              setActiveTab(value)
            }
          }} className="space-y-4">
            {/* Responsive grid tabs */}
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-9 mb-4 h-auto gap-1.5 sm:gap-2 p-1">
              <TabsTrigger value="overview" className="text-xs sm:text-sm py-1.5 sm:py-2 px-2">Overview</TabsTrigger>
              <TabsTrigger value="users" className="text-xs sm:text-sm py-1.5 sm:py-2 px-2">Users</TabsTrigger>
              <TabsTrigger value="jury" className="text-xs sm:text-sm py-1.5 sm:py-2 px-2">Jury</TabsTrigger>
              <TabsTrigger value="projects" className="text-xs sm:text-sm py-1.5 sm:py-2 px-2">Projects</TabsTrigger>
              <TabsTrigger value="organization" className="text-xs sm:text-sm py-1.5 sm:py-2 px-2">
                <span className="hidden lg:inline">Organization</span>
                <span className="lg:hidden">Org</span>
              </TabsTrigger>
              <TabsTrigger value="groups" className="text-xs sm:text-sm py-1.5 sm:py-2 px-2">Groups</TabsTrigger>
              <TabsTrigger value="policy-submissions" className="text-xs sm:text-sm py-1.5 sm:py-2 px-2">
                Submissions
              </TabsTrigger>
              <TabsTrigger value="files" className="text-xs sm:text-sm py-1.5 sm:py-2 px-2">Files</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs sm:text-sm py-1.5 sm:py-2 px-2">Settings</TabsTrigger>
            </TabsList>
            
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 sm:space-y-5">
            <section>
              <h3 className="text-xs sm:text-sm md:text-base font-semibold text-gray-900 mb-2 sm:mb-3">Overview</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
                {[
                  { label: 'Total Users', key: 'totalUsers' as const, description: 'Registered users', icon: Users, color: 'bg-blue-500' },
                  { label: 'Active Projects', key: 'activeProjects' as const, description: 'Ongoing FYPs', icon: FolderOpen, color: 'bg-green-500' },
                  { label: 'Committees', key: 'committees' as const, description: 'Active committees', icon: Users2, color: 'bg-purple-500' },
                  { label: 'Announcements', key: 'announcements' as const, description: 'System announcements', icon: Bell, color: 'bg-orange-500' }
                ].map((card) => {
                  const value = getMetricValue(card.key)
                  const displayValue = value
                  const Icon = card.icon
                  return (
                    <div key={card.label} className="block h-full">
                      <Card className="relative h-full flex flex-col overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                        <CardHeader className="pb-2 flex-grow pl-2.5 sm:pl-3 md:pl-4 pr-2.5 sm:pr-3 pt-2.5 sm:pt-3 md:pt-4">
                          <div className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 ${card.color} rounded-lg flex items-center justify-center mb-1.5 sm:mb-2 shadow-inner`}>
                            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-white" />
                          </div>
                          <CardTitle className="text-xs sm:text-sm md:text-base leading-tight">{card.label}</CardTitle>
                          <p className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mt-1">{displayValue ?? '—'}</p>
                        </CardHeader>
                        <CardContent className="pt-0 pb-2 sm:pb-3 pl-2.5 sm:pl-3 md:pl-4 pr-2.5 sm:pr-3 text-[10px] sm:text-xs text-gray-600">
                          {card.description}
                        </CardContent>
                      </Card>
                    </div>
                  )
                })}
              </div>
            </section>

            <section>
              <h3 className="text-xs sm:text-sm md:text-base font-semibold text-gray-900 mb-2 sm:mb-3">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
                {[
                  { label: 'Manage Users', description: 'View and approve accounts', icon: Users, color: 'bg-blue-500', gradient: 'from-blue-500 to-blue-600', action: 'manageUsers', stat: stats.totalUsers, statLabel: 'Total Users' },
                  { label: 'Committees', description: 'Configure committees', icon: Users2, color: 'bg-green-500', gradient: 'from-green-500 to-green-600', action: 'committeeManagement', stat: stats.committees, statLabel: 'Active Committees' },
                  { label: 'Review Projects', description: 'Track project progress', icon: FolderOpen, color: 'bg-purple-500', gradient: 'from-purple-500 to-purple-600', action: 'reviewProjects', stat: stats.activeProjects, statLabel: 'Active Projects' },
                  { label: 'Database Backup', description: 'Secure your data', icon: Database, color: 'bg-orange-500', gradient: 'from-orange-500 to-orange-600', action: 'databaseBackup' }
                ].map((quickAction) => {
                  const Icon = quickAction.icon
                  return (
                    <div key={quickAction.label} className="block h-full">
                      <Card
                        onClick={() => handleQuickAction(quickAction.action as any)}
                        className="group relative h-full flex flex-col overflow-hidden border-2 border-transparent bg-gradient-to-br from-white to-gray-50 shadow-md hover:shadow-lg hover:border-gray-200 transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5"
                      >
                        <CardHeader className="pb-2 flex-grow pt-2.5 sm:pt-3 md:pt-4 px-2.5 sm:px-3 md:px-4">
                          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                            <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br ${quickAction.gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                              <Icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                            </div>
                            {quickAction.stat !== undefined && (
                              <div className="text-right">
                                <div className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r ${quickAction.gradient} bg-clip-text text-transparent">
                                  {quickAction.stat ?? '—'}
                                </div>
                                <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5">
                                  {quickAction.statLabel}
                                </div>
                              </div>
                            )}
                          </div>
                          <CardTitle className="text-xs sm:text-sm md:text-base font-semibold text-gray-800 leading-tight">{quickAction.label}</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 pb-2 sm:pb-3 px-2.5 sm:px-3 md:px-4">
                          <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 leading-relaxed">{quickAction.description}</p>
                          <div className="mt-1.5 sm:mt-2 flex items-center text-[10px] sm:text-xs md:text-sm font-medium text-blue-600 group-hover:text-blue-700">
                            <span>Open</span>
                            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )
                })}
              </div>
            </section>
          </TabsContent>

            {/* Manage Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
                  <div>
                    <CardTitle className="text-sm sm:text-base md:text-lg lg:text-xl">User Management</CardTitle>
                    <CardDescription className="text-[10px] sm:text-xs md:text-sm mt-0.5">
                      Manage all system users and their permissions
                    </CardDescription>
                  </div>
                  <Button className="bg-green-600 hover:bg-green-700 w-full sm:w-auto text-xs sm:text-sm h-7 sm:h-8 md:h-9 px-2 sm:px-3 md:px-4" onClick={() => {
                    setSelectedUser({
                      name: '',
                      email: '',
                      role: 'STUDENT',
                      department: 'Computer Science'
                    })
                    setIsAddUserDialogOpen(true)
                  }}>
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Add User</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 pt-0">
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6">
                  <div className="flex-1 relative">
                    <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search users by name or email..."
                      value={searchUserQuery}
                      onChange={(e) => setSearchUserQuery(e.target.value)}
                      className="pl-8 sm:pl-10 h-8 sm:h-9 md:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-full sm:w-36 md:w-40 lg:w-48 h-8 sm:h-9 md:h-10 text-xs sm:text-sm">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Roles</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="COMMITTEE_HEAD">Committee Head</SelectItem>
                      <SelectItem value="TEACHER">Teacher</SelectItem>
                      <SelectItem value="STUDENT">Student</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-36 md:w-40 lg:w-48 h-8 sm:h-9 md:h-10 text-xs sm:text-sm">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-full sm:w-36 md:w-40 lg:w-48 h-8 sm:h-9 md:h-10 text-xs sm:text-sm">
                      <SelectValue placeholder="Filter by department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Departments</SelectItem>
                      <SelectItem value="Computer Science">Computer Science</SelectItem>
                      <SelectItem value="Software Engineering">Software Engineering</SelectItem>
                      <SelectItem value="Administration">Administration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Users Table */}
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm">User</TableHead>
                        <TableHead className="text-xs sm:text-sm">Role</TableHead>
                        <TableHead className="text-xs sm:text-sm">Status</TableHead>
                        <TableHead className="text-xs sm:text-sm">GPA / Employee ID</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden md:table-cell">Department</TableHead>
                        <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Joined Date</TableHead>
                        <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="py-2 sm:py-3">
                            <div>
                              <div className="font-medium text-xs sm:text-sm">{user.name}</div>
                              <div className="text-[10px] sm:text-xs text-gray-500 truncate max-w-[150px] sm:max-w-none">{user.email}</div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 sm:py-3">
                            {getRoleBadge(user.role)}
                          </TableCell>
                          <TableCell className="py-2 sm:py-3">
                            {getStatusBadge(user.status || 'PENDING')}
                          </TableCell>
                          <TableCell className="py-2 sm:py-3 text-xs sm:text-sm">
                            {user.role === 'TEACHER' || user.role === 'COMMITTEE_HEAD' ? (
                              user.teacherProfile?.employeeId || 'N/A'
                            ) : (
                              typeof user.gpa === 'number' ? user.gpa.toFixed(2) : 'N/A'
                            )}
                          </TableCell>
                          <TableCell className="py-2 sm:py-3 text-xs sm:text-sm hidden md:table-cell">
                            {user.department || 'N/A'}
                          </TableCell>
                          <TableCell className="py-2 sm:py-3 text-xs sm:text-sm hidden lg:table-cell">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="py-2 sm:py-3">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 p-0">
                                  <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                  setSelectedUser(user)
                                  setIsViewUserDialogOpen(true)
                                }}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setSelectedUser(user)
                                  setIsEditUserDialogOpen(true)
                                }}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {user.status !== 'APPROVED' && (
                                  <DropdownMenuItem 
                                    onClick={() => handleApproveRejectUser(user.id, 'approve')}
                                    className="text-green-600"
                                  >
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Activate Account
                                  </DropdownMenuItem>
                                )}
                                {user.status === 'APPROVED' && (
                                  <DropdownMenuItem 
                                    onClick={() => handleApproveRejectUser(user.id, 'reject')}
                                    className="text-orange-600"
                                  >
                                    <UserX className="mr-2 h-4 w-4" />
                                    Deactivate Account
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem 
                                      onSelect={(e) => e.preventDefault()}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete User
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete User</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete this user? This action cannot be undone and will permanently remove the user and all associated data.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Review Projects Tab */}
          <TabsContent value="projects">
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">Review Projects</h3>
                  <p className="text-[10px] sm:text-xs md:text-sm text-gray-600 mt-0.5">Projects taken by students</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial">
                    <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search projects..."
                      value={projectSearchQuery}
                      onChange={(e) => setProjectSearchQuery(e.target.value)}
                      className="pl-8 sm:pl-10 w-full sm:w-48 md:w-64 h-8 sm:h-9 md:h-10 text-xs sm:text-sm"
                    />
                  </div>
                  <Select value={projectStatusFilter} onValueChange={setProjectStatusFilter}>
                    <SelectTrigger className="w-full sm:w-36 md:w-40 lg:w-48 h-8 sm:h-9 md:h-10 text-xs sm:text-sm">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Status</SelectItem>
                      <SelectItem value="PROPOSED">Proposed</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {loadingProjects ? (
                <div className="flex items-center justify-center py-6 sm:py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-green-600 mx-auto mb-3 sm:mb-4"></div>
                    <p className="text-xs sm:text-sm text-gray-600">Loading projects...</p>
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm">Proposal Title</TableHead>
                            <TableHead className="text-xs sm:text-sm">Students</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden md:table-cell">Supervisor</TableHead>
                            <TableHead className="text-xs sm:text-sm">Status</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Weekly Reports</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Submitted Date</TableHead>
                            <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {projects.length === 0 && !loadingProjects ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-muted-foreground py-6 sm:py-8 text-xs sm:text-sm">
                                No approved projects found
                              </TableCell>
                            </TableRow>
                          ) : (
                            projects
                              .filter((project: any) => {
                                const matchesSearch = project.proposalTitle?.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                                                     project.proposalDescription?.toLowerCase().includes(projectSearchQuery.toLowerCase()) ||
                                                     project.projectTitle?.toLowerCase().includes(projectSearchQuery.toLowerCase());
                                const matchesStatus = projectStatusFilter === 'ALL' || project.projectStatus === projectStatusFilter;
                                return matchesSearch && matchesStatus;
                              })
                              .map((project: any) => (
                              <TableRow key={project.id} className="hover:bg-gray-50">
                                <TableCell className="font-medium py-2 sm:py-3">
                                  <div>
                                    <div className="font-semibold text-xs sm:text-sm">{project.proposalTitle || project.title || 'Untitled'}</div>
                                    {project.projectTitle && project.projectTitle !== project.proposalTitle && (
                                      <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5">Project: {project.projectTitle}</div>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="py-2 sm:py-3 text-xs sm:text-sm">
                                  <div className="max-w-[120px] sm:max-w-none truncate">
                                    {project.group?.members?.map((member: any) => member.user?.name || member.name).join(', ') || project.submittedBy?.name || 'No students'}
                                  </div>
                                </TableCell>
                                <TableCell className="py-2 sm:py-3 text-xs sm:text-sm hidden md:table-cell">
                                  {project.supervisor?.name || project.teacher?.name || 'No supervisor'}
                                </TableCell>
                                <TableCell className="py-2 sm:py-3">
                                  <Badge variant={
                                    project.status === 'FYP_I' || project.status === 'IN_PROGRESS' ? 'secondary' : 
                                    project.status === 'FYP_II' ? 'default' : 
                                    project.status === 'COMPLETED' ? 'default' : 'outline'
                                  } className="text-[10px] sm:text-xs">
                                    {project.status === 'FYP_I' ? 'FYP I' :
                                     project.status === 'FYP_II' ? 'FYP II' :
                                     project.status === 'IN_PROGRESS' ? 'In Progress' :
                                     project.status === 'COMPLETED' ? 'Completed' :
                                     'Approved'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="py-2 sm:py-3 hidden lg:table-cell">
                                  {project.weeklyReports && project.weeklyReports.length > 0 ? (
                                    <div className="space-y-1">
                                      <Badge variant="outline" className="bg-blue-50 text-[10px] sm:text-xs">
                                        {project.weeklyReports.length} Report{project.weeklyReports.length !== 1 ? 's' : ''}
                                      </Badge>
                                      <div className="text-[10px] sm:text-xs text-gray-500">
                                        Latest: Week {project.weeklyReports[0]?.week || 'N/A'}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] sm:text-xs text-gray-400">No reports yet</span>
                                  )}
                                </TableCell>
                                <TableCell className="py-2 sm:py-3 text-xs sm:text-sm hidden lg:table-cell">
                                  <div>{new Date(project.submittedDate || project.createdAt).toLocaleDateString()}</div>
                                  {project.approvedDate && (
                                    <div className="text-[10px] sm:text-xs text-gray-500">Approved: {new Date(project.approvedDate).toLocaleDateString()}</div>
                                  )}
                                </TableCell>
                                <TableCell className="py-2 sm:py-3">
                                  <div className="flex space-x-1 sm:space-x-2">
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleViewProject(project)}
                                      className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3"
                                    >
                                      <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                      <span className="hidden sm:inline">View</span>
                                      <span className="sm:hidden">V</span>
                                    </Button>
                                    {project.fileUrl && (
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3"
                                        onClick={() => window.open(project.fileUrl, '_blank')}
                                      >
                                        <Download className="w-4 h-4" />
                                      </Button>
                                    )}
                                    <AlertDialog open={isDeleteProjectDialogOpen && projectToDelete?.id === project.id} onOpenChange={(open) => {
                                      if (!open) {
                                        setIsDeleteProjectDialogOpen(false);
                                        setProjectToDelete(null);
                                      }
                                    }}>
                                      <AlertDialogTrigger asChild>
                                        <Button 
                                          size="sm" 
                                          variant="outline"
                                          className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                                          onClick={() => {
                                            setProjectToDelete(project);
                                            setIsDeleteProjectDialogOpen(true);
                                          }}
                                        >
                                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Delete Project</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Are you sure you want to delete "{project.proposalTitle || project.title}"? This action cannot be undone.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel onClick={() => {
                                            setIsDeleteProjectDialogOpen(false);
                                            setProjectToDelete(null);
                                          }}>Cancel</AlertDialogCancel>
                                          <AlertDialogAction 
                                            onClick={() => handleDeleteProject(project.id)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            Delete
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Teacher-Composed Projects Section */}
              <Card className="mt-4 sm:mt-6">
                <CardHeader className="p-3 sm:p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
                    <div>
                      <CardTitle className="text-sm sm:text-base md:text-lg lg:text-xl">Teacher-Composed Project Ideas</CardTitle>
                      <CardDescription className="text-[10px] sm:text-xs md:text-sm mt-0.5">
                        Projects and ideas proposed by teachers
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingTeacherProjects ? (
                    <div className="flex items-center justify-center py-6 sm:py-8">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-green-600 mx-auto mb-3 sm:mb-4"></div>
                        <p className="text-xs sm:text-sm text-gray-600">Loading teacher-composed projects...</p>
                      </div>
                    </div>
                  ) : teacherComposedProjects.length === 0 ? (
                    <div className="p-6 sm:p-8 text-center">
                      <p className="text-xs sm:text-sm text-gray-500">No teacher-composed projects available</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm">Project Title</TableHead>
                            <TableHead className="text-xs sm:text-sm">Teacher</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden md:table-cell">Department</TableHead>
                            <TableHead className="text-xs sm:text-sm">Status</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Created Date</TableHead>
                            <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teacherComposedProjects.map((project: any) => (
                            <TableRow key={project.id}>
                              <TableCell className="py-2 sm:py-3 text-xs sm:text-sm">
                                <div className="font-medium">{project.title || 'Untitled'}</div>
                                {project.description && (
                                  <div className="text-[10px] sm:text-xs text-gray-500 mt-1 line-clamp-2">
                                    {project.description.substring(0, 100)}...
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="py-2 sm:py-3 text-xs sm:text-sm">
                                {project.teacher?.name || 'Unknown'}
                              </TableCell>
                              <TableCell className="py-2 sm:py-3 text-xs sm:text-sm hidden md:table-cell">
                                {project.teacher?.department || 'N/A'}
                              </TableCell>
                              <TableCell className="py-2 sm:py-3">
                                <Badge 
                                  variant={project.status === 'PROPOSED' ? 'secondary' : 'default'} 
                                  className="text-[10px] sm:text-xs"
                                >
                                  {project.status === 'PROPOSED' ? 'Available' : project.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2 sm:py-3 text-xs sm:text-sm hidden lg:table-cell">
                                {new Date(project.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="py-2 sm:py-3">
                                <div className="flex space-x-1 sm:space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleViewProject(project)}
                                    className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3"
                                  >
                                    <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                    <span className="hidden sm:inline">View</span>
                                    <span className="sm:hidden">V</span>
                                  </Button>
                                  <AlertDialog open={isDeleteProjectDialogOpen && projectToDelete?.id === project.id} onOpenChange={(open) => {
                                    if (!open) {
                                      setIsDeleteProjectDialogOpen(false);
                                      setProjectToDelete(null);
                                    }
                                  }}>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => {
                                          setProjectToDelete(project);
                                          setIsDeleteProjectDialogOpen(true);
                                        }}
                                      >
                                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Project</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "{project.title}"? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => {
                                          setIsDeleteProjectDialogOpen(false);
                                          setProjectToDelete(null);
                                        }}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => handleDeleteProject(project.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Student-Proposed Projects Section */}
              <Card className="mt-4 sm:mt-6">
                <CardHeader className="p-3 sm:p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
                    <div>
                      <CardTitle className="text-sm sm:text-base md:text-lg lg:text-xl">Student-Proposed Project Ideas</CardTitle>
                      <CardDescription className="text-[10px] sm:text-xs md:text-sm mt-0.5">
                        Projects and ideas proposed by students
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {loadingStudentProjects ? (
                    <div className="flex items-center justify-center py-6 sm:py-8">
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-green-600 mx-auto mb-3 sm:mb-4"></div>
                        <p className="text-xs sm:text-sm text-gray-600">Loading student-proposed projects...</p>
                      </div>
                    </div>
                  ) : studentProposedProjects.length === 0 ? (
                    <div className="p-6 sm:p-8 text-center">
                      <p className="text-xs sm:text-sm text-gray-500">No student-proposed projects available</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm">Project Title</TableHead>
                            <TableHead className="text-xs sm:text-sm">Student</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden md:table-cell">Department</TableHead>
                            <TableHead className="text-xs sm:text-sm">Status</TableHead>
                            <TableHead className="text-xs sm:text-sm hidden lg:table-cell">Created Date</TableHead>
                            <TableHead className="text-xs sm:text-sm">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {studentProposedProjects.map((project: any) => (
                            <TableRow key={project.id}>
                              <TableCell className="py-2 sm:py-3 text-xs sm:text-sm">
                                <div className="font-medium">{project.title || 'Untitled'}</div>
                                {project.description && (
                                  <div className="text-[10px] sm:text-xs text-gray-500 mt-1 line-clamp-2">
                                    {project.description.substring(0, 100)}...
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="py-2 sm:py-3 text-xs sm:text-sm">
                                {project.teacher?.name || 'Unknown'}
                                {project.teacher?.rollNumber && (
                                  <div className="text-[10px] text-gray-500">Roll: {project.teacher.rollNumber}</div>
                                )}
                              </TableCell>
                              <TableCell className="py-2 sm:py-3 text-xs sm:text-sm hidden md:table-cell">
                                {project.teacher?.department || 'N/A'}
                              </TableCell>
                              <TableCell className="py-2 sm:py-3">
                                <Badge 
                                  variant={project.status === 'PROPOSED' ? 'secondary' : 'default'} 
                                  className="text-[10px] sm:text-xs"
                                >
                                  {project.status === 'PROPOSED' ? 'Available' : project.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2 sm:py-3 text-xs sm:text-sm hidden lg:table-cell">
                                {new Date(project.createdAt).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="py-2 sm:py-3">
                                <div className="flex space-x-1 sm:space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleViewProject(project)}
                                    className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3"
                                  >
                                    <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                                    <span className="hidden sm:inline">View</span>
                                    <span className="sm:hidden">V</span>
                                  </Button>
                                  <AlertDialog open={isDeleteProjectDialogOpen && projectToDelete?.id === project.id} onOpenChange={(open) => {
                                    if (!open) {
                                      setIsDeleteProjectDialogOpen(false);
                                      setProjectToDelete(null);
                                    }
                                  }}>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="h-7 sm:h-8 text-xs sm:text-sm px-2 sm:px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => {
                                          setProjectToDelete(project);
                                          setIsDeleteProjectDialogOpen(true);
                                        }}
                                      >
                                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Project</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "{project.title}"? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => {
                                          setIsDeleteProjectDialogOpen(false);
                                          setProjectToDelete(null);
                                        }}>Cancel</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => handleDeleteProject(project.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Committees Tab */}
          {/* Organization Tab - Faculties & Committees */}
          <TabsContent value="organization">
            <div className="space-y-6">
              {/* Faculties Section */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Faculty Management</CardTitle>
                      <CardDescription>
                        Manage university faculties and departments
                      </CardDescription>
                    </div>
                    <Button className="bg-green-600 hover:bg-green-700" onClick={() => {
                      setFacultyFormData({ name: '', description: '', code: '', departments: '' });
                      setIsAddFacultyDialogOpen(true);
                    }}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Faculty
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {faculties.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                              No faculties found. Add one to get started.
                            </TableCell>
                          </TableRow>
                        ) : (
                          faculties.map((faculty: any) => (
                            <TableRow key={faculty.id}>
                              <TableCell>
                                <div className="font-medium">{faculty.name}</div>
                              </TableCell>
                              <TableCell>{faculty.code || 'N/A'}</TableCell>
                              <TableCell>
                                <div className="text-sm text-gray-600 max-w-md truncate">
                                  {faculty.description || 'No description'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={faculty.isActive ? 'bg-green-500' : 'bg-gray-500'}>
                                  {faculty.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => {
                                      setSelectedFaculty(faculty);
                                      setFacultyFormData({
                                        name: faculty.name,
                                        description: faculty.description || '',
                                        code: faculty.code || '',
                                        departments: faculty.departments || ''
                                      });
                                      setIsEditFacultyDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Faculty</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete this faculty? This action cannot be undone and will remove all associated departments and data.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction 
                                          onClick={() => handleDeleteFaculty(faculty.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Committees Section */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Committee Management</CardTitle>
                      <CardDescription>
                        Manage FYP committees and their members
                      </CardDescription>
                    </div>
                    <Button 
                      type="button"
                      className="bg-green-600 hover:bg-green-700" 
                      onClick={handleOpenCreateCommitteeDialog}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Committee
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Committee</TableHead>
                          <TableHead>Head</TableHead>
                          <TableHead>Members</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {committees.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                              No committees found. Create one to get started.
                            </TableCell>
                          </TableRow>
                        ) : (
                          committees.map((committee) => (
                          <TableRow key={committee.id}>
                            <TableCell>
                              <div className="font-medium">{committee.name}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                  <Users className="h-4 w-4" />
                                </div>
                                <div>
                                  <div className="font-medium">
                                    {typeof committee.head === 'string' 
                                      ? committee.head 
                                      : committee.head?.name || committee.headDetails?.name || 'Unknown'}
                                  </div>
                                  <div className="text-sm text-gray-500">Committee Head</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {committee.members && Array.isArray(committee.members) ? (
                                  committee.members.length > 0 ? (
                                    committee.members.map((member, index) => (
                                      <div key={index} className="text-sm">
                                        {typeof member === 'string' ? member : member?.name || 'Unknown'}
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-sm text-gray-400">No members</span>
                                  )
                                ) : (
                                  <span className="text-sm text-gray-400">No members</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={committee.status === 'Active' ? 'bg-green-500' : 'bg-gray-500'}>
                                {committee.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {committee.created}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button size="sm" variant="outline" onClick={() => handleViewCommittee(committee)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleEditCommittee(committee)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the committee.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteCommittee(committee.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Group Approvals Tab */}
          <TabsContent value="groups">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Group Approvals</CardTitle>
                    <CardDescription>
                      Review and approve student groups for FYP projects
                    </CardDescription>
                  </div>
                  <Select value={groupStatusFilter} onValueChange={setGroupStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending Approval</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="all">All Groups</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {loadingGroups ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                      <p className="text-gray-600">Loading groups...</p>
                    </div>
                  </div>
                ) : groups.length === 0 ? (
                  <div className="text-center py-12">
                    <Users2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Groups Found</h3>
                    <p className="text-gray-600">
                      {groupStatusFilter === 'pending' && 'No groups are pending approval'}
                      {groupStatusFilter === 'approved' && 'No groups have been approved yet'}
                      {groupStatusFilter === 'all' && 'No active groups in the system'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groups.map((group: any) => (
                      <Card key={group.id} className="border-2">
                        <CardContent className="pt-6">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-4">
                                <h3 className="text-lg font-semibold">{group.name}</h3>
                                <Badge className={group.isApproved ? 'bg-green-500' : 'bg-yellow-500'}>
                                  {group.isApproved ? 'Approved' : 'Pending'}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div>
                                  <p className="text-sm text-gray-500">Members</p>
                                  <p className="font-medium">{group.members?.length || 0}/3</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Created</p>
                                  <p className="font-medium">{new Date(group.createdAt).toLocaleDateString()}</p>
                                </div>
                                {group.isApproved && group.approvedAt && (
                                  <div>
                                    <p className="text-sm text-gray-500">Approved</p>
                                    <p className="font-medium">{new Date(group.approvedAt).toLocaleDateString()}</p>
                                  </div>
                                )}
                              </div>

                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-2">Group Members:</p>
                                <div className="space-y-2">
                                  {group.members?.map((member: any) => (
                                    <div key={member.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                      <div className="flex items-center space-x-3 flex-1">
                                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                          <span className="text-sm font-medium text-blue-700">
                                            {member.user?.name?.charAt(0) || 'U'}
                                          </span>
                                        </div>
                                        <div className="flex-1">
                                          <p className="text-sm font-medium">{member.user?.name}</p>
                                          <p className="text-xs text-gray-500">
                                            {member.user?.rollNumber} • {member.user?.department}
                                          </p>
                                        </div>
                                        {member.role === 'LEADER' && (
                                          <Badge variant="secondary" className="text-xs">Leader</Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setSelectedStudent(member.user);
                                            setIsStudentDetailsOpen(true);
                                          }}
                                          className="h-8"
                                        >
                                          <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => handleRemoveStudentClick(group.id, member.user)}
                                          disabled={removingStudentId === member.user.id}
                                          className="h-8"
                                        >
                                          {removingStudentId === member.user.id ? (
                                            <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
                                          ) : (
                                            <UserX className="h-3 w-3 sm:h-4 sm:w-4" />
                                          )}
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col gap-2 ml-4">
                              {!group.isApproved && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleApproveGroup(group.id, true)}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleApproveGroup(group.id, false)}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setGroupToDelete(group);
                                  setIsDeleteGroupDialogOpen(true);
                                }}
                                disabled={deletingGroupId === group.id}
                                className="mt-2"
                              >
                                {deletingGroupId === group.id ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Deleting...
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Group
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Student Details Dialog */}
          <Dialog open={isStudentDetailsOpen} onOpenChange={setIsStudentDetailsOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Student Details</DialogTitle>
                <DialogDescription>
                  View complete information about this student
                </DialogDescription>
              </DialogHeader>
              {selectedStudent && (
                <StudentDetailsContent student={selectedStudent} />
              )}
            </DialogContent>
          </Dialog>

          {/* Delete Group Confirmation Dialog */}
          <AlertDialog open={isDeleteGroupDialogOpen} onOpenChange={setIsDeleteGroupDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Group</AlertDialogTitle>
                <AlertDialogDescription>
                  {groupToDelete && (
                    <div className="space-y-4 mt-4">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                            <Users2 className="w-6 h-6 text-red-700" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">{groupToDelete.name}</h3>
                            <p className="text-sm text-gray-500">
                              {groupToDelete.members?.length || 0} member(s)
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-red-800 font-medium mb-2">
                          Are you sure you want to delete this group?
                        </p>
                        <p className="text-sm text-red-700">
                          This action will:
                        </p>
                        <ul className="text-sm text-red-700 list-disc list-inside mt-2 space-y-1">
                          <li>Remove all members from the group</li>
                          <li>Delete all associated group requests</li>
                          <li>Notify all group members about the deletion</li>
                          <li>This action cannot be undone</li>
                        </ul>
                        {groupToDelete.members && groupToDelete.members.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-red-200">
                            <p className="text-xs font-medium text-red-800 mb-2">Group Members:</p>
                            <div className="space-y-1">
                              {groupToDelete.members.map((member: any) => (
                                <p key={member.id} className="text-xs text-red-700">
                                  • {member.user?.name} ({member.user?.rollNumber})
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => {
                  setIsDeleteGroupDialogOpen(false);
                  setGroupToDelete(null);
                }}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteGroup}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete Group
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Remove Student Confirmation Dialog */}
          <AlertDialog open={isRemoveStudentDialogOpen} onOpenChange={setIsRemoveStudentDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove Student from Group</AlertDialogTitle>
                <AlertDialogDescription>
                  {studentToRemove && (
                    <div className="space-y-4 mt-4">
                      <div className="flex items-center space-x-4">
                        <Avatar className="w-16 h-16">
                          <AvatarImage 
                            src={studentToRemove.student.profileImage || ''} 
                            alt={studentToRemove.student.name} 
                          />
                          <AvatarFallback className="bg-red-100 text-red-700 text-xl">
                            {studentToRemove.student.name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-lg font-semibold">{studentToRemove.student.name}</h3>
                          <p className="text-sm text-gray-500">{studentToRemove.student.email}</p>
                          {studentToRemove.student.rollNumber && (
                            <p className="text-xs text-gray-400 mt-1">
                              {studentToRemove.student.rollNumber} • {studentToRemove.student.department}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-800">
                          Are you sure you want to remove <strong>{studentToRemove.student.name}</strong> from this group? 
                          This action cannot be undone.
                        </p>
                        {studentToRemove && groups.find((g: any) => g.id === studentToRemove.groupId)?.members?.length <= 2 && (
                          <p className="text-xs text-red-700 mt-2 font-medium">
                            ⚠️ Warning: Removing this student will deactivate the group as it will have less than 2 members.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => {
                  setIsRemoveStudentDialogOpen(false);
                  setStudentToRemove(null);
                }}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRemoveStudent}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Remove Student
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* File Tracking Tab */}
          <TabsContent value="files">
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                <div>
                  <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900">File Uploads</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Manage all student file submissions</p>
                </div>
                <Badge variant="outline" className="text-[11px] sm:text-xs md:text-sm px-2 sm:px-3 py-1 sm:py-1.5">
                  {uploadedFiles.length} Files
                </Badge>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
                <div className="flex-1 min-w-full sm:min-w-[200px]">
                  <Label className="text-[11px] sm:text-xs md:text-sm mb-1">Search Files</Label>
                  <div className="relative">
                    <Search className="absolute left-2 sm:left-3 top-2 sm:top-2.5 sm:top-3 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search files..."
                      value={fileSearchQuery}
                      onChange={(e) => setFileSearchQuery(e.target.value)}
                      className="pl-8 sm:pl-10 h-8 sm:h-9 md:h-10 text-xs sm:text-sm"
                    />
                  </div>
                </div>
                <div className="w-full sm:w-auto min-w-[150px]">
                  <Label className="text-[11px] sm:text-xs md:text-sm mb-1">File Type</Label>
                  <Select value={fileTypeFilter} onValueChange={setFileTypeFilter}>
                    <SelectTrigger className="w-full sm:w-[150px] h-8 sm:h-9 md:h-10 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Types</SelectItem>
                      <SelectItem value="PROPOSAL">Proposal</SelectItem>
                      <SelectItem value="REPORT">Report</SelectItem>
                      <SelectItem value="DOCUMENTATION">Documentation</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-full sm:w-auto min-w-[150px]">
                  <Label className="text-[11px] sm:text-xs md:text-sm mb-1">Department</Label>
                  <Select value={fileDepartmentFilter} onValueChange={setFileDepartmentFilter}>
                    <SelectTrigger className="w-full sm:w-[150px] h-8 sm:h-9 md:h-10 text-xs sm:text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Departments</SelectItem>
                      <SelectItem value="Computer Science">Computer Science</SelectItem>
                      <SelectItem value="Software Engineering">Software Engineering</SelectItem>
                      <SelectItem value="Administration">Administration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Files Table */}
              {loadingFiles ? (
                <div className="flex items-center justify-center py-6 sm:py-8">
                  <div className="text-xs sm:text-sm text-muted-foreground">Loading files...</div>
                </div>
              ) : uploadedFiles.length === 0 ? (
                <Card>
                  <CardContent className="py-6 sm:py-8">
                    <div className="text-center text-muted-foreground">
                      <FileText className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-xs sm:text-sm">No files uploaded yet</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0 sm:p-4 md:p-6">
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap">File</TableHead>
                            <TableHead className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap hidden sm:table-cell">Student</TableHead>
                            <TableHead className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap hidden md:table-cell">Project</TableHead>
                            <TableHead className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap hidden lg:table-cell">Uploaded</TableHead>
                            <TableHead className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap">Status</TableHead>
                            <TableHead className="text-[11px] sm:text-xs md:text-sm whitespace-nowrap">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {uploadedFiles.filter(file => {
                            const matchesSearch = (file.fileName || file.originalName || '').toLowerCase().includes(fileSearchQuery.toLowerCase()) ||
                              (file.studentName || '').toLowerCase().includes(fileSearchQuery.toLowerCase()) ||
                              (file.projectTitle || '').toLowerCase().includes(fileSearchQuery.toLowerCase())
                            const matchesType = fileTypeFilter === 'ALL' || (file.fileType || '').includes(fileTypeFilter)
                            const matchesDept = fileDepartmentFilter === 'ALL' || file.department === fileDepartmentFilter
                            return matchesSearch && matchesType && matchesDept
                          }).map((file) => {
                            const isApproved = file.status === 'COMMITTEE_APPROVED' || file.status === 'ADMIN_APPROVED';
                            let projectDisplay = '';
                            if ((file.fileType && file.fileType.toUpperCase() === 'PROOF') || file.projectTitle === 'No Project') {
                              projectDisplay = 'Proof Submission';
                            } else if (file.fileType && file.fileType.toUpperCase() === 'PROPOSAL' && file.groupName && file.groupName !== 'No Group') {
                              projectDisplay = `Proposal - ${file.groupName}`;
                            } else {
                              projectDisplay = file.projectTitle || 'N/A';
                            }
                            return (
                              <TableRow key={file.id}>
                                <TableCell className="text-xs sm:text-sm">
                                  <div className="font-medium truncate max-w-[120px] sm:max-w-none">{file.originalName || file.fileName}</div>
                                  <div className="text-[10px] sm:text-xs text-muted-foreground">{file.fileSize}</div>
                                  <div className="sm:hidden text-[10px] text-muted-foreground mt-1">
                                    {file.studentName} • {projectDisplay}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm hidden sm:table-cell">
                                  <div className="font-medium truncate">{file.studentName}</div>
                                  <div className="text-[10px] sm:text-xs text-muted-foreground truncate">{file.studentEmail}</div>
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm hidden md:table-cell truncate max-w-[150px]">{projectDisplay}</TableCell>
                                <TableCell className="text-xs sm:text-sm hidden lg:table-cell">
                                  <div className="text-xs sm:text-sm">{file.uploadDate}</div>
                                  <div className="text-[10px] sm:text-xs text-muted-foreground">{file.uploadTime}</div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 ${
                                      file.status === 'ADMIN_APPROVED' ? 'bg-green-600' :
                                      file.status === 'COMMITTEE_APPROVED' ? 'bg-blue-600' :
                                      file.status === 'COMMITTEE_REJECTED' ? 'bg-red-600' :
                                      file.status === 'ADMIN_REJECTED' ? 'bg-red-600' :
                                      file.status === 'REJECTED' ? 'bg-red-600' :
                                      'bg-yellow-500'
                                    }`}
                                  >
                                    {file.status === 'ADMIN_APPROVED'
                                      ? 'Approved by Admin'
                                      : file.status === 'COMMITTEE_APPROVED'
                                      ? 'Approved by Committee Head'
                                      : file.status === 'COMMITTEE_REJECTED'
                                      ? 'Rejected by Committee Head'
                                      : file.status === 'ADMIN_REJECTED'
                                      ? 'Rejected by Admin'
                                      : file.status === 'REJECTED'
                                      ? 'Rejected'
                                      : 'Pending'}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex space-x-1 sm:space-x-2 flex-wrap gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedFile(file);
                                        handleViewFile(file);
                                      }}
                                      title="View"
                                      className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0"
                                    >
                                      <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const url = `/api/admin/files/${encodeURIComponent(String(file.id))}/download`;
                                        const a = document.createElement('a');
                                        a.href = url;
                                        a.download = file.originalName || file.fileName || 'download';
                                        document.body.appendChild(a);
                                        a.click();
                                        a.remove();
                                      }}
                                      title="Download"
                                      className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 p-0"
                                    >
                                      <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                                    </Button>
                                    {!isApproved && file.fileType?.toUpperCase() === 'PROPOSAL' && (
                                      <>
                                        <Button
                                          variant="default"
                                          size="sm"
                                          onClick={() => handleApproveFile(file.id)}
                                          title="Approve"
                                          className="bg-green-600 hover:bg-green-700 text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 sm:py-1.5 h-7 sm:h-8 md:h-9"
                                        >
                                          <Check className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-0.5 sm:mr-1" />
                                          <span className="hidden sm:inline">Approve</span>
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => handleRejectFile(file.id)}
                                          title="Reject"
                                          className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 sm:py-1.5 h-7 sm:h-8 md:h-9"
                                        >
                                          <X className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-0.5 sm:mr-1" />
                                          <span className="hidden sm:inline">Reject</span>
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* File Details Dialog */}
            <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {selectedFile?.fileType || 'File'} Details
                  </DialogTitle>
                  <DialogDescription>
                    View file submission details
                  </DialogDescription>
                </DialogHeader>
                {selectedFile && (
                  <div className="space-y-6 mt-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                          <User className="w-4 h-4" />
                          Submitted By
                        </div>
                        {selectedFile.studentName ? (
                          <>
                            <p className="text-sm font-semibold">{selectedFile.studentName}</p>
                            {selectedFile.studentEmail && (
                              <p className="text-xs text-gray-500">{selectedFile.studentEmail}</p>
                            )}
                            {selectedFile.studentRollNumber && (
                              <p className="text-xs text-gray-500">Roll Number: {selectedFile.studentRollNumber}</p>
                            )}
                            {selectedFile.department && (
                              <p className="text-xs text-gray-500">Department: {selectedFile.department}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm text-gray-500 italic">Not available</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                          <Calendar className="w-4 h-4" />
                          Uploaded Date
                        </div>
                        <p className="text-sm">{selectedFile.uploadDate || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{selectedFile.uploadTime || ''}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <FileText className="w-4 h-4" />
                        File Details
                      </div>
                      <div className="bg-white border rounded-lg p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedFile.projectTitle && (
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-500">Project Title</label>
                              <p className="text-sm text-gray-900">{selectedFile.projectTitle}</p>
                            </div>
                          )}
                          {selectedFile.groupName && (
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-500">Group Name</label>
                              <p className="text-sm text-gray-900">{selectedFile.groupName}</p>
                            </div>
                          )}
                          {selectedFile.fileName && (
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-500">File Name</label>
                              <p className="text-sm text-gray-900">{selectedFile.originalName || selectedFile.fileName}</p>
                            </div>
                          )}
                          {selectedFile.fileSize && (
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-500">File Size</label>
                              <p className="text-sm text-gray-900">{selectedFile.fileSize}</p>
                            </div>
                          )}
                          {selectedFile.fileType && (
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-500">File Type</label>
                              <p className="text-sm text-gray-900">{selectedFile.fileType}</p>
                            </div>
                          )}
                          {selectedFile.status && (
                            <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-500">Status</label>
                              <Badge
                                className={
                                  selectedFile.status === 'ADMIN_APPROVED' ? 'bg-green-600' :
                                  selectedFile.status === 'COMMITTEE_APPROVED' ? 'bg-blue-600' :
                                  selectedFile.status === 'COMMITTEE_REJECTED' ? 'bg-red-600' :
                                  selectedFile.status === 'ADMIN_REJECTED' ? 'bg-red-600' :
                                  selectedFile.status === 'REJECTED' ? 'bg-red-600' :
                                  'bg-yellow-500'
                                }
                              >
                                {selectedFile.status === 'ADMIN_APPROVED'
                                  ? 'Approved by Admin'
                                  : selectedFile.status === 'COMMITTEE_APPROVED'
                                  ? 'Approved by Committee Head'
                                  : selectedFile.status === 'COMMITTEE_REJECTED'
                                  ? 'Rejected by Committee Head'
                                  : selectedFile.status === 'ADMIN_REJECTED'
                                  ? 'Rejected by Admin'
                                  : selectedFile.status === 'REJECTED'
                                  ? 'Rejected'
                                  : 'Pending'}
                              </Badge>
                            </div>
                          )}
                        </div>
                        {(selectedFile.description || selectedFile.title) && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-500">Description</label>
                            {(() => {
                              try {
                                const descText = selectedFile.description || selectedFile.title || '';
                                const parsed = JSON.parse(descText);
                                if (typeof parsed === 'object' && parsed !== null) {
                                  return (
                                    <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
                                      {parsed.projectTrack && (
                                        <div className="space-y-1">
                                          <span className="text-xs font-medium text-gray-500">Project Track:</span>
                                          <p className="text-sm text-gray-900">{parsed.projectTrack}</p>
                                        </div>
                                      )}
                                      {parsed.programOfStudy && (
                                        <div className="space-y-1">
                                          <span className="text-xs font-medium text-gray-500">Program of Study:</span>
                                          <p className="text-sm text-gray-900">{parsed.programOfStudy}</p>
                                        </div>
                                      )}
                                      {parsed.session && (
                                        <div className="space-y-1">
                                          <span className="text-xs font-medium text-gray-500">Session:</span>
                                          <p className="text-sm text-gray-900">{parsed.session}</p>
                                        </div>
                                      )}
                                      {parsed.domain && (
                                        <div className="space-y-1">
                                          <span className="text-xs font-medium text-gray-500">Domain/Area:</span>
                                          <p className="text-sm text-gray-900">{parsed.domain}</p>
                                        </div>
                                      )}
                                      {parsed.date && (
                                        <div className="space-y-1">
                                          <span className="text-xs font-medium text-gray-500">Date:</span>
                                          <p className="text-sm text-gray-900">{parsed.date}</p>
                                        </div>
                                      )}
                                      {parsed.members && Array.isArray(parsed.members) && parsed.members.length > 0 && (
                                        <div className="space-y-2">
                                          <span className="text-xs font-medium text-gray-500">Group Members:</span>
                                          <div className="space-y-2">
                                            {parsed.members.map((member: any, idx: number) => (
                                              <div key={idx} className="bg-white border rounded p-2 text-sm">
                                                <p className="font-medium">{member.name || 'N/A'}</p>
                                                {member.cmsId && <p className="text-xs text-gray-500">CMS ID: {member.cmsId}</p>}
                                                {member.email && <p className="text-xs text-gray-500">{member.email}</p>}
                                                {member.cellNumber && <p className="text-xs text-gray-500">Phone: {member.cellNumber}</p>}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                                return <p className="text-sm text-gray-900 whitespace-pre-wrap">{descText}</p>;
                              } catch {
                                return <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedFile.description || selectedFile.title}</p>;
                              }
                            })()}
                          </div>
                        )}
                        {selectedFile.fileUrl && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-500">File</label>
                            <a 
                              href={selectedFile.fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-2"
                            >
                              <FileText className="w-4 h-4" />
                              {selectedFile.originalName || selectedFile.fileName}
                            </a>
                          </div>
                        )}
                        {selectedFile.supervisorName && (
                          <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-500">Supervisor</label>
                            <p className="text-sm text-gray-900">{selectedFile.supervisorName}</p>
                            {selectedFile.supervisorEmail && (
                              <p className="text-xs text-gray-500">{selectedFile.supervisorEmail}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="policy-submissions">
            <div className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Submissions</CardTitle>
                  <CardDescription>
                    Review proof submissions and policy acknowledgments from students.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <Button className="bg-green-600 hover:bg-green-700" onClick={() => router.push('/admin/policies/submissions')}>
                      <FileCheck className="h-4 w-4 mr-2" />
                      Open Submissions
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">
                    View and manage all student form submissions, proof submissions, and policy acknowledgments.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="committees">
            <Card>
              <CardHeader>
                <CardTitle>Legacy Committee View</CardTitle>
                <CardDescription>
                  Committees have been moved to the Organization tab
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setActiveTab('organization')}>
                  Go to Organization
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Jury Management Tab - Redirects to dedicated page */}

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
              {/* Settings Tabs */}
              <Tabs value={activeSettingsTab} onValueChange={setActiveSettingsTab}>
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="account">Account</TabsTrigger>
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                  <TabsTrigger value="backup">Backup</TabsTrigger>
                  <TabsTrigger value="policies">Policies</TabsTrigger>
                </TabsList>

                {/* Account Settings */}
                <TabsContent value="account" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Account Settings</CardTitle>
                      <CardDescription>
                        Update your admin email and password
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      {/* Current Account Info */}
                      <div className="bg-gray-50 rounded-lg p-4 border">
                        <h3 className="font-semibold text-sm mb-2">Current Account Information</h3>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-gray-500">Email:</span> <span className="font-medium">{user?.email || 'N/A'}</span></p>
                          <p><span className="text-gray-500">Role:</span> <span className="font-medium">{user?.role || 'N/A'}</span></p>
                        </div>
                      </div>

                      {/* Change Email Section */}
                      <div className="space-y-4 border-t pt-6">
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Change Email</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            Update your admin email address. You will need to log in again with your new email after the change.
                          </p>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="newEmail">New Email Address</Label>
                            <Input
                              id="newEmail"
                              type="email"
                              placeholder="Enter new email address"
                              value={emailForm.newEmail}
                              onChange={(e) => setEmailForm({...emailForm, newEmail: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="emailCurrentPassword">Current Password</Label>
                            <Input
                              id="emailCurrentPassword"
                              type="password"
                              placeholder="Enter your current password"
                              value={emailForm.currentPassword}
                              onChange={(e) => setEmailForm({...emailForm, currentPassword: e.target.value})}
                            />
                          </div>
                          <Button
                            onClick={handleUpdateEmail}
                            disabled={isUpdatingEmail || !emailForm.newEmail || !emailForm.currentPassword}
                            className="w-full sm:w-auto"
                          >
                            {isUpdatingEmail ? 'Updating...' : 'Update Email'}
                          </Button>
                        </div>
                      </div>

                      {/* Change Password Section */}
                      <div className="space-y-4 border-t pt-6">
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Change Password</h3>
                          <p className="text-sm text-gray-500 mb-4">
                            Update your admin password. You will need to log in again with your new password after the change.
                          </p>
                        </div>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="passwordCurrentPassword">Current Password</Label>
                            <Input
                              id="passwordCurrentPassword"
                              type="password"
                              placeholder="Enter your current password"
                              value={passwordForm.currentPassword}
                              onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                              id="newPassword"
                              type="password"
                              placeholder="Enter new password (min. 8 characters)"
                              value={passwordForm.newPassword}
                              onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                            />
                            <p className="text-xs text-gray-500">
                              Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character.
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                              id="confirmPassword"
                              type="password"
                              placeholder="Confirm new password"
                              value={passwordForm.confirmPassword}
                              onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                            />
                          </div>
                          <Button
                            onClick={handleUpdatePassword}
                            disabled={isUpdatingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                            className="w-full sm:w-auto"
                          >
                            {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* General Settings */}
                <TabsContent value="general" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>General Settings</CardTitle>
                      <CardDescription>
                        Basic system configuration
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="systemName">System Name</Label>
                          <Input
                            id="systemName"
                            value={settings.systemName}
                            onChange={(e) => setSettings({...settings, systemName: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="universityName">University Name</Label>
                          <Input
                            id="universityName"
                            value={settings.universityName}
                            onChange={(e) => setSettings({...settings, universityName: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactEmail">Contact Email</Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          value={settings.contactEmail}
                          onChange={(e) => setSettings({...settings, contactEmail: e.target.value})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Maintenance Mode</Label>
                          <p className="text-sm text-gray-500">Temporarily disable user access</p>
                        </div>
                        <Switch
                          checked={settings.maintenanceMode}
                          onCheckedChange={(checked) => setSettings({...settings, maintenanceMode: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Allow Registration</Label>
                          <p className="text-sm text-gray-500">Enable new user registration</p>
                        </div>
                        <Switch
                          checked={settings.allowRegistration}
                          onCheckedChange={(checked) => setSettings({...settings, allowRegistration: checked})}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Security Settings */}
                <TabsContent value="security" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Security Settings</CardTitle>
                      <CardDescription>
                        Configure security and authentication options
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="minPasswordLength">Minimum Password Length</Label>
                        <Input
                          id="minPasswordLength"
                          type="number"
                          value={settings.minPasswordLength}
                          onChange={(e) => setSettings({...settings, minPasswordLength: parseInt(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sessionTimeout">Session Timeout (hours)</Label>
                        <Input
                          id="sessionTimeout"
                          type="number"
                          value={settings.sessionTimeout}
                          onChange={(e) => setSettings({...settings, sessionTimeout: parseInt(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                        <Input
                          id="maxLoginAttempts"
                          type="number"
                          value={settings.maxLoginAttempts}
                          onChange={(e) => setSettings({...settings, maxLoginAttempts: parseInt(e.target.value)})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Require Email Verification</Label>
                          <p className="text-sm text-gray-500">Force email verification for new accounts</p>
                        </div>
                        <Switch
                          checked={settings.requireEmailVerification}
                          onCheckedChange={(checked) => setSettings({...settings, requireEmailVerification: checked})}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Enable Two-Factor Authentication</Label>
                          <p className="text-sm text-gray-500">Add an extra layer of security</p>
                        </div>
                        <Switch
                          checked={settings.enableTwoFactorAuth}
                          onCheckedChange={(checked) => setSettings({...settings, enableTwoFactorAuth: checked})}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Notification Settings */}
                <TabsContent value="notifications" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Notification Settings</CardTitle>
                      <CardDescription>
                        Configure system notifications and preferences
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Email Notifications</Label>
                          <p className="text-sm text-gray-500">Send notifications via email</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {settings.emailNotifications && (
                            <Badge variant="default" className="bg-green-500">Active</Badge>
                          )}
                          <Switch
                            checked={settings.emailNotifications}
                            onCheckedChange={(checked) => setSettings({...settings, emailNotifications: checked})}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>SMS Notifications</Label>
                          <p className="text-sm text-gray-500">Send notifications via SMS</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {settings.smsNotifications && (
                            <Badge variant="default" className="bg-green-500">Active</Badge>
                          )}
                          <Switch
                            checked={settings.smsNotifications}
                            onCheckedChange={(checked) => setSettings({...settings, smsNotifications: checked})}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Push Notifications</Label>
                          <p className="text-sm text-gray-500">Send browser push notifications</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {settings.pushNotifications && (
                            <Badge variant="default" className="bg-green-500">Active</Badge>
                          )}
                          <Switch
                            checked={settings.pushNotifications}
                            onCheckedChange={(checked) => setSettings({...settings, pushNotifications: checked})}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Deadline Reminders</Label>
                          <p className="text-sm text-gray-500">Remind users about upcoming deadlines</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {settings.deadlineReminders && (
                            <Badge variant="default" className="bg-green-500">Active</Badge>
                          )}
                          <Switch
                            checked={settings.deadlineReminders}
                            onCheckedChange={(checked) => setSettings({...settings, deadlineReminders: checked})}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Approval Notifications</Label>
                          <p className="text-sm text-gray-500">Notify when approvals are required</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {settings.approvalNotifications && (
                            <Badge variant="default" className="bg-green-500">Active</Badge>
                          )}
                          <Switch
                            checked={settings.approvalNotifications}
                            onCheckedChange={(checked) => setSettings({...settings, approvalNotifications: checked})}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Backup Settings */}
                <TabsContent value="backup" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Backup Settings</CardTitle>
                      <CardDescription>
                        Configure data backup and retention
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Automatic Backup</Label>
                          <p className="text-sm text-gray-500">Enable automatic system backups</p>
                        </div>
                        <Switch
                          checked={settings.automaticBackup}
                          onCheckedChange={(checked) => setSettings({...settings, automaticBackup: checked})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="backupFrequency">Backup Frequency</Label>
                        <Select value={settings.backupFrequency} onValueChange={(value) => setSettings({...settings, backupFrequency: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Daily">Daily</SelectItem>
                            <SelectItem value="Weekly">Weekly</SelectItem>
                            <SelectItem value="Monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="retentionDays">Retention Days</Label>
                        <Input
                          id="retentionDays"
                          type="number"
                          value={settings.retentionDays}
                          onChange={(e) => setSettings({...settings, retentionDays: parseInt(e.target.value)})}
                        />
                      </div>
                      <div className="flex space-x-4">
                        <Button 
                          variant="outline" 
                          onClick={handleBackupNow}
                          disabled={backupInProgress}
                        >
                          <Database className="h-4 w-4 mr-2" />
                          {backupInProgress ? 'Creating Backup...' : 'Backup Now'}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="outline"
                              disabled={restoreInProgress || availableBackups.length === 0}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              {restoreInProgress ? 'Restoring...' : 'Restore Backup'}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Restore Backup?</AlertDialogTitle>
                              <AlertDialogDescription>
                                <div className="space-y-2">
                                  <p className="font-semibold text-destructive">⚠️ WARNING: This action cannot be undone!</p>
                                  <p>Restoring a backup will overwrite all current data in the system. This includes:</p>
                                  <ul className="list-disc list-inside ml-4 space-y-1">
                                    <li>All users and accounts</li>
                                    <li>Projects and groups</li>
                                    <li>Committees and faculties</li>
                                    <li>System settings</li>
                                  </ul>
                                  <p className="mt-2">Are you sure you want to continue?</p>
                                </div>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleRestoreBackup()}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Yes, Restore Backup
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>

                      {/* Backup History */}
                      {availableBackups.length > 0 && (
                        <div className="mt-6">
                          <Label className="mb-3 block">Recent Backups</Label>
                          <div className="border rounded-lg overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Filename</TableHead>
                                  <TableHead>Size</TableHead>
                                  <TableHead>Created</TableHead>
                                  <TableHead>Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {availableBackups.slice(0, 5).map((backup) => (
                                  <TableRow key={backup.filename}>
                                    <TableCell className="font-medium">{backup.filename}</TableCell>
                                    <TableCell>{backup.size}</TableCell>
                                    <TableCell>{new Date(backup.created).toLocaleString()}</TableCell>
                                    <TableCell>
                                      <div className="flex space-x-2">
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={async () => {
                                            const response = await fetch(`/api/admin/backup?file=${backup.filename}`)
                                            if (response.ok) {
                                              const blob = await response.blob()
                                              const url = window.URL.createObjectURL(blob)
                                              const a = document.createElement('a')
                                              a.href = url
                                              a.download = backup.filename
                                              document.body.appendChild(a)
                                              a.click()
                                              a.remove()
                                              window.URL.revokeObjectURL(url)
                                            }
                                          }}
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button 
                                              variant="ghost" 
                                              size="sm"
                                            >
                                              Restore
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent>
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Restore Backup?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                <div className="space-y-2">
                                                  <p className="font-semibold text-destructive">⚠️ WARNING: This action cannot be undone!</p>
                                                  <p>You are about to restore: <span className="font-semibold">{backup.filename}</span></p>
                                                  <p>This will overwrite all current data in the system. Are you sure you want to continue?</p>
                                                </div>
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction 
                                                onClick={() => handleRestoreBackup(backup.filename)}
                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                              >
                                                Yes, Restore Backup
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Policy Management Settings */}
                <TabsContent value="policies" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Policy Management</CardTitle>
                      <CardDescription>
                        Manage system policies and documents
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Policy Acknowledgment Required</Label>
                          <p className="text-sm text-gray-500">Require users to acknowledge policies</p>
                        </div>
                        <Switch
                          checked={settings.policyAcknowledgmentRequired || false}
                          onCheckedChange={(checked) => setSettings({...settings, policyAcknowledgmentRequired: checked})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Active Policies</Label>
                        <p className="text-sm text-gray-500">Manage policy documents that users must acknowledge</p>
                        <div className="border rounded-lg p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">Privacy Policy</span>
                            </div>
                            <Badge variant="default" className="bg-green-500">Active</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">Terms of Service</span>
                            </div>
                            <Badge variant="default" className="bg-green-500">Active</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-blue-600" />
                              <span className="font-medium">Academic Integrity Policy</span>
                            </div>
                            <Badge variant="default" className="bg-green-500">Active</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Policy Document
                        </Button>
                        <Button variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          View Acknowledgments
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Save Settings */}
              <div className="flex justify-end">
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleSaveSettings}
                >
                  Save Settings
                </Button>
              </div>
            </div>
          </TabsContent>
          </Tabs>
        </main>

        {/* User View Dialog */}
        <Dialog open={isViewUserDialogOpen} onOpenChange={setIsViewUserDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                Complete information about the selected user.
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Name</Label>
                    <p className="text-lg">{selectedUser.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-lg">{selectedUser.email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Role</Label>
                    <div className="mt-1">{getRoleBadge(selectedUser.role)}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedUser.status || 'PENDING')}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Department</Label>
                    <p className="text-lg">{selectedUser.department || 'N/A'}</p>
                  </div>
                  {(selectedUser.role === 'TEACHER' || selectedUser.role === 'COMMITTEE_HEAD') ? (
                    <div>
                      <Label className="text-sm font-medium">Employee ID</Label>
                      <p className="text-lg">{selectedUser.teacherProfile?.employeeId || 'N/A'}</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label className="text-sm font-medium">GPA</Label>
                        <p className="text-lg">
                          {typeof selectedUser.gpa === 'number' ? selectedUser.gpa.toFixed(2) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Roll Number</Label>
                        <p className="text-lg">{selectedUser.rollNumber || 'N/A'}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <Label className="text-sm font-medium">Joined Date</Label>
                    <p className="text-lg">{new Date(selectedUser.createdAt || Date.now()).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Show GPA warning and transcript for students with GPA < 2.0 who are still pending */}
                {selectedUser.role === 'STUDENT' && selectedUser.gpa && selectedUser.gpa < 2.0 && selectedUser.status === 'PENDING' && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-2 text-yellow-800 mb-2">
                      <AlertCircle className="w-5 h-5" />
                      <p className="font-medium">Requires Admin Approval</p>
                    </div>
                    <p className="text-sm text-yellow-700">
                      This student has a GPA below 2.0 and requires manual approval.
                    </p>
                  </div>
                )}

                {/* Transcript section for students */}
                {selectedUser.role === 'STUDENT' && (selectedUser as any).studentProfile?.transcriptUrl && (
                  <div className="mt-4">
                    <Label className="text-sm font-medium">Transcript</Label>
                    <div className="mt-2 p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Eye className="w-5 h-5 text-blue-600" />
                          <span className="text-sm">Transcript uploaded</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const url = (selectedUser as any).studentProfile.transcriptUrl;
                            window.open(url, '_blank');
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Transcript
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* User Edit Dialog */}
        <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>
                Update user information and permissions.
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editName">Name</Label>
                    <Input
                      id="editName"
                      value={selectedUser.name}
                      onChange={(e) => setSelectedUser({...selectedUser, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editEmail">Email</Label>
                    <Input
                      id="editEmail"
                      type="email"
                      value={selectedUser.email}
                      onChange={(e) => setSelectedUser({...selectedUser, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editRole">Role</Label>
                    <Select value={selectedUser.role} onValueChange={(value) => setSelectedUser({...selectedUser, role: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COMMITTEE_HEAD">Committee Head</SelectItem>
                        <SelectItem value="TEACHER">Teacher</SelectItem>
                        <SelectItem value="STUDENT">Student</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editStatus">Status</Label>
                    <Select value={selectedUser.status || 'PENDING'} onValueChange={(value) => setSelectedUser({...selectedUser, status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editDepartment">Department</Label>
                    <Input
                      id="editDepartment"
                      value={selectedUser.department || ''}
                      onChange={(e) => setSelectedUser({...selectedUser, department: e.target.value})}
                    />
                  </div>
                  {(selectedUser.role === 'TEACHER' || selectedUser.role === 'COMMITTEE_HEAD') ? (
                    <div className="space-y-2">
                      <Label htmlFor="editEmployeeId">Employee ID</Label>
                      <Input
                        id="editEmployeeId"
                        value={selectedUser.teacherProfile?.employeeId || ''}
                        onChange={(e) => setSelectedUser({
                          ...selectedUser,
                          teacherProfile: {
                            ...(selectedUser.teacherProfile || {}),
                            employeeId: e.target.value
                          }
                        })}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="editGpa">GPA</Label>
                      <Input
                        id="editGpa"
                        type="number"
                        step="0.01"
                        min="0"
                        max="4"
                        value={selectedUser.gpa ?? ''}
                        onChange={(e) => {
                          const value = e.target.value
                          setSelectedUser({
                            ...selectedUser,
                            gpa: value === '' ? null : parseFloat(value)
                          })
                        }}
                      />
                    </div>
                  )}
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="editPassword">New Password (Leave empty to keep current password)</Label>
                    <Input
                      id="editPassword"
                      type="password"
                      placeholder="Enter new password (min 8 characters)"
                      value={selectedUser.newPassword || ''}
                      onChange={(e) => setSelectedUser({...selectedUser, newPassword: e.target.value})}
                    />
                    <p className="text-xs text-gray-500">Only fill this if you want to change the user's password. Minimum 8 characters required.</p>
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsEditUserDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={handleSaveUser}>
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Committee View Dialog */}
        <Dialog open={isViewCommitteeDialogOpen} onOpenChange={setIsViewCommitteeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Committee Details</DialogTitle>
              <DialogDescription>
                Complete information about the selected committee.
              </DialogDescription>
            </DialogHeader>
            {selectedCommittee && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Committee Name</Label>
                    <p className="text-lg">{selectedCommittee.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Committee Head</Label>
                    <p className="text-lg">{selectedCommittee.head}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <div className="mt-1">
                      <Badge className={selectedCommittee.status === 'Active' ? 'bg-green-500' : 'bg-gray-500'}>
                        {selectedCommittee.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Created Date</Label>
                    <p className="text-lg">{selectedCommittee.created}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Members</Label>
                  <div className="mt-2 space-y-1">
                    {selectedCommittee.members && Array.isArray(selectedCommittee.members) && selectedCommittee.members.length > 0 ? (
                      selectedCommittee.members.map((member, index) => (
                        <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                          {typeof member === 'string' ? member : member?.name || member?.user?.name || 'Unknown Member'}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No members assigned</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Committee Edit Dialog */}
        <Dialog open={isEditCommitteeDialogOpen} onOpenChange={setIsEditCommitteeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Committee</DialogTitle>
              <DialogDescription>
                Update committee information and members.
              </DialogDescription>
            </DialogHeader>
            {selectedCommittee && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editCommitteeName">Committee Name</Label>
                    <Input
                      id="editCommitteeName"
                      value={selectedCommittee.name}
                      onChange={(e) => setSelectedCommittee({...selectedCommittee, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editCommitteeHead">Committee Head</Label>
                    <Input
                      id="editCommitteeHead"
                      value={selectedCommittee.head}
                      onChange={(e) => setSelectedCommittee({...selectedCommittee, head: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editCommitteeStatus">Status</Label>
                    <Select value={selectedCommittee.status} onValueChange={(value) => setSelectedCommittee({...selectedCommittee, status: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editMembers">Members</Label>
                  <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
                    {selectedCommittee.members && Array.isArray(selectedCommittee.members) && selectedCommittee.members.length > 0 ? (
                      selectedCommittee.members.map((member, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm">
                            {typeof member === 'string' ? member : member?.name || member?.user?.name || 'Unknown Member'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No members assigned</p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">Note: Members are managed through the committee creation/edit interface. Use the member selection dropdown to add or remove members.</p>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsEditCommitteeDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={handleSaveCommittee}>
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add User Dialog */}
        <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account in the system.
              </DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="addName">Name</Label>
                    <Input
                      id="addName"
                      value={selectedUser.name}
                      onChange={(e) => setSelectedUser({...selectedUser, name: e.target.value})}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addEmail">Email</Label>
                    <Input
                      id="addEmail"
                      type="email"
                      value={selectedUser.email}
                      onChange={(e) => setSelectedUser({...selectedUser, email: e.target.value})}
                      placeholder="Enter email address"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="addRole">Role</Label>
                    <Select value={selectedUser.role} onValueChange={(value) => setSelectedUser({...selectedUser, role: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STUDENT">Student</SelectItem>
                        <SelectItem value="TEACHER">Teacher</SelectItem>
                        <SelectItem value="COMMITTEE_HEAD">Committee Head</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="addDepartment">Department</Label>
                    <Input
                      id="addDepartment"
                      value={selectedUser.department}
                      onChange={(e) => setSelectedUser({...selectedUser, department: e.target.value})}
                      placeholder="Enter department"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={handleAddUser}>
                    Add User
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Committee Dialog */}
        <Dialog open={isAddCommitteeDialogOpen} onOpenChange={setIsAddCommitteeDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Committee</DialogTitle>
              <DialogDescription>
                Create a new FYP committee with head and members.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addCommitteeName">Committee Name</Label>
                  <Input
                    id="addCommitteeName"
                    value={selectedCommittee.name || ''}
                    onChange={(e) => setSelectedCommittee({
                      ...selectedCommittee, 
                      name: e.target.value
                    })}
                    placeholder="Enter committee name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addFaculty">Faculty</Label>
                  <Select
                    value={selectedCommittee.faculty || ''}
                    onValueChange={(value) => setSelectedCommittee({
                      ...selectedCommittee, 
                      faculty: value,
                      department: '' // Reset department when faculty changes
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select faculty" />
                    </SelectTrigger>
                    <SelectContent>
                      {faculties.map((faculty: any) => (
                        <SelectItem key={faculty.id} value={faculty.name}>
                          {faculty.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="addDepartment">Department</Label>
                  <Select
                    value={selectedCommittee.department || ''}
                    onValueChange={(value) => setSelectedCommittee({
                      ...selectedCommittee, 
                      department: value
                    })}
                    disabled={!selectedCommittee.faculty}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={selectedCommittee.faculty ? "Select department" : "Select faculty first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCommittee.faculty ? (
                        (() => {
                          const selectedFaculty = faculties.find((f: any) => f.name === selectedCommittee.faculty);
                          const deptList = selectedFaculty?.departments 
                            ? selectedFaculty.departments.split(',').map((d: string) => d.trim()).filter((d: string) => d)
                            : [];
                          if (deptList.length > 0) {
                            return deptList.map((dept: string, index: number) => (
                              <SelectItem key={index} value={dept}>
                                {dept}
                              </SelectItem>
                            ));
                          } else {
                            return (
                              <div className="px-2 py-1.5 text-sm text-gray-500 text-center">
                                No departments available for this faculty
                              </div>
                            );
                          }
                        })()
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-gray-500 text-center">
                          Select faculty first
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="addCommitteeHead">Committee Head</Label>
                  <Popover open={isCommitteeHeadOpen} onOpenChange={setIsCommitteeHeadOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={isCommitteeHeadOpen}
                        className="w-full justify-between"
                      >
                        {selectedCommittee?.head || "Select committee head..."}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search committee head..." />
                        <CommandList>
                          <CommandEmpty>No committee head found.</CommandEmpty>
                          <CommandGroup>
                            {committeeHeads.map((head: any) => (
                              <CommandItem
                                key={head.id}
                                value={head.name}
                                onSelect={() => {
                                  setSelectedCommittee({
                                    ...selectedCommittee, 
                                    head: head.name,
                                    headId: head.id
                                  });
                                  setIsCommitteeHeadOpen(false);
                                }}
                              >
                                <CheckIcon
                                  className={`mr-2 h-4 w-4 ${
                                    selectedCommittee.headId === head.id ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                <div className="flex flex-col">
                                  <span>{head.name}</span>
                                  {head.department && (
                                    <span className="text-xs text-gray-500">{head.department}</span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="addMembers">Members</Label>
                <Popover open={isMembersOpen} onOpenChange={setIsMembersOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isMembersOpen}
                      className="w-full justify-between"
                    >
                      {selectedMemberIds.length > 0 
                        ? `${selectedMemberIds.length} member(s) selected`
                        : "Select members..."}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Search teachers..." />
                      <CommandList>
                        <CommandEmpty>No teacher found.</CommandEmpty>
                        <CommandGroup>
                          {teachers.map((teacher: any) => (
                            <CommandItem
                              key={teacher.id}
                              value={teacher.name}
                              onSelect={() => {
                                const isSelected = selectedMemberIds.includes(teacher.id);
                                if (isSelected) {
                                  setSelectedMemberIds(selectedMemberIds.filter(id => id !== teacher.id));
                                  setSelectedCommittee({
                                    ...selectedCommittee, 
                                    members: (selectedCommittee.members || []).filter((m: string) => m !== teacher.name)
                                  });
                                } else {
                                  setSelectedMemberIds([...selectedMemberIds, teacher.id]);
                                  setSelectedCommittee({
                                    ...selectedCommittee, 
                                    members: [...(selectedCommittee.members || []), teacher.name]
                                  });
                                }
                              }}
                            >
                              <CheckIcon
                                className={`mr-2 h-4 w-4 ${
                                  selectedMemberIds.includes(teacher.id) ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              <div className="flex flex-col">
                                <span>{teacher.name}</span>
                                {teacher.department && (
                                  <span className="text-xs text-gray-500">{teacher.department}</span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedMemberIds.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedMemberIds.map((teacherId: string) => {
                      const teacher = teachers.find((t: any) => t.id === teacherId);
                      if (!teacher) return null;
                      return (
                        <Badge key={teacherId} variant="secondary" className="flex items-center gap-1">
                          {teacher.name}
                          <X
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => {
                              setSelectedMemberIds(selectedMemberIds.filter(id => id !== teacherId));
                              setSelectedCommittee({
                                ...selectedCommittee,
                                members: (selectedCommittee.members || []).filter((m: string) => m !== teacher.name)
                              });
                            }}
                          />
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => {
                  setIsAddCommitteeDialogOpen(false);
                  setSelectedCommittee({
                    name: '',
                    head: '',
                    headId: '',
                    faculty: '',
                    department: '',
                    members: []
                  });
                  setSelectedMemberIds([]);
                }}>
                  Cancel
                </Button>
                <Button 
                  type="button"
                  className="bg-green-600 hover:bg-green-700" 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddCommittee(e);
                  }}
                >
                  Create Committee
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Faculty Dialog */}
        <Dialog open={isAddFacultyDialogOpen} onOpenChange={setIsAddFacultyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Faculty</DialogTitle>
              <DialogDescription>
                Create a new faculty or department in the system.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="addFacultyName">Faculty Name *</Label>
                <Input
                  id="addFacultyName"
                  value={facultyFormData.name}
                  onChange={(e) => setFacultyFormData({...facultyFormData, name: e.target.value})}
                  placeholder="e.g., Faculty of Engineering"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addFacultyCode">Faculty Code</Label>
                <Input
                  id="addFacultyCode"
                  value={facultyFormData.code}
                  onChange={(e) => setFacultyFormData({...facultyFormData, code: e.target.value})}
                  placeholder="e.g., ENG"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addFacultyDescription">Description</Label>
                <textarea
                  id="addFacultyDescription"
                  className="w-full p-2 border rounded-md"
                  rows={3}
                  value={facultyFormData.description}
                  onChange={(e) => setFacultyFormData({...facultyFormData, description: e.target.value})}
                  placeholder="Enter faculty description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addFacultyDepartments">Departments *</Label>
                <Textarea
                  id="addFacultyDepartments"
                  className="w-full p-2 border rounded-md"
                  rows={4}
                  value={facultyFormData.departments}
                  onChange={(e) => setFacultyFormData({...facultyFormData, departments: e.target.value})}
                  placeholder="Enter departments separated by commas (e.g., Computer Science, Electrical Engineering, Mechanical Engineering)"
                />
                <p className="text-xs text-gray-500">Enter department names separated by commas. These will be available when creating committees.</p>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => {
                  setIsAddFacultyDialogOpen(false);
                  setFacultyFormData({ name: '', description: '', code: '', departments: '' });
                }}>
                  Cancel
                </Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleAddFaculty()}>
                  Add Faculty
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Faculty Dialog */}
        <Dialog open={isEditFacultyDialogOpen} onOpenChange={setIsEditFacultyDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Faculty</DialogTitle>
              <DialogDescription>
                Update faculty information.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="editFacultyName">Faculty Name *</Label>
                <Input
                  id="editFacultyName"
                  value={facultyFormData.name}
                  onChange={(e) => setFacultyFormData({...facultyFormData, name: e.target.value})}
                  placeholder="e.g., Faculty of Engineering"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editFacultyCode">Faculty Code</Label>
                <Input
                  id="editFacultyCode"
                  value={facultyFormData.code}
                  onChange={(e) => setFacultyFormData({...facultyFormData, code: e.target.value})}
                  placeholder="e.g., ENG"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editFacultyDescription">Description</Label>
                <textarea
                  id="editFacultyDescription"
                  className="w-full p-2 border rounded-md"
                  rows={3}
                  value={facultyFormData.description}
                  onChange={(e) => setFacultyFormData({...facultyFormData, description: e.target.value})}
                  placeholder="Enter faculty description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editFacultyDepartments">Departments *</Label>
                <Textarea
                  id="editFacultyDepartments"
                  className="w-full p-2 border rounded-md"
                  rows={4}
                  value={facultyFormData.departments}
                  onChange={(e) => setFacultyFormData({...facultyFormData, departments: e.target.value})}
                  placeholder="Enter departments separated by commas (e.g., Computer Science, Electrical Engineering, Mechanical Engineering)"
                />
                <p className="text-xs text-gray-500">Enter department names separated by commas. These will be available when creating committees.</p>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => {
                  setIsEditFacultyDialogOpen(false);
                  setSelectedFaculty(null);
                  setFacultyFormData({ name: '', description: '', code: '', departments: '' });
                }}>
                  Cancel
                </Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleEditFaculty()}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Project View/Edit Dialog */}
        <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{projectEditMode ? 'Edit Project' : 'Project Details'}</DialogTitle>
              <DialogDescription>
                {projectEditMode ? 'Update project information' : 'View project details and information'}
              </DialogDescription>
            </DialogHeader>
            {selectedProject && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="projectTitle">Project Title</Label>
                    {projectEditMode ? (
                      <Input
                        id="projectTitle"
                        value={projectFormData.title}
                        onChange={(e) => setProjectFormData({...projectFormData, title: e.target.value})}
                        placeholder="Enter project title"
                      />
                    ) : (
                      <p className="text-sm text-gray-700">{selectedProject.title}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="projectDescription">Description</Label>
                    {projectEditMode ? (
                      <textarea
                        id="projectDescription"
                        className="w-full p-2 border rounded-md"
                        rows={4}
                        value={projectFormData.description}
                        onChange={(e) => setProjectFormData({...projectFormData, description: e.target.value})}
                        placeholder="Enter project description"
                      />
                    ) : (
                      <p className="text-sm text-gray-700">{selectedProject.description || 'No description provided'}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="projectStatus">Status</Label>
                    {projectEditMode ? (
                      <Select 
                        value={projectFormData.status} 
                        onValueChange={(value) => setProjectFormData({...projectFormData, status: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PROPOSED">Proposed</SelectItem>
                          <SelectItem value="APPROVED">Approved</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="COMPLETED">Completed</SelectItem>
                          <SelectItem value="REJECTED">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={
                        selectedProject.status === 'COMPLETED' ? 'default' : 
                        selectedProject.status === 'IN_PROGRESS' ? 'secondary' : 
                        selectedProject.status === 'APPROVED' ? 'default' : 'outline'
                      }>
                        {selectedProject.status?.replace('_', ' ') || 'Unknown'}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Supervisor</Label>
                      <p className="text-sm text-gray-700">{selectedProject.supervisor?.name || 'No supervisor assigned'}</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Created Date</Label>
                      <p className="text-sm text-gray-700">
                        {selectedProject.createdAt ? new Date(selectedProject.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Students</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.group?.members?.length > 0 ? (
                        selectedProject.group.members.map((member, idx) => (
                          <Badge key={idx} variant="outline">
                            {member.user?.name || member.user?.email || 'Unknown Student'}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500">No students assigned</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  {projectEditMode ? (
                    <>
                      <Button variant="outline" onClick={() => setProjectEditMode(false)}>
                        Cancel
                      </Button>
                      <Button className="bg-green-600 hover:bg-green-700" onClick={handleUpdateProject}>
                        Save Changes
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setIsProjectDialogOpen(false)}>
                        Close
                      </Button>
                      <Button className="bg-green-600 hover:bg-green-700" onClick={() => setProjectEditMode(true)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Project
                      </Button>
                    </>
                  )}
                </div>

                {/* Weekly Reports Section */}
                {selectedProject.weeklyReports && selectedProject.weeklyReports.length > 0 && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">Weekly Reports</h4>
                        <p className="text-sm text-gray-500">Track student progress through weekly submissions</p>
                      </div>
                      <Badge variant="outline" className="bg-blue-50">
                        {selectedProject.weeklyReports.length} Report{selectedProject.weeklyReports.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {selectedProject.weeklyReports.map((report: any, index: number) => (
                        <div key={report.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                          <div className="flex items-center space-x-3">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <div>
                              <p className="font-medium text-sm">Week {report.week || index + 1}</p>
                              <p className="text-xs text-gray-500">
                                {report.fileName || 'Weekly Report'} • {new Date(report.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {report.fileUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => window.open(report.fileUrl, '_blank')}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                            )}
                            {report.fileUrl && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const link = document.createElement('a');
                                  link.href = report.fileUrl;
                                  link.download = report.fileName || 'weekly-report';
                                  link.click();
                                }}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}