
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions';
import { VerificationCodeGenerator } from '@/util/api/domainVerificationKey';
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
  const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } });

  let domain = await prisma.domain.findFirst({ where: { domainName: params.domainName } });

  if (!domain) {
    console.log('domain not found');
    return Response.json({ error: 'domain not found' }, { status: 404 })
  }
  if (domain.userId !== user?.id) {
    console.log('not allowed');
    return Response.json({ error: 'not allowed' }, { status: 503 })
  }

  // set domain verification key if it does not exist
  if (!domain.domainVerificationKey) {
    const verificationKey = VerificationCodeGenerator.generate();
    await prisma.domain.update({ where: { id: domain.id }, data: { domainVerificationKey: verificationKey } });
    domain = await prisma.domain.findFirst({ where: { domainName: params.domainName } });
  }
  
  if (!domain) {
    return Response.json({ error: 'domain update error' }, { status: 404 })
  }

  const domainResponse = {
    id: domain.id,
    domainName: domain.domainName,
    domainVerificationKey: domain.domainVerificationKey,
    domainVerified: domain.domainVerified,
    crawlStatus: domain.crawlStatus,
    lastErrorTime: domain.lastErrorTime,
    lastErrorType: domain.lastErrorType,
    lastErrorMessage: domain.lastErrorMessage,
    crawlInterval: domain.crawlInterval,
    crawlEnabled: domain.crawlEnabled,
    crawlDepth: domain.crawlDepth,
    lastCrawlTime: domain.lastCrawlTime,
    warning: domain.warning,
    disableNotifications: domain.disableNotifications,
    error: domain.error,
    error404: domain.error404,
    error404NotificationDisabled: domain.error404NotificationDisabled,
    error404NotificationDisabledUntil: domain.error404NotificationDisabledUntil,
    error503: domain.error503,
    error503NotificationDisabled: domain.error503NotificationDisabled,
    error503NotificationDisabledUntil: domain.error503NotificationDisabledUntil,
    performanceScore: domain.performanceScore,
    image: domain.image,
    robotsIndex: domain.robotsIndex,
    robotsFollow: domain.robotsFollow
  }

  return Response.json(domainResponse, { status: 200 })
}
