import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import Toast from 'react-native-toast-message';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import {
  emptyMembers,
  STUDENT_FORM_TABS,
  submitStudentForm,
  type MemberRow,
  type StudentFormTabKey,
} from '../../services/studentFormService';

function FormLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <Text style={styles.label}>
      {children}
      {required ? ' *' : ''}
    </Text>
  );
}

function FormInput({
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <TextInput
      style={[styles.input, multiline && styles.textArea]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
    />
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function MembersBlock({
  members,
  onChange,
  requiredFirst,
}: {
  members: MemberRow[];
  onChange: (idx: number, field: keyof MemberRow, value: string) => void;
  requiredFirst?: boolean;
}) {
  return (
    <View style={styles.membersBlock}>
      {members.map((m, i) => (
        <View key={i} style={styles.memberCard}>
          <Text style={styles.memberHeading}>Member {i + 1}</Text>
          <FormLabel required={requiredFirst && i === 0}>Full Name</FormLabel>
          <FormInput
            value={m.name}
            onChangeText={(v) => onChange(i, 'name', v)}
            placeholder="Student name"
          />
          <FormLabel required={requiredFirst && i === 0}>Registration No.</FormLabel>
          <FormInput
            value={m.regNo}
            onChangeText={(v) => onChange(i, 'regNo', v)}
            placeholder="e.g. 20K-1234"
          />
        </View>
      ))}
    </View>
  );
}

function OfficeFieldsNote() {
  return (
    <Text style={styles.officeNote}>
      Fields below are optional — for supervisor / committee office use after submission.
    </Text>
  );
}

function SubmitBar({
  submitting,
  onSubmit,
}: {
  submitting: boolean;
  onSubmit: () => void;
}) {
  return (
    <Pressable
      style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
      onPress={onSubmit}
      disabled={submitting}>
      {submitting ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <FeatherIcon name="send" size={18} color="#fff" />
          <Text style={styles.submitBtnText}>Submit Form</Text>
        </>
      )}
    </Pressable>
  );
}

function SupervisorChangeFormBody({ onDone }: { onDone: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    projectTitle: '',
    projectCode: '',
    prevSupervisor: '',
    newSupervisor: '',
    coSupervisors: '',
    reason: '',
    members: emptyMembers(3),
    prevSupervisorComments: '',
    newSupervisorComments: '',
    committeeComments: '',
    date: new Date().toISOString().split('T')[0],
  });

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!form.projectTitle.trim() || !form.prevSupervisor.trim() || !form.newSupervisor.trim()) {
      Toast.show({ type: 'error', text1: 'Fill required project and supervisor fields' });
      return;
    }
    if (!form.reason.trim()) {
      Toast.show({ type: 'error', text1: 'Reason for change is required' });
      return;
    }
    if (!form.members[0].name.trim() || !form.members[0].regNo.trim()) {
      Toast.show({ type: 'error', text1: 'Team lead name and registration no. are required' });
      return;
    }
    setSubmitting(true);
    try {
      await submitStudentForm('supervisor-change', form);
      Toast.show({ type: 'success', text1: 'Form submitted successfully' });
      onDone();
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Submission failed',
        text2: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.formBody}>
      <SectionTitle>Project Information</SectionTitle>
      <FormLabel required>Project Title</FormLabel>
      <FormInput value={form.projectTitle} onChangeText={(v) => set('projectTitle', v)} />
      <FormLabel>Project Code</FormLabel>
      <FormInput value={form.projectCode} onChangeText={(v) => set('projectCode', v)} />
      <FormLabel required>Previous Supervisor</FormLabel>
      <FormInput value={form.prevSupervisor} onChangeText={(v) => set('prevSupervisor', v)} />
      <FormLabel required>New Supervisor</FormLabel>
      <FormInput value={form.newSupervisor} onChangeText={(v) => set('newSupervisor', v)} />
      <FormLabel>Co-Supervisor(s)</FormLabel>
      <FormInput value={form.coSupervisors} onChangeText={(v) => set('coSupervisors', v)} />
      <FormLabel required>Reason for Change</FormLabel>
      <FormInput value={form.reason} onChangeText={(v) => set('reason', v)} multiline />

      <SectionTitle>Team Members</SectionTitle>
      <MembersBlock
        members={form.members}
        requiredFirst
        onChange={(i, field, value) => {
          setForm((prev) => {
            const members = [...prev.members];
            members[i] = { ...members[i], [field]: value };
            return { ...prev, members };
          });
        }}
      />

      <SectionTitle>Office / Committee (Optional)</SectionTitle>
      <OfficeFieldsNote />
      <FormLabel>Comments by Previous Supervisor</FormLabel>
      <FormInput
        value={form.prevSupervisorComments}
        onChangeText={(v) => set('prevSupervisorComments', v)}
        multiline
      />
      <FormLabel>Comments by New Supervisor</FormLabel>
      <FormInput
        value={form.newSupervisorComments}
        onChangeText={(v) => set('newSupervisorComments', v)}
        multiline
      />
      <FormLabel>Comments by FYP Committee / Chairman</FormLabel>
      <FormInput
        value={form.committeeComments}
        onChangeText={(v) => set('committeeComments', v)}
        multiline
      />
      <FormLabel>Date</FormLabel>
      <FormInput value={form.date} onChangeText={(v) => set('date', v)} placeholder="YYYY-MM-DD" />

      <SubmitBar submitting={submitting} onSubmit={submit} />
    </View>
  );
}

