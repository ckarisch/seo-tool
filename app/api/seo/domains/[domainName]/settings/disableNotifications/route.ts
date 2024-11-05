
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
    console.log('error: no session')
    return Response.json({ error: 'Not authenticated', domains: [] }, { status: 401 })
  }

  const { value } = await request.json();

  console.log('set notifications: ' + value.toString());

  const domain = await prisma.domain.findFirst({ where: { domainName: params.domainName } });

  if (!domain) {
    return Response.json({ error: 'domain not found' }, { status: 404 })
  }

  await prisma.domain.update({
    where: { id: domain.id },
    data: { disableNotifications: value }
  });

  return Response.json({ success: true }, { status: 200 });
}