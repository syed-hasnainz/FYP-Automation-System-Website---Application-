import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { validatePassword } from '@/lib/security';

const updateEmailSchema = z.object({
  newEmail: z.string().email('Invalid email format'),
  currentPassword: z.string().min(1, 'Current password is required'),
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

// PUT /api/admin/settings - Update admin email or password
export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized. User ID is required.' },
        { status: 401 }
      );
    }

    // Verify user is admin
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        email: true,
        password: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Only allow ADMIN or SUPER_ADMIN to use this endpoint
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized. Only administrators can use this endpoint.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { updateType, ...data } = body;

    if (updateType === 'email') {
      // Update email
      const { newEmail, currentPassword } = updateEmailSchema.parse(data);

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 401 }
        );
      }

      // Check if email already exists
      const existingUser = await db.user.findUnique({
        where: { email: newEmail },
      });

      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json(
          { error: 'Email already exists. Please use a different email.' },
          { status: 400 }
        );
      }

      // Update email
      await db.user.update({
        where: { id: userId },
        data: { email: newEmail },
      });

      return NextResponse.json({
        message: 'Email updated successfully. Please log in again with your new email.',
        email: newEmail,
      });
    } else if (updateType === 'password') {
      // Update password
      const { currentPassword, newPassword } = updatePasswordSchema.parse(data);

      // Validate new password meets requirements
      const passwordValidation = validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return NextResponse.json(
          { error: passwordValidation.error },
          { status: 400 }
        );
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 401 }
        );
      }

      // Check if new password is the same as current password
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) {
        return NextResponse.json(
          { error: 'New password must be different from current password' },
          { status: 400 }
        );
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await db.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return NextResponse.json({
        message: 'Password updated successfully. Please log in again with your new password.',
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid update type. Must be "email" or "password".' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error updating admin settings:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update settings. Please try again.' },
      { status: 500 }
    );
  }
}