function ConsentFormBody({ onDone }: { onDone: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    teamLead: '',
    teamLeadReg: '',
    teamLeadSign: '',
    members: emptyMembers(2),
    witnesses: ['', ''],
    committeeComments: '',
    committeeSignature: '',
    date: new Date().toISOString().split('T')[0],
  });

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!form.teamLead.trim() || !form.teamLeadReg.trim()) {
      Toast.show({ type: 'error', text1: 'Team lead name and registration no. are required' });
      return;
    }
    setSubmitting(true);
    try {
      await submitStudentForm('consent', form);
      Toast.show({ type: 'success', text1: 'Form submitted successfully' });
      onDone();
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Submission failed',
        text2: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.formBody}>
      <SectionTitle>Team Lead</SectionTitle>
      <FormLabel required>Team Lead Name</FormLabel>
      <FormInput value={form.teamLead} onChangeText={(v) => set('teamLead', v)} />
      <FormLabel required>Team Lead Registration No.</FormLabel>
      <FormInput value={form.teamLeadReg} onChangeText={(v) => set('teamLeadReg', v)} />
      <FormLabel>Team Lead Signature</FormLabel>
      <FormInput value={form.teamLeadSign} onChangeText={(v) => set('teamLeadSign', v)} />

      <SectionTitle>Other Team Members</SectionTitle>
      <MembersBlock
        members={form.members}
        onChange={(i, field, value) => {
          setForm((prev) => {
            const members = [...prev.members];
            members[i] = { ...members[i], [field]: value };
            return { ...prev, members };
          });
        }}
      />

      <SectionTitle>Witnesses</SectionTitle>
      {form.witnesses.map((w, i) => (
        <View key={i} style={styles.witnessRow}>
          <FormLabel>Witness {i + 1}</FormLabel>
          <FormInput
            value={w}
            onChangeText={(v) => {
              setForm((prev) => {
                const witnesses = [...prev.witnesses];
                witnesses[i] = v;
                return { ...prev, witnesses };
              });
            }}
          />
        </View>
      ))}

      <SectionTitle>Committee (Optional)</SectionTitle>
      <OfficeFieldsNote />
      <FormLabel>Comments by FYP Committee</FormLabel>
      <FormInput
        value={form.committeeComments}
        onChangeText={(v) => set('committeeComments', v)}
        multiline
      />
      <FormLabel>Committee Signature</FormLabel>
      <FormInput
        value={form.committeeSignature}
        onChangeText={(v) => set('committeeSignature', v)}
      />
      <FormLabel>Date</FormLabel>
      <FormInput value={form.date} onChangeText={(v) => set('date', v)} />

      <SubmitBar submitting={submitting} onSubmit={submit} />
    </View>
  );
}

