import { UserRole } from "@prisma/client";
import { AxiosError } from 'axios';
import { initialCrawl } from "@/crawler/initialCrawl";
import { analyzeLink } from "@/apiComponents/crawler/linkTools";
import { Link, checkTimeout } from "@/app/api/seo/domains/[domainName]/crawl/crawlLinkHelper";
import { extractLinks } from "@/crawler/extractLinks";
import { recursiveCrawl, recursiveCrawlResponse } from "@/crawler/recursiveCrawl";
import { createLogger, LogEntry } from "@/apiComponents/dev/logger";
import { prisma } from "@/lib/prisma";

export type crawlDomainPublicResponse = {
    error?: string;
    errorTooManyLinksOccured?: boolean;
    error404Occured?: boolean;
    error503Occured?: boolean;
    warning?: boolean;
    crawlWarning?: boolean;
    warningDoubleSlashOccured?: boolean;
    errorCount?: number;
    warningCount?: number;
}

export async function* crawlDomainPublicGenerator(url: string, depth: number, followLinks: boolean, maxDuration: number): AsyncGenerator<LogEntry, crawlDomainPublicResponse> {
    const crawlStartTime = new Date().getTime();
    const maxCrawlTime = maxDuration - 1000; // milliseconds
    const maxLinkEntries = 50;
    const maxRequests = 50;

    let analyzedUrl = analyzeLink(url, url);
    const crawlDomainPublicLogger = createLogger('CRAWL (public)');

    const links: Link[] = [];

    let timePassed, requestStartTime, requestTime;
    let warningDoubleSlashOccured = false;
    let errorUnknownOccured = false;
    let error404Occured = false;
    let error503Occured = false;
    let errorTimeoutOccured = false;
    let errorTooManyLinksOccured = false;
    let error404Links = [];
    const crawledLinks: (string)[] = ['/'];

    const domain = await prisma.domain.findFirst({ where: { domainName: url } });

    const targetURL = 'https://' + url;
    analyzedUrl = analyzeLink(targetURL, targetURL);
    const extractedDomain = analyzedUrl.linkDomain;

    if (domain) {
        if (domain.crawlStatus === 'crawling') {
            // no public crawls during normal crawl
            yield* crawlDomainPublicLogger.log('domain currently crawling: ' + (new Date().getTime() - (domain.lastCrawl?.getTime() ?? 0)));
            return { error: 'domain currently crawling' };
        }
    } else {
        return { error: 'domain not found' };
    }

    const domainCrawl = await prisma.anonymousCrawl.create({
        data: {
            domainName: url,
            startTime: new Date(),
            status: 'crawling',
            error: false
        }
    });

    let crawlError = false;
    let totalErrorCount = 0;
    let totalWarningCount = 0;

    try {
        yield* crawlDomainPublicLogger.log('Public Crawling: ' + targetURL + `depth ${depth}, followLinks ${followLinks}, maxDuration ${maxDuration}`);

        timePassed = (new Date().getTime() - crawlStartTime);
        if (checkTimeout(timePassed, maxCrawlTime)) {
            return { error: 'Timeout' };
        }

        requestStartTime = new Date().getTime();
        let data;
        data = (await initialCrawl(domain, targetURL, maxCrawlTime, crawlStartTime, null, analyzedUrl)).data;

        links.push(...extractLinks(data, url, targetURL));

        const subfunctionGenerator = recursiveCrawl(
            prisma,
            links,
            crawledLinks,
            depth,
            analyzedUrl,
            extractedDomain,
            crawlStartTime,
            maxCrawlTime,
            maxLinkEntries,
            maxRequests,
            '',
            null,
            false,
            requestStartTime,
            crawlDomainPublicLogger,
            UserRole.STANDARD
        );

        let result: IteratorResult<LogEntry, recursiveCrawlResponse>;
        do {
            result = await subfunctionGenerator.next();
            if (!result.done) {
                yield result.value;
            }
        } while (!result.done);

        let subfunctionResult: recursiveCrawlResponse | undefined = undefined;
        subfunctionResult = result.value;

        yield* crawlDomainPublicLogger.log(`subfunctionResult` + subfunctionResult);

        if (!subfunctionResult) {
            return { error: 'Public Crawl Error' };
        }

        // Update total counts from recursive crawl
        totalErrorCount = subfunctionResult.errorCount || 0;
        totalWarningCount = subfunctionResult.warningCount || 0;

        if (subfunctionResult.warningDoubleSlashOccured) {
            warningDoubleSlashOccured = true;
            yield* crawlDomainPublicLogger.log(`❗2: warning: double slash occured`);
        }

        if (subfunctionResult.timeout) {
            errorTimeoutOccured = true;
        } else if (subfunctionResult.tooManyRequests) {
            errorTooManyLinksOccured = true;
        }

        requestTime = new Date().getTime() - requestStartTime;
        yield* crawlDomainPublicLogger.log(`request time (${targetURL}): ${requestTime}`);

        await prisma.anonymousCrawl.update({
            where: { id: domainCrawl.id },
            data: {
                status: 'done',
                error: false,
                endTime: new Date(),
                warningDoubleSlash: warningDoubleSlashOccured,
                error404: error404Occured
            }
        });

    } catch (error: AxiosError | TypeError | any) {
        yield* crawlDomainPublicLogger.log(error);
        timePassed = (new Date().getTime() - crawlStartTime);
        errorUnknownOccured = true;

        if (error instanceof AxiosError) {
            yield* crawlDomainPublicLogger.log('axios error on request')
            crawlError = true;

            await prisma.anonymousCrawl.update({
                where: { id: domainCrawl.id },
                data: {
                    status: 'error',
                    error: true,
                    endTime: new Date(),
                    errorName: error.code ? error.code : error.name,
                    errorMessage: error.cause?.message,
                    crawlTime: timePassed
                }
            });
        } else if (error instanceof TypeError) {
            yield* crawlDomainPublicLogger.log('type error on request')
            crawlError = true;

            await prisma.anonymousCrawl.update({
                where: { id: domainCrawl.id },
                data: {
                    status: 'error',
                    error: true,
                    endTime: new Date(),
                    errorName: error.name,
                    errorMessage: error.message,
                    crawlTime: timePassed
                }
            });
        } else {
            yield* crawlDomainPublicLogger.log('unknown request error')
            crawlError = true;

            await prisma.anonymousCrawl.update({
                where: { id: domainCrawl.id },
                data: {
                    status: 'error',
                    error: true,
                    endTime: new Date(),
                    errorName: error.name ? error.name : 'unknown',
                    errorMessage: error.cause?.message,
                    crawlTime: timePassed
                }
            });
        }
        return { error: 'Error fetching data' };
    } finally {
        timePassed = (new Date().getTime() - crawlStartTime);

        const error = (
            error404Occured ||
            error503Occured ||
            crawlError
        );

        const crawlWarning = (
            errorTooManyLinksOccured
        );

        const warning = (
            warningDoubleSlashOccured
        );

        yield* crawlDomainPublicLogger.log('crawling done: ' + timePassed);

        return {
            error: error ? 'crawl errors' : undefined,
            errorTooManyLinksOccured,
            error404Occured,
            error503Occured,
            warning,
            crawlWarning,
            warningDoubleSlashOccured,
            errorCount: totalErrorCount,
            warningCount: totalWarningCount
        };
    }
}