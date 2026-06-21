import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// DELETE /api/admin/committees/[id]/members/[memberId] - Remove member from committee
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  try {
    const { id, memberId } = await params
    const userId = request.headers.get('x-user-id')

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
      return NextResponse.json({ error: 'Unauthorized. Only committee head can remove members.' }, { status: 403 })
    }

    // Get current members
    const currentMembers = committee.members ? JSON.parse(committee.members) : []
    
    // Remove the member
    const updatedMembers = currentMembers.filter((mId: string) => mId !== memberId)

    // Update committee
    await db.committee.update({
      where: { id },
      data: {
        members: JSON.stringify(updatedMembers)
      }
    })

    return NextResponse.json({ 
      message: 'Member removed successfully',
      memberIds: updatedMembers
    })
  } catch (error) {
    console.error('Error removing member:', error)
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    )
  }
}