function ExtensionFormBody({ onDone }: { onDone: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    projectTitle: '',
    reason: '',
    requestedExtension: '',
    members: emptyMembers(3),
    supportingDocs: '',
  });

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async () => {
    if (!form.projectTitle.trim() || !form.reason.trim() || !form.requestedExtension.trim()) {
      Toast.show({ type: 'error', text1: 'Project title, reason, and extension period are required' });
      return;
    }
    setSubmitting(true);
    try {
      await submitStudentForm('extension', form);
      Toast.show({ type: 'success', text1: 'Form submitted successfully' });
      onDone();
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Submission failed',
        text2: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.formBody}>
      <FormLabel required>Project Title</FormLabel>
      <FormInput value={form.projectTitle} onChangeText={(v) => set('projectTitle', v)} />
      <FormLabel required>Reason for Extension</FormLabel>
      <FormInput value={form.reason} onChangeText={(v) => set('reason', v)} multiline />
      <FormLabel required>Requested Extension</FormLabel>
      <FormInput
        value={form.requestedExtension}
        onChangeText={(v) => set('requestedExtension', v)}
        placeholder="e.g. 2 weeks"
      />

      <SectionTitle>Team Members</SectionTitle>
      <MembersBlock
        members={form.members}
        onChange={(i, field, value) => {
          setForm((prev) => {
            const members = [...prev.members];
            members[i] = { ...members[i], [field]: value };
            return { ...prev, members };
          });
        }}
      />

      <FormLabel>Supporting Documents</FormLabel>
      <FormInput
        value={form.supportingDocs}
        onChangeText={(v) => set('supportingDocs', v)}
        placeholder="Optional — describe or link documents"
      />

      <SubmitBar submitting={submitting} onSubmit={submit} />
    </View>
  );
}

function ReEvalFormBody({ onDone }: { onDone: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    courseOrComponent: '',
    reason: '',
    members: emptyMembers(3),
    supportingDocs: '',
  });

  const submit = async () => {
    if (!form.courseOrComponent.trim() || !form.reason.trim()) {
      Toast.show({ type: 'error', text1: 'Course/component and reason are required' });
      return;
    }
    setSubmitting(true);
    try {
      await submitStudentForm('reeval', form);
      Toast.show({ type: 'success', text1: 'Form submitted successfully' });
      onDone();
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Submission failed',
        text2: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.formBody}>
      <FormLabel required>Course / Component</FormLabel>
      <FormInput
        value={form.courseOrComponent}
        onChangeText={(v) =>
          setForm((prev) => ({ ...prev, courseOrComponent: v }))
        }
      />
      <FormLabel required>Reason for Appeal</FormLabel>
      <FormInput
        value={form.reason}
        onChangeText={(v) => setForm((prev) => ({ ...prev, reason: v }))}
        multiline
      />

      <SectionTitle>Team Members</SectionTitle>
      <MembersBlock
        members={form.members}
        onChange={(i, field, value) => {
          setForm((prev) => {
            const members = [...prev.members];
            members[i] = { ...members[i], [field]: value };
            return { ...prev, members };
          });
        }}
      />

      <FormLabel>Supporting Documents</FormLabel>
      <FormInput
        value={form.supportingDocs}
        onChangeText={(v) => setForm((prev) => ({ ...prev, supportingDocs: v }))}
        placeholder="Optional"
      />

      <SubmitBar submitting={submitting} onSubmit={submit} />
    </View>
  );
}

