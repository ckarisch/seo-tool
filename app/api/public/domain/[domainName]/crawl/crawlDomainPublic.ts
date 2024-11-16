import { PrismaClient } from "@prisma/client";

import { AxiosError } from 'axios';
import { NextResponse } from 'next/server';
import { initialCrawl } from "@/crawler/initialCrawl";
import { analyzeLink } from "@/apiComponents/crawler/linkTools";
import { Link, checkTimeout } from "@/app/api/seo/domains/[domainName]/crawl/crawlLinkHelper";
import { extractLinks } from "@/crawler/extractLinks";
import { recursiveCrawl, recursiveCrawlResponse } from "@/crawler/recursiveCrawl";
import { CrawlResponseYieldType, createLogger, isLogEntry } from "@/apiComponents/dev/logger";

const prisma = new PrismaClient();



export const crawlDomainPublic = async (url: string, depth: number, followLinks: boolean, maxDuration: number): Promise<Response> => {
    const crawlStartTime = new Date().getTime();
    const maxCrawlTime = maxDuration - 1000; // milliseconds

    let analyzedUrl = analyzeLink(url, url);
    const cronLogger = createLogger('CRAWL (public)');

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
            console.log('domain currently crawling: ' + (new Date().getTime() - (domain.lastCrawl?.getTime() ?? 0)));
            return Response.json({ error: 'domain currently crawling' }, { status: 500 })
        }
    }
    else {
        return Response.json({ error: 'domain not found' }, { status: 500 });
    }

    const domainCrawl = await prisma.anonymousCrawl.create({
        data: {
            domainName: url,
            startTime: new Date(),
            status: 'crawling',
            error: false
        }
    });

    try {
        console.log('Public Crawling: ' + targetURL, `depth ${depth}, followLinks ${followLinks}, maxDuration ${maxDuration}`);

        // Fetch the HTML content from the target URL
        timePassed = (new Date().getTime() - crawlStartTime);
        if (checkTimeout(timePassed, maxCrawlTime)) {
            Response.json({ error: 'Timeout' }, { status: 500 });
        }

        requestStartTime = new Date().getTime();
        let data;
        data = await initialCrawl(domain, targetURL, maxCrawlTime, crawlStartTime, null, analyzedUrl);


        links.push(...extractLinks(data, url, targetURL));

        const maxLinkEntries = 50;
        const maxRequests = 50;

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
            true,
            requestStartTime,
            cronLogger);


        // Initialize the result variable
        let subfunctionResult: recursiveCrawlResponse | undefined = undefined;

        // Process all yields from subfunction
        let subfunctionItem: IteratorResult<CrawlResponseYieldType>;
        do {
            subfunctionItem = await subfunctionGenerator.next();
            if (!subfunctionItem.done) {
                if ('type' in subfunctionItem.value && subfunctionItem.value.type === 'result') {
                    subfunctionResult = subfunctionItem.value.value;
                } else {
                    if (isLogEntry(subfunctionItem.value)) {
                        // yield subfunctionItem.value;
                        console.log(subfunctionItem.value);
                    }
                }
            }
        } while (!subfunctionItem.done);

        
        if (!subfunctionResult) {
            return Response.json({ error: 'Public Crawl Error' }, { status: 500 });
        }
        else if (subfunctionResult.timeout) {
            return Response.json({ error: 'Timeout' }, { status: 500 });
        }
        else if (subfunctionResult.tooManyRequests) {
            return Response.json({ error: 'Too many link entries' }, { status: 500 });
        }

        if (subfunctionResult.warningDoubleSlashOccured) {
            warningDoubleSlashOccured = true;
        }

        if (subfunctionResult.timeout) {
            errorTimeoutOccured = true;
        }
        else if (subfunctionResult.tooManyRequests) {
            errorTooManyLinksOccured = true;
        }

        requestTime = new Date().getTime() - requestStartTime;
        console.log(`request time (${targetURL}): ${requestTime}`);

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
        console.log(error);
        timePassed = (new Date().getTime() - crawlStartTime);
        errorUnknownOccured = true;

        if (error instanceof AxiosError) {
            console.log('set axios update')

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
            console.log('set type update')

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
            console.log('set unknown update')

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
        return Response.json({ error: 'Error fetching data' }, { status: 500 })
    }
    finally {
        timePassed = (new Date().getTime() - crawlStartTime);

        const error = (
            error404Occured ||
            error503Occured ||
            errorTooManyLinksOccured
        )

        const warning = (
            warningDoubleSlashOccured
        );

        // await CalculateScore(domain.id);
        console.log('crawling done: ', timePassed);

        return Response.json({ error, errorTooManyLinksOccured, error404Occured, error503Occured, warning, warningDoubleSlashOccured }, { status: 200 })
    }

}