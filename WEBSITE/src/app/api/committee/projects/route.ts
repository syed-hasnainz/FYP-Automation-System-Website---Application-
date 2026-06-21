import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Get all projects with approved proposals for Committee Head review
export async function GET(request: NextRequest) {
  try {
    // Fetch all project submissions that are proposals and have been approved by Committee Head or Super Admin
    const approvedProposals = await db.projectSubmission.findMany({
      where: {
        fileType: 'PROPOSAL',
        status: {
          in: ['COMMITTEE_APPROVED', 'ADMIN_APPROVED']
        }
      },
      include: {
        project: {
          include: {
            group: {
              include: {
                members: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        rollNumber: true,
                        department: true,
                      },
                    },
                  },
                },
              },
            },
            supervisor: {
              select: {
                id: true,
                name: true,
                email: true,
                department: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            rollNumber: true,
            department: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Transform the data to show proposal details with project information
    const projectsWithProposals = approvedProposals.map((proposal) => ({
      id: proposal.id, // Use proposal ID as the main ID
      proposalId: proposal.id,
      proposalTitle: proposal.title, // The title from the proposal submission
      proposalDescription: proposal.description,
      projectId: proposal.projectId,
      projectTitle: proposal.project?.title || proposal.title, // Fallback to proposal title if no project
      projectStatus: proposal.project?.status || 'PROPOSED',
      projectDescription: proposal.project?.description || proposal.description,
      status: proposal.status, // COMMITTEE_APPROVED or ADMIN_APPROVED
      fileUrl: proposal.fileUrl,
      fileName: proposal.fileName,
      submittedDate: proposal.createdAt,
      approvedDate: proposal.updatedAt,
      supervisorRemarks: proposal.supervisorRemarks,
      adminRemarks: proposal.adminRemarks,
      committeeRemarks: proposal.committeeRemarks,
      // Group information
      group: proposal.project?.group ? {
        id: proposal.project.group.id,
        name: proposal.project.group.name,
        members: proposal.project.group.members.map((member: any) => ({
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          rollNumber: member.user.rollNumber,
          department: member.user.department,
        })),
      } : null,
      // Supervisor information
      supervisor: proposal.project?.supervisor || null,
      // Student who submitted
      submittedBy: {
        id: proposal.student.id,
        name: proposal.student.name,
        email: proposal.student.email,
        rollNumber: proposal.student.rollNumber,
        department: proposal.student.department,
      },
    }));

    // Also fetch teacher-composed and student-proposed project ideas
    // For admins/committee heads: show all ideas regardless of status
    const userRole = request.headers.get('x-user-role') || '';
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'COMMITTEE_HEAD';
    
    const teacherComposedWhere: any = {
      isFacultyProposed: true,
    };
    
    if (!isAdmin) {
      // For students: only show available ideas
      teacherComposedWhere.status = 'PROPOSED';
      teacherComposedWhere.groupId = null;
    }
    
    const teacherComposedIdeas = await db.project.findMany({
      where: teacherComposedWhere,
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const studentProposedWhere: any = {
      isFacultyProposed: false,
      teacher: {
        role: 'STUDENT' // Ensure creator is a student
      }
    };
    
    if (!isAdmin) {
      // For students: only show available ideas
      studentProposedWhere.status = 'PROPOSED';
      studentProposedWhere.groupId = null;
    }
    
    const studentProposedIdeas = await db.project.findMany({
      where: studentProposedWhere,
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            role: true,
            rollNumber: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Transform teacher-composed ideas to match the format
    const teacherIdeasFormatted = teacherComposedIdeas.map((idea) => ({
      id: `idea-${idea.id}`,
      proposalId: null,
      proposalTitle: idea.title,
      proposalDescription: idea.description,
      projectId: idea.id,
      projectTitle: idea.title,
      projectStatus: idea.status,
      projectDescription: idea.description,
      status: 'PROPOSED_IDEA',
      fileUrl: null,
      fileName: null,
      submittedDate: idea.createdAt,
      approvedDate: null,
      supervisorRemarks: null,
      adminRemarks: null,
      committeeRemarks: null,
      group: null,
      supervisor: null,
      submittedBy: {
        id: idea.teacher.id,
        name: idea.teacher.name,
        email: idea.teacher.email,
        rollNumber: null,
        department: idea.teacher.department,
      },
      isFacultyProposed: true,
      isProjectIdea: true,
    }));

    // Transform student-proposed ideas to match the format
    const studentIdeasFormatted = studentProposedIdeas.map((idea) => ({
      id: `idea-${idea.id}`,
      proposalId: null,
      proposalTitle: idea.title,
      proposalDescription: idea.description,
      projectId: idea.id,
      projectTitle: idea.title,
      projectStatus: idea.status,
      projectDescription: idea.description,
      status: 'PROPOSED_IDEA',
      fileUrl: null,
      fileName: null,
      submittedDate: idea.createdAt,
      approvedDate: null,
      supervisorRemarks: null,
      adminRemarks: null,
      committeeRemarks: null,
      group: null,
      supervisor: null,
      submittedBy: {
        id: idea.teacher.id,
        name: idea.teacher.name,
        email: idea.teacher.email,
        rollNumber: idea.teacher.rollNumber,
        department: idea.teacher.department,
      },
      isFacultyProposed: false,
      isProjectIdea: true,
    }));

    // Combine all projects: approved proposals + teacher ideas + student ideas
    const allProjects = [...projectsWithProposals, ...teacherIdeasFormatted, ...studentIdeasFormatted];

    return NextResponse.json(allProjects);
  } catch (error) {
    console.error('Error fetching approved projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch approved projects' },
      { status: 500 }
    );
  }
}