function GeneralFormBody({ onDone }: { onDone: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    subject: '',
    description: '',
    members: emptyMembers(3),
    supportingDocs: '',
  });

  const submit = async () => {
    if (!form.subject.trim() || !form.description.trim()) {
      Toast.show({ type: 'error', text1: 'Subject and description are required' });
      return;
    }
    setSubmitting(true);
    try {
      await submitStudentForm('general', form);
      Toast.show({ type: 'success', text1: 'Form submitted successfully' });
      onDone();
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: 'Submission failed',
        text2: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.formBody}>
      <FormLabel required>Subject</FormLabel>
      <FormInput
        value={form.subject}
        onChangeText={(v) => setForm((prev) => ({ ...prev, subject: v }))}
      />
      <FormLabel required>Description of Issue / Request</FormLabel>
      <FormInput
        value={form.description}
        onChangeText={(v) => setForm((prev) => ({ ...prev, description: v }))}
        multiline
      />

      <SectionTitle>Team Members</SectionTitle>
      <MembersBlock
        members={form.members}
        onChange={(i, field, value) => {
          setForm((prev) => {
            const members = [...prev.members];
            members[i] = { ...members[i], [field]: value };
            return { ...prev, members };
          });
        }}
      />

      <FormLabel>Supporting Documents</FormLabel>
      <FormInput
        value={form.supportingDocs}
        onChangeText={(v) => setForm((prev) => ({ ...prev, supportingDocs: v }))}
        placeholder="Optional"
      />

      <SubmitBar submitting={submitting} onSubmit={submit} />
    </View>
  );
}

export function StudentFormsScreen() {
  const [activeTab, setActiveTab] = useState<StudentFormTabKey>('supervisor');
  const [formKey, setFormKey] = useState(0);

  const activeMeta = STUDENT_FORM_TABS.find((t) => t.key === activeTab)!;

  const resetForm = () => setFormKey((k) => k + 1);

  const renderForm = () => {
    const props = { key: `${activeTab}-${formKey}`, onDone: resetForm };
    switch (activeTab) {
      case 'supervisor':
        return <SupervisorChangeFormBody {...props} />;
      case 'consent':
        return <ConsentFormBody {...props} />;
      case 'extension':
        return <ExtensionFormBody {...props} />;
      case 'reeval':
        return <ReEvalFormBody {...props} />;
      case 'general':
        return <GeneralFormBody {...props} />;
      default:
        return null;
    }
  };

  return (
    <PortalScreenLayout
      title="FYP Forms"
      subtitle="Select a form type and submit for committee review">
      <Text style={styles.pickTitle}>Choose a form</Text>
      <View style={styles.typeList}>
        {STUDENT_FORM_TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[styles.typeCard, active && styles.typeCardActive]}
              onPress={() => setActiveTab(tab.key)}>
              <View style={[styles.typeIconWrap, active && styles.typeIconWrapActive]}>
                <FeatherIcon
                  name={tab.icon}
                  size={20}
                  color={active ? '#fff' : '#2563eb'}
                />
              </View>
              <View style={styles.typeTextWrap}>
                <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>
                  {tab.label}
                </Text>
                <Text
                  style={[styles.typeDesc, active && styles.typeDescActive]}
                  numberOfLines={2}>
                  {tab.description}
                </Text>
              </View>
              {active ? (
                <View style={styles.selectedPill}>
                  <Text style={styles.selectedPillText}>Selected</Text>
                </View>
              ) : (
                <FeatherIcon name="chevron-right" size={20} color="#9ca3af" />
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.formCard}>
        <View style={styles.formCardHeader}>
          <FeatherIcon name={activeMeta.icon} size={22} color="#2563eb" />
          <Text style={styles.formCardTitle}>{activeMeta.label} Form</Text>
        </View>
        {renderForm()}
      </View>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  pickTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 10,
  },
  typeList: { gap: 10, marginBottom: 16 },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
  },
  typeCardActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  typeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconWrapActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  typeTextWrap: { flex: 1 },
  typeLabel: { fontSize: 15, fontWeight: '700', color: '#111827' },
  typeLabelActive: { color: '#fff' },
  typeDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  typeDescActive: { color: '#dbeafe' },
  selectedPill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  selectedPillText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  formCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  formCardTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  formBody: { gap: 4, paddingBottom: 24 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 10, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fafafa',
  },
  textArea: { minHeight: 88, paddingTop: 12 },
  membersBlock: { gap: 10 },
  memberCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
  },
  memberHeading: { fontSize: 13, fontWeight: '700', color: '#4b5563', marginBottom: 4 },
  witnessRow: { marginBottom: 4 },
  officeNote: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 8,
    lineHeight: 18,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16a34a',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 20,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
