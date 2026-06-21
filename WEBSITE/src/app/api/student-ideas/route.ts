import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/student-ideas - Get all student-proposed project ideas
export async function GET(request: NextRequest) {
  try {
    // Check if request is from admin/committee head (they should see all ideas)
    const userRole = request.headers.get('x-user-role') || '';
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'COMMITTEE_HEAD';
    
    // For students: only show available ideas (PROPOSED, not taken)
    // For admins/committee heads: show all student ideas regardless of status
    const whereClause: any = {
      isFacultyProposed: false,
      teacher: {
        role: 'STUDENT' // Ensure the creator is actually a student, not a teacher
      }
    };
    
    if (!isAdmin) {
      // For students: only show available ideas
      whereClause.status = 'PROPOSED';
      whereClause.groupId = null;
    }
    // For admins: show all student ideas (including taken ones)
    
    const studentIdeas = await db.project.findMany({
      where: whereClause,
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

    return NextResponse.json(studentIdeas);
  } catch (error) {
    console.error('Error fetching student ideas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student ideas' },
      { status: 500 }
    );
  }
}

// POST /api/student-ideas - Create a new student-proposed project idea
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is a student
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Only students can propose project ideas' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, requirements } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Create project idea with student as the "teacher" (creator)
    // isFacultyProposed is false to indicate it's a student proposal
    const newIdea = await db.project.create({
      data: {
        title,
        description,
        requirements: requirements || null,
        isFacultyProposed: false,
        status: 'PROPOSED',
        teacherId: userId, // Student's ID as the creator
      },
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
    });

    return NextResponse.json(newIdea, { status: 201 });
  } catch (error) {
    console.error('Error creating student idea:', error);
    return NextResponse.json(
      { error: 'Failed to create student idea' },
      { status: 500 }
    );
  }
}

