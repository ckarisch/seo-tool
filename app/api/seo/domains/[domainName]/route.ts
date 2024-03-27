
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

  const domain = await prisma.domain.findFirst({ where: { domainName: params.domainName } })

  if (!domain) {
    return Response.json({ error: 'domain not found' }, { status: 404 })
  }
  

  const domainResponse = {
    id: domain.id,
    domainName: domain.domainName,
    crawlStatus: domain.crawlStatus,
    lastErrorTime: domain.lastErrorTime,
    lastErrorType: domain.lastErrorType,
    lastErrorMessage: domain.lastErrorMessage,
    crawlInterval: domain.crawlInterval,
    crawlEnabled: domain.crawlEnabled,
    crawlDepth: domain.crawlDepth,
    lastCrawlTime: domain.lastCrawlTime,
    loaded: true
  }

  return Response.json(domainResponse, { status: 200 })
}
