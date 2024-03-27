
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions';
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { domainName: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session || !session!.user) {
    console.log('error: no session')
    return Response.json({ error: 'Not authenticated', domains: [] }, { status: 401 })
  }

  const user = await prisma.user.findFirst({ where: { email: session.user.email! } })
  const domain = await prisma.domain.findFirst({ where: { domainName: params.domainName } })

  if (!domain || domain.userId != user?.id) {
    return Response.json({ error: 'domain not found' }, { status: 404 })
  }

  const links = await prisma.internalLink.findMany({ where: { domainId: domain.id } })
  const externalLinks = await prisma.externalLink.findMany({ where: { domainId: domain.id } })

  return Response.json({ links, externalLinks, crawlingStatus: domain.crawlStatus, lastErrorTime: domain.lastErrorTime, lastErrorType: domain.lastErrorType, lastErrorMessage: domain.lastErrorMessage, loaded: true }, { status: 200 })
}

export async function DELETE(
  request: Request,
  { params }: { params: { domainName: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session || !session!.user) {
    console.log('error: no session')
    return Response.json({ error: 'Not authenticated', domains: [] }, { status: 401 })
  }
  const user = await prisma.user.findFirst({ where: { email: session.user.email! } })
  const domain = await prisma.domain.findFirst({ where: { domainName: params.domainName } })

  if (!domain || domain.userId != user?.id) {
    return Response.json({ error: 'domain not found' }, { status: 404 })
  }

  await prisma.internalLink.deleteMany({ where: { domainId: domain.id } });
  await prisma.externalLink.deleteMany({ where: { domainId: domain.id } });

  return Response.json({ success: true })
}