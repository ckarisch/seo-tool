import { env } from "process";
import { createLogger } from "../dev/logger";
import { LogEntry } from "../dev/StreamingLogViewer";
import { crawlDomain, crawlDomainResponse } from "@/app/api/seo/domains/[domainName]/crawl/crawlDomain";
import { CronJob, PrismaClient } from "@prisma/client";
import { domainIntervalGenerator, domainIntervalResponse } from "./domainInterval";
import { quickAnalysis } from "@/app/api/seo/domains/[domainName]/crawl/quickAnalysis";
const prisma = new PrismaClient();

const resetCrawlTime = 3600000; // 1h
const maxDomainCrawls = 5;
const fallbackInterval = 1420; // nearly a day

export async function* quickAnalysisGenerator(maxExecutionTime: number, host: string, cron: CronJob): AsyncGenerator<LogEntry> {
    const mainLogger = createLogger('Quick_START');

    let domainsCrawled = 0;

    if (env.NODE_ENV == 'development') {
        yield* mainLogger.log(`cron in dev mode`);
    }

    yield* mainLogger.log('start auto crawl');
    const domains = await prisma.domain.findMany({ orderBy: { lastQuickAnalysis: 'asc' }, include: { user: { select: { role: true } } } });

    if (!domains || domains.length === 0) {
        yield* mainLogger.log('no auto crawls found');
        return Response.json({ error: 'no auto crawls found' }, { status: 404 })
    }

    for (const domain of domains) {
        if (domainsCrawled >= maxDomainCrawls) {
            yield* mainLogger.log(`stop crawling (crawled = ${domainsCrawled})`);
            break;
        }

        if (!domain.crawlEnabled) {
            yield* mainLogger.log(`➥  crawling disabled: domain ${domain.domainName}`);
            continue;
        }

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

        let diffMinutes = 0;
        if (domainInterval > 0) {
            let lastQuickAnalysis = domain.lastQuickAnalysis;
            if (!lastQuickAnalysis) {
                lastQuickAnalysis = new Date('01-01-1970');
            }
            const now = new Date();
            const diff = now.getTime() - lastQuickAnalysis.getTime();
            diffMinutes = Math.floor(diff / 60000);
        }
        else {
            yield* mainLogger.log('❗ auto crawl: ' + domain.domainName + ' has no crawl interval');
            break;
        }
        if (!domain.domainVerified) {
            if (domain.user.role === 'admin') {
                yield* mainLogger.log(`❗✅ admin mode (not verified): domain ${domain.domainName}`);

            }
            else {
                yield* mainLogger.log(`❌ not verified: domain ${domain.domainName} (${diffMinutes} / ${domainInterval} m)`);
                continue;
            }
        }
        yield* mainLogger.log(`✅ domain ${domain.domainName}: verified (${diffMinutes} / ${domainInterval} m)`);

        if (domain.crawlEnabled) {
            yield* mainLogger.log(`➝  domain ${domain.domainName}: crawl enabled`);

            if (diffMinutes >= domainInterval) {
                yield* mainLogger.log('➝  auto crawl: ' + domain.domainName + ' last crawl was ' + diffMinutes + ' / ' + domainInterval + ' minutes ago');

                const depth = 2;
                const followLinks = true;
                // const logger = (text: string) => (yield log(text));
                yield* mainLogger.log(`➝  domain ${domain.domainName}: start`);

                /* subfunction */
                const subfunctionGenerator = quickAnalysis(domain.domainName, depth, followLinks, maxExecutionTime, true);

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

                domainsCrawled += 1;

                await prisma.adminLog.create({
                    data: {
                        createdAt: new Date(),
                        message: `domain ${domain.domainName} quick analysis (score: ${(domain.score ? domain.score : 0) * 100}), host: ${host}`,
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