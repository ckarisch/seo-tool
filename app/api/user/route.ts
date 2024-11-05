
import { authOptions } from '@/lib/auth';
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
  const sessionUser = await prisma.user.findFirst({ where: { email: session.user.email! } })

  if (!sessionUser) {
    return Response.json({ error: 'user not found' }, { status: 404 })
  }

  const userResponse = {
    id: sessionUser.id,
    role: sessionUser.role
  }

  return Response.json(userResponse, { status: 200 })
}
