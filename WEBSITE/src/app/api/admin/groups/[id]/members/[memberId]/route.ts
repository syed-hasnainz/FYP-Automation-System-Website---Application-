import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createNotification } from '@/lib/notification-service';

// DELETE /api/admin/groups/[id]/members/[memberId] - Remove a member from group (admin/committee head only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; memberId: string }> }
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
        { error: 'Unauthorized. Only admins and committee heads can remove members.' },
        { status: 403 }
      );
    }

    const { id: groupId, memberId } = await params;

    // Check if the member to be removed exists in this group
    const memberToRemove = await db.groupMember.findFirst({
      where: {
        userId: memberId,
        groupId: groupId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        group: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!memberToRemove) {
      return NextResponse.json(
        { error: 'Member not found in this group' },
        { status: 404 }
      );
    }

    // Get all group members before removal
    const allMembers = await db.groupMember.findMany({
      where: { groupId: groupId },
      select: { userId: true }
    });
    const allMemberIds = allMembers.map(m => m.userId);

    // Delete any group requests associated with the removed member and other group members
    await db.groupRequest.deleteMany({
      where: {
        OR: [
          {
            toUserId: memberId,
            fromUserId: { in: allMemberIds }
          },
          {
            fromUserId: memberId,
            toUserId: { in: allMemberIds }
          }
        ]
      }
    });

    // Get remaining members before removal for notifications
    const allGroupMembers = await db.groupMember.findMany({
      where: { groupId: groupId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Find the group leader
    const groupLeader = allGroupMembers.find(m => m.role === 'LEADER');

    // Remove the member
    await db.groupMember.delete({
      where: {
        id: memberToRemove.id
      }
    });

    // Notify the removed student
    await createNotification({
      userId: memberToRemove.userId,
      title: 'Removed from Group',
      message: `You have been removed from the group "${memberToRemove.group.name}" by an administrator.`,
      type: 'WARNING',
      category: 'GROUP',
      link: '/student?section=groups'
    }).catch(err => console.warn('Failed to send notification to removed student:', err));

    // Notify the group leader (if exists and is not the removed member)
    if (groupLeader && groupLeader.userId !== memberToRemove.userId) {
      await createNotification({
        userId: groupLeader.userId,
        title: 'Group Member Removed',
        message: `${memberToRemove.user.name} has been removed from your group "${memberToRemove.group.name}" by an administrator.`,
        type: 'INFO',
        category: 'GROUP',
        link: '/student?section=groups'
      }).catch(err => console.warn('Failed to send notification to group leader:', err));
    }

    // Check if group has less than 2 members after removal
    const remainingMembers = await db.groupMember.count({
      where: {
        groupId: groupId
      }
    });

    // If less than 2 members remain, deactivate the group
    if (remainingMembers < 2) {
      await db.group.update({
        where: { id: groupId },
        data: { 
          isActive: false,
          isApproved: false // Also unapprove if group becomes inactive
        }
      });

      // Notify remaining members about group deactivation
      const remainingMemberIds = allGroupMembers
        .filter(m => m.userId !== memberToRemove.userId)
        .map(m => m.userId);

      for (const memberId of remainingMemberIds) {
        await createNotification({
          userId: memberId,
          title: 'Group Deactivated',
          message: `Your group "${memberToRemove.group.name}" has been deactivated due to insufficient members (less than 2).`,
          type: 'WARNING',
          category: 'GROUP',
          link: '/student?section=groups'
        }).catch(err => console.warn('Failed to send notification:', err));
      }

      return NextResponse.json({
        success: true,
        message: `${memberToRemove.user.name} removed. Group deactivated due to insufficient members.`,
        groupDeactivated: true
      });
    }

    return NextResponse.json({
      success: true,
      message: `${memberToRemove.user.name} has been removed from the group`,
      groupDeactivated: false
    });
  } catch (error: any) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member from group' },
      { status: 500 }
    );
  }
}

