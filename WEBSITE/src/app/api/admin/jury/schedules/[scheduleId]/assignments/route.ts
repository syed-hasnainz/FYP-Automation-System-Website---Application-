import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET jury assignments for a defense schedule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const { scheduleId } = await params;

    const assignments = await db.juryAssignment.findMany({
      where: {
        defenseScheduleId: scheduleId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('Error fetching jury assignments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jury assignments' },
      { status: 500 }
    );
  }
}

// POST - Create jury assignment for a group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  try {
    const { scheduleId } = await params;
    const body = await request.json();
    const {
      groupId,
      groupName,
      projectTitle,
      juryMembers, // Array of teacher IDs
      chairpersonId,
    } = body;

    if (!groupId || !juryMembers || !Array.isArray(juryMembers) || juryMembers.length === 0) {
      return NextResponse.json(
        { error: 'Group ID and jury members are required' },
        { status: 400 }
      );
    }

    // Get the defense schedule to create announcement
    const defenseSchedule = await db.defenseSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!defenseSchedule) {
      return NextResponse.json(
        { error: 'Defense schedule not found' },
        { status: 404 }
      );
    }

    const assignment = await db.juryAssignment.create({
      data: {
        defenseScheduleId: scheduleId,
        groupId,
        groupName,
        projectTitle,
        juryMembers: JSON.stringify(juryMembers),
        chairpersonId,
      },
    });

    // Create or update announcement for this assignment
    // Check if an announcement already exists for this defense schedule
    const existingAnnouncement = await db.announcement.findFirst({
      where: {
        relatedId: scheduleId,
        type: 'DEFENSE_SCHEDULE',
      },
    });

    const defenseTypeLabel = defenseSchedule.defenseType === 'PROPOSAL' 
      ? 'Proposal' 
      : defenseSchedule.defenseType === 'FYP_I' 
      ? 'FYP-I' 
      : 'FYP-II';

    const announcementContent = `${defenseTypeLabel} Defense has been scheduled.\n\n` +
      `Title: ${defenseSchedule.title}\n` +
      (defenseSchedule.description ? `Description: ${defenseSchedule.description}\n` : '') +
      `Date: ${new Date(defenseSchedule.defenseDate).toLocaleDateString()}\n` +
      `Time: ${defenseSchedule.defenseTime}\n` +
      `Venue: ${defenseSchedule.venue}`;

    if (existingAnnouncement) {
      // Update existing announcement to include this group and teachers
      const existingTargetedGroups = existingAnnouncement.targetedGroups
        ? JSON.parse(existingAnnouncement.targetedGroups)
        : [];
      const existingTargetedTeachers = existingAnnouncement.targetedTeachers
        ? JSON.parse(existingAnnouncement.targetedTeachers)
        : [];

      // Add new group and teachers if not already present
      const updatedGroups = existingTargetedGroups.includes(groupId)
        ? existingTargetedGroups
        : [...existingTargetedGroups, groupId];
      
      const updatedTeachers = [...new Set([...existingTargetedTeachers, ...juryMembers])];

      await db.announcement.update({
        where: { id: existingAnnouncement.id },
        data: {
          targetedGroups: JSON.stringify(updatedGroups),
          targetedTeachers: JSON.stringify(updatedTeachers),
          isActive: true,
        },
      });

      // Create notifications for newly added teachers with jury group information
      for (const teacherId of juryMembers) {
        if (!existingTargetedTeachers.includes(teacherId)) {
          // Get group info for better notification
          const group = await db.group.findUnique({
            where: { id: groupId },
            select: { name: true, projects: { take: 1, select: { title: true } } }
          });
          
          const juryCount = updatedTeachers.length;
          const juryGroupInfo = juryCount > 1 
            ? `You are part of a jury panel of ${juryCount} members`
            : 'You are the sole jury member';
          
          await db.notification.create({
            data: {
              userId: teacherId,
              title: `${defenseTypeLabel} Defense Scheduled - Jury Assignment`,
              message: `${juryGroupInfo} for the ${defenseTypeLabel} defense "${defenseSchedule.title}" for group "${group?.name || groupName}" (Project: "${group?.projects?.[0]?.title || projectTitle || 'N/A'}"). Scheduled on ${new Date(defenseSchedule.defenseDate).toLocaleDateString()} at ${defenseSchedule.defenseTime} in ${defenseSchedule.venue}. Please review the defense details in Project Execution and prepare for evaluation.`,
              type: 'DEFENSE_SCHEDULE',
              relatedId: scheduleId,
              isRead: false,
            },
          });
        }
      }

      // Create notifications for group members if group is newly added
      if (!existingTargetedGroups.includes(groupId)) {
        const group = await db.group.findUnique({
          where: { id: groupId },
          include: {
            members: {
              include: {
                user: true,
              },
            },
          },
        });

        if (group && group.members) {
          for (const member of group.members) {
            await db.notification.create({
              data: {
                userId: member.userId,
                title: `${defenseTypeLabel} Defense Scheduled`,
                message: `Your group "${group.name}" has been scheduled for ${defenseSchedule.title} on ${new Date(defenseSchedule.defenseDate).toLocaleDateString()} at ${defenseSchedule.defenseTime} in ${defenseSchedule.venue}`,
                type: 'DEFENSE_SCHEDULE',
                relatedId: scheduleId,
                isRead: false,
              },
            });
          }
        }
      }
    } else {
      // Create new announcement
      const announcement = await db.announcement.create({
        data: {
          title: `${defenseTypeLabel} Defense Scheduled`,
          content: announcementContent,
          type: 'DEFENSE_SCHEDULE',
          createdBy: defenseSchedule.createdBy,
          priority: 'HIGH',
          targetedTeachers: JSON.stringify(juryMembers),
          targetedGroups: JSON.stringify([groupId]),
          relatedId: scheduleId,
          isActive: true,
        },
      });

      // Create notifications for selected teachers with jury group information
      for (const teacherId of juryMembers) {
        // Get teacher name for personalized message
        const teacher = await db.user.findUnique({
          where: { id: teacherId },
          select: { name: true }
        });
        
        // Create jury group info
        const juryCount = juryMembers.length;
        const juryGroupInfo = juryCount > 1 
          ? `You are part of a jury panel of ${juryCount} members`
          : 'You are the sole jury member';
        
        await db.notification.create({
          data: {
            userId: teacherId,
            title: `${defenseTypeLabel} Defense Scheduled - Jury Assignment`,
            message: `${juryGroupInfo} for the ${defenseTypeLabel} defense "${defenseSchedule.title}" for group "${groupName}" (Project: "${projectTitle || 'N/A'}"). Scheduled on ${new Date(defenseSchedule.defenseDate).toLocaleDateString()} at ${defenseSchedule.defenseTime} in ${defenseSchedule.venue}. Please review the defense details in Project Execution and prepare for evaluation.`,
            type: 'DEFENSE_SCHEDULE',
            relatedId: scheduleId,
            isRead: false,
          },
        });
      }

      // Create notifications for students in the group
      const group = await db.group.findUnique({
        where: { id: groupId },
        include: {
          members: {
            include: {
              user: true,
            },
          },
        },
      });

      if (group && group.members) {
        for (const member of group.members) {
          await db.notification.create({
            data: {
              userId: member.userId,
              title: `${defenseTypeLabel} Defense Scheduled`,
              message: `Your group "${group.name}" has been scheduled for ${defenseSchedule.title} on ${new Date(defenseSchedule.defenseDate).toLocaleDateString()} at ${defenseSchedule.defenseTime} in ${defenseSchedule.venue}`,
              type: 'DEFENSE_SCHEDULE',
              relatedId: scheduleId,
              isRead: false,
            },
          });
        }
      }
    }

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error('Error creating jury assignment:', error);
    return NextResponse.json(
      { error: 'Failed to create jury assignment' },
      { status: 500 }
    );
  }
}
