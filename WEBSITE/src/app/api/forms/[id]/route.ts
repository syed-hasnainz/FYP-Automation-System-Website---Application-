import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/forms/[id] - Get a specific form submission
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');

    if (!id) {
      return NextResponse.json(
        { error: 'Form submission ID is required' },
        { status: 400 }
      );
    }

    const formSubmission = await db.formSubmission.findUnique({
      where: { id },
    });

    if (!formSubmission) {
      return NextResponse.json(
        { error: 'Form submission not found' },
        { status: 404 }
      );
    }

    // Check if user owns this submission
    if (userId && formSubmission.submittedBy !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to view this submission' },
        { status: 403 }
      );
    }

    return NextResponse.json(formSubmission);
  } catch (error) {
    console.error('Error fetching form submission:', error);
    return NextResponse.json(
      { error: 'Failed to fetch form submission' },
      { status: 500 }
    );
  }
}

// DELETE /api/forms/[id] - Delete a form submission
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');

    if (!id) {
      return NextResponse.json(
        { error: 'Form submission ID is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      console.error('[Delete Form] No user ID provided');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Delete Form] User ID:', userId);
    console.log('[Delete Form] Submission ID:', id);

    // Check if form submission exists
    const formSubmission = await db.formSubmission.findUnique({
      where: { id },
    });

    if (!formSubmission) {
      console.error('[Delete Form] Form submission not found:', id);
      return NextResponse.json(
        { error: 'Form submission not found' },
        { status: 404 }
      );
    }

    // Check if user is admin/committee head
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user) {
      console.error('[Delete Form] User not found:', userId);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    console.log('[Delete Form] User role:', user.role);
    console.log('[Delete Form] Submission submittedBy:', formSubmission.submittedBy);

    const isAdmin = user.role === 'ADMIN' || user.role === 'COMMITTEE_HEAD';

    // Check if user owns this submission OR is an admin
    if (!isAdmin && formSubmission.submittedBy !== userId) {
      console.error('[Delete Form] Unauthorized - User is not admin and does not own submission');
      return NextResponse.json(
        { error: 'Unauthorized to delete this submission' },
        { status: 403 }
      );
    }

    console.log('[Delete Form] Authorized to delete. Proceeding...');

    // Delete the form submission
    await db.formSubmission.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Form submission deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting form submission:', error);
    return NextResponse.json(
      { error: 'Failed to delete form submission' },
      { status: 500 }
    );
  }
}

