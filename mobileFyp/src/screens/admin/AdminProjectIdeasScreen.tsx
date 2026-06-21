import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { EmptyState } from '../../components/portal/EmptyState';
import { LoadingView } from '../../components/portal/LoadingView';
import { PortalScreenLayout } from '../../components/portal/PortalScreenLayout';
import { SheetModal, sheetStyles } from '../../components/portal/SheetModal';
import {
  createFacultyProjectIdea,
  deleteProjectIdea,
  fetchFacultyProjectIdeas,
} from '../../services/adminService';
import {
  filterProjectIdeas,
  formatProjectIdea,
  type FormattedProjectIdea,
} from '../../utils/projectIdeas';

export function AdminProjectIdeasScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<FormattedProjectIdea[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    domain: '',
    requirements: '',
    tools: '',
  });

  const loadData = useCallback(async () => {
    try {
      const data = await fetchFacultyProjectIdeas();
      const list = Array.isArray(data) ? data : [];
      setProjects(list.map(formatProjectIdea));
    } catch {
      Alert.alert(
        'Load failed',
        'Could not load project ideas. Check your connection to the server.',
      );
      setProjects([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredProjects = useMemo(
    () => filterProjectIdeas(projects, searchQuery),
    [projects, searchQuery],
  );

  const resetForm = () => {
    setForm({ title: '', description: '', domain: '', requirements: '', tools: '' });
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      Alert.alert('Required', 'Title and description are required.');
      return;
    }
    setSaving(true);
    try {
      await createFacultyProjectIdea({
        title: form.title.trim(),
        description: form.description.trim(),
        domain: form.domain.trim() || undefined,
        requirements: form.requirements.trim() || undefined,
        tools: form.tools.trim() || undefined,
      });
      setFormOpen(false);
      resetForm();
      await loadData();
      Alert.alert('Success', 'Project idea published for students.');
    } catch {
      Alert.alert('Error', 'Failed to create project idea.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (project: FormattedProjectIdea) => {
    Alert.alert('Delete idea?', `Remove "${project.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProjectIdea(project.id);
            await loadData();
          } catch {
            Alert.alert('Error', 'Failed to delete project idea.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return <LoadingView message="Loading project ideas..." />;
  }

  return (
    <PortalScreenLayout
      title="Project Ideas"
      subtitle="Publish FYP ideas for students"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
      <View style={styles.headerRow}>
        <Text style={styles.countText}>{projects.length} ideas published</Text>
        <Pressable style={styles.addBtn} onPress={() => setFormOpen(true)}>
          <FeatherIcon name="plus" size={14} color="#fff" />
          <Text style={styles.addBtnText}>Add Idea</Text>
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <FeatherIcon name="search" size={16} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search ideas..."
          placeholderTextColor="#9ca3af"
        />
      </View>

      {filteredProjects.length === 0 ? (
        <EmptyState
          title="No project ideas"
          message="Add an idea for students to browse during registration and project selection."
        />
      ) : (
        filteredProjects.map(project => (
          <View key={project.id} style={styles.card}>
            <Text style={styles.cardTitle}>{project.title}</Text>
            <Text style={styles.cardMeta}>
              {project.department} · {project.postedAt}
            </Text>
            {project.description ? (
              <Text style={styles.cardDesc} numberOfLines={3}>
                {project.description}
              </Text>
            ) : null}
            <View style={styles.cardActions}>
              <Pressable style={styles.deleteBtn} onPress={() => handleDelete(project)}>
                <FeatherIcon name="trash-2" size={14} color="#dc2626" />
                <Text style={styles.deleteBtnText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      <SheetModal
        visible={formOpen}
        onClose={() => {
          setFormOpen(false);
          resetForm();
        }}
        title="Add Project Idea"
        subtitle="Students will see this in Project Ideas"
        footer={
          <View style={sheetStyles.footerRow}>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
              onPress={() => {
                setFormOpen(false);
                resetForm();
              }}>
              <Text style={sheetStyles.footerBtnCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[sheetStyles.footerBtn, sheetStyles.footerBtnPrimary]}
              onPress={handleCreate}
              disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={sheetStyles.footerBtnPrimaryText}>Publish</Text>
              )}
            </Pressable>
          </View>
        }>
        <TextInput
          style={styles.input}
          placeholder="Project title *"
          placeholderTextColor="#9ca3af"
          value={form.title}
          onChangeText={v => setForm(p => ({ ...p, title: v }))}
        />
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description *"
          placeholderTextColor="#9ca3af"
          multiline
          value={form.description}
          onChangeText={v => setForm(p => ({ ...p, description: v }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Domain (e.g. AI, Web, IoT)"
          placeholderTextColor="#9ca3af"
          value={form.domain}
          onChangeText={v => setForm(p => ({ ...p, domain: v }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Requirements (comma-separated)"
          placeholderTextColor="#9ca3af"
          value={form.requirements}
          onChangeText={v => setForm(p => ({ ...p, requirements: v }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Tools (comma-separated)"
          placeholderTextColor="#9ca3af"
          value={form.tools}
          onChangeText={v => setForm(p => ({ ...p, tools: v }))}
        />
      </SheetModal>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  countText: { fontSize: 12, color: '#6b7280' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#16a34a',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  searchInput: { flex: 1, fontSize: 13, color: '#111827', paddingVertical: 11 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardMeta: { fontSize: 11, color: '#6b7280', marginBottom: 6 },
  cardDesc: { fontSize: 13, color: '#374151', lineHeight: 18 },
  cardActions: { flexDirection: 'row', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
  },
  deleteBtnText: { fontSize: 12, fontWeight: '600', color: '#dc2626' },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: '#111827',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
});
