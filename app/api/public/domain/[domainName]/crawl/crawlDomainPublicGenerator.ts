import { PrismaClient, UserRole } from "@prisma/client";

import { AxiosError } from 'axios';
import { NextResponse } from 'next/server';
import { initialCrawl } from "@/crawler/initialCrawl";
import { analyzeLink } from "@/apiComponents/crawler/linkTools";
import { Link, checkTimeout } from "@/app/api/seo/domains/[domainName]/crawl/crawlLinkHelper";
import { extractLinks } from "@/crawler/extractLinks";
import { recursiveCrawl, recursiveCrawlResponse } from "@/crawler/recursiveCrawl";
import { CrawlResponseYieldType, createLogger, isLogEntry, LogEntry } from "@/apiComponents/dev/logger";

const prisma = new PrismaClient();

export type crawlDomainPublicResponse = {
    error?: string,
    errorTooManyLinksOccured?: boolean,
    error404Occured?: boolean,
    error503Occured?: boolean,
    warning?: boolean,
    crawlWarning?: boolean,
    warningDoubleSlashOccured?: boolean
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


    const targetURL = 'https://' + url; // URL of the website you want to crawl
    analyzedUrl = analyzeLink(targetURL, targetURL);
    const extractedDomain = analyzedUrl.linkDomain;

    if (domain) {
        // no public crawls during normal crawl
        if (domain.crawlStatus === 'crawling') {
            yield* crawlDomainPublicLogger.log('domain currently crawling: ' + (new Date().getTime() - (domain.lastCrawl?.getTime() ?? 0)));
            // return Response.json({ error: 'domain currently crawling' }, { status: 500 })
            return { error: 'domain currently crawling' };
        }
    }
    else {
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

    try {
        yield* crawlDomainPublicLogger.log('Public Crawling: ' + targetURL + `depth ${depth}, followLinks ${followLinks}, maxDuration ${maxDuration}`);

        // Fetch the HTML content from the target URL
        timePassed = (new Date().getTime() - crawlStartTime);
        if (checkTimeout(timePassed, maxCrawlTime)) {
            Response.json({ error: 'Timeout' }, { status: 500 });
        }

        requestStartTime = new Date().getTime();
        let data;
        data = (await initialCrawl(domain, targetURL, maxCrawlTime, crawlStartTime, null, analyzedUrl)).data;

        links.push(...extractLinks(data, url, targetURL));

        const subfunctionGenerator = recursiveCrawl(prisma,
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
            null, //domainCrawl
            false, // do not push links to database in public crawls
            requestStartTime,
            crawlDomainPublicLogger,
            UserRole.STANDARD);

        let result: IteratorResult<LogEntry, recursiveCrawlResponse>;
        do {
            result = await subfunctionGenerator.next();
            if (!result.done) {
                yield result.value;
            }
        } while (!result.done);

        // Initialize the result variable
        let subfunctionResult: recursiveCrawlResponse | undefined = undefined;
        subfunctionResult = result.value;

        yield* crawlDomainPublicLogger.log(`subfunctionResult` + subfunctionResult);

        // yield* crawlDomainPublicLogger.log(`subfunctionResult (${JSON.stringify(subfunctionResult)})`);
        if (!subfunctionResult) {
            // return Response.json({ error: 'Public Crawl Error' }, { status: 500 });
            return { error: 'Public Crawl Error' };
        }

        if (subfunctionResult.warningDoubleSlashOccured) {
            warningDoubleSlashOccured = true;
            yield* crawlDomainPublicLogger.log(`❗2: warning: double slash occured`);
        }

        if (subfunctionResult.timeout) {
            errorTimeoutOccured = true;
        }
        else if (subfunctionResult.tooManyRequests) {
            errorTooManyLinksOccured = true;
        }

        requestTime = new Date().getTime() - requestStartTime;
        yield* crawlDomainPublicLogger.log(`request time (${targetURL}): ${requestTime}`);

        // 2do: always update
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

        // Send the extracted data as a response
        // return NextResponse.json({ links }, { status: 200 })

    } catch (error: AxiosError | TypeError | any) {
        // Handle any errors
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
        }
        else if (error instanceof TypeError) {
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
        }
        else {
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
        // return Response.json({ error: 'Error fetching data' }, { status: 500 })
        return { error: 'Error fetching data' };
    }
    finally {
        timePassed = (new Date().getTime() - crawlStartTime);

        const error = (
            error404Occured ||
            error503Occured ||
            crawlError
        )

        const crawlWarning = (
            errorTooManyLinksOccured
        );

        const warning = (
            warningDoubleSlashOccured
        );

        // await CalculateScore(domain.id);
        yield* crawlDomainPublicLogger.log('crawling done: ' + timePassed);

        return { error: error ? 'crawl errors' : undefined, errorTooManyLinksOccured, error404Occured, error503Occured, warning, crawlWarning, warningDoubleSlashOccured };
    }

}