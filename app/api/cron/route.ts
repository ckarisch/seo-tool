
import { PrismaClient } from '@prisma/client';
import { crawlDomain } from '../seo/domains/[domainName]/crawl/crawlDomain';

export const maxDuration = 200; // in seconds

const prisma = new PrismaClient();

const resetCrawlTime = 3600000 // 1h

export async function GET(
  request: Request
) {

  // maxExecutionTime ist 20 seconds lower than maxDuration to prevent hard timeouts
  const maxExecutionTime = 180000; // in milliseconds
  

  if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  console.log('start auto crawl');
  const domains = await prisma.domain.findMany({});

  if (!domains || domains.length === 0) {
    console.log('no auto crawls found');
    return Response.json({ error: 'no auto crawls found' }, { status: 404 })
  }

  for (const domain of domains) {
    if (domain.crawlStatus === 'crawling') {
      if (domain.lastCrawl && Date.now() - domain.lastCrawl.getTime() > resetCrawlTime) {
        // reset domain crawl status, when it was remains in that status for a long time
        // this can happen on route timeouts while crawling
        console.error(`crawling status of domain ${domain.name} (${domain.domainName}) reset`);
        await prisma.domain.update({ where: { id: domain.id }, data: { crawlStatus: 'idle' } });
      }
      console.log('auto crawl: ' + domain.domainName + ' is already crawling');
      continue;
    }
    if (domain.crawlEnabled) {
      if (domain.crawlInterval && domain.crawlInterval > 0) {
        const lastCrawl = domain.lastCrawl;
        if (lastCrawl) {
          const now = new Date();
          const diff = now.getTime() - lastCrawl.getTime();
          const diffMinutes = Math.floor(diff / 60000);
          if (diffMinutes > domain.crawlInterval) {
            console.log('auto crawl: ' + domain.domainName + ' last crawl was ' + diffMinutes + ' minutes ago');

            const depth = 2;
            const followLinks = true;
            await crawlDomain(domain.domainName, depth, followLinks, maxExecutionTime);

            continue;
          }
          else {
            console.log('skip auto crawl: ' + domain.domainName + ' last crawl was ' + diffMinutes + ' minutes ago');
          }
        }
      }
      else {
        console.log('auto crawl: ' + domain.domainName + ' has no crawl interval');
      }
    }
  }


  return Response.json({ success: true }, { status: 200 });
}