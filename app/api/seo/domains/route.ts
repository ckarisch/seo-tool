import { PrismaClient } from '@prisma/client'
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';

import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '../../auth/[...nextauth]/authOptions';


const prisma = new PrismaClient();

export async function GET(req: NextRequest, res: NextResponse) {
  const session = await getServerSession(
    req as unknown as NextApiRequest,
    {
      ...res,
      getHeader: (name: string) => res.headers?.get(name),
      setHeader: (name: string, value: string) => res.headers?.set(name, value),
    } as unknown as NextApiResponse,
    authOptions
  );

  console.log('session', session)

  if (!session || !session!.user) {
    console.log('no session')
    return Response.json({ error: 'Not authenticated', domains: []}, { status: 401 })
  }
  const user = await prisma.user.findUnique({ where: { email: session!.user!.email! } })
  if (!user) {
    console.log('no user')
    return Response.json({ error: 'Not authenticated', domains: [] }, { status: 401 })
  }

  const domains = await prisma.domain.findMany({ where: { userId: user.id } });

  return Response.json({ domains, loaded: true }, { status: 200 })
}

// post new domain
export async function POST(
  request: Request
) {
  const session = await getServerSession(authOptions);

  if (!session || !session!.user) {
    console.log('error: no session')
    return Response.json({ error: 'Not authenticated', domains: [] }, { status: 401 })
  }

  const data = await request.json()
  const { name, domainName } = data

  const admin = await prisma.user.findFirst({ where: { role: 'admin' } })

  if (!admin) {
    return Response.json({ error: 'no admin found' }, { status: 500 })
  }
  const domain = await prisma.domain.create({
    data: {
      name,
      domainName,
      userId: admin.id,
      crawlInterval: 24 * 60 // once a day
    }
  })

  return Response.json({ domain }, { status: 200 })
}