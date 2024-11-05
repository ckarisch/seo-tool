
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  return NextResponse.json({
    authenticated: !!session,
    session,
  });
}

export async function POST(
  request: Request,
  { params }: { params: { domainName: string } }
) {

  const { value } = await request.json();

  console.log('set crawl: ' + value.toString());
  const session = await getServerSession(authOptions);

  if (!session || !session!.user) {
    console.log('error: no session')
    return Response.json({ error: 'Not authenticated', domains: [] }, { status: 401 })
  }

  const domain = await prisma.domain.findFirst({ where: { domainName: params.domainName } });

  if (!domain) {
    return Response.json({ error: 'domain not found' }, { status: 404 })
  }

  const updatedDomain = await prisma.domain.update({
    where: { id: domain.id },
    data: { crawlEnabled: value }
  });

  return Response.json({ updatedDomain, loaded: true }, { status: 200 });
}