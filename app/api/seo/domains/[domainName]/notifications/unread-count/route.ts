import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

    // Count unread notifications
    const count = await prisma.notification.count({
      where: {
        domainId: domain.id,
        read: false
      }
    });

    return Response.json({ count }, { status: 200 });
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    return Response.json(
      { error: 'Failed to count notifications' },
      { status: 500 }
    );
  }
}