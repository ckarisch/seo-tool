import { env } from "process";
import { createLogger } from "../dev/logger";
import { LogEntry } from "../dev/StreamingLogViewer";
import { crawlDomain, crawlDomainResponse } from "@/app/api/seo/domains/[domainName]/crawl/crawlDomain";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const resetCrawlTime = 3600000; // 1h
const maxDomainCrawls = 2; // 1h

export async function* crawlerGenerator(maxExecutionTime: number, host: string): AsyncGenerator<LogEntry> {
    const mainLogger = createLogger('CRAWL_START');

    let domainsCrawled = 0;

    if (env.NODE_ENV == 'development') {
        yield* mainLogger.log(`cron in dev mode`);
    }

    yield* mainLogger.log('start auto crawl');
    const domains = await prisma.domain.findMany({ orderBy: { lastCrawl: 'asc' } });

    if (!domains || domains.length === 0) {
        yield* mainLogger.log('no auto crawls found');
        return Response.json({ error: 'no auto crawls found' }, { status: 404 })
    }

    for (const domain of domains) {
        if (domainsCrawled >= maxDomainCrawls) {
            yield* mainLogger.log(`stop crawling (crawled = ${domainsCrawled})`);
            break;
        }
        let diffMinutes = 0;
        if (domain.crawlInterval && domain.crawlInterval > 0) {
            let lastCrawl = domain.lastCrawl;
            if (!lastCrawl) {
                lastCrawl = new Date('01-01-1970');
            }
            const now = new Date();
            const diff = now.getTime() - lastCrawl.getTime();
            diffMinutes = Math.floor(diff / 60000);
        }
        else {
            yield* mainLogger.log('❗ auto crawl: ' + domain.domainName + ' has no crawl interval');
            break;
        }
        if (!domain.domainVerified) {
            yield* mainLogger.log(`❌ not verified: domain ${domain.domainName} (${diffMinutes} / ${domain.crawlInterval} m)`);
            continue;
        }
        yield* mainLogger.log(`✅ domain ${domain.domainName}: verified (${diffMinutes} / ${domain.crawlInterval} m)`);

        if (domain.crawlStatus === 'crawling') {
            if (domain.lastCrawl && Date.now() - domain.lastCrawl.getTime() > resetCrawlTime) {
                // reset domain crawl status, when it was remains in that status for a long time
                // this can happen on route timeouts while crawling
                console.error(`➝  crawling status of domain ${domain.name} (${domain.domainName}) reset`);
                await prisma.domain.update({ where: { id: domain.id }, data: { crawlStatus: 'idle' } });
            }
            yield* mainLogger.log('➝  auto crawl: ' + domain.domainName + ' is already crawling');
            continue;
        }
        if (domain.crawlEnabled) {

            yield* mainLogger.log(`➝  domain ${domain.domainName}: crawl enabled`);

            if (diffMinutes > domain.crawlInterval) {
                yield* mainLogger.log('➝  auto crawl: ' + domain.domainName + ' last crawl was ' + diffMinutes + ' / ' + domain.crawlInterval + ' minutes ago');

                const depth = 2;
                const followLinks = true;
                // const logger = (text: string) => (yield log(text));
                yield* mainLogger.log(`➝  domain ${domain.domainName}: start`);

                /* subfunction */
                const subfunctionGenerator = crawlDomain(domain.domainName, depth, followLinks, maxExecutionTime, true);

                let result: IteratorResult<LogEntry, crawlDomainResponse>;
                do {
                    result = await subfunctionGenerator.next();
                    if (!result.done) {
                        yield result.value;
                    }
                } while (!result.done);

                let subfunctionResult: crawlDomainResponse | undefined = undefined;
                subfunctionResult = result.value;
                /* end subfunction */

                // await crawlDomain(domain.domainName, depth, followLinks, maxExecutionTime);
                domainsCrawled += 1;

                await prisma.adminLog.create({
                    data: {
                        createdAt: new Date(),
                        message: `domain ${domain.domainName} crawled (score: ${(domain.score ? domain.score : 0) * 100}), host: ${host}`,
                        domainId: domain.id,
                        userId: domain.userId
                    }
                });

                yield* mainLogger.log(`➝  domain ${domain.domainName}: end (crawled = ${domainsCrawled})`);
                continue;
            }
            else {
                yield* mainLogger.log('➥  skip auto crawl: ' + domain.domainName + ' last crawl was ' + diffMinutes + ' / ' + domain.crawlInterval + ' minutes ago');
            }
        }
    }

}