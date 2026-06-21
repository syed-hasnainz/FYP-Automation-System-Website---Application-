import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  types,
} from '@react-native-documents/picker';
import ReactNativeBlobUtil from 'react-native-blob-util';
import Icon from 'react-native-vector-icons/Feather';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { InputField } from '../../components/common/InputField';
import { MessageBanner } from '../../components/common/MessageBanner';
import {
  DepartmentDropdown,
  type DepartmentOption,
} from '../../components/common/DepartmentDropdown';
import {
  FacultyDropdown,
  parseDepartments,
  type FacultyOption,
} from '../../components/common/FacultyDropdown';
import { RoleDropdown, type RoleValue } from '../../components/common/RoleDropdown';
import {
  MaintenanceModal,
  RegistrationDisabledModal,
} from '../../components/auth/SystemModals';
import { PolicyModal } from '../../components/auth/PolicyModal';
import { ConditionalModal } from '../../components/auth/ConditionalModal';
import { ForgotPasswordModal } from '../../components/auth/ForgotPasswordModal';
import {
  completeConditionalRegistration,
  fetchRegistrationFaculties,
  fetchSystemSettings,
  forgotPassword,
  login,
  register,
  resetPassword,
} from '../../services/authService';
import { ensureApiReady } from '../../services/apiClient';
import { saveAuthSession } from '../../utils/storage';
import { useAuthStore } from '../../store/authStore';
import type { AuthUser, RegisterResponse } from '../../types/auth';
import { isAxiosError } from 'axios';

const buildingBg = require('../../assets/building.png');
const hamdardLogo = require('../../assets/hamdard-logo.png');

