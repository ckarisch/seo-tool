import { getServerSession } from 'next-auth';
import { crawlDomain } from './crawlDomain';
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions';

export async function POST(
  request: Request,
  { params }: { params: { domainName: string } }
) {

  console.log('New crawl request: ' + params.domainName);
  const session = await getServerSession(authOptions);

  if (!session || !session!.user) {
    console.log('error: no session')
    return Response.json({ error: 'Not authenticated', domains: [] }, { status: 401 })
  }

  const depth = 2;
  const followLinks = true;

  return crawlDomain(params.domainName, depth, followLinks);
}