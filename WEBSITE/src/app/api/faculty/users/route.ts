import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/faculty/users - Get students and teachers by faculty
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const { searchParams } = new URL(request.url)
    const faculty = searchParams.get('faculty')
    const role = searchParams.get('role') // STUDENT or TEACHER

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the committee head's committee to get their faculty
    const committeeHead = await db.user.findUnique({
      where: { id: userId },
      include: {
        teacherProfile: true
      }
    })

    if (!committeeHead || committeeHead.role !== 'COMMITTEE_HEAD') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get committee to find faculty/department
    const committee = await db.committee.findFirst({
      where: { chairpersonId: userId }
    })

    // Get faculty from committee head's teacher profile, committee name, or department
    const committeeHeadFaculty = committeeHead?.teacherProfile?.faculty || committee?.name || committeeHead?.department || null

    // Build where clause
    const where: any = {
      role: role
    }
    
    if (role === 'STUDENT') {
      if (faculty) {
        where.studentProfile = {
          faculty: faculty
        }
      } else if (committeeHeadFaculty) {
        where.studentProfile = {
          faculty: committeeHeadFaculty
        }
      }
      // If still no match, try by department
      if (!where.studentProfile && committeeHead?.department) {
        where.department = committeeHead.department
      }
    } else if (role === 'TEACHER') {
      if (faculty) {
        where.teacherProfile = {
          faculty: faculty
        }
      } else if (committeeHeadFaculty) {
        where.teacherProfile = {
          faculty: committeeHeadFaculty
        }
      }
      // If still no match, try by department
      if (!where.teacherProfile && committeeHead?.department) {
        where.department = committeeHead.department
      }
    }

    const users = await db.user.findMany({
      where,
      include: {
        studentProfile: role === 'STUDENT',
        teacherProfile: role === 'TEACHER'
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Format response
    const formattedUsers = users.map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      profileImage: user.profileImage,
      rollNumber: user.rollNumber,
      ...(role === 'STUDENT' && user.studentProfile ? {
        semester: user.studentProfile.semester,
        batch: user.studentProfile.batch,
        cgpa: user.studentProfile.cgpa,
        faculty: user.studentProfile.faculty
      } : {}),
      ...(role === 'TEACHER' && user.teacherProfile ? {
        designation: user.teacherProfile.designation,
        employeeId: user.teacherProfile.employeeId,
        officeHours: user.teacherProfile.officeHours,
        supervisionCapacity: user.teacherProfile.supervisionCapacity,
        faculty: user.teacherProfile.faculty
      } : {})
    }))

    return NextResponse.json(formattedUsers)
  } catch (error) {
    console.error('Error fetching faculty users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch faculty users' },
      { status: 500 }
    )
  }
}

