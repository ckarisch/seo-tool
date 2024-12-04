import { NextResponse } from 'next/server';
import { PrismaClient, NotificationType } from '@prisma/client';
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

  const { value } = await request.json();

  // Validate the notification type
  if (!Object.values(NotificationType).includes(value)) {
    return Response.json({ error: 'Invalid notification type' }, { status: 400 });
  }

  const domain = await prisma.domain.findFirst({
    where: { 
      domainName: params.domainName,
      userId: session.user.id
    }
  });

  if (!domain) {
    return Response.json({ error: 'Domain not found' }, { status: 404 });
  }

  const updatedDomain = await prisma.domain.update({
    where: { id: domain.id },
    data: { notificationType: value }
  });

  return Response.json({ updatedDomain, loaded: true }, { status: 200 });
}