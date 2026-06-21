'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { BookOpen, Eye, EyeOff, Loader2, User, Mail, Lock, GraduationCap, Users, Upload, AlertCircle, X, FileText } from 'lucide-react';
import BackgroundMotif from '@/components/background-motif'
import HeaderHero from '@/components/header-hero'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'STUDENT' as 'STUDENT' | 'TEACHER' | 'COMMITTEE_HEAD' | 'ADMIN',
    rollNumber: '',
    department: '',
    gpa: '',
    accessPass: '',
    empId: '',
  });
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [activePolicy, setActivePolicy] = useState<any>(null);
  const [loadingPolicy, setLoadingPolicy] = useState(false);
  const router = useRouter();

  // Ensure favicon on this page (some browsers may cache or ignore app metadata)
  useEffect(() => {
    try {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null
      if (link) link.href = '/hamdardfavicon.png'
      else {
        const l = document.createElement('link')
        l.rel = 'icon'
        l.href = '/hamdardfavicon.png'
        document.head.appendChild(l)
      }
    } catch (e) {
      // ignore
    }

    // Fetch active policy document
    const fetchActivePolicy = async () => {
      setLoadingPolicy(true)
      try {
        const response = await fetch('/api/policy/active')
        if (response.ok) {
          const policy = await response.json()
          if (policy.requireAcknowledgment) {
            setActivePolicy(policy)
          }
        }
      } catch (error) {
        console.error('Failed to fetch active policy:', error)
      } finally {
        setLoadingPolicy(false)
      }
    }

    fetchActivePolicy()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    console.log('Field changed:', name, '=', value); // Debug log
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      };
      // Clear role-specific fields when role changes
      if (name === 'role') {
        console.log('Role changed to:', value);
        console.log('Should show Employee ID?', value === 'TEACHER' || value === 'COMMITTEE_HEAD');
        if (value !== 'STUDENT') {
          updated.rollNumber = '';
          updated.gpa = '';
        }
        if (value !== 'TEACHER' && value !== 'COMMITTEE_HEAD') {
          updated.department = '';
          updated.empId = '';
        }
        if (value !== 'TEACHER' && value !== 'COMMITTEE_HEAD' && value !== 'ADMIN') {
          updated.accessPass = '';
        }
      }
      return updated;
    });
    if (error) setError('');
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    if (success) {
      setSuccess(false);
      setSuccessMessage('');
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    // Validate name
    if (!formData.name || formData.name.trim() === '') {
      errors.name = 'Full name is required';
      isValid = false;
    }

    // Validate email
    if (!formData.email || formData.email.trim() === '') {
      errors.email = 'Email address is required';
      isValid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Please enter a valid email address';
        isValid = false;
      }
    }

    // Validate password
    if (!formData.password || formData.password.trim() === '') {
      errors.password = 'Password is required';
      isValid = false;
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
      isValid = false;
    }

    // Validate confirm password
    if (!formData.confirmPassword || formData.confirmPassword.trim() === '') {
      errors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
      isValid = false;
    }

    // Role-specific validations
    if (formData.role === 'STUDENT' && !formData.rollNumber) {
      errors.rollNumber = 'Roll number is required for students';
      isValid = false;
    }

    if ((formData.role === 'TEACHER' || formData.role === 'COMMITTEE_HEAD') && !formData.department) {
      errors.department = 'Department is required for teachers and committee heads';
      isValid = false;
    }

    if ((formData.role === 'TEACHER' || formData.role === 'COMMITTEE_HEAD') && !formData.empId) {
      errors.empId = 'Employee ID is required for teachers and committee heads';
      isValid = false;
    }

    // Require transcript for all students
    if (formData.role === 'STUDENT' && !transcriptFile) {
      errors.transcript = 'Transcript upload is required for student registration';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const gpa = parseFloat(formData.gpa) || 0;
    
    // Require policy acknowledgment for all students
    if (formData.role === 'STUDENT' && !policyAccepted) {
      setError('You must acknowledge the FYP Registration Policy to register.');
      return;
    }

    setLoading(true);
    setError('');
    setFieldErrors({});
    setSuccess(false);
    setSuccessMessage('');

    try {
      let transcriptData: { name: string; type: string; data: string } | null = null;
      
      // Handle transcript file upload for all students (required)
      if (formData.role === 'STUDENT') {
        if (!transcriptFile) {
          setError('Transcript upload is required for student registration');
          setLoading(false);
          return;
        }
        const reader = new FileReader();
        transcriptData = await new Promise<{ name: string; type: string; data: string }>((resolve, reject) => {
          reader.onload = () => resolve({
            name: transcriptFile.name,
            type: transcriptFile.type,
            data: reader.result as string
          });
          reader.onerror = reject;
          reader.readAsDataURL(transcriptFile);
        });
      }

      const submitData: any = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        ...(formData.role === 'STUDENT' && {
          rollNumber: formData.rollNumber,
          department: formData.department,
          cgpa: formData.gpa ? parseFloat(formData.gpa) : undefined,
          policyAccepted: policyAccepted,
        }),
        ...(formData.role === 'TEACHER' && {
          department: formData.department,
          accessPass: formData.accessPass,
          empId: formData.empId,
        }),
        ...(formData.role === 'COMMITTEE_HEAD' && {
          department: formData.department,
          accessPass: formData.accessPass,
          empId: formData.empId,
        }),
        ...(formData.role === 'ADMIN' && {
          department: formData.department,
          accessPass: formData.accessPass,
        }),
      };

      if (transcriptData) {
        submitData.transcriptFile = transcriptData;
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      const data = await response.json();

      if (response.ok) {
        // Show success message and hide form
        setSuccess(true);
        setSuccessMessage('Your registration has been processed. You will be notified through email & SMS once your account is approved by the administrator.');
        
        // All users require admin approval - redirect to login page after 5 seconds
        setTimeout(() => {
          router.push('/');
        }, 5000);
      } else {
        // Handle API validation errors
        if (data.details && Array.isArray(data.details)) {
          // Zod validation errors
          const zodErrors: Record<string, string> = {};
          data.details.forEach((err: any) => {
            const field = err.path?.[0] || 'general';
            zodErrors[field] = err.message || 'Invalid value';
          });
          setFieldErrors(zodErrors);
          setError('Please fix the errors in the form');
        } else if (data.error) {
          // Check if error is about a specific field
          const errorMsg = data.error.toLowerCase();
          if (errorMsg.includes('email')) {
            setFieldErrors({ email: data.error });
          } else if (errorMsg.includes('password')) {
            setFieldErrors({ password: data.error });
          } else if (errorMsg.includes('access pass')) {
            setFieldErrors({ accessPass: data.error });
          } else if (errorMsg.includes('employee') || errorMsg.includes('emp')) {
            setFieldErrors({ empId: data.error });
          } else if (errorMsg.includes('department')) {
            setFieldErrors({ department: data.error });
          } else {
            setError(data.error);
          }
        } else {
          setError('Registration failed. Please try again.');
        }
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center p-6 py-12 relative overflow-hidden">
      <HeaderHero />
      <BackgroundMotif />
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 items-center relative z-10 -mt-12 md:-mt-24">
        {/* Illustration / Info (hidden on small screens) */}
          <div className="hidden md:flex flex-col items-center justify-center p-6 bg-gradient-to-br from-green-50 to-white rounded-lg relative">
          <div className="absolute -right-4 -bottom-4 opacity-20 pointer-events-none">
            <svg width="160" height="160" viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="20" width="80" height="12" rx="3" fill="#bbf7d0"/>
              <rect x="8" y="36" width="80" height="12" rx="3" fill="#d1fae5"/>
              <path d="M110 40 L110 10 L140 10 L140 40 Z" fill="#bbf7d0"/>
            </svg>
          </div>
          <div className="text-green-600 text-6xl mb-4">🎓</div>
          <h2 className="text-xl font-bold text-gray-800">Welcome to University Portal</h2>
          <p className="text-gray-600 mt-2 text-center">Register to submit your FYP, track progress, and communicate with supervisors.</p> 
          <ul className="mt-4 text-sm text-gray-600 space-y-1">
            <li>• Easy registration & approvals</li>
            <li>• Secure accounts</li>
            <li>• Fast admin reviews</li>
          </ul>
        </div>

        {/* Registration Form */}
        <div>
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <img src="/hamdard-logo.png" alt="Hamdard" className="w-12 h-12 object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">FYP Portal</h1>
            <p className="text-gray-600 mt-2">Create your account</p>
          </div>

          <Card className="shadow-2xl overflow-hidden">
            <CardHeader className="bg-white py-4 px-6 relative">
              <div className="mx-auto bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-full px-6 py-2 w-fit shadow-md">
                <CardTitle className="text-white text-lg">Join University Portal</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4"> 
              {success ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
                  <p className="text-gray-600 mb-4">{successMessage}</p>
                  <p className="text-sm text-gray-500">You will be redirected shortly...</p>
                </div>
              ) : (
              <form id="registration-form" onSubmit={handleSubmit} className="space-y-3">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Debug: Show current role and conditional check */}
              <div className="bg-yellow-50 border border-yellow-200 p-2 rounded text-xs mb-2">
                <strong>Debug Info:</strong> Role = "{formData.role}" | 
                Should show Employee ID? {(formData.role === 'TEACHER' || formData.role === 'COMMITTEE_HEAD') ? 'YES ✓' : 'NO ✗'}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className={`pl-10 ${fieldErrors.name ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {fieldErrors.name && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className={`pl-10 ${fieldErrors.email ? 'border-red-500' : ''}`}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                {/* Role */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="role">Register as *</Label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      required
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none bg-white"
                    >
                      <option value="STUDENT">Student</option>
                      <option value="TEACHER">Teacher</option>
                      <option value="COMMITTEE_HEAD">Committee Head</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                  {/* Debug info */}
                  <p className="text-xs text-gray-500">Current role: {formData.role}</p>
                  {(formData.role === 'TEACHER' || formData.role === 'COMMITTEE_HEAD') && (
                    <div className="text-xs text-green-600 font-bold bg-green-100 p-2 rounded mb-2">
                      ✓ Employee ID field should be visible below (Role: {formData.role})
                    </div>
                  )}
                </div>

                {/* Roll Number (for students) */}
                {formData.role === 'STUDENT' && (
                  <div className="space-y-2">
                    <Label htmlFor="rollNumber">Roll Number *</Label>
                    <div className="relative">
                      <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="rollNumber"
                        name="rollNumber"
                        type="text"
                        placeholder="Enter your roll number"
                        value={formData.rollNumber}
                        onChange={handleChange}
                        required={formData.role === 'STUDENT'}
                        className={`pl-10 ${fieldErrors.rollNumber ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {fieldErrors.rollNumber && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {fieldErrors.rollNumber}
                      </p>
                    )}
                  </div>
                )}

                {/* Department (for teachers and committee heads) */}
                {(formData.role === 'TEACHER' || formData.role === 'COMMITTEE_HEAD') && (
                  <>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="department">Department *</Label>
                      <div className="relative">
                        <BookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="department"
                          name="department"
                          type="text"
                          placeholder="e.g., Computer Science, Software Engineering, Information Technology"
                          value={formData.department}
                          onChange={handleChange}
                          required
                          className={`pl-10 ${fieldErrors.department ? 'border-red-500' : ''}`}
                        />
                      </div>
                      {fieldErrors.department ? (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {fieldErrors.department}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500">
                          Enter your department name (e.g., Computer Science, Software Engineering, etc.)
                        </p>
                      )}
                    </div>

                    {/* Employee ID (for teachers and committee heads) */}
                    <div className="space-y-2 bg-blue-50 p-2 rounded border-2 border-blue-200">
                      <Label htmlFor="empId" className="font-semibold text-gray-900">Employee ID *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                          id="empId"
                          name="empId"
                          type="text"
                          placeholder="Enter your employee ID"
                          value={formData.empId}
                          onChange={handleChange}
                          required
                          className={`pl-10 bg-white ${fieldErrors.empId ? 'border-red-500' : 'border-gray-300'}`}
                        />
                      </div>
                      {fieldErrors.empId ? (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {fieldErrors.empId}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-600">Enter your employee ID</p>
                      )}
                    </div>
                  </>
                )}

                {/* Access Pass (for Admin, Committee Head, and Teacher only) */}
                {(formData.role === 'ADMIN' || formData.role === 'COMMITTEE_HEAD' || formData.role === 'TEACHER') && (
                  <div className="space-y-2">
                    <Label htmlFor="accessPass">Access Pass *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        id="accessPass"
                        name="accessPass"
                        type="text"
                        placeholder={
                          formData.role === 'TEACHER' ? 'TEACHER@2024' :
                          formData.role === 'COMMITTEE_HEAD' ? 'COMMITTEE@2024' :
                          'ADMIN@2024'
                        }
                        value={formData.accessPass}
                        onChange={handleChange}
                        required
                        className={`pl-10 ${fieldErrors.accessPass ? 'border-red-500' : ''}`}
                      />
                    </div>
                    {fieldErrors.accessPass ? (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {fieldErrors.accessPass}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500">
                        {formData.role === 'ADMIN' && 'Use: ADMIN@2024'}
                        {formData.role === 'TEACHER' && 'Use: TEACHER@2024'}
                        {formData.role === 'COMMITTEE_HEAD' && 'Use: COMMITTEE@2024'}
                      </p>
                    )}
                  </div>
                )}

                {/* GPA (for students) */}
                {formData.role === 'STUDENT' && (
                  <div className="space-y-2">
                    <Label htmlFor="gpa">GPA *</Label>
                    <Input
                      id="gpa"
                      name="gpa"
                      type="number"
                      step="0.01"
                      min="0"
                      max="4"
                      placeholder="Enter your GPA (0-4)"
                      value={formData.gpa}
                      onChange={handleChange}
                      required
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      Students with GPA ≥ 3.0 are auto-approved. GPA &lt; 3.0 requires admin approval.
                    </p>
                  </div>
                )}

                {/* Transcript Upload (Required for all students) */}
                {formData.role === 'STUDENT' && (
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="transcript">Upload Transcript *</Label>
                    <div className="space-y-2">
                      <Input
                        id="transcript"
                        name="transcript"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        required
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Check file size (max 5MB)
                            if (file.size > 5 * 1024 * 1024) {
                              setError('File size must be less than 5MB');
                              e.target.value = '';
                              setTranscriptFile(null);
                              return;
                            }
                            setTranscriptFile(file);
                            if (error) setError('');
                          }
                        }}
                        className="w-full"
                      />
                      {transcriptFile && (
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <span className="text-sm text-gray-700">{transcriptFile.name}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTranscriptFile(null);
                              const input = document.getElementById('transcript') as HTMLInputElement;
                              if (input) input.value = '';
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Transcript is required for all student registrations. Max size: 5MB (PDF, JPG, PNG)
                    </p>
                  </div>
                )}

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password (min 8 characters)"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      className={`pl-10 pr-10 ${fieldErrors.password ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required
                      className={`pl-10 pr-10 ${fieldErrors.confirmPassword ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {fieldErrors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>


              {/* Policy Link and Acknowledgment Checkbox */}
              {activePolicy && (
                <div className="flex flex-col items-start gap-2 text-sm border p-3 rounded bg-blue-50 mb-2">
                  <div>
                    <span className="text-gray-600">Please read the </span>
                    <a
                      href={activePolicy.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {activePolicy.fileName || 'FYP Registration Policy'}
                    </a>
                    <span className="text-gray-600"> before registering.</span>
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={policyAccepted}
                      onChange={e => setPolicyAccepted(e.target.checked)}
                      required
                    />
                    <span>I have read and accept the FYP Registration Policy.</span>
                  </label>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
              )}

            {!success && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-green-600 hover:underline font-medium">
                  Sign in here
                </Link> 
              </p>
            </div>
            )}
          </CardContent>
        </Card>
        </div>

      </div>
    </div>
  );
}