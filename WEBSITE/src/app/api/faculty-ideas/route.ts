import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/faculty-ideas - Get all faculty-proposed project ideas
export async function GET(request: NextRequest) {
  try {
    // Check if request is from admin/committee head (they should see all ideas)
    const userRole = request.headers.get('x-user-role') || '';
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'COMMITTEE_HEAD';
    
    // For students: only show available ideas (PROPOSED, not taken)
    // For admins/committee heads: show all faculty ideas regardless of status
    const whereClause: any = {
      isFacultyProposed: true,
    };
    
    if (!isAdmin) {
      // For students: only show available ideas
      whereClause.status = 'PROPOSED';
      whereClause.groupId = null;
    }
    // For admins: show all faculty ideas (including taken ones)
    
    const facultyIdeas = await db.project.findMany({
      where: whereClause,
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
            teacherProfile: {
              select: {
                designation: true,
                supervisionCapacity: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate teacher availability for each project
    const ideasWithAvailability = await Promise.all(
      facultyIdeas.map(async (idea) => {
        const teacherActiveProjects = await db.project.count({
          where: {
            supervisorId: idea.teacherId,
            status: {
              in: ['PROPOSED', 'APPROVED', 'IN_PROGRESS'],
            },
          },
        });

        const capacity = idea.teacher.teacherProfile?.supervisionCapacity || 4;
        const isAvailable = teacherActiveProjects < capacity;

        return {
          ...idea,
          teacher: {
            ...idea.teacher,
            isAvailable,
            activeProjects: teacherActiveProjects,
            capacity,
          },
        };
      })
    );

    return NextResponse.json(ideasWithAvailability);
  } catch (error) {
    console.error('Error fetching faculty ideas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch faculty ideas' },
      { status: 500 }
    );
  }
}

// POST /api/faculty-ideas - Create a new faculty-proposed project idea (teacher only)
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a teacher
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== 'TEACHER') {
      return NextResponse.json(
        { error: 'Only teachers can propose project ideas' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, domain, objectives, requirements, tools } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    const newIdea = await db.project.create({
      data: {
        title,
        description,
        domain: domain || null,
        objectives: objectives || null,
        requirements: requirements || null,
        tools: tools || null,
        isFacultyProposed: true,
        status: 'PROPOSED',
        teacherId: userId,
      },
      include: {
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
    });

    return NextResponse.json(newIdea, { status: 201 });
  } catch (error) {
    console.error('Error creating faculty idea:', error);
    return NextResponse.json(
      { error: 'Failed to create faculty idea' },
      { status: 500 }
    );
  }
}
