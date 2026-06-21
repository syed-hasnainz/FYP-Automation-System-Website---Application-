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
    const policy = await db.policy.findUnique({ where: { id } })

    if (!policy) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 })
    }

    if (policy.createdBy !== userId) {
      return NextResponse.json({ error: 'Unauthorized to delete this policy' }, { status: 403 })
    }

    // Delete file
    const filePath = join(process.cwd(), 'public', policy.fileUrl)
    if (existsSync(filePath)) {
      await unlink(filePath).catch(() => {}) // Ignore errors if file doesn't exist
    }

    // Delete from database
    await db.policy.delete({ where: { id } })

    return NextResponse.json({ message: 'Policy deleted successfully' })
  } catch (error) {
    console.error('Error deleting policy:', error)
    return NextResponse.json({ error: 'Failed to delete policy' }, { status: 500 })
  }
}

