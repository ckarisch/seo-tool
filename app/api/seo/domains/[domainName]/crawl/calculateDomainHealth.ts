import { PrismaClient, Domain, DomainCrawl } from '@prisma/client'

interface DomainHealth {
  totalCrawls: number;
  timeoutPercentage: number;
  typeErrorPercentage: number;
  badRequestPercentage: number;
  timeoutCount: number;
  typeErrorCount: number;
  badRequestCount: number;
}

type CrawlError = {
  errorName: string | null
}

const prisma = new PrismaClient();

export async function calculateDomainHealth(domain: Domain): Promise<DomainHealth> {
  // Get crawls from the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  console.log(sevenDaysAgo);
  
  const recentCrawls = await prisma.domainCrawl.findMany({
    where: {
      domainId: domain.id,
      startTime: { gte: sevenDaysAgo }
    },
    select: {
      errorName: true
    }
  });

  const totalCrawls = recentCrawls.length;
  const timeoutErrors = recentCrawls.filter((crawl: CrawlError) => crawl.errorName === 'timeout').length;
  const typeErrors = recentCrawls.filter((crawl: CrawlError) => crawl.errorName === 'TypeError').length;
  const badRequestErrors = recentCrawls.filter((crawl: CrawlError) => crawl.errorName === 'ERR_BAD_REQUEST').length;

  // Calculate percentages
  const calculatePercentage = (count: number): number => {
    if (totalCrawls === 0) return 0;
    return Number(((count / totalCrawls) * 100).toFixed(2));
  };

  return {
    totalCrawls,
    timeoutPercentage: calculatePercentage(timeoutErrors),
    typeErrorPercentage: calculatePercentage(typeErrors),
    badRequestPercentage: calculatePercentage(badRequestErrors),
    timeoutCount: timeoutErrors,
    typeErrorCount: typeErrors,
    badRequestCount: badRequestErrors
  };
}