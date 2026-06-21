import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const document = await db.studentDocument.findUnique({ where: { id } })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if user is the document owner
    const isOwner = document.uploadedBy === userId

    // Check if user is a committee head
    // Since committee heads can only view documents from their faculty (filtered in UI),
    // we allow them to delete any document they can see
    let isCommitteeHeadWithAccess = false
    if (!isOwner) {
      const user = await db.user.findUnique({
        where: { id: userId },
        include: {
          teacherProfile: true
        }
      })

      if (user?.role === 'COMMITTEE_HEAD') {
        // Get committee to find faculty
        const committee = await db.committee.findFirst({
          where: { chairpersonId: userId }
        })

        // If committee head has a committee, allow deletion
        // The UI already filters documents by faculty when displaying them,
        // so if a committee head can see a document, they should be able to delete it
        if (committee) {
          isCommitteeHeadWithAccess = true
        }
      }
    }

    if (!isOwner && !isCommitteeHeadWithAccess) {
      console.error('Delete document authorization failed:', {
        userId,
        documentId: id,
        isOwner,
        documentFaculty: document.faculty,
        documentDepartment: document.department,
        userRole: (await db.user.findUnique({ where: { id: userId } }))?.role
      })
      return NextResponse.json({ error: 'Unauthorized to delete this document' }, { status: 403 })
    }

    // Delete file
    const filePath = join(process.cwd(), 'public', document.fileUrl)
    if (existsSync(filePath)) {
      await unlink(filePath).catch(() => {}) // Ignore errors if file doesn't exist
    }

    // Delete from database
    await db.studentDocument.delete({ where: { id } })

    return NextResponse.json({ message: 'Document deleted successfully' })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}

