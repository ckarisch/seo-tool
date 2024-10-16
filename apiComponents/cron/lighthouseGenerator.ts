import { env } from "process";
import { createLogger } from "../dev/logger";
import { LogEntry } from "../dev/StreamingLogViewer";
import { CronJob, PrismaClient } from "@prisma/client";
import { lighthouseAnalysis, lighthouseAnalysisResponse } from "@/crawler/lighthouseAnalysis";
import { domainIntervalGenerator, domainIntervalResponse } from "./domainInterval";
const prisma = new PrismaClient();

const resetCrawlTime = 3600000; // 1h
const maxDomainCrawls = 2; // 1h
const fallbackInterval = 1420; // nearly a day

export async function* lighthouseGenerator(maxExecutionTime: number, host: string, cron: CronJob): AsyncGenerator<LogEntry> {
    const mainLogger = createLogger('Lighthouse_START');

    let domainsCrawled = 0;

    if (env.NODE_ENV == 'development') {
        yield* mainLogger.log(`cron in dev mode`);
    }

    yield* mainLogger.log('start auto crawl');
    const domains = await prisma.domain.findMany({ orderBy: { lastCrawl: 'asc' }, include: { user: { select: { role: true } } } });

    if (!domains || domains.length === 0) {
        yield* mainLogger.log('no auto crawls found');
        return Response.json({ error: 'no auto crawls found' }, { status: 404 })
    }

    for (const domain of domains) {
        let domainInterval = fallbackInterval;
        
        /* subfunction */
        const generateInterval = domainIntervalGenerator(domain.user.role, domain, cron, fallbackInterval);

        let lighthouseIteratorResult: IteratorResult<LogEntry, domainIntervalResponse>;
        do {
            lighthouseIteratorResult = await generateInterval.next();
            if (!lighthouseIteratorResult.done) {
                yield lighthouseIteratorResult.value;
            }
        } while (!lighthouseIteratorResult.done);

        domainInterval = lighthouseIteratorResult.value.domainInterval;
        /* end subfunction */

        if (domainsCrawled >= maxDomainCrawls) {
            yield* mainLogger.log(`stop crawling (crawled = ${domainsCrawled})`);
            break;
        }
        let diffMinutes = 0;
        if (domainInterval > 0) {
            let lastLighthouseAnalysis = domain.lastLighthouseAnalysis;
            if (!lastLighthouseAnalysis) {
                lastLighthouseAnalysis = new Date('01-01-1970');
            }
            const now = new Date();
            const diff = now.getTime() - lastLighthouseAnalysis.getTime();
            diffMinutes = Math.floor(diff / 60000);
        }
        if (!domain.domainVerified) {
            yield* mainLogger.log(`❌ not verified: domain ${domain.domainName} (${diffMinutes} / ${domainInterval} m)`);
            continue;
        }
        yield* mainLogger.log(`✅ domain ${domain.domainName}: verified (${diffMinutes} / ${domainInterval} m)`);

        if (domain.crawlEnabled) {

            yield* mainLogger.log(`➝  domain ${domain.domainName}: crawl enabled`);

            if (diffMinutes >= domainInterval) {
                yield* mainLogger.log('➝  auto crawl: ' + domain.domainName + ' last crawl was ' + diffMinutes + ' / ' + domainInterval + ' minutes ago');
                yield* mainLogger.log(`➝  domain ${domain.domainName}: start`);


                /* subfunction */
                const lighthouseGenerator = lighthouseAnalysis(
                    prisma,
                    domain
                );

                let lighthouseIteratorResult: IteratorResult<LogEntry, lighthouseAnalysisResponse>;
                do {
                    lighthouseIteratorResult = await lighthouseGenerator.next();
                    if (!lighthouseIteratorResult.done) {
                        yield lighthouseIteratorResult.value;
                    }
                } while (!lighthouseIteratorResult.done);

                let lighthouseResult: lighthouseAnalysisResponse | undefined = undefined;
                lighthouseResult = lighthouseIteratorResult.value;
                /* end subfunction */

                // await crawlDomain(domain.domainName, depth, followLinks, maxExecutionTime);
                domainsCrawled += 1;

                let lighthouseScore = 0;
                if (lighthouseResult.insights && lighthouseResult.insights.lighthouseResult.categories.performance) {
                    lighthouseScore = lighthouseResult.insights.lighthouseResult.categories.performance.score;
                }

                await prisma.adminLog.create({
                    data: {
                        createdAt: new Date(),
                        message: `domain ${domain.domainName} lighthoues (performanceScore: ${lighthouseScore * 100}), host: ${host}`,
                        domainId: domain.id,
                        userId: domain.userId
                    }
                });

                yield* mainLogger.log(`➝  domain ${domain.domainName}: end (crawled = ${domainsCrawled})`);
                continue;
            }
            else {
                yield* mainLogger.log('➥  skip auto crawl: ' + domain.domainName + ' last crawl was ' + diffMinutes + ' / ' + domainInterval + ' minutes ago');
            }
        }
    }

}