
import { PrismaClient } from '@prisma/client';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getServerSession } from 'next-auth';
import { crawlDomain } from '../seo/domains/[domainName]/crawl/crawlDomain';

const prisma = new PrismaClient();

export async function GET(
  request: Request
) {
  console.log('start auto crawl');
  const domains = await prisma.domain.findMany({ where: { crawlEnabled: true } });

  if (!domains || domains.length === 0) {
    console.log('no auto crawls found');
    return Response.json({ error: 'no auto crawls found' }, { status: 404 })
  }

  for (const domain of domains) {
    if (domain.crawlStatus === 'crawling') {
      console.log('auto crawl: ' + domain.domainName + ' is already crawling');
      continue;
    }

    if (domain.crawlInterval && domain.crawlInterval > 0) {
      const lastCrawl = domain.lastCrawl;
      if (lastCrawl) {
        const now = new Date();
        const diff = now.getTime() - lastCrawl.getTime();
        const diffMinutes = Math.floor(diff / 60000);
        if (diffMinutes > domain.crawlInterval) {
          console.log('auto crawl: ' + domain.domainName + ' last crawl was ' + diffMinutes + ' minutes ago');

          const depth = 0;
          const followLinks = false;
          await crawlDomain(domain.domainName, depth, followLinks);

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


  return Response.json({ success: true }, { status: 200 });
}