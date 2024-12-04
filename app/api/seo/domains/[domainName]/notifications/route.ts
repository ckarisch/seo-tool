import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient();

export async function GET(
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

    // Fetch notifications for the domain
    const notifications = await prisma.notification.findMany({
      where: { domainId: domain.id },
      orderBy: [
        { read: 'asc' },      // Unread first
        { createdAt: 'desc' } // Newest first
      ],
      take: 50 // Limit to last 50 notifications
    });

    return Response.json({ notifications }, { status: 200 });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return Response.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}