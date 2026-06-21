import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createNotification } from '@/lib/notification-service';

// DELETE /api/admin/groups/[id] - Delete a group (admin/committee head only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if user is admin or committee head
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'COMMITTEE_HEAD')) {
      return NextResponse.json(
        { error: 'Unauthorized. Only admins and committee heads can delete groups.' },
        { status: 403 }
      );
    }

    const { id: groupId } = await params;

    // Get group with all members before deletion
    const group = await db.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!group) {
      return NextResponse.json(
        { error: 'Group not found' },
        { status: 404 }
      );
    }

    // Get all member IDs for notifications
    const memberIds = group.members.map(m => m.userId);
    const groupName = group.name;

    // Delete all group members (cascade should handle this, but being explicit)
    await db.groupMember.deleteMany({
      where: { groupId: groupId }
    });

    // Delete all group requests associated with this group's members
    await db.groupRequest.deleteMany({
      where: {
        OR: [
          { fromUserId: { in: memberIds } },
          { toUserId: { in: memberIds } }
        ]
      }
    });

    // Delete the group
    await db.group.delete({
      where: { id: groupId }
    });

    // Send notifications to all group members
    for (const member of group.members) {
      await createNotification({
        userId: member.userId,
        title: 'Group Deleted',
        message: `Your group "${groupName}" has been deleted by an administrator. All members have been removed from the group.`,
        type: 'WARNING',
        category: 'GROUP',
        link: '/student?section=groups'
      }).catch(err => console.warn('Failed to send notification:', err));
    }

    return NextResponse.json({
      success: true,
      message: `Group "${groupName}" has been deleted successfully. All members have been notified.`
    });
  } catch (error: any) {
    console.error('Error deleting group:', error);
    return NextResponse.json(
      { error: 'Failed to delete group' },
      { status: 500 }
    );
  }
}

