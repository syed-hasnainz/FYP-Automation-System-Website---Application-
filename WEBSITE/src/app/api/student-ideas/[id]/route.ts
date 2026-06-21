import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// DELETE /api/student-ideas/[id] - Delete a student-proposed project idea (only by the creator)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { error: 'Only students can delete their own project ideas' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Find the project idea
    const project = await db.project.findUnique({
      where: { id },
      include: {
        teacher: {
          select: {
            id: true,
            role: true
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project idea not found' },
        { status: 404 }
      );
    }

    // Verify it's a student-proposed idea
    if (project.isFacultyProposed) {
      return NextResponse.json(
        { error: 'This is not a student-proposed idea' },
        { status: 403 }
      );
    }

    // Verify the student is the creator
    if (project.teacherId !== userId) {
      return NextResponse.json(
        { error: 'You can only delete your own project ideas' },
        { status: 403 }
      );
    }

    // Check if the project has been taken by a group
    if (project.groupId) {
      return NextResponse.json(
        { error: 'Cannot delete a project idea that has been taken by a group' },
        { status: 400 }
      );
    }

    // Delete the project idea
    await db.project.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Project idea deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting student idea:', error);
    return NextResponse.json(
      { error: 'Failed to delete project idea' },
      { status: 500 }
    );
  }
}

