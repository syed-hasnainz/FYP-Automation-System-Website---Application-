import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createNotification, NotificationTemplates } from '@/lib/notification-service'
import { sendAccountApprovalEmail } from '@/lib/email'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, status: true, rollNumber: true, department: true, isActive: true }
    })
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(user)
  } catch (err) {
    console.error('Error in admin users GET id:', err)
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'Failed to fetch user', details: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const userData = await request.json().catch(() => ({}))

    // Normalize status if provided (accept 'Approved'|'APPROVED'|'approve' etc.)
    let statusToSet: string | undefined = undefined
    if (userData.status !== undefined && userData.status !== null) {
      const s = String(userData.status).toUpperCase()
      if (s === 'APPROVED' || s === 'APPROVE') statusToSet = 'APPROVED'
      else if (s === 'REJECTED' || s === 'REJECT') statusToSet = 'REJECTED'
      else if (s === 'PENDING') statusToSet = 'PENDING'
    }

    const dataToUpdate: any = {
      name: userData.name,
      email: userData.email,
      role: userData.role,
      department: userData.department,
      rollNumber: userData.rollNumber,
      gpa: userData.gpa,
      profileImage: userData.profileImage,
    }
    if (statusToSet) dataToUpdate.status = statusToSet

    // Handle password update if provided
    if (userData.password && userData.password.trim() !== '') {
      const { validatePassword } = require('@/lib/security')
      const passwordValidation = validatePassword(userData.password)
      if (!passwordValidation.valid) {
        return NextResponse.json(
          { error: passwordValidation.error },
          { status: 400 }
        )
      }
      const bcrypt = require('bcryptjs')
      const hashedPassword = await bcrypt.hash(userData.password, 10)
      dataToUpdate.password = hashedPassword
    }

    // Get the current user status before update to check if status changed
    const currentUser = await db.user.findUnique({
      where: { id },
      select: { status: true }
    })
    const previousStatus = currentUser?.status

    const updatedUser = await db.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        isActive: true,
        rollNumber: true,
        department: true,
        gpa: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true,
        teacherProfile: {
          select: {
            employeeId: true,
            supervisionCapacity: true,
          },
        },
      }
    })

    // Update teacher profile if user is a teacher or committee head
    if (userData.role === 'TEACHER' || userData.role === 'COMMITTEE_HEAD') {
      const teacherProfileData: any = {}
      
      if (userData.supervisionCapacity !== undefined) {
        teacherProfileData.supervisionCapacity = userData.supervisionCapacity || 4
      }
      
      // Update employeeId if provided
      if (userData.employeeId !== undefined) {
        teacherProfileData.employeeId = userData.employeeId
      }
      
      if (Object.keys(teacherProfileData).length > 0) {
        await db.teacherProfile.upsert({
          where: { userId: id },
          create: {
            userId: id,
            employeeId: userData.employeeId || `EMP${Date.now()}`,
            supervisionCapacity: userData.supervisionCapacity || 4,
            designation: userData.role === 'COMMITTEE_HEAD' ? 'Committee Head' : 'Faculty Member',
            officeHours: '9:00 AM - 5:00 PM',
          },
          update: teacherProfileData,
        })
      }
    }

    // Send approval email if status changed to APPROVED
    if (statusToSet === 'APPROVED' && previousStatus !== 'APPROVED' && updatedUser.email) {
      console.log(`Sending approval email to: ${updatedUser.email}`);
      sendAccountApprovalEmail(
        updatedUser.email,
        updatedUser.name || 'User',
        updatedUser.role || 'USER'
      ).catch((emailError) => {
        console.error('Failed to send approval email:', emailError);
        // Don't fail the update if email fails
      });
    }

    return NextResponse.json({ message: 'User updated successfully', user: updatedUser })
  } catch (error) {
    console.error('User update error:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Failed to update user', details: message }, { status: 500 })
  }
}

// PATCH endpoint: used to change status (approve/reject/pending)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const action: string | undefined = (body.action || body.status || undefined)

    if (!action) {
      return NextResponse.json({ error: 'No action provided' }, { status: 400 })
    }

    let newStatus: string | undefined
    if (action === 'approve' || action === 'APPROVE' || action === 'APPROVED') newStatus = 'APPROVED'
    else if (action === 'reject' || action === 'REJECT' || action === 'REJECTED') newStatus = 'REJECTED'
    else if (action === 'pending' || action === 'PENDING') newStatus = 'PENDING'

    if (!newStatus) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Ensure user exists first to return a clearer 404 if needed
    const existing = await db.user.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const updatedUser = await db.user.update({
      where: { id },
      data: { status: newStatus },
      select: { id: true, name: true, email: true, role: true, status: true, isActive: true }
    })

    // Send notification and email to user when their account is approved/rejected
    try {
      const template = newStatus === 'APPROVED'
        ? NotificationTemplates.userApproved(updatedUser.name || 'User')
        : newStatus === 'REJECTED'
        ? NotificationTemplates.userRejected(updatedUser.name || 'User')
        : null;
      
      if (template) {
        console.log(`Creating notification for user ${id}: ${template.title}`);
        const notification = await createNotification({
          userId: id,
          ...template
        });
        console.log('Notification created:', notification);
      }

      // Send email when account is approved
      if (newStatus === 'APPROVED' && updatedUser.email) {
        console.log(`Sending approval email to: ${updatedUser.email}`);
        sendAccountApprovalEmail(
          updatedUser.email,
          updatedUser.name || 'User',
          updatedUser.role || 'USER'
        ).catch((emailError) => {
          console.error('Failed to send approval email:', emailError);
          // Don't fail the approval if email fails
        });
      }
    } catch (notifErr) {
      console.error('Failed to create notification:', notifErr)
    }

    return NextResponse.json({ message: `User status updated to ${newStatus}`, user: updatedUser })
  } catch (error) {
    console.error('User approval error:', error)
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ error: 'Failed to update user status', details: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    
    // Check if user exists
    const user = await db.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Delete user (cascade will handle related records like profiles, messages, etc.)
    // Due to Prisma cascade deletes, this should remove:
    // - StudentProfile or TeacherProfile
    // - GroupMemberships
    // - Messages
    // - Notifications
    // - etc.
    await db.user.delete({ where: { id } })
    
    console.log(`User ${user.email} (${user.role}) deleted successfully`)
    return NextResponse.json({ message: 'User deleted successfully', id })
  } catch (error) {
    console.error('User deletion error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    // Check if it's a foreign key constraint error
    if (errorMessage.includes('Foreign key constraint') || errorMessage.includes('constraint')) {
      return NextResponse.json({ 
        error: 'Cannot delete user due to existing relationships. Please remove all related data first.',
        details: errorMessage
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Failed to delete user',
      details: errorMessage
    }, { status: 500 })
  }
}