const RESTRICTED_ROLES = ['ADMIN', 'COMMITTEE_HEAD', 'TEACHER'] as const;
type RestrictedRole = (typeof RESTRICTED_ROLES)[number];

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export function HomeScreen({ navigation }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [selectedRole, setSelectedRole] = useState<RoleValue>('STUDENT');
  const requiresAccessPass = RESTRICTED_ROLES.includes(
    selectedRole as RestrictedRole,
  );
  const isStudent = selectedRole === 'STUDENT';

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [showMaintenancePopup, setShowMaintenancePopup] = useState(false);
  const [showRegistrationDisabledPopup, setShowRegistrationDisabledPopup] =
    useState(false);
  const [showPolicyDialog, setShowPolicyDialog] = useState(false);
  const [showConditionalDialog, setShowConditionalDialog] = useState(false);
  const [registrationResult, setRegistrationResult] =
    useState<RegisterResponse | null>(null);

  const [showForgotPasswordDialog, setShowForgotPasswordDialog] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [resetPasswordStep, setResetPasswordStep] = useState<'email' | 'code'>(
    'email',
  );
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [showAccessPass, setShowAccessPass] = useState(false);
  const [faculties, setFaculties] = useState<FacultyOption[]>([]);
  const [rememberMe, setRememberMe] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [accessPass, setAccessPass] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [faculty, setFaculty] = useState('');
  const [session, setSession] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [cgpa, setCgpa] = useState('');
  const [prerequisitesPassed, setPrerequisitesPassed] = useState<
    boolean | null
  >(null);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [transcriptFile, setTranscriptFile] = useState<{
    name: string;
    type: string;
    uri: string;
  } | null>(null);

  const showMessage = useCallback(
    (text: string, type: 'success' | 'error' = 'success') => {
      setMessage(text);
      setMessageType(type);
      setTimeout(() => setMessage(''), 3000);
    },
    [],
  );

  useEffect(() => {
    setDepartment('');
    setFaculty('');
  }, [selectedRole]);

  const departmentOptions: DepartmentOption[] = React.useMemo(() => {
    const selectedFaculty = faculties.find(item => item.name === faculty);
    return parseDepartments(selectedFaculty?.departments).map(dept => ({
      label: dept,
      value: dept,
    }));
  }, [faculties, faculty]);

  const handleFacultyChange = (value: string) => {
    setFaculty(value);
    setDepartment('');
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        await ensureApiReady();
        const data = await fetchSystemSettings();
        const isMaintenance = data.general?.maintenanceMode || false;
        const isRegAllowed = data.general?.allowRegistration !== false;
        setMaintenanceMode(isMaintenance);
        setAllowRegistration(isRegAllowed);
        if (isMaintenance) setShowMaintenancePopup(true);
      } catch {
        // Non-blocking: login still works; defaults keep maintenance off.
        if (__DEV__) {
          console.warn(
            'Could not load system settings. Check internet and that https://hamdard-automation.onrender.com is reachable (Render free tier: first request after sleep may take ~1 minute).',
          );
        }
      }
    };
    loadSettings();
    const loadFaculties = async () => {
      try {
        await ensureApiReady();
        const data = await fetchRegistrationFaculties();
        setFaculties(data);
      } catch {
        setFaculties([]);
      }
    };
    loadFaculties();
  }, []);

  const navigateByRole = (user: AuthUser) => {
    switch (user.role) {
      case 'ADMIN':
        navigation.replace('SuperAdmin');
        break;
      case 'COMMITTEE_HEAD':
        navigation.replace('CommitteeHead');
        break;
      case 'TEACHER':
        navigation.replace('Teacher');
        break;
      case 'STUDENT':
      default:
        navigation.replace('Student');
        break;
    }
  };

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword) {
      showMessage('Please enter email and password', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const data = await login(loginEmail.trim(), loginPassword);

      if (data.user.status === 'PENDING') {
        showMessage(
          'Your registration is pending approval. You will be notified once your account is approved.',
          'error',
        );
        return;
      }

      if (data.user.status === 'CONDITIONALLY_REGISTERED') {
        showMessage(
          'Your registration is pending approval. Please wait for admin or committee approval.',
          'error',
        );
        return;
      }

      if (data.user.status === 'REJECTED') {
        showMessage(
          'Your registration has been rejected. Please contact the administrator for more information.',
          'error',
        );
        return;
      }

      if (maintenanceMode && data.user.role !== 'ADMIN') {
        showMessage(
          'System is currently under maintenance. Only administrators can login.',
          'error',
        );
        return;
      }

      await saveAuthSession({
        token: data.token,
        user: data.user,
        sessionExpiry: data.sessionExpiry,
      });
      useAuthStore.getState().setUser(data.user);

      showMessage(`Welcome back, ${data.user.name}!`, 'success');
      setTimeout(() => navigateByRole(data.user), 1000);
    } catch (error) {
      if (isAxiosError(error) && error.response?.data) {
        const errData = error.response.data as {
          error?: string;
          remainingAttempts?: number;
        };
        const errorMsg = errData.error || 'Invalid credentials';
        const attemptsMsg =
          errData.remainingAttempts !== undefined &&
          errData.remainingAttempts > 0
            ? ` (${errData.remainingAttempts} attempt(s) remaining)`
            : '';
        showMessage(errorMsg + attemptsMsg, 'error');
      } else {
        showMessage('Something went wrong. Please try again.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail.trim()) {
      showMessage('Please enter your email address', 'error');
      return;
    }

    setForgotPasswordLoading(true);
    try {
      const data = await forgotPassword(forgotPasswordEmail.trim());
      showMessage(data.message, 'success');
      setResetPasswordStep('code');
    } catch (error) {
      const msg = isAxiosError(error)
        ? (error.response?.data as { error?: string })?.error ||
          'Failed to send reset email'
        : 'Something went wrong. Please try again.';
      showMessage(msg, 'error');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!verificationCode || !newPassword || !confirmPassword) {
      showMessage('Please fill in all fields', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showMessage('Passwords do not match', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showMessage('Password must be at least 8 characters', 'error');
      return;
    }

    setForgotPasswordLoading(true);
    try {
      await resetPassword(verificationCode, newPassword);
      showMessage('Password reset successful! You can now login.', 'success');
      setShowForgotPasswordDialog(false);
      setForgotPasswordEmail('');
      setVerificationCode('');
      setNewPassword('');
      setConfirmPassword('');
      setResetPasswordStep('email');
    } catch (error) {
      const msg = isAxiosError(error)
        ? (error.response?.data as { error?: string })?.error ||
          'Failed to reset password'
        : 'Something went wrong. Please try again.';
      showMessage(msg, 'error');
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const pickTranscript = async () => {
    try {
      const [file] = await pick({
        type: [types.pdf, types.images],
      });
      if (!file?.uri || !file.name) return;

      const [localCopy] = await keepLocalCopy({
        files: [{ uri: file.uri, fileName: file.name }],
        destination: 'cachesDirectory',
      });

      const uri =
        localCopy?.status === 'success' ? localCopy.localUri : file.uri;
      setTranscriptFile({
        name: file.name,
        type: file.type ?? 'application/octet-stream',
        uri,
      });
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) {
        return;
      }
      showMessage('Could not pick file', 'error');
    }
  };

  const readTranscriptBase64 = async () => {
    if (!transcriptFile) return undefined;
    try {
      const path = transcriptFile.uri.replace('file://', '');
      const base64 = await ReactNativeBlobUtil.fs.readFile(path, 'base64');
      const mime = transcriptFile.type || 'application/octet-stream';
      return {
        name: transcriptFile.name,
        type: mime,
        data: `data:${mime};base64,${base64}`,
      };
    } catch (err) {
      console.error('Error reading file:', err);
      return undefined;
    }
  };

  const handleRegister = async () => {
    if (maintenanceMode) {
      setShowMaintenancePopup(true);
      return;
    }
    if (!allowRegistration) {
      setShowRegistrationDisabledPopup(true);
      return;
    }

    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      showMessage('Please fill required fields', 'error');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      showMessage('Passwords do not match', 'error');
      return;
    }

    if (regPassword.length < 8) {
      showMessage('Password must be at least 8 characters', 'error');
      return;
    }

    if (isStudent) {
      if (
        !rollNumber.trim() ||
        !department.trim() ||
        !faculty.trim() ||
        !session.trim() ||
        !contactInfo.trim() ||
        !cgpa.trim()
      ) {
        showMessage('Please fill all student fields', 'error');
        return;
      }
      if (prerequisitesPassed === null) {
        showMessage('Please answer prerequisite question', 'error');
        return;
      }
      if (!policyAccepted) {
        showMessage('Please accept the FYP Registration Policy', 'error');
        return;
      }
    }

    const needsFacultySelection =
      isStudent ||
      selectedRole === 'TEACHER' ||
      selectedRole === 'COMMITTEE_HEAD';

    if (needsFacultySelection) {
      if (!faculty.trim()) {
        showMessage('Please select a faculty', 'error');
        return;
      }
      if (!department.trim()) {
        showMessage('Please select a department', 'error');
        return;
      }
    }

    if (requiresAccessPass && !accessPass.trim()) {
      showMessage('Access pass is required', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name: regName.trim(),
        email: regEmail.trim(),
        role: selectedRole,
        password: regPassword,
      };

      if (RESTRICTED_ROLES.includes(selectedRole as RestrictedRole)) {
        payload.accessPass = accessPass;
      }

      if (isStudent) {
        payload.rollNumber = rollNumber.trim();
        payload.department = department.trim();
        payload.faculty = faculty.trim();
        payload.session = session.trim();
        payload.contactInfo = contactInfo.trim();
        payload.cgpa = parseFloat(cgpa);
        payload.prerequisitesPassed = prerequisitesPassed;
        payload.policyAccepted = policyAccepted;

        const transcriptData = await readTranscriptBase64();
        if (transcriptData) payload.transcriptFile = transcriptData;
      } else if (
        selectedRole === 'TEACHER' ||
        selectedRole === 'COMMITTEE_HEAD'
      ) {
        payload.department = department.trim();
        payload.faculty = faculty.trim();
      }

      const data = await register(payload);

      if (data.eligibilityStatus === 'CONDITIONAL') {
        setRegistrationResult(data);
        setShowConditionalDialog(true);
      } else {
        showMessage(
          'Account created! Your registration is pending approval. You can log in once approved.',
          'success',
        );
        setTimeout(() => setActiveTab('login'), 2500);
      }
    } catch (error) {
      const msg = isAxiosError(error)
        ? (error.response?.data as { error?: string })?.error ||
          'Failed to create account'
        : 'Something went wrong. Please try again.';
      showMessage(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteConditional = async (form: {
    unpassedCourses?: string;
    conditionalCommitment: string;
  }) => {
    if (!registrationResult?.userId) return;

    try {
      await completeConditionalRegistration({
        userId: registrationResult.userId,
        unpassedCourses: form.unpassedCourses,
        conditionalCommitment: form.conditionalCommitment,
      });
      setShowConditionalDialog(false);
      setRegistrationResult(null);
      showMessage(
        'Registration submitted! Your application is pending approval.',
        'success',
      );
      setTimeout(() => setActiveTab('login'), 2000);
    } catch {
      showMessage('Failed to submit conditional information', 'error');
    }
  };

  const registerDisabled =
    isLoading || maintenanceMode || !allowRegistration;

  return (
    <View style={styles.bg}>
      <ImageBackground
        source={buildingBg}
        style={styles.background}
        imageStyle={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.overlay} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.content,
              activeTab === 'register' && styles.contentWide,
            ]}>
            <View style={styles.branding}>
              <Image
                source={hamdardLogo}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.universityTitle}>UNIVERSITY</Text>
              <Text style={styles.systemTitle}>FYP Automation System</Text>
            </View>

            <MessageBanner message={message} type={messageType} />

            <View style={styles.card}>
              <View style={styles.welcomeBadge}>
                <Text style={styles.welcomeTitle}>Welcome</Text>
                <Text style={styles.welcomeDesc}>
                  Sign in to your account or create a new one
                </Text>
              </View>

              <View style={styles.tabs}>
                <Pressable
                  style={[styles.tab, activeTab === 'login' && styles.tabActive]}
                  onPress={() => setActiveTab('login')}>
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === 'login' && styles.tabTextActive,
                    ]}>
                    Login
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.tab,
                    activeTab === 'register' && styles.tabActive,
                  ]}
                  onPress={() => setActiveTab('register')}>
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === 'register' && styles.tabTextActive,
                    ]}>
                    Register
                  </Text>
                </Pressable>
              </View>

              {activeTab === 'login' ? (
                <View style={styles.form}>
                  <InputField
                    label="Email"
                    value={loginEmail}
                    onChangeText={setLoginEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="you@university.edu"
                    editable={!isLoading}
                    leftIcon={
                      <Icon name="mail" size={16} color="#9ca3af" />
                    }
                  />
                  <InputField
                    label="Password"
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    secureTextEntry={!showPassword}
                    placeholder="Enter your password"
                    editable={!isLoading}
                    leftIcon={
                      <Icon name="lock" size={16} color="#9ca3af" />
                    }
                    rightIcon={
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}>
                        <Icon
                          name={showPassword ? 'eye-off' : 'eye'}
                          size={16}
                          color="#6b7280"
                        />
                      </TouchableOpacity>
                    }
                  />

                  <View style={styles.rowBetween}>
                    <Pressable
                      style={styles.rememberRow}
                      onPress={() => setRememberMe(!rememberMe)}>
                      <View
                        style={[
                          styles.checkbox,
                          rememberMe && styles.checkboxChecked,
                        ]}
                      />
                      <Text style={styles.rememberText}>Remember me</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setShowForgotPasswordDialog(true)}
                      disabled={isLoading}>
                      <Text style={styles.link}>Forgot?</Text>
                    </Pressable>
                  </View>

                  <Pressable
                    style={[styles.primaryBtn, isLoading && styles.btnDisabled]}
                    onPress={handleLogin}
                    disabled={isLoading}>
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Login</Text>
                    )}
                  </Pressable>
                </View>
              ) : (
                <View style={styles.form}>
                  <InputField
                    label="Full Name"
                    value={regName}
                    onChangeText={setRegName}
                    placeholder="Enter your full name"
                    editable={!isLoading}
                  />
                  <InputField
                    label="Email"
                    value={regEmail}
                    onChangeText={setRegEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="Enter your email"
                    editable={!isLoading}
                  />

                  <RoleDropdown
                    value={selectedRole}
                    onChange={setSelectedRole}
                    disabled={isLoading}
                  />

                  {requiresAccessPass && (
                    <InputField
                      label="Access Pass"
                      value={accessPass}
                      onChangeText={setAccessPass}
                      secureTextEntry={!showAccessPass}
                      placeholder="Enter your access pass"
                      editable={!isLoading}
                      rightIcon={
                        <TouchableOpacity
                          onPress={() => setShowAccessPass(!showAccessPass)}>
                          <Icon
                            name={showAccessPass ? 'eye-off' : 'eye'}
                            size={16}
                            color="#6b7280"
                          />
                        </TouchableOpacity>
                      }
                    />
                  )}

                  {(isStudent ||
                    selectedRole === 'TEACHER' ||
                    selectedRole === 'COMMITTEE_HEAD') && (
                    <>
                      <FacultyDropdown
                        value={faculty}
                        onChange={handleFacultyChange}
                        faculties={faculties}
                        disabled={isLoading}
                      />
                      <DepartmentDropdown
                        value={department}
                        onChange={setDepartment}
                        options={departmentOptions}
                        disabled={isLoading || !faculty.trim()}
                      />
                    </>
                  )}

                  {isStudent && (
                    <>
                      <InputField
                        label="Roll Number *"
                        value={rollNumber}
                        onChangeText={setRollNumber}
                        placeholder="Enter your roll number"
                        editable={!isLoading}
                      />
                      <InputField
                        label="Session *"
                        value={session}
                        onChangeText={setSession}
                        placeholder="e.g., 2020-2024"
                        editable={!isLoading}
                      />
                      <InputField
                        label="Contact Number *"
                        value={contactInfo}
                        onChangeText={setContactInfo}
                        keyboardType="phone-pad"
                        placeholder="e.g., +92-300-1234567"
                        editable={!isLoading}
                      />
                      <InputField
                        label="CGPA *"
                        value={cgpa}
                        onChangeText={setCgpa}
                        keyboardType="decimal-pad"
                        placeholder="e.g., 3.50"
                        editable={!isLoading}
                      />

                      <Text style={styles.label}>
                        Have you passed all prerequisite courses? *
                      </Text>
                      <View style={styles.radioRow}>
                        <Pressable
                          style={styles.radioOption}
                          onPress={() => setPrerequisitesPassed(true)}>
                          <View
                            style={[
                              styles.radio,
                              prerequisitesPassed === true &&
                                styles.radioSelected,
                            ]}
                          />
                          <Text style={styles.radioLabel}>Yes</Text>
                        </Pressable>
                        <Pressable
                          style={styles.radioOption}
                          onPress={() => setPrerequisitesPassed(false)}>
                          <View
                            style={[
                              styles.radio,
                              prerequisitesPassed === false &&
                                styles.radioSelected,
                            ]}
                          />
                          <Text style={styles.radioLabel}>No</Text>
                        </Pressable>
                      </View>

                      <Text style={styles.label}>
                        Upload Transcript (Optional)
                      </Text>
                      <Pressable
                        style={styles.fileBtn}
                        onPress={pickTranscript}
                        disabled={isLoading}>
                        <Text style={styles.fileBtnText}>
                          {transcriptFile
                            ? transcriptFile.name
                            : 'Choose file (PDF, JPG, PNG)'}
                        </Text>
                      </Pressable>
                      <Text style={styles.hint}>
                        Accepted formats: PDF, JPG, PNG (Max 5MB)
                      </Text>
                    </>
                  )}

                  <InputField
                    label="Password"
                    value={regPassword}
                    onChangeText={setRegPassword}
                    secureTextEntry={!showRegPassword}
                    placeholder="Enter your password"
                    editable={!isLoading}
                    leftIcon={
                      <Icon name="lock" size={16} color="#9ca3af" />
                    }
                    rightIcon={
                      <TouchableOpacity
                        onPress={() => setShowRegPassword(!showRegPassword)}>
                        <Icon
                          name={showRegPassword ? 'eye-off' : 'eye'}
                          size={16}
                          color="#6b7280"
                        />
                      </TouchableOpacity>
                    }
                  />
                  <InputField
                    label="Confirm Password"
                    value={regConfirmPassword}
                    onChangeText={setRegConfirmPassword}
                    secureTextEntry={!showRegConfirmPassword}
                    placeholder="Confirm your password"
                    editable={!isLoading}
                    leftIcon={
                      <Icon name="lock" size={16} color="#9ca3af" />
                    }
                    rightIcon={
                      <TouchableOpacity
                        onPress={() =>
                          setShowRegConfirmPassword(!showRegConfirmPassword)
                        }>
                        <Icon
                          name={showRegConfirmPassword ? 'eye-off' : 'eye'}
                          size={16}
                          color="#6b7280"
                        />
                      </TouchableOpacity>
                    }
                  />

                  {isStudent && (
                    <View style={styles.policyBox}>
                      <Pressable
                        style={styles.policyRow}
                        onPress={() => setPolicyAccepted(!policyAccepted)}>
                        <View
                          style={[
                            styles.checkbox,
                            policyAccepted && styles.checkboxChecked,
                          ]}
                        />
                        <Text style={styles.policyText}>
                          I have read and accept the{' '}
                          <Text
                            style={styles.policyLink}
                            onPress={() => setShowPolicyDialog(true)}>
                            FYP Registration Policy
                          </Text>
                          . I understand the eligibility criteria and commit to
                          completing all requirements.
                        </Text>
                      </Pressable>
                    </View>
                  )}

                  <Pressable
                    style={[
                      styles.primaryBtn,
                      registerDisabled && styles.btnDisabled,
                    ]}
                    onPress={handleRegister}
                    disabled={registerDisabled}>
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryBtnText}>
                        {maintenanceMode
                          ? 'System Under Maintenance'
                          : !allowRegistration
                            ? 'Registration Disabled'
                            : 'Register'}
                      </Text>
                    )}
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <MaintenanceModal
        visible={showMaintenancePopup}
        onClose={() => setShowMaintenancePopup(false)}
      />
      <RegistrationDisabledModal
        visible={showRegistrationDisabledPopup}
        onClose={() => setShowRegistrationDisabledPopup(false)}
      />
      <PolicyModal
        visible={showPolicyDialog}
        onClose={() => setShowPolicyDialog(false)}
      />
      <ConditionalModal
        visible={showConditionalDialog}
        registrationResult={registrationResult}
        onClose={() => {
          setShowConditionalDialog(false);
          setRegistrationResult(null);
        }}
        onSubmit={handleCompleteConditional}
      />
      <ForgotPasswordModal
        visible={showForgotPasswordDialog}
        step={resetPasswordStep}
        email={forgotPasswordEmail}
        verificationCode={verificationCode}
        newPassword={newPassword}
        confirmPassword={confirmPassword}
        loading={forgotPasswordLoading}
        onEmailChange={setForgotPasswordEmail}
        onCodeChange={setVerificationCode}
        onNewPasswordChange={setNewPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onClose={() => {
          setShowForgotPasswordDialog(false);
          setForgotPasswordEmail('');
          setVerificationCode('');
          setNewPassword('');
          setConfirmPassword('');
          setResetPasswordStep('email');
        }}
        onBack={() => setResetPasswordStep('email')}
        onSubmit={
          resetPasswordStep === 'email'
            ? handleForgotPassword
            : handleResetPassword
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bg: { flex: 1, backgroundColor: '#ecfdf5' },
  background: {
    ...StyleSheet.absoluteFill,
  },
  backgroundImage: {
    opacity: 0.2,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
    paddingVertical: 32,
  },
  content: { width: '100%', maxWidth: 400, alignSelf: 'center' },
  contentWide: { maxWidth: 520 },
  branding: { alignItems: 'center', marginBottom: 12 },
  logo: {
    width: 96,
    height: 96,
    marginBottom: 8,
  },
  universityTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 1,
  },
  systemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  welcomeBadge: {
    backgroundColor: '#16a34a',
    margin: 12,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  welcomeTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  welcomeDesc: {
    color: '#dcfce7',
    fontSize: 10,
    marginTop: 2,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  tabTextActive: { color: '#16a34a', fontWeight: '600' },
  form: { padding: 12, paddingTop: 4 },
  label: {
    fontSize: 12,
    color: '#374151',
    marginBottom: 4,
    fontWeight: '500',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: '#9ca3af',
    borderRadius: 3,
  },
  checkboxChecked: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  rememberText: { fontSize: 12, color: '#374151' },
  link: { fontSize: 12, color: '#16a34a', fontWeight: '500' },
  primaryBtn: {
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  radioRow: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  radioOption: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#9ca3af',
  },
  radioSelected: {
    borderColor: '#16a34a',
    backgroundColor: '#16a34a',
  },
  radioLabel: { fontSize: 14, color: '#374151' },
  fileBtn: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 4,
    backgroundColor: '#f9fafb',
  },
  fileBtnText: { fontSize: 13, color: '#374151' },
  hint: { fontSize: 11, color: '#6b7280', marginBottom: 10 },
  policyBox: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  policyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  policyText: { flex: 1, fontSize: 12, color: '#374151' },
  policyLink: { color: '#16a34a', fontWeight: '600', textDecorationLine: 'underline' },
});
