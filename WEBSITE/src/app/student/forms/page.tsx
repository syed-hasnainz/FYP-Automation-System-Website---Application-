"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, FileText, Upload, ArrowLeft, Eye, Trash2, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const FORM_TYPES = [
  { key: "supervisor", label: "Supervisor Change Form", icon: FileText },
  { key: "consent", label: "FYP Student Consent Form", icon: FileText },
  { key: "extension", label: "Extension Request Form", icon: FileText },
  { key: "reeval", label: "Re-Evaluation Appeal Form", icon: FileText },
  { key: "general", label: "General Request Form", icon: FileText },
];

export default function StudentFormsPage() {
  const [activeTab, setActiveTab] = useState("fill");
  const [selectedFormType, setSelectedFormType] = useState("supervisor");
  const { toast } = useToast();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">FYP Forms</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Submit and track your form submissions</p>
            </div>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/student'}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Dashboard</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </div>
          
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="fill">Fill Forms</TabsTrigger>
              <TabsTrigger value="submissions">My Submissions</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="fill" className="space-y-6">
            {/* Form Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Form Type</CardTitle>
                <CardDescription>Choose the form you want to fill</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {FORM_TYPES.map((form) => {
                    const Icon = form.icon;
                    const isSelected = selectedFormType === form.key;
                    return (
                      <button
                        key={form.key}
                        onClick={() => setSelectedFormType(form.key)}
                        className={`p-6 rounded-lg border-2 transition-all text-left ${
                          isSelected
                            ? "border-blue-600 bg-blue-50 shadow-md"
                            : "border-gray-200 bg-white hover:border-blue-400 hover:shadow-sm"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <Icon className={`h-6 w-6 ${isSelected ? "text-blue-600" : "text-gray-400"}`} />
                          {isSelected && (
                            <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                              Selected
                            </span>
                          )}
                        </div>
                        <p className={`font-medium ${isSelected ? "text-blue-900" : "text-gray-700"}`}>
                          {form.label}
                        </p>
                        {!isSelected && (
                          <p className="text-xs text-gray-500 mt-1">Click to select</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Form Content */}
            <Card>
              <CardHeader>
                <CardTitle>{FORM_TYPES.find(f => f.key === selectedFormType)?.label}</CardTitle>
                <CardDescription>Fill in all required fields and submit</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedFormType === "supervisor" && <SupervisorChangeForm />}
                {selectedFormType === "consent" && <ConsentForm />}
                {selectedFormType === "extension" && <ExtensionRequestForm />}
                {selectedFormType === "reeval" && <ReEvaluationAppealForm />}
                {selectedFormType === "general" && <GeneralRequestForm />}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="submissions">
            <MySubmissionsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SupervisorChangeForm() {
  const [form, setForm] = useState({
    projectTitle: "",
    projectCode: "",
    prevSupervisor: "",
    newSupervisor: "",
    coSupervisors: "",
    reason: "",
    members: [{ name: "", regNo: "" }, { name: "", regNo: "" }, { name: "", regNo: "" }],
    prevSupervisorComments: "",
    newSupervisorComments: "",
    committeeComments: "",
    date: new Date().toISOString().split('T')[0],
    supportingDoc: null as File | null,
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMemberChange = (idx: number, field: string, value: string) => {
    setForm((prev) => {
      const members = [...prev.members];
      members[idx] = { ...members[idx], [field]: value };
      return { ...prev, members };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      const formData = new FormData();
      formData.append('type', 'supervisor-change');
      formData.append('data', JSON.stringify({
        projectTitle: form.projectTitle,
        projectCode: form.projectCode,
        prevSupervisor: form.prevSupervisor,
        newSupervisor: form.newSupervisor,
        coSupervisors: form.coSupervisors,
        reason: form.reason,
        members: form.members,
        prevSupervisorComments: form.prevSupervisorComments,
        newSupervisorComments: form.newSupervisorComments,
        committeeComments: form.committeeComments,
        date: form.date,
      }));
      if (form.supportingDoc) {
        formData.append('file', form.supportingDoc);
      }
      
      const res = await fetch("/api/forms/submit", {
        method: "POST",
        headers: { 
          ...(user?.id && { "x-user-id": user.id })
        },
        body: formData,
      });

      if (res.ok) {
        toast({ title: "Success", description: "Form submitted successfully!" });
        // Reset form
        setForm({
          projectTitle: "",
          projectCode: "",
          prevSupervisor: "",
          newSupervisor: "",
          coSupervisors: "",
          reason: "",
          members: [{ name: "", regNo: "" }, { name: "", regNo: "" }, { name: "", regNo: "" }],
          prevSupervisorComments: "",
          newSupervisorComments: "",
          committeeComments: "",
          date: new Date().toISOString().split('T')[0],
          supportingDoc: null,
        });
      } else {
        const error = await res.json();
        throw new Error(error.error || "Failed to submit form");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to submit form", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="projectTitle">Project Title *</Label>
          <Input
            id="projectTitle"
            name="projectTitle"
            value={form.projectTitle}
            onChange={handleChange}
            placeholder="Enter project title"
            required
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="projectCode">Project Code *</Label>
          <Input
            id="projectCode"
            name="projectCode"
            value={form.projectCode}
            onChange={handleChange}
            placeholder="Enter project code"
            required
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prevSupervisor">Previous Supervisor Name *</Label>
          <Input
            id="prevSupervisor"
            name="prevSupervisor"
            value={form.prevSupervisor}
            onChange={handleChange}
            placeholder="Enter previous supervisor name"
            required
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newSupervisor">New Supervisor Name *</Label>
          <Input
            id="newSupervisor"
            name="newSupervisor"
            value={form.newSupervisor}
            onChange={handleChange}
            placeholder="Enter new supervisor name"
            required
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="coSupervisors">Co-Supervisor(s) Name</Label>
          <Input
            id="coSupervisors"
            name="coSupervisors"
            value={form.coSupervisors}
            onChange={handleChange}
            placeholder="Enter co-supervisor names"
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="date"
              name="date"
              type="date"
              value={form.date}
              onChange={handleChange}
              className="h-10 pl-10"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason for Request of Change *</Label>
        <Textarea
          id="reason"
          name="reason"
          value={form.reason}
          onChange={handleChange}
          placeholder="Explain the reason for supervisor change"
          required
          rows={4}
          className="resize-none"
        />
      </div>

      {/* Team Members */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Team Members</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {form.members.map((member, idx) => (
            <div key={idx} className="space-y-3 p-4 border rounded-lg bg-gray-50">
              <div className="space-y-2">
                <Label htmlFor={`name${idx}`}>Name {idx + 1} {idx === 0 && '*'}</Label>
                <Input
                  id={`name${idx}`}
                  value={member.name}
                  onChange={(e) => handleMemberChange(idx, "name", e.target.value)}
                  placeholder={`Member ${idx + 1} name`}
                  required={idx === 0}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`regNo${idx}`}>Registration Number {idx === 0 && '*'}</Label>
                <Input
                  id={`regNo${idx}`}
                  value={member.regNo}
                  onChange={(e) => handleMemberChange(idx, "regNo", e.target.value)}
                  placeholder="Registration number"
                  required={idx === 0}
                  className="h-10"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comments Sections */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prevSupervisorComments">Comments by Previous Supervisor</Label>
          <Textarea
            id="prevSupervisorComments"
            name="prevSupervisorComments"
            value={form.prevSupervisorComments}
            onChange={handleChange}
            placeholder="Previous supervisor comments (if available)"
            rows={3}
            className="resize-none"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="newSupervisorComments">Comments by New Supervisor</Label>
          <Textarea
            id="newSupervisorComments"
            name="newSupervisorComments"
            value={form.newSupervisorComments}
            onChange={handleChange}
            placeholder="New supervisor comments (if available)"
            rows={3}
            className="resize-none"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="committeeComments">Comments by FYP Committee/Chairman</Label>
          <Textarea
            id="committeeComments"
            name="committeeComments"
            value={form.committeeComments}
            onChange={handleChange}
            placeholder="Committee comments (if available)"
            rows={3}
            className="resize-none"
          />
        </div>
      </div>

      {/* File Upload */}
      <div className="space-y-2">
        <Label htmlFor="supportingDoc">Attach Supporting Document (Optional)</Label>
        <div className="space-y-2">
          <Input
            id="supportingDoc"
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            onChange={(e) => setForm({ ...form, supportingDoc: e.target.files?.[0] || null })}
            className="h-10"
          />
          {form.supportingDoc && (
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-700">{form.supportingDoc.name}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setForm({ ...form, supportingDoc: null });
                  const input = document.getElementById('supportingDoc') as HTMLInputElement;
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
          Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
        </p>
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setForm({
              projectTitle: "",
              projectCode: "",
              prevSupervisor: "",
              newSupervisor: "",
              coSupervisors: "",
              reason: "",
              members: [{ name: "", regNo: "" }, { name: "", regNo: "" }, { name: "", regNo: "" }],
              prevSupervisorComments: "",
              newSupervisorComments: "",
              committeeComments: "",
              date: new Date().toISOString().split('T')[0],
              supportingDoc: null,
            });
          }}
          disabled={submitting}
        >
          Reset
        </Button>
        <Button
          type="submit"
          className="bg-green-600 hover:bg-green-700"
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Submit Form"}
        </Button>
      </div>
    </form>
  );
}

function ConsentForm() {
  const [form, setForm] = useState({
    teamLead: "",
    teamLeadReg: "",
    members: [{ name: "", regNo: "" }, { name: "", regNo: "" }],
    witnesses: ["", ""],
    committeeComments: "",
    committeeSignature: "",
    date: new Date().toISOString().split('T')[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMemberChange = (idx: number, field: string, value: string) => {
    setForm((prev) => {
      const members = [...prev.members];
      members[idx] = { ...members[idx], [field]: value };
      return { ...prev, members };
    });
  };

  const handleWitnessChange = (idx: number, value: string) => {
    setForm((prev) => {
      const witnesses = [...prev.witnesses];
      witnesses[idx] = value;
      return { ...prev, witnesses };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      const res = await fetch("/api/forms/submit", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(user?.id && { "x-user-id": user.id })
        },
        body: JSON.stringify({ type: "consent", ...form }),
      });

      if (res.ok) {
        toast({ title: "Success", description: "Form submitted successfully!" });
      } else {
        throw new Error("Failed to submit form");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to submit form", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="teamLead">Team Lead Name *</Label>
          <Input
            id="teamLead"
            name="teamLead"
            value={form.teamLead}
            onChange={handleChange}
            placeholder="Enter team lead name"
            required
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="teamLeadReg">Team Lead Registration Number *</Label>
          <Input
            id="teamLeadReg"
            name="teamLeadReg"
            value={form.teamLeadReg}
            onChange={handleChange}
            placeholder="Enter registration number"
            required
            className="h-10"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Team Members</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {form.members.map((member, idx) => (
            <div key={idx} className="space-y-3 p-4 border rounded-lg bg-gray-50">
              <div className="space-y-2">
                <Label htmlFor={`memberName${idx}`}>Name {idx + 2}</Label>
                <Input
                  id={`memberName${idx}`}
                  value={member.name}
                  onChange={(e) => handleMemberChange(idx, "name", e.target.value)}
                  placeholder={`Member ${idx + 2} name`}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`memberReg${idx}`}>Registration Number</Label>
                <Input
                  id={`memberReg${idx}`}
                  value={member.regNo}
                  onChange={(e) => handleMemberChange(idx, "regNo", e.target.value)}
                  placeholder="Registration number"
                  className="h-10"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Witnesses</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {form.witnesses.map((witness, idx) => (
            <div key={idx} className="space-y-2">
              <Label htmlFor={`witness${idx}`}>Witness #{idx + 1}</Label>
              <Input
                id={`witness${idx}`}
                value={witness}
                onChange={(e) => handleWitnessChange(idx, e.target.value)}
                placeholder={`Witness #${idx + 1}`}
                className="h-10"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="committeeComments">Comments by FYP Committee</Label>
        <Textarea
          id="committeeComments"
          name="committeeComments"
          value={form.committeeComments}
          onChange={handleChange}
          placeholder="Committee comments"
          rows={3}
          className="resize-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="committeeSignature">Committee Signature</Label>
          <Input
            id="committeeSignature"
            name="committeeSignature"
            value={form.committeeSignature}
            onChange={handleChange}
            placeholder="Enter committee signature"
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            name="date"
            type="date"
            value={form.date}
            onChange={handleChange}
            className="h-10"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => window.location.reload()} disabled={submitting}>
          Reset
        </Button>
        <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Form"}
        </Button>
      </div>
    </form>
  );
}

function ExtensionRequestForm() {
  const [form, setForm] = useState({
    projectTitle: "",
    reason: "",
    requestedExtension: "",
    members: [{ name: "", regNo: "" }, { name: "", regNo: "" }, { name: "", regNo: "" }],
    supportingDoc: null as File | null,
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMemberChange = (idx: number, field: string, value: string) => {
    setForm((prev) => {
      const members = [...prev.members];
      members[idx] = { ...members[idx], [field]: value };
      return { ...prev, members };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      const formData = new FormData();
      formData.append('type', 'extension');
      formData.append('data', JSON.stringify({
        projectTitle: form.projectTitle,
        reason: form.reason,
        requestedExtension: form.requestedExtension,
        members: form.members,
      }));
      if (form.supportingDoc) {
        formData.append('file', form.supportingDoc);
      }
      
      const res = await fetch("/api/forms/submit", {
        method: "POST",
        headers: { 
          ...(user?.id && { "x-user-id": user.id })
        },
        body: formData,
      });

      if (res.ok) {
        toast({ title: "Success", description: "Form submitted successfully!" });
      } else {
        throw new Error("Failed to submit form");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to submit form", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="projectTitle">Project Title *</Label>
        <Input
          id="projectTitle"
          name="projectTitle"
          value={form.projectTitle}
          onChange={handleChange}
          placeholder="Enter project title"
          required
          className="h-10"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason for Extension Request *</Label>
        <Textarea
          id="reason"
          name="reason"
          value={form.reason}
          onChange={handleChange}
          placeholder="Explain the reason for extension request"
          required
          rows={4}
          className="resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="requestedExtension">Requested Extension *</Label>
        <Input
          id="requestedExtension"
          name="requestedExtension"
          value={form.requestedExtension}
          onChange={handleChange}
          placeholder="e.g., 2 weeks"
          required
          className="h-10"
        />
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Team Members</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {form.members.map((member, idx) => (
            <div key={idx} className="space-y-3 p-4 border rounded-lg bg-gray-50">
              <div className="space-y-2">
                <Label htmlFor={`extName${idx}`}>Name {idx + 1}</Label>
                <Input
                  id={`extName${idx}`}
                  value={member.name}
                  onChange={(e) => handleMemberChange(idx, "name", e.target.value)}
                  placeholder={`Member ${idx + 1} name`}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`extReg${idx}`}>Registration Number</Label>
                <Input
                  id={`extReg${idx}`}
                  value={member.regNo}
                  onChange={(e) => handleMemberChange(idx, "regNo", e.target.value)}
                  placeholder="Registration number"
                  className="h-10"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="supportingDoc">Attach Supporting Document (Optional)</Label>
        <Input
          id="supportingDoc"
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={(e) => setForm({ ...form, supportingDoc: e.target.files?.[0] || null })}
          className="h-10"
        />
        <p className="text-xs text-gray-500">
          Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => window.location.reload()} disabled={submitting}>
          Reset
        </Button>
        <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Form"}
        </Button>
      </div>
    </form>
  );
}

function ReEvaluationAppealForm() {
  const [form, setForm] = useState({
    courseOrComponent: "",
    reason: "",
    members: [{ name: "", regNo: "" }, { name: "", regNo: "" }, { name: "", regNo: "" }],
    supportingDoc: null as File | null,
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMemberChange = (idx: number, field: string, value: string) => {
    setForm((prev) => {
      const members = [...prev.members];
      members[idx] = { ...members[idx], [field]: value };
      return { ...prev, members };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      const formData = new FormData();
      formData.append('type', 'reeval');
      formData.append('data', JSON.stringify({
        courseOrComponent: form.courseOrComponent,
        reason: form.reason,
        members: form.members,
      }));
      if (form.supportingDoc) {
        formData.append('file', form.supportingDoc);
      }
      
      const res = await fetch("/api/forms/submit", {
        method: "POST",
        headers: { 
          ...(user?.id && { "x-user-id": user.id })
        },
        body: formData,
      });

      if (res.ok) {
        toast({ title: "Success", description: "Form submitted successfully!" });
      } else {
        throw new Error("Failed to submit form");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to submit form", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="courseOrComponent">Course/Component *</Label>
        <Input
          id="courseOrComponent"
          name="courseOrComponent"
          value={form.courseOrComponent}
          onChange={handleChange}
          placeholder="Enter course or component name"
          required
          className="h-10"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason for Appeal *</Label>
        <Textarea
          id="reason"
          name="reason"
          value={form.reason}
          onChange={handleChange}
          placeholder="Explain the reason for re-evaluation appeal"
          required
          rows={4}
          className="resize-none"
        />
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Team Members</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {form.members.map((member, idx) => (
            <div key={idx} className="space-y-3 p-4 border rounded-lg bg-gray-50">
              <div className="space-y-2">
                <Label htmlFor={`reevalName${idx}`}>Name {idx + 1}</Label>
                <Input
                  id={`reevalName${idx}`}
                  value={member.name}
                  onChange={(e) => handleMemberChange(idx, "name", e.target.value)}
                  placeholder={`Member ${idx + 1} name`}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`reevalReg${idx}`}>Registration Number</Label>
                <Input
                  id={`reevalReg${idx}`}
                  value={member.regNo}
                  onChange={(e) => handleMemberChange(idx, "regNo", e.target.value)}
                  placeholder="Registration number"
                  className="h-10"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="supportingDoc">Attach Supporting Document (Optional)</Label>
        <Input
          id="supportingDoc"
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={(e) => setForm({ ...form, supportingDoc: e.target.files?.[0] || null })}
          className="h-10"
        />
        <p className="text-xs text-gray-500">
          Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => window.location.reload()} disabled={submitting}>
          Reset
        </Button>
        <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Form"}
        </Button>
      </div>
    </form>
  );
}

function GeneralRequestForm() {
  const [form, setForm] = useState({
    subject: "",
    description: "",
    members: [{ name: "", regNo: "" }, { name: "", regNo: "" }, { name: "", regNo: "" }],
    supportingDoc: null as File | null,
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleMemberChange = (idx: number, field: string, value: string) => {
    setForm((prev) => {
      const members = [...prev.members];
      members[idx] = { ...members[idx], [field]: value };
      return { ...prev, members };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      const formData = new FormData();
      formData.append('type', 'general');
      formData.append('data', JSON.stringify({
        subject: form.subject,
        description: form.description,
        members: form.members,
      }));
      if (form.supportingDoc) {
        formData.append('file', form.supportingDoc);
      }
      
      const res = await fetch("/api/forms/submit", {
        method: "POST",
        headers: { 
          ...(user?.id && { "x-user-id": user.id })
        },
        body: formData,
      });

      if (res.ok) {
        toast({ title: "Success", description: "Form submitted successfully!" });
      } else {
        throw new Error("Failed to submit form");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to submit form", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="subject">Subject *</Label>
        <Input
          id="subject"
          name="subject"
          value={form.subject}
          onChange={handleChange}
          placeholder="Enter subject"
          required
          className="h-10"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description of Issue/Request *</Label>
        <Textarea
          id="description"
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Describe your issue or request"
          required
          rows={4}
          className="resize-none"
        />
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Team Members</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {form.members.map((member, idx) => (
            <div key={idx} className="space-y-3 p-4 border rounded-lg bg-gray-50">
              <div className="space-y-2">
                <Label htmlFor={`genName${idx}`}>Name {idx + 1}</Label>
                <Input
                  id={`genName${idx}`}
                  value={member.name}
                  onChange={(e) => handleMemberChange(idx, "name", e.target.value)}
                  placeholder={`Member ${idx + 1} name`}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`genReg${idx}`}>Registration Number</Label>
                <Input
                  id={`genReg${idx}`}
                  value={member.regNo}
                  onChange={(e) => handleMemberChange(idx, "regNo", e.target.value)}
                  placeholder="Registration number"
                  className="h-10"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="supportingDoc">Attach Supporting Document (Optional)</Label>
        <Input
          id="supportingDoc"
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={(e) => setForm({ ...form, supportingDoc: e.target.files?.[0] || null })}
          className="h-10"
        />
        <p className="text-xs text-gray-500">
          Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => window.location.reload()} disabled={submitting}>
          Reset
        </Button>
        <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit Form"}
        </Button>
      </div>
    </form>
  );
}

function MySubmissionsTab() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const { toast } = useToast();

  const loadSubmissions = async () => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      if (!user?.id) return;

      const res = await fetch(`/api/forms/submissions?userId=${user.id}`, {
        headers: { 'x-user-id': user.id }
      });
      
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatFormType = (type: string) => {
    const typeMap: Record<string, string> = {
      'supervisor-change': 'Supervisor Change Form',
      'consent': 'FYP Student Consent Form',
      'extension': 'Extension Request Form',
      'reeval': 'Re-Evaluation Appeal Form',
      'general': 'General Request Form',
    };
    return typeMap[type] || type;
  };

  const handleView = async (submissionId: string) => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      const res = await fetch(`/api/forms/${submissionId}`, {
        headers: { 'x-user-id': user?.id || '' }
      });
      
      if (res.ok) {
        const data = await res.json();
        setSelectedSubmission(data);
        setIsViewDialogOpen(true);
      } else {
        throw new Error('Failed to load submission');
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to load submission', variant: 'destructive' });
    }
  };

  const handleDelete = async (submissionId: string) => {
    try {
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      const res = await fetch(`/api/forms/${submissionId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user?.id || '' }
      });
      
      if (res.ok) {
        toast({ title: 'Success', description: 'Form submission deleted successfully' });
        loadSubmissions();
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete submission');
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to delete submission', variant: 'destructive' });
    }
  };

  const renderFormData = (data: any) => {
    if (!data || typeof data !== 'object') return null;

    const excludeKeys = ['type', 'members', 'witnesses'];
    const entries = Object.entries(data).filter(([key]) => !excludeKeys.includes(key));

    return (
      <div className="space-y-4">
        {entries.map(([key, value]: [string, any]) => {
          if (!value || value === '') return null;
          const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
          return (
            <div key={key} className="space-y-1">
              <Label className="text-sm font-medium text-gray-700">{label}</Label>
              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
              </p>
            </div>
          );
        })}
        {data.members && Array.isArray(data.members) && data.members.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Team Members</Label>
            <div className="space-y-2">
              {data.members.map((member: any, idx: number) => (
                member.name || member.regNo ? (
                  <div key={idx} className="bg-gray-50 p-3 rounded border">
                    <p className="text-sm"><span className="font-medium">Name:</span> {member.name || 'N/A'}</p>
                    <p className="text-sm"><span className="font-medium">Registration Number:</span> {member.regNo || 'N/A'}</p>
                  </div>
                ) : null
              ))}
            </div>
          </div>
        )}
        {data.witnesses && Array.isArray(data.witnesses) && data.witnesses.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Witnesses</Label>
            <div className="space-y-2">
              {data.witnesses.map((witness: string, idx: number) => (
                witness ? (
                  <div key={idx} className="bg-gray-50 p-3 rounded border">
                    <p className="text-sm">Witness #{idx + 1}: {witness}</p>
                  </div>
                ) : null
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>My Submissions</CardTitle>
          <CardDescription>View and track all your form submissions</CardDescription>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No submissions yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((submission: any) => (
                <div key={submission.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {formatFormType(submission.type)}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Submitted on {new Date(submission.createdAt).toLocaleDateString()} at {new Date(submission.createdAt).toLocaleTimeString()}
                      </p>
                      {submission.reviewComments && (
                        <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                          <p className="text-xs font-medium text-blue-900 mb-1">Review Comments:</p>
                          <p className="text-sm text-blue-800">{submission.reviewComments}</p>
                        </div>
                      )}
                      {submission.reviewedAt && (
                        <p className="text-xs text-gray-400 mt-1">
                          Reviewed on {new Date(submission.reviewedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(submission.status || 'PENDING')}`}>
                        {submission.status || 'PENDING'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleView(submission.id)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Form Submission</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this form submission? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => {
                              e.preventDefault();
                              handleDelete(submission.id);
                            }}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Submission Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSubmission ? formatFormType(selectedSubmission.type) : 'Form Submission Details'}
            </DialogTitle>
            <DialogDescription>
              View all details of your form submission
            </DialogDescription>
          </DialogHeader>
          {selectedSubmission && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-700">Submission Date</Label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedSubmission.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(selectedSubmission.status || 'PENDING')}`}>
                    {selectedSubmission.status || 'PENDING'}
                  </span>
                </div>
              </div>
              
              {selectedSubmission.reviewComments && (
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-700">Review Comments</Label>
                  <p className="text-sm text-gray-900 bg-blue-50 p-3 rounded border border-blue-200">
                    {selectedSubmission.reviewComments}
                  </p>
                </div>
              )}

              {selectedSubmission.reviewedAt && (
                <div className="space-y-1">
                  <Label className="text-sm font-medium text-gray-700">Reviewed At</Label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedSubmission.reviewedAt).toLocaleString()}
                  </p>
                </div>
              )}

              <div className="border-t pt-4">
                <Label className="text-sm font-medium text-gray-700 mb-3 block">Form Data</Label>
                {renderFormData(selectedSubmission.data)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
