import type { ProjectIdea } from '../services/studentService';

export type FormattedProjectIdea = {
  id: string;
  title: string;
  description: string;
  teacher: string;
  teacherId?: string;
  department: string;
  postedAt: string;
  tags: string[];
  email: string;
  requirements: string[];
  duration: string;
  teamSize: string;
  status?: string;
};

export function formatProjectIdea(project: ProjectIdea): FormattedProjectIdea {
  const requirementsStr = project.requirements ? String(project.requirements) : '';
  const requirementsArray = requirementsStr
    ? requirementsStr.split(',').map((item) => item.trim()).filter(Boolean)
    : [];

  const teacherName =
    project.teacher?.name || project.supervisor?.name || 'Unknown Teacher';
  const department =
    project.teacher?.department ||
    project.supervisor?.department ||
    'Computer Science';

  let postedAt = 'Recently';
  if (project.createdAt) {
    const parsed = new Date(project.createdAt);
    postedAt = Number.isNaN(parsed.getTime())
      ? 'Recently'
      : parsed.toLocaleDateString();
  }

  const tags: string[] = [];
  if (project.domain?.trim()) {
    tags.push(project.domain.trim());
  }
  if (requirementsArray.length > 0) {
    for (const req of requirementsArray) {
      if (!tags.includes(req)) {
        tags.push(req);
      }
    }
  }
  if (project.tools?.trim()) {
    const toolTags = project.tools.split(',').map((t) => t.trim()).filter(Boolean);
    for (const tool of toolTags.slice(0, 3)) {
      if (!tags.includes(tool)) {
        tags.push(tool);
      }
    }
  }
  if (tags.length === 0) {
    tags.push('FYP');
  }

  return {
    id: project.id,
    title: project.title,
    description: project.description || '',
    teacher: teacherName,
    teacherId: project.teacher?.id || project.supervisor?.id,
    department,
    postedAt,
    tags: tags.slice(0, 6),
    email: project.teacher?.email || project.supervisor?.email || '',
    requirements:
      requirementsArray.length > 0 ? requirementsArray : ['No specific requirements'],
    duration: '6 months',
    teamSize: '2-3 students',
    status: project.status,
  };
}

export function filterProjectIdeas(
  projects: FormattedProjectIdea[],
  searchQuery: string,
) {
  const q = searchQuery.trim().toLowerCase();
  if (!q) {
    return projects;
  }

  return projects.filter(
    (project) =>
      project.title.toLowerCase().includes(q) ||
      project.description.toLowerCase().includes(q) ||
      project.teacher.toLowerCase().includes(q) ||
      project.department.toLowerCase().includes(q) ||
      project.tags.some((tag) => tag.toLowerCase().includes(q)),
  );
}
