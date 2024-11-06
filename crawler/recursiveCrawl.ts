import { analyzeLink } from "@/apiComponents/crawler/linkTools";
import { LogEntry, Logger } from "@/apiComponents/dev/logger";
import { checkRequests, checkTimeout, createPushLinkInput, getStrongestErrorCode, linkType, pushAllLinks, pushExternalLink } from "@/app/api/seo/domains/[domainName]/crawl/crawlLinkHelper";
import axios, { AxiosError } from "axios";
import { load } from "cheerio";
import runErrorChecks from "./errorChecker";

export interface recursiveCrawlResponse {
    timeout: boolean,
    tooManyRequests: boolean,
    warningDoubleSlashOccured: boolean
}

export async function* recursiveCrawl(
    prisma: any,
    links: any[],
    crawledLinks: any[],
    depth: number,
    analyzedUrl: any,
    extractedDomain: string,
    crawlStartTime: number,
    maxCrawlTime: number,
    maxLinkEntries: number,
    maxRequests: number,
    url: string,
    domainId: string,
    pushLinksToDomain: boolean,
    requestStartTime: number,
    subLogger: Logger): AsyncGenerator<LogEntry, recursiveCrawlResponse, unknown> {

    yield* subLogger.log('recursive crawl started');
    yield* subLogger.log('extractedDomain: ' + extractedDomain);
    let timePassed, requestTime;

    let requests = 0;
    let linkEntries = 0;
    let warningDoubleSlashOccured = false;
    let error404Occured = false;
    let error503Occured = false;
    const error404Links = [];
    const pushLinkInputs = [];

    const protocol = 'https://';

    let response: recursiveCrawlResponse = {
        timeout: false,
        tooManyRequests: false,
        warningDoubleSlashOccured: false
    }

    let crawlActive = true;
    // maxRequests = 5;

    for (let j = 0; (crawlActive && j < depth); j++) {
        for (let i = 0; (crawlActive && i < links.length); i++) {
            if (typeof links[i] !== 'undefined' && links[i]) { // Check if the link is defined
                const { subdomain, normalizedLink, isInternal, isInternalPage, warningDoubleSlash } = analyzeLink(links[i]!.path, extractedDomain);

                if (!crawledLinks.includes(normalizedLink)) {
                    crawledLinks.push(normalizedLink);
                    if (warningDoubleSlash) {
                        yield* subLogger.log('❗double slash occured');
                        warningDoubleSlashOccured = true;
                        response.warningDoubleSlashOccured = true;
                    }

                    if (isInternal) {
                        yield* subLogger.log('Crawling: ' + normalizedLink);
                        if (subdomain != analyzedUrl.subdomain) {
                            yield* subLogger.log(`warning: subdomain (${normalizedLink}) not matching with requested url`)
                        }

                        crawledLinks.push(normalizedLink); // Use the non-null assertion operator

                        timePassed = (new Date().getTime() - crawlStartTime);
                        // if (await checkTimeoutAndPush(prisma, timePassed, maxCrawlTime, domainCrawl.id, domain.id)) {
                        //     yield* subLogger.log('timeout: ', timePassed);
                        //     return Response.json({ error: 'Timeout' }, { status: 500 });
                        // }

                        if (checkTimeout(timePassed, maxCrawlTime)) {
                            yield* subLogger.log('timeout: ' + timePassed);
                            response.timeout = true;
                            crawlActive = false;
                            break;
                        }

                        linkEntries++;
                        if (checkRequests(linkEntries, maxLinkEntries)) {
                            yield* subLogger.log('too many link entries: ' + linkEntries);
                            // return Response.json({ error: 'Too many link entries' }, { status: 500 });
                            response.tooManyRequests = true;
                            crawlActive = false;
                            break;
                        }

                        if (isInternalPage) {
                            // only crawl pages
                            requests++;
                            yield* subLogger.log('request number: ' + requests);
                            if (checkRequests(requests, maxRequests)) {
                                yield* subLogger.log('too many requests: ' + requests);
                                // return Response.json({ error: 'Too many requests' }, { status: 500 });
                                response.tooManyRequests = true;
                                crawlActive = false;
                                break;
                            }

                            requestStartTime = new Date().getTime();
                            const requestUrl = protocol + normalizedLink;
                            yield* subLogger.log(`request (${requestUrl})`);

                            let errors = {
                                err_404: false,
                                err_503: false
                            }

                            let data

                            try {
                                timePassed = (new Date().getTime() - crawlStartTime);
                                data = (await axios.get(requestUrl, { timeout: maxCrawlTime - timePassed })).data;
                                await runErrorChecks({
                                    data,
                                    domainId,
                                    internalLinkId: undefined,
                                    domainCrawlId: undefined,
                                    url: requestUrl
                                });
                            }
                            catch (error: AxiosError | TypeError | any) {
                                // Handle any errors
                                // yield* subLogger.log(error);
                                timePassed = (new Date().getTime() - crawlStartTime);

                                if (error instanceof AxiosError) {
                                    if (error.code === 'ERR_BAD_REQUEST') {
                                        if (error.response?.status == 404) {
                                            errors.err_404 = true;
                                            error404Occured = true;
                                            error404Links.push(normalizedLink);
                                        }
                                        yield* subLogger.log('error: 404' + requestUrl)
                                    }
                                    else if (error.code === 'ERR_BAD_RESPONSE') {
                                        if (error.response?.status == 503) {
                                            errors.err_503 = true;
                                            error503Occured = true;
                                        }
                                        yield* subLogger.log('error:503' + requestUrl)
                                    }
                                }
                                else {
                                    throw error;
                                }
                            }
                            requestTime = new Date().getTime() - requestStartTime;
                            yield* subLogger.log(`request time (${requestUrl}): ${new Date().getTime() - requestStartTime}`);

                            const strongestErrorCode = getStrongestErrorCode(errors);
                            // await pushLink(prisma, links[i].foundOnPath, normalizedLink, warningDoubleSlash, domain.id, linkType.page, requestTime, strongestErrorCode);

                            if (pushLinksToDomain && domainId) {
                                const pushLinkInput = createPushLinkInput(links[i].foundOnPath, normalizedLink, warningDoubleSlash, domainId, linkType.page, requestTime, strongestErrorCode);
                                pushLinkInputs.push(pushLinkInput);
                            }

                            if (!data) continue;
                            const $ = load(data);
                            const aElements = $('a').toArray();

                            for (let element of aElements) {
                                const href = $(element).attr('href');
                                if (href) {
                                    const { normalizedLink } = analyzeLink(href, extractedDomain);
                                    links.push({ path: normalizedLink, foundOnPath: requestUrl });
                                }
                            }
                        }
                        else {
                            // add images and documents
                            yield* subLogger.log('push to internal links: ' + normalizedLink);
                            if (pushLinksToDomain && domainId) {
                                requestTime = new Date().getTime() - requestStartTime;

                                const pushLinkInput = createPushLinkInput(links[i].foundOnPath, normalizedLink, warningDoubleSlash, domainId, linkType.page, requestTime, null);
                                pushLinkInputs.push(pushLinkInput);
                            }
                            // await pushLink(prisma, links[i].foundOnPath, normalizedLink, warningDoubleSlash, domainId, linkType.page, requestTime, null);
                        }
                    }
                    else {
                        yield* subLogger.log('push to external links: ' + normalizedLink);
                        if (pushLinksToDomain && domainId) {
                            // 2do: summarize promises
                            await pushExternalLink(prisma, links[i].foundOnPath, normalizedLink, domainId);
                        }
                    }
                }
            }
        }
    }
    if (pushLinksToDomain && domainId) {
        requestStartTime = new Date().getTime();
        yield* subLogger.log(`start pushing links (${pushLinkInputs.length})`);

        const promises = pushAllLinks(prisma, pushLinkInputs);
        await Promise.all(promises);
        requestTime = new Date().getTime() - requestStartTime;

        yield* subLogger.log(`end pushing links (${pushLinkInputs.length}): ${new Date().getTime() - requestStartTime}`);
    }

    return response;
}