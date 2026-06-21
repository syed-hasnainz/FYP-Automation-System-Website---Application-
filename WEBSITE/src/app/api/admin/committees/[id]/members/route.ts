import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT /api/admin/committees/[id]/members - Update committee members
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = request.headers.get('x-user-id')
    const { memberIds } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if committee exists and user is the head
    const committee = await db.committee.findUnique({
      where: { id }
    })

    if (!committee) {
      return NextResponse.json({ error: 'Committee not found' }, { status: 404 })
    }

    if (committee.chairpersonId !== userId) {
      return NextResponse.json({ error: 'Unauthorized. Only committee head can update members.' }, { status: 403 })
    }

    // Update committee members
    const updatedCommittee = await db.committee.update({
      where: { id },
      data: {
        members: memberIds && Array.isArray(memberIds) ? JSON.stringify(memberIds) : committee.members
      }
    })

    return NextResponse.json({ 
      message: 'Committee members updated successfully',
      memberIds: memberIds || []
    })
  } catch (error) {
    console.error('Error updating committee members:', error)
    return NextResponse.json(
      { error: 'Failed to update committee members' },
      { status: 500 }
    )
  }
}

