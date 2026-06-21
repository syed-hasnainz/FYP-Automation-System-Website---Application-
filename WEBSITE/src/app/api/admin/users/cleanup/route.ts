import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST /api/admin/users/cleanup - Clean up incomplete registrations or verify user deletion
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, action } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await db.user.findFirst({
      where: { email },
      include: {
        studentProfile: {
          select: {
            eligibilityStatus: true,
            conditionalCommitment: true,
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({
        message: 'User not found in database',
        exists: false
      });
    }

    // If action is 'delete', attempt to delete the user
    if (action === 'delete') {
      try {
        await db.user.delete({ where: { id: user.id } });
        return NextResponse.json({
          message: 'User deleted successfully',
          deleted: true,
          user: { id: user.id, email: user.email, role: user.role }
        });
      } catch (deleteError) {
        const errorMsg = deleteError instanceof Error ? deleteError.message : String(deleteError);
        return NextResponse.json({
          error: 'Failed to delete user',
          details: errorMsg,
          user: { id: user.id, email: user.email, role: user.role }
        }, { status: 500 });
      }
    }

    // Otherwise, just return user info
    return NextResponse.json({
      message: 'User exists',
      exists: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        hasIncompleteRegistration: user.role === 'STUDENT' && 
          user.studentProfile?.eligibilityStatus === 'CONDITIONAL' &&
          (!user.studentProfile?.conditionalCommitment || user.studentProfile.conditionalCommitment.trim() === '')
      }
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

