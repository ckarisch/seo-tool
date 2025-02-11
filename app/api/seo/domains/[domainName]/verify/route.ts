
import { VerifyDomain } from '@/apiComponents/domain/verifyDomain';
import { authOptions } from '@/lib/auth';
import { DnsLookupError, performDnsLookup } from '@/util/api/dnsLookup';
import { Domain, PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { domainName: string } }
): Promise<Response> {
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

  try {
    if (!domain.domainVerificationKey) {
      return new Response(JSON.stringify({ error: 'No verification key present' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const isVerified = await VerifyDomain(domain);

    const result: Partial<Domain> = {
      id: domain.id,
      domainName: domain.name,
      domainVerified: isVerified
    };

    if (!isVerified) {
      return Response.json(result, { status: 500 })
    }

    return Response.json(result, { status: 200 })

  } catch (error) {
    if (error instanceof DnsLookupError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
