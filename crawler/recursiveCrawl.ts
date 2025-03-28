import { analyzeLink } from "@/apiComponents/crawler/linkTools";
import { LogEntry, Logger } from "@/apiComponents/dev/logger";
import { checkRequests, checkTimeout, createPushLinkInput, Link, linkType, pushAllLinks, pushExternalLink, pushExternalLinks, pushLink } from "@/app/api/seo/domains/[domainName]/crawl/crawlLinkHelper";
import axios, { AxiosError } from "axios";
import { load } from "cheerio";
import runErrorChecks, { HttpErrorCode } from "./errorChecker";
import { DomainCrawl, Prisma, UserRole } from "@prisma/client";
import { checkCanonical } from "./checks/checkCanonical";
import { handleHttpError } from "./errorHandle/handleHttpError";
import { checkLanguage } from "./checks/checkLanguage";
import * as https from 'https';

export interface recursiveCrawlResponse {
    timeout: boolean;
    tooManyRequests: boolean;
    warningDoubleSlashOccured: boolean;
    errorCount: number;
    warningCount: number;
    isPartial: boolean;
}

let totalErrorCount = 0;
let totalWarningCount = 0;

export async function* recursiveCrawl(
    prisma: any,
    links: Link[],
    crawledLinks: any[],
    depth: number,
    analyzedUrl: any,
    extractedDomain: string,
    crawlStartTime: number,
    maxCrawlTime: number,
    maxLinkEntries: number,
    maxRequests: number,
    domainId: string | null,
    domainCrawl: DomainCrawl | null,
    pushLinksToDomain: boolean,
    requestStartTime: number,
    subLogger: Logger,
    userRole: UserRole): AsyncGenerator<LogEntry, recursiveCrawlResponse, unknown> {

    const checkPartialTimeout = (currentTime: number) => {
        const timeLeft = maxCrawlTime - currentTime;
        return timeLeft <= 20000; // 20 seconds left
    };

    yield* subLogger.log('recursive crawl started');
    yield* subLogger.log('extractedDomain: ' + extractedDomain);
    let timePassed, requestTime;

    let requests = 0;
    let linkEntries = 0;
    let warningDoubleSlashOccured = false;
    let error404Occured = false;
    let error503Occured = false;
    const error404Links: string[] = [];
    const pushLinkInputs: Prisma.InternalLinkUpsertArgs[] = [];
    const externalLinksToInsert: { foundOnPath: string; href: string }[] = []; // Add this line
    const skippedCanonicals: any[] = [];

    let response: recursiveCrawlResponse = {
        timeout: false,
        tooManyRequests: false,
        warningDoubleSlashOccured: false,
        errorCount: 0,
        warningCount: 0,
        isPartial: false
    }

    let crawlActive = true;
    // maxRequests = 5;

    for (let j = 0; (crawlActive && j < depth); j++) {
        for (let i = 0; (crawlActive && i < links.length); i++) {
            // Check for partial timeout before processing each link
            timePassed = (new Date().getTime() - crawlStartTime);
            if (checkPartialTimeout(timePassed) && domainCrawl) {
                // Save remaining links
                const remainingLinks = links.slice(i).reduce<Link[]>((acc, current) => {
                    // Only add if path doesn't exist in accumulator
                    if (!acc.some(link => link.path === current.path)) {
                        acc.push(current);
                    }
                    return acc;
                }, []);

                yield* subLogger.log('Saving partial crawl state with ' + remainingLinks.length + ' remaining links');

                await prisma.domainCrawl.update({
                    where: { id: domainCrawl.id },
                    data: {
                        status: 'partial',
                        isPartial: true,
                        remainingLinks: {
                            links: remainingLinks,
                            crawledLinks: crawledLinks
                        },
                        endTime: new Date(),
                        crawlTime: timePassed
                    }
                });

                response.timeout = true;
                response.isPartial = true;
                crawlActive = false;
                break;
            }

            if (typeof links[i] !== 'undefined' && links[i]) { // Check if the link is defined
                const { subdomain, normalizedLink, normalizedPageLink, normalizedHttpsPageLink, isInternal, isInternalPage, warningDoubleSlash } = analyzeLink(links[i]!.path, extractedDomain);

                if (!crawledLinks.includes(normalizedPageLink)) {
                    if (warningDoubleSlash) {
                        yield* subLogger.verbose('❗double slash occured');
                        warningDoubleSlashOccured = true;
                        response.warningDoubleSlashOccured = true;
                    }

                    if (isInternal) {
                        if (subdomain != analyzedUrl.subdomain) {
                            yield* subLogger.log(`warning: subdomain (${normalizedPageLink}) not matching with requested url`)
                        }

                        timePassed = (new Date().getTime() - crawlStartTime);

                        if (checkTimeout(timePassed, maxCrawlTime)) {
                            yield* subLogger.log('timeout: ' + timePassed);
                            response.timeout = true;
                            crawlActive = false;
                            break;
                        }

                        linkEntries++;
                        if (checkRequests(linkEntries, maxLinkEntries)) {
                            yield* subLogger.log('too many link entries: ' + linkEntries);
                            response.tooManyRequests = true;
                            crawlActive = false;
                            break;
                        }

                        if (isInternalPage) {
                            // only crawl pages
                            requests++;
                            if (checkRequests(requests, maxRequests)) {
                                yield* subLogger.log('too many requests: ' + requests);
                                response.tooManyRequests = true;
                                crawlActive = false;
                                break;
                            }

                            requestStartTime = new Date().getTime();
                            const requestUrl = normalizedHttpsPageLink;

                            let errors = {
                                err_404: false,
                                err_503: false
                            }

                            let data;
                            requestTime = 0; // set to 0 in case of error

                            try {
                                yield* subLogger.verbose(`${normalizedPageLink} request`);
                                timePassed = (new Date().getTime() - crawlStartTime);
                                requestStartTime = new Date().getTime();

                                const axiosInstance = axios.create();
                                axiosInstance.interceptors.request.use(config => {
                                    config.timeout = maxCrawlTime - timePassed;
                                    return config;
                                });

                                const abortController = new AbortController();
                                data = (await axiosInstance.get(requestUrl, {
                                    signal: abortController.signal,
                                    validateStatus: function (status) {
                                        return status < 500; // Accept all status codes less than 500
                                    },
                                    httpsAgent: new https.Agent({
                                        rejectUnauthorized: false,
                                        timeout: maxCrawlTime - timePassed
                                    })
                                })).data;

                                requestTime = new Date().getTime() - requestStartTime;
                                let internalLinkId: string | undefined = undefined;

                                // Check for canonical URL before processing the page
                                if (!links[i].ignoreCanonical) {
                                    if (skippedCanonicals.includes(normalizedHttpsPageLink)) {
                                        // if this link is already marked as non canonical, skip it
                                        // no request to check for canonical tag will be started
                                        continue;
                                    }
                                    const { hasCanonical, canonicalUrl } = checkCanonical(data);
                                    if (hasCanonical && canonicalUrl) {
                                        // Add new link with ignoreCanonical = true
                                        const { normalizedLink: canonicalNormalizedLink } = analyzeLink(canonicalUrl, extractedDomain);

                                        if (canonicalNormalizedLink !== normalizedLink) {
                                            // only skip, if canonical link is different
                                            links.push({
                                                path: canonicalNormalizedLink,
                                                foundOnPath: requestUrl,
                                                ignoreCanonical: true
                                            });

                                            // do not push non canonicals to database

                                            yield* subLogger.verbose('skip non canonical ' + normalizedLink)
                                            yield* subLogger.verbose('use ' + canonicalNormalizedLink)
                                            skippedCanonicals.push(normalizedLink);

                                            // Skip further processing of this link
                                            continue;
                                        }
                                    }
                                }

                                // only push to crawled links, if link is not skipped
                                crawledLinks.push(normalizedPageLink);
                                const { language } = checkLanguage(data);

                                if (pushLinksToDomain && domainId) {
                                    const internalLink = await pushLink(prisma,
                                        links[i].foundOnPath,
                                        normalizedPageLink,
                                        false,
                                        domainId,
                                        linkType.page,
                                        requestTime,
                                        null,
                                        language);
                                    internalLinkId = internalLink.id;
                                }

                                const errorCheckResult = await runErrorChecks({
                                    data,
                                    domainId: domainId ? domainId : undefined,
                                    internalLinkId,
                                    domainCrawlId: domainCrawl ? domainCrawl.id : undefined,
                                    url: requestUrl
                                }, userRole);

                                totalErrorCount += errorCheckResult.summary.errorCount;
                                totalWarningCount += errorCheckResult.summary.warningCount;
                            }
                            catch (error: AxiosError | TypeError | any) {
                                yield* subLogger.verbose(`request ${requests} error (${requestUrl})`);
                                timePassed = (new Date().getTime() - crawlStartTime);

                                if (error.code === 'ECONNRESET') {
                                    yield* subLogger.error(`Socket connection reset for ${requestUrl}`);
                                    // Handle the ECONNRESET error specifically
                                    if (pushLinksToDomain && domainId) {
                                        await prisma.errorLog.create({
                                            data: {
                                                errorType: {
                                                    connect: {
                                                        code: 'ECONNRESET'
                                                    }
                                                },
                                                domain: {
                                                    connect: {
                                                        id: domainId
                                                    }
                                                },
                                                domainCrawl: domainCrawl ? {
                                                    connect: {
                                                        id: domainCrawl.id
                                                    }
                                                } : undefined,
                                                metadata: {
                                                    url: requestUrl,
                                                    message: 'Socket connection reset'
                                                }
                                            }
                                        });
                                    }
                                    // Skip this URL and continue with the next one
                                    continue;
                                }

                                if (error instanceof AxiosError) {
                                    const errorResult = await handleHttpError({
                                        error,
                                        prisma,
                                        domainId,
                                        domainCrawlId: domainCrawl?.id,
                                        normalizedLink: normalizedPageLink,
                                        foundOnPath: links[i].foundOnPath,
                                        requestUrl,
                                        requestTime,
                                        userRole,
                                        pushLinksToDomain
                                    });

                                    if (!errorResult.shouldSkip) {
                                        if (errorResult.errorCode === HttpErrorCode.ERROR_404) {
                                            errors.err_404 = true;
                                            error404Occured = true;
                                            error404Links.push(normalizedHttpsPageLink);
                                            yield* subLogger.verbose('error: 404 ' + requestUrl);
                                        } else if (errorResult.errorCode === HttpErrorCode.ERROR_503) {
                                            errors.err_503 = true;
                                            error503Occured = true;
                                            yield* subLogger.verbose('error: 503 ' + requestUrl);
                                        }
                                    }
                                } else {
                                    yield* subLogger.error(`request ${requests} critical error at ${requestUrl} ${JSON.stringify(error)}`);
                                }
                            }
                            yield* subLogger.verbose(`request ${requests} ${new Date().getTime() - requestStartTime}ms (${requestUrl})`);

                            // const strongestErrorCode = getStrongestErrorCode(errors);

                            if (!data) continue;
                            const $ = load(data);
                            const aElements = $('a').toArray();

                            for (let element of aElements) {
                                const href = $(element).attr('href');
                                if (href) {
                                    const { normalizedPageLink } = analyzeLink(href, extractedDomain);
                                    links.push({ path: normalizedPageLink, foundOnPath: requestUrl, ignoreCanonical: false });
                                }
                            }
                        }
                        else {
                            // add images and documents
                            // yield* subLogger.log('push to internal links: ' + normalizedLink);
                            if (pushLinksToDomain && domainId) {
                                requestTime = new Date().getTime() - requestStartTime;

                                const pushLinkInput = createPushLinkInput(links[i].foundOnPath, normalizedHttpsPageLink, warningDoubleSlash, domainId, linkType.file, requestTime, null, null);
                                pushLinkInputs.push(pushLinkInput);
                            }
                            // await pushLink(prisma, links[i].foundOnPath, normalizedLink, warningDoubleSlash, domainId, linkType.page, requestTime, null);
                        }
                    }
                    else {
                        // yield* subLogger.log('push to external links: ' + normalizedLink);
                        if (pushLinksToDomain && domainId) {
                            yield* subLogger.verbose(`push to external: ${normalizedLink} ${normalizedHttpsPageLink}`);

                            // Instead of immediate push, collect in array
                            externalLinksToInsert.push({
                                foundOnPath: links[i].foundOnPath,
                                href: normalizedHttpsPageLink
                            });
                        }
                    }
                }
            }
        }
    }

    yield* subLogger.log(`total request:  ${requests}`);

    if (pushLinksToDomain && domainId) {
        requestStartTime = new Date().getTime();
        yield* subLogger.verbose(`start pushing links (${pushLinkInputs.length})`);

        yield* subLogger.verbose(`filtering ${externalLinksToInsert.length} external links for unique entries`);

        // Filter for unique external links based on href
        const uniqueExternalLinks = externalLinksToInsert.reduce<{ foundOnPath: string; href: string }[]>((acc, current) => {
            // Only add if href doesn't exist in accumulator
            if (!acc.some(link => link.href === current.href)) {
                acc.push(current);
            }
            return acc;
        }, []);

        yield* subLogger.verbose(`start pushing external links (${uniqueExternalLinks.length} unique from ${externalLinksToInsert.length} total)`);

        // Run both operations concurrently
        const [internalResults, externalResults] = await Promise.all([
            pushAllLinks(prisma, pushLinkInputs),
            pushExternalLinks(prisma, uniqueExternalLinks, domainId)
        ]);

        requestTime = new Date().getTime() - requestStartTime;
        yield* subLogger.log(`end pushing all links (internal: ${pushLinkInputs.length}, external: ${externalLinksToInsert.length}): ${requestTime}ms`);
    }
    return {
        ...response,
        errorCount: totalErrorCount,
        warningCount: totalWarningCount
    };
}