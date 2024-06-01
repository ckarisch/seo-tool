import { Prisma, PrismaClient } from "@prisma/client";

import axios, { AxiosError } from 'axios';
import cheerio from 'cheerio';
import { NextResponse } from 'next/server';
import { analyzeLink } from "../../../../../../apiComponents/crawler/linkTools";
import { crawlNotification, crawlNotificationType } from "./crawlNotification";
import { CalculateScore } from "@/apiComponents/domain/calculateScore";
import { initialCrawl } from "@/crawler/initialCrawl";
import { Link, checkRequests, checkTimeoutAndPush, getStrongestErrorCode, linkType, pushExternalLink, pushLink } from "./crawlLinkHelper";
import { extractLinks } from "@/crawler/extractLinks";
import { recursiveCrawl } from "@/crawler/recursiveCrawl";

const prisma = new PrismaClient();

export const crawlDomain = async (url: string, depth: number, followLinks: boolean, maxDuration: number): Promise<Response> => {
    const crawlStartTime = new Date().getTime();
    const maxCrawlTime = maxDuration - 1000; // milliseconds
    const seconds = 30; // min seconds between crawls
    const maxRequests = 100;
    const maxLinkEntries = 300; // with documents and images

    const analyzedUrl = analyzeLink(url, url);

    const links: Link[] = [];
    const crawledLinks: (string)[] = ['/'];

    let timePassed, requestStartTime, requestTime;
    let requests = 0;
    let linkEntries = 0;
    let warningDoubleSlashOccured = false;
    let errorUnknownOccured = false;
    let error404Occured = false;
    let error503Occured = false;
    let error404Links: string[] = [];

    const domain = await prisma.domain.findFirst({ where: { domainName: url } });
    const user = await prisma.user.findFirst({ where: { id: domain?.userId }, include: { notificationContacts: true } });

    if (!domain) {
        return Response.json({ error: 'domain not found' }, { status: 404 })
    }

    if (!user) {
        return Response.json({ error: 'domain has no user' }, { status: 500 })
    }

    const targetURL = 'https://' + url; // URL of the website you want to crawl
    const protocol = 'https://';

    if (domain.crawlStatus === 'crawling') {
        console.log('domain currently crawling: ' + (new Date().getTime() - (domain.lastCrawl?.getTime() ?? 0)));
        return Response.json({ error: 'domain currently crawling' }, { status: 500 })
    }

    if (domain.lastCrawl && (new Date().getTime() - (domain.lastCrawl?.getTime() ?? 0)) < 1000 * seconds) {
        console.log('Crawling too soon: ' + (new Date().getTime() - (domain.lastCrawl?.getTime() ?? 0)));
        return Response.json({ error: 'crawling too soon' }, { status: 500 })
    }

    const domainCrawl = await prisma.domainCrawl.create({
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

    await prisma.domain.update({
        where: { id: domain.id },
        data: {
            lastCrawl: new Date(), // important for crawl reset to set lastCrawl here
            crawlStatus: 'crawling'
        }
    });

    try {
        console.log('Crawling: ' + targetURL, `depth ${depth}, followLinks ${followLinks}, maxDuration ${maxDuration}`);

        // Fetch the HTML content from the target URL
        timePassed = (new Date().getTime() - crawlStartTime);
        if (await checkTimeoutAndPush(prisma, timePassed, maxCrawlTime, domainCrawl.id, domain.id)) {
            Response.json({ error: 'Timeout' }, { status: 500 });
        }

        requestStartTime = new Date().getTime();
        let data;
        data = await initialCrawl(targetURL, maxCrawlTime, crawlStartTime, true, user, analyzedUrl);
        requestTime = new Date().getTime() - requestStartTime;
        console.log(`request time (${targetURL}): ${requestTime}`);

        // links.push({ path: '/', foundOnPath: '/' });
        await pushLink(prisma, '/', '/', false, domain.id, linkType.page, requestTime, null);

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
            return NextResponse.json({ links: [] }, { status: 200 })
        }

        links.push(...extractLinks(data, url, targetURL));

        // const addSlash = targetURL.endsWith('/') ? '' : '/';

        const recursiveCrawlResponse = await recursiveCrawl(prisma, links, crawledLinks, depth, analyzedUrl, crawlStartTime, maxCrawlTime, maxLinkEntries, maxRequests, url, domain.id, true, requestStartTime);
        if (recursiveCrawlResponse.timeout) {
            return Response.json({ error: 'Timeout' }, { status: 500 });
        }
        else if (recursiveCrawlResponse.tooManyRequests) {
            return Response.json({ error: 'Too many link entries' }, { status: 500 });
        }

        // for (let j = 0; j < depth; j++) {
        //     for (let i = 0; i < links.length; i++) {
        //         if (typeof links[i] !== 'undefined' && links[i]) { // Check if the link is defined
        //             const { subdomain, normalizedLink, isInternal, isInternalPage, warningDoubleSlash } = analyzeLink(links[i]!.path, url);

        //             if (!crawledLinks.includes(normalizedLink)) {
        //                 crawledLinks.push(normalizedLink);
        //                 if (warningDoubleSlash) warningDoubleSlashOccured = true;

        //                 if (isInternal) {
        //                     console.log('Crawling: ' + normalizedLink);
        //                     if (subdomain != analyzedUrl.subdomain) {
        //                         console.log(`warning: subdomain (${normalizedLink}) not matching with requested url`)
        //                     }

        //                     crawledLinks.push(normalizedLink); // Use the non-null assertion operator

        //                     timePassed = (new Date().getTime() - crawlStartTime);
        //                     if (await checkTimeoutAndPush(prisma, timePassed, maxCrawlTime, domainCrawl.id, domain.id)) {
        //                         console.log('timeout: ', timePassed);
        //                         return Response.json({ error: 'Timeout' }, { status: 500 });
        //                     }

        //                     linkEntries++;
        //                     if (checkRequests(linkEntries, maxLinkEntries)) {
        //                         console.log('too many link entries: ', linkEntries);
        //                         return Response.json({ error: 'Too many link entries' }, { status: 500 });
        //                     }

        //                     if (isInternalPage) {
        //                         // only crawl pages
        //                         requests++;
        //                         console.log('request number: ', requests);
        //                         if (checkRequests(requests, maxRequests)) {
        //                             console.log('too many requests: ', requests);
        //                             return Response.json({ error: 'Too many requests' }, { status: 500 });
        //                         }

        //                         requestStartTime = new Date().getTime();
        //                         const requestUrl = protocol + normalizedLink;
        //                         console.log(`request (${requestUrl})`);

        //                         let errors = {
        //                             err_404: false,
        //                             err_503: false
        //                         }

        //                         let data

        //                         try {
        //                             timePassed = (new Date().getTime() - crawlStartTime);
        //                             data = (await axios.get(requestUrl, { timeout: maxCrawlTime - timePassed })).data;
        //                         }
        //                         catch (error: AxiosError | TypeError | any) {
        //                             // Handle any errors
        //                             // console.log(error);
        //                             timePassed = (new Date().getTime() - crawlStartTime);

        //                             if (error instanceof AxiosError) {
        //                                 if (error.code === 'ERR_BAD_REQUEST') {
        //                                     if (error.response?.status == 404) {
        //                                         errors.err_404 = true;
        //                                         error404Occured = true;
        //                                         error404Links.push(normalizedLink);
        //                                     }
        //                                     console.log('error: 404', requestUrl)
        //                                 }
        //                                 else if (error.code === 'ERR_BAD_RESPONSE') {
        //                                     if (error.response?.status == 503) {
        //                                         errors.err_503 = true;
        //                                         error503Occured = true;
        //                                     }
        //                                     console.log('error:503', requestUrl)
        //                                 }
        //                             }
        //                             else {
        //                                 throw error;
        //                             }
        //                         }
        //                         requestTime = new Date().getTime() - requestStartTime;
        //                         console.log(`request time (${requestUrl}): ${new Date().getTime() - requestStartTime}`);

        //                         const strongestErrorCode = getStrongestErrorCode(errors);
        //                         await pushLink(prisma, links[i].foundOnPath, normalizedLink, warningDoubleSlash, domain.id, linkType.page, requestTime, strongestErrorCode);

        //                         if (!data) continue;
        //                         const $ = cheerio.load(data);
        //                         const aElements = $('a').toArray();

        //                         for (let element of aElements) {
        //                             const href = $(element).attr('href');
        //                             if (href) {
        //                                 links.push({ path: href, foundOnPath: requestUrl });
        //                             }
        //                         }
        //                     }
        //                     else {
        //                         // add images and documents
        //                         console.log('push to internal links: ' + normalizedLink);
        //                         await pushLink(prisma, links[i].foundOnPath, normalizedLink, warningDoubleSlash, domain.id, linkType.page, requestTime, null);
        //                     }
        //                 }
        //                 else {
        //                     console.log('push to external links: ' + normalizedLink);
        //                     await pushExternalLink(prisma, links[i].foundOnPath, normalizedLink, domain.id);
        //                 }
        //             }
        //         }
        //     }
        // }

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
        return NextResponse.json({ links }, { status: 200 })

    } catch (error: AxiosError | TypeError | any) {
        // Handle any errors
        console.log(error);
        timePassed = (new Date().getTime() - crawlStartTime);
        errorUnknownOccured = true;

        if (error instanceof AxiosError) {
            console.log('set axios update')
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
            console.log('set type update')
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
            console.log('set unknown update')
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
        return Response.json({ error: 'Error fetching data' }, { status: 500 })
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

        await CalculateScore(domain.id);

        if (!domain.disableNotifications && !errorUnknownOccured) {
            // only send 1 error notification
            if (error503Occured) {
                await crawlNotification(user, crawlNotificationType.Error503, analyzedUrl.normalizedLink, error404Links);
            }
            else if (error404Occured) {
                await crawlNotification(user, crawlNotificationType.Error404, analyzedUrl.normalizedLink, error404Links);
            }
        }

        console.log('crawling done: ', timePassed);
    }

}