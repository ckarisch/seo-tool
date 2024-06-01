import { crawlDomainPublic } from './crawlDomainPublic';

export const maxDuration = 200; // in seconds

export async function POST(
  request: Request,
  { params }: { params: { domainName: string } }
) {

  console.log('Public crawl request: ' + params.domainName);

  const depth = 2;
  const followLinks = true;
  const maxExecutionTime = 20000; // in milliseconds

  return crawlDomainPublic(params.domainName, depth, followLinks, maxExecutionTime);
}