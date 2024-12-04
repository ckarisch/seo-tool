import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(
  request: Request,
  { params }: { params: { domainName: string } }
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
      }
    });

    if (!domain) {
      return Response.json({ error: 'Domain not found' }, { status: 404 });
    }

    // Update all unread notifications for this domain
    const result = await prisma.notification.updateMany({
      where: {
        domainId: domain.id,
        read: false
      },
      data: {
        read: true
      }
    });

    return Response.json({ 
      success: true,
      count: result.count 
    }, { status: 200 });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return Response.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}