
import { PrismaClient } from '@prisma/client';
import { crawlDomain } from '../seo/domains/[domainName]/crawl/crawlDomain';
import { env } from 'process';

export const maxDuration = 60; // in seconds
import { NextResponse } from 'next/server'
import { generateStreamingLogViewer, LogEntry, streamLogs } from '@/apiComponents/dev/StreamingLogViewer';
import { createLogger } from '@/apiComponents/dev/logger';

const prisma = new PrismaClient();

const resetCrawlTime = 3600000 // 1h

export async function GET(request: Request) {
  // maxExecutionTime ist 20 seconds lower than maxDuration to prevent hard timeouts
  const maxExecutionTime = 180000; // in milliseconds

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const html = generateStreamingLogViewer({
        title: 'Application Logs',
        styles: {
          maxHeight: '500px',
          width: '900px',
        }
      })
      controller.enqueue(encoder.encode(html))

      // Example log generator with correct typing
      async function* generateLogs(): AsyncGenerator<LogEntry> {
        const log = (...args: string[]) => {
          const message = args.join(', ');
          console.log(message);
          return { text: message };
        }
        const mainLogger = createLogger('MAIN');
        const crawlLogger = createLogger('CRAWL');

        if (env.NODE_ENV == 'development') {
          yield* mainLogger.log(`cron in dev mode`);
        }
        else if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
          return Response.json({ error: 'unauthorized' }, { status: 401 });
        }

        yield log('start auto crawl');
        const domains = await prisma.domain.findMany({});

        if (!domains || domains.length === 0) {
          yield log('no auto crawls found');
          return Response.json({ error: 'no auto crawls found' }, { status: 404 })
        }

        for (const domain of domains) {
          if (!domain.domainVerified) {
            yield log(`❌ not verified: domain ${domain.domainName}`);
            continue;
          }
          yield log(`✅ domain ${domain.domainName} verified`);

          if (domain.crawlStatus === 'crawling') {
            if (domain.lastCrawl && Date.now() - domain.lastCrawl.getTime() > resetCrawlTime) {
              // reset domain crawl status, when it was remains in that status for a long time
              // this can happen on route timeouts while crawling
              console.error(`➝  crawling status of domain ${domain.name} (${domain.domainName}) reset`);
              await prisma.domain.update({ where: { id: domain.id }, data: { crawlStatus: 'idle' } });
            }
            yield log('➝  auto crawl: ' + domain.domainName + ' is already crawling');
            continue;
          }
          if (domain.crawlEnabled) {

            yield log(`➝  domain ${domain.domainName} crawl enabled`);
            if (domain.crawlInterval && domain.crawlInterval > 0) {
              const lastCrawl = domain.lastCrawl;
              if (lastCrawl) {
                const now = new Date();
                const diff = now.getTime() - lastCrawl.getTime();
                const diffMinutes = Math.floor(diff / 60000);
                if (diffMinutes > domain.crawlInterval) {
                  yield log('➝  auto crawl: ' + domain.domainName + ' last crawl was ' + diffMinutes + ' / ' + domain.crawlInterval + ' minutes ago');

                  const depth = 2;
                  const followLinks = true;
                  // const logger = (text: string) => (yield log(text));
                  yield* (await crawlDomain(domain.domainName, depth, followLinks, maxExecutionTime))(crawlLogger);
                  // await crawlDomain(domain.domainName, depth, followLinks, maxExecutionTime);

                  continue;
                }
                else {
                  yield log('➥  skip auto crawl: ' + domain.domainName + ' last crawl was ' + diffMinutes + ' / ' + domain.crawlInterval + ' minutes ago');
                }
              }
            }
            else {
              yield log('❗ auto crawl: ' + domain.domainName + ' has no crawl interval');
            }
          }
        }

      }

      await streamLogs(controller, encoder, generateLogs())
      controller.close()
    }
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}