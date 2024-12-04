import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: { domainName: string; notificationId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session || !session!.user) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // First get the domain to verify ownership
    const domain = await prisma.domain.findFirst({
      where: { 
        domainName: params.domainName,
        userId: session.user.id
      },
      include: {
        notifications: {
          where: {
            id: params.notificationId
          }
        }
      }
    });

    if (!domain) {
      return Response.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Verify the notification belongs to this domain
    if (!domain.notifications.length) {
      return Response.json({ error: 'Notification not found' }, { status: 404 });
    }

    // Update the notification
    const updatedNotification = await prisma.notification.update({
      where: {
        id: params.notificationId,
      },
      data: {
        read: true
      }
    });

    return Response.json({ notification: updatedNotification }, { status: 200 });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return Response.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}