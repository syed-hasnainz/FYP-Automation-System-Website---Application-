import React, { useCallback, useMemo, useState } from 'react';
import {
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
import { DetailRow, SheetModal, sheetStyles } from '../../components/portal/SheetModal';
import { usePortalNavigation } from '../../components/portal/portalNavigation';
import { fetchProjectIdeas } from '../../services/studentService';
import {
  filterProjectIdeas,
  formatProjectIdea,
  type FormattedProjectIdea,
} from '../../utils/projectIdeas';

export function StudentProjectsScreen() {
  const { navigateTo } = usePortalNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState<FormattedProjectIdea[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<FormattedProjectIdea | null>(
    null,
  );

  const loadData = useCallback(async () => {
    try {
      const data = await fetchProjectIdeas();
      const list = Array.isArray(data) ? data : [];
      setProjects(list.map(formatProjectIdea));
    } catch {
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

  const handleContactTeacher = useCallback(() => {
    setSelectedProject(null);
    navigateTo('Messages');
  }, [navigateTo]);

  if (loading) {
    return <LoadingView message="Loading project ideas..." />;
  }

  return (
    <PortalScreenLayout
      title="Project Ideas"
      subtitle="Browse available FYP projects"
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        loadData();
      }}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Available Project Ideas</Text>
      </View>

      <View style={styles.searchWrap}>
        <FeatherIcon name="search" size={18} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search projects..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 ? (
          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
            <FeatherIcon name="x-circle" size={18} color="#9ca3af" />
          </Pressable>
        ) : null}
      </View>

      {filteredProjects.length === 0 ? (
        <EmptyState
          icon="search"
          title={projects.length === 0 ? 'No project ideas' : 'No projects found'}
          message={
            projects.length === 0
              ? 'Teachers have not posted project ideas yet.'
              : 'Try a different search term.'
          }
        />
      ) : (
        filteredProjects.map((project) => (
          <View key={project.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.deptBadge}>
                <Text style={styles.deptBadgeText}>{project.department}</Text>
              </View>
              <Text style={styles.dateText}>{project.postedAt}</Text>
            </View>

            <Text style={styles.cardTitle}>{project.title}</Text>
            {project.description ? (
              <Text style={styles.cardDesc} numberOfLines={3}>
                {project.description}
              </Text>
            ) : null}

            <View style={styles.tagsRow}>
              {project.tags.map((tag) => (
                <View key={`${project.id}-${tag}`} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.postedBy} numberOfLines={1}>
                <Text style={styles.postedByLabel}>Posted by: </Text>
                {project.teacher}
              </Text>
              <View style={styles.actions}>
                <Pressable
                  style={styles.viewBtn}
                  onPress={() => setSelectedProject(project)}>
                  <FeatherIcon name="eye" size={14} color="#111827" />
                  <Text style={styles.viewBtnText}>View Details</Text>
                </Pressable>
                <Pressable style={styles.contactBtn} onPress={handleContactTeacher}>
                  <FeatherIcon name="mail" size={14} color="#fff" />
                  <Text style={styles.contactBtnText}>Contact</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))
      )}

      <SheetModal
        visible={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        title={selectedProject?.title ?? 'Project Details'}
        subtitle={selectedProject?.department}
        footer={
          selectedProject ? (
            <View style={sheetStyles.footerRow}>
              <Pressable
                style={[sheetStyles.footerBtn, sheetStyles.footerBtnCancel]}
                onPress={() => setSelectedProject(null)}>
                <Text style={sheetStyles.footerBtnCancelText}>Close</Text>
              </Pressable>
              <Pressable
                style={[sheetStyles.footerBtn, styles.contactFooterBtn]}
                onPress={handleContactTeacher}>
                <FeatherIcon name="mail" size={16} color="#fff" />
                <Text style={[sheetStyles.footerBtnPrimaryText, styles.contactFooterText]}>
                  Contact Teacher
                </Text>
              </Pressable>
            </View>
          ) : null
        }>
        {selectedProject ? (
          <>
            <Text style={styles.modalSectionTitle}>Description</Text>
            <Text style={styles.modalBodyText}>{selectedProject.description}</Text>

            <DetailRow icon="user" label="Teacher" value={selectedProject.teacher} />
            {selectedProject.email ? (
              <DetailRow icon="mail" label="Email" value={selectedProject.email} />
            ) : null}
            <DetailRow
              icon="briefcase"
              label="Department"
              value={selectedProject.department}
            />
            <DetailRow icon="clock" label="Duration" value={selectedProject.duration} />
            <DetailRow icon="users" label="Team Size" value={selectedProject.teamSize} />
            {selectedProject.status ? (
              <DetailRow icon="flag" label="Status" value={selectedProject.status} />
            ) : null}

            <Text style={styles.modalSectionTitle}>Technical Requirements</Text>
            <View style={styles.tagsRow}>
              {selectedProject.requirements.map((req) => (
                <View key={`req-${req}`} style={styles.reqTag}>
                  <Text style={styles.reqTagText}>{req}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.modalSectionTitle}>Tags</Text>
            <View style={styles.tagsRow}>
              {selectedProject.tags.map((tag) => (
                <View key={`modal-tag-${tag}`} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}
      </SheetModal>
    </PortalScreenLayout>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    minHeight: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  deptBadge: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    maxWidth: '65%',
  },
  deptBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
  dateText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  cardDesc: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 10,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tag: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4b5563',
  },
  reqTag: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reqTagText: {
    fontSize: 12,
    color: '#374151',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
    gap: 10,
  },
  postedBy: {
    fontSize: 12,
    color: '#6b7280',
  },
  postedByLabel: {
    fontWeight: '600',
    color: '#4b5563',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
    paddingVertical: 10,
    backgroundColor: '#111827',
  },
  contactBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    marginTop: 4,
  },
  modalBodyText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 21,
    marginBottom: 12,
  },
  contactFooterBtn: {
    flex: 1.4,
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#111827',
  },
  contactFooterText: {
    marginLeft: 0,
  },
});
