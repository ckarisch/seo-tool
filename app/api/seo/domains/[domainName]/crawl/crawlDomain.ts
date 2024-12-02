
import { AxiosError } from 'axios';
import { analyzeLink } from "../../../../../../apiComponents/crawler/linkTools";
import { initialCrawl } from "@/crawler/initialCrawl";
import { Link, checkTimeoutAndPush, linkType, pushLink } from "./crawlLinkHelper";
import { extractLinks } from "@/crawler/extractLinks";
import { recursiveCrawl, recursiveCrawlResponse } from "@/crawler/recursiveCrawl";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createLogger } from "@/apiComponents/dev/logger";
import { LogEntry } from "@/apiComponents/dev/StreamingLogViewer";
import { prisma } from '@/lib/prisma';
import { Domain, UserRole } from '@prisma/client';

export type crawlDomainResponse = {
    error?: string | null,
    domains?: any[],
    links?: any[]
}

export async function* crawlDomain(
    domain: Partial<Domain>,
    depth: number,
    followLinks: boolean,
    maxDuration: number,
    adminMode?: boolean
): AsyncGenerator<LogEntry, crawlDomainResponse> {

    const crawlStartTime = new Date().getTime();
    const maxCrawlTime = maxDuration - 1000; // milliseconds
    const seconds = 30; // min seconds between crawls
    const maxRequests = 1000;
    const maxLinkEntries = 500; // with documents and images

    let logger = createLogger('CRAWL ');
    if (!domain) {
        yield* logger.log('error: domain not found');
        return { error: 'domain not found' };
    }
    const url = domain.domainName ?? '';
    logger = createLogger('CRAWL ' + url);

    if (!domain.id || !domain.domainName || url === '') {
        yield* logger.log('error: domain fields not found');
        return { error: 'domain fields not found' };
    }

    let analyzedUrl = analyzeLink(url, url);
    let extractedDomain = analyzedUrl.linkDomain;
    let extractedDomainLinkHttps = analyzedUrl.linkDomainWithHttps;

    const links: Link[] = [];
    const crawledLinks: (string)[] = ['/'];

    let timePassed, requestStartTime, requestTime;
    let warningDoubleSlashOccured = false;
    let errorUnknownOccured = false;
    let error404Occured = false;
    let error503Occured = false;

    const user = await prisma.user.findFirst({ where: { id: domain?.userId }, include: { notificationContacts: true } });


    const session = await getServerSession(authOptions);

    if (!adminMode) {
        if (!session || !session!.user) {
            yield* logger.log('error: no session');
            return { error: 'Not authenticated', domains: [] };
        }
        const sessionUser = await prisma.user.findFirst({ where: { email: session.user.email! } })

        if (!sessionUser) {
            yield* logger.log('error: session user not found');
            return { error: 'user not fould' };
        }

        if (sessionUser.role !== UserRole.ADMIN) {
            // admins are allowed to crawl unverified domains
            if (!domain.domainVerified) {
                yield* logger.log('error: domain not verified');
                return { error: 'Domain not verified', domains: [] };
            }

            if (!user) {
                return { error: 'domain has no user' };
            }

            if (domain.userId !== user.id) {
                yield* logger.log('error: not allowed');
                return { error: 'not allowed', domains: [] };
            }
        }
    }

    let targetURL = extractedDomainLinkHttps; // URL of the website you want to crawl

    if (domain.crawlStatus === 'crawling') {
        yield* logger.log('domain currently crawling: ' + (new Date().getTime() - (domain.lastCrawl?.getTime() ?? 0)));
        return { error: 'domain currently crawling' };
    }

    if (domain.lastCrawl && (new Date().getTime() - (domain.lastCrawl?.getTime() ?? 0)) < 1000 * seconds) {
        yield* logger.log('Crawling too soon: ' + (new Date().getTime() - (domain.lastCrawl?.getTime() ?? 0)));
        return { error: 'crawling too soon' };
    }

    // Check for partial crawl before starting new one
    const partialCrawl = await prisma.domainCrawl.findFirst({
        where: {
            domainId: domain.id,
            isPartial: true,
            status: 'partial'
        },
        orderBy: {
            startTime: 'desc'
        }
    });

    let domainCrawl;

    if (partialCrawl && partialCrawl.remainingLinks) {
        yield* logger.log('Continuing partial crawl');
        // Convert stored JSON back to Link array
        const savedState = partialCrawl.remainingLinks as any;
        links.push(...savedState.links);
        crawledLinks.push(...savedState.crawledLinks);

        // Update the crawl status
        domainCrawl = await prisma.domainCrawl.update({
            where: { id: partialCrawl.id },
            data: {
                status: 'crawling',
                isPartial: false,
                remainingLinks: null
            }
        });
    }
    else {
        domainCrawl = await prisma.domainCrawl.create({
            data: {
                domain: {
                    connect: {
                        id: domain.id
                    }
                },
                startTime: new Date(),
                status: 'crawling',
                error: false
            }
        });
    }

    await prisma.domain.update({
        where: { id: domain.id },
        data: {
            lastCrawl: new Date(), // important for crawl reset to set lastCrawl here
            crawlStatus: 'crawling'
        }
    });

    try {
        yield* logger.log('Crawling: ' + targetURL + `depth ${depth}, followLinks ${followLinks}, maxDuration ${maxDuration}`);

        // Fetch the HTML content from the target URL
        timePassed = (new Date().getTime() - crawlStartTime);
        if (await checkTimeoutAndPush(prisma, timePassed, maxCrawlTime, domainCrawl.id, domain.id)) {
            yield* logger.log(`timout in crawlDomain`);
            return { links: [] };
        }

        requestStartTime = new Date().getTime();

        const {
            data,
            finalURL,
            finalURLObject
        } = await initialCrawl(domain, targetURL, maxCrawlTime, crawlStartTime, user, analyzedUrl);

        requestTime = new Date().getTime() - requestStartTime;
        yield* logger.log(`request time (${targetURL}): ${requestTime}`);

        targetURL = finalURLObject.hostname;
        analyzedUrl = analyzeLink(targetURL, targetURL);
        extractedDomain = analyzedUrl.linkDomain;
        yield* logger.log(`now using finalURL ${targetURL}`);
        
        if (!followLinks) {
            await prisma.domainCrawl.update({
                where: { id: domainCrawl.id },
                data: {
                    status: 'done',
                    error: false,
                    endTime: new Date()
                }
            });
            await prisma.domain.update({
                where: { id: domain.id },
                data: {
                    crawlStatus: 'idle'
                }
            });
            return { links: [] };
        }

        links.push({ foundOnPath: '', ignoreCanonical: false, path: targetURL });
        links.push(...extractLinks(data, targetURL, targetURL));
        yield* logger.log('start recursive crawl');

        /* subfunction */
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
            domain.id,
            domainCrawl,
            true,
            requestStartTime, logger,
            user?.role ?? UserRole.STANDARD);

        let result: IteratorResult<LogEntry, recursiveCrawlResponse>;
        do {
            result = await subfunctionGenerator.next();
            if (!result.done) {
                yield result.value;
            }
        } while (!result.done);

        let subfunctionResult: recursiveCrawlResponse | undefined = undefined;
        subfunctionResult = result.value;
        /* end subfunction */

        // After the loop, check the final result with null check
        if (subfunctionResult?.timeout) {
            return { error: 'Timeout' };
        }
        else if (subfunctionResult?.tooManyRequests) {
            return { error: 'Too many link entries' };
        }

        await prisma.domainCrawl.update({
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
        return { links };

    } catch (error: AxiosError | TypeError | any) {
        // Handle any errors
        yield* logger.log(JSON.stringify(error));
        timePassed = (new Date().getTime() - crawlStartTime);
        errorUnknownOccured = true;

        if (error instanceof AxiosError) {
            yield* logger.log('AxiosError' + error.cause?.message)
            await prisma.domain.update({
                where: { id: domain.id },
                data: {
                    crawlStatus: 'idle',
                    lastErrorTime: new Date(),
                    lastErrorType: error.code ? error.code : error.name,
                    lastErrorMessage: error.cause?.message,
                    lastCrawlTime: timePassed,
                    errorUnknown: true
                }
            });

            await prisma.domainCrawl.update({
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
            yield* logger.log('TypeError: ' + error.message)
            await prisma.domain.update({
                where: { id: domain.id },
                data: {
                    crawlStatus: 'idle',
                    lastErrorTime: new Date(),
                    lastErrorType: error.name,
                    lastErrorMessage: error.message,
                    lastCrawlTime: timePassed,
                    errorUnknown: true
                }
            });

            await prisma.domainCrawl.update({
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
            yield* logger.log('unknown error')
            await prisma.domain.update({
                where: { id: domain.id },
                data: {
                    crawlStatus: 'idle',
                    lastErrorTime: new Date(),
                    lastErrorType: error.name ? error.name : 'unknown',
                    lastErrorMessage: '',
                    lastCrawlTime: timePassed,
                    errorUnknown: true
                }
            });


            await prisma.domainCrawl.update({
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
    }
    finally {
        timePassed = (new Date().getTime() - crawlStartTime);

        const error = (
            error404Occured ||
            error503Occured
        )

        const warning = (
            warningDoubleSlashOccured
        );

        await prisma.domain.update({
            where: { id: domain.id },
            data: {
                crawlStatus: 'idle',
                lastCrawlTime: timePassed,
                errorUnknown: errorUnknownOccured,
                error,
                warning,
                error404: error404Occured,
                error503: error503Occured
            }
        });

        yield* logger.log('crawling done: ' + timePassed);
        return { error: null, domains: [] };
    }
}
