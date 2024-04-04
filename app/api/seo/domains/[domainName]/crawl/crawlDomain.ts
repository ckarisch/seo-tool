import { Prisma, PrismaClient } from "@prisma/client";

import axios, { AxiosError } from 'axios';
import cheerio from 'cheerio';
import { NextResponse } from 'next/server';
import { analyzeLink } from "./linkTools";
import { crawlNotification, crawlNotificationType } from "./crawlNotification";
import { CalculateScore } from "@/apiComponents/domain/calculateScore";

const prisma = new PrismaClient();

export enum linkType {
    anchor,
    page
}

const pushLink = (foundOnPath: string, href: string, warningDoubleSlash: boolean, domainId: string, type: linkType, requestTime: number, errorCode: errorTypes | null) => {
    return prisma.internalLink.upsert({
        create: {
            foundOnPath,
            path: href,
            domain: {
                connect: {
                    id: domainId
                }
            },
            lastCheck: new Date(),
            lastLoadTime: requestTime,
            type: linkType[type],
            errorCode,
            warningDoubleSlash
        },
        update: {
            foundOnPath,
            lastCheck: new Date(),
            lastLoadTime: requestTime,
            type: linkType[type],
            errorCode,
            warningDoubleSlash
        },
        where: { domainId_path: { domainId, path: href } }
    });
}

const pushExternalLink = (foundOnPath: string, href: string, domainId: string) => {
    return prisma.externalLink.upsert({
        create: {
            foundOnPath,
            url: href,
            domain: {
                connect: {
                    id: domainId
                }
            },
            lastCheck: new Date(),
        },
        update: {
            foundOnPath,
            lastCheck: new Date(),
        },
        where: { domainId_url: { domainId, url: href } }
    });
}

const checkTimeout = async (timePassed: number, maxCrawlTime: number, domainCrawlId: string, domainId: string) => {
    if (timePassed + 500 > maxCrawlTime) {
        await prisma.domainCrawl.update({
            where: { id: domainCrawlId },
            data: {
                status: 'error',
                error: true,
                endTime: new Date(),
                errorName: 'timeout',
                errorMessage: 'the server did not respond within the time limit'
            }
        });

        await prisma.domain.update({
            where: { id: domainId },
            data: {
                crawlStatus: 'idle'
            }
        });

        return true;
    }
    return false;
}

const checkRequests = (requests: number, maxRequests: number) => {
    return requests >= maxRequests;
}

interface Link {
    foundOnPath: string,
    path: string
}


interface linkErros {
    err_404: boolean,
    err_503: boolean
}

enum errorTypes {
    err_503 = 503,
    err_404 = 404
}

const getStrongestErrorCode = (errors: linkErros): errorTypes | null => {
    if (errors.err_503) {
        return errorTypes.err_503;
    }
    if (errors.err_404) {
        return errorTypes.err_404;
    }
    return null;
}

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
    let error404Links = [];

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
        if (await checkTimeout(timePassed, maxCrawlTime, domainCrawl.id, domain.id)) {
            Response.json({ error: 'Timeout' }, { status: 500 });
        }

        requestStartTime = new Date().getTime();
        let data;
        try {
            data = (await axios.get(targetURL, { timeout: maxCrawlTime - timePassed })).data;
        }
        catch (error: AxiosError | TypeError | any) {
            // Handle any errors
            // console.log(error);
            timePassed = (new Date().getTime() - crawlStartTime);

            if (error instanceof AxiosError) {
                if (error.code === 'ERR_BAD_REQUEST') {
                    if (error.response?.status == 404) {
                        crawlNotification(user, crawlNotificationType.Error404, analyzedUrl.normalizedLink, [analyzedUrl.normalizedLink]);
                    }
                    console.log('error: 404', targetURL)
                }
                else if (error.code === 'ERR_BAD_RESPONSE') {
                    if (error.response?.status == 503) {
                        crawlNotification(user, crawlNotificationType.Error503, analyzedUrl.normalizedLink, [analyzedUrl.normalizedLink]);
                    }
                    console.log('error:503', targetURL)
                }
            }
            else {
                throw error;
            }
        }
        requestTime = new Date().getTime() - requestStartTime;
        console.log(`request time (${targetURL}): ${requestTime}`);

        links.push({ path: '/', foundOnPath: '/' });
        await pushLink('/', '/', false, domain.id, linkType.page, requestTime, null);

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

        console.log('extracting links');
        // Load HTML into cheerio
        const $ = cheerio.load(data);

        // Extract data using cheerio (links)
        const aElements = $('a').toArray();


        requestStartTime = new Date().getTime();
        timePassed = (new Date().getTime() - crawlStartTime);
        // let prismaOperations = [];

        for (let element of aElements) {
            const href = $(element).attr('href');
            if (href) {
                const { normalizedLink } = analyzeLink(href, url);
                links.push({ path: normalizedLink, foundOnPath: targetURL });
            }
        }
        requestTime = new Date().getTime() - requestStartTime;
        console.log(`extracting links operation time: ${new Date().getTime() - requestStartTime}`);


        // const addSlash = targetURL.endsWith('/') ? '' : '/';

        for (let j = 0; j < depth; j++) {
            for (let i = 0; i < links.length; i++) {
                if (typeof links[i] !== 'undefined' && links[i]) { // Check if the link is defined
                    const { subdomain, normalizedLink, isInternal, isInternalPage, warningDoubleSlash } = analyzeLink(links[i]!.path, url);

                    if (!crawledLinks.includes(normalizedLink)) {
                        crawledLinks.push(normalizedLink);
                        if (warningDoubleSlash) warningDoubleSlashOccured = true;

                        if (isInternal) {
                            console.log('Crawling: ' + normalizedLink);
                            if (subdomain != analyzedUrl.subdomain) {
                                console.log(`warning: subdomain (${normalizedLink}) not matching with requested url`)
                            }

                            crawledLinks.push(normalizedLink); // Use the non-null assertion operator

                            timePassed = (new Date().getTime() - crawlStartTime);
                            if (await checkTimeout(timePassed, maxCrawlTime, domainCrawl.id, domain.id)) {
                                console.log('timeout: ', timePassed);
                                return Response.json({ error: 'Timeout' }, { status: 500 });
                            }

                            linkEntries++;
                            if (checkRequests(linkEntries, maxLinkEntries)) {
                                console.log('too many link entries: ', linkEntries);
                                return Response.json({ error: 'Too many link entries' }, { status: 500 });
                            }

                            if (isInternalPage) {
                                // only crawl pages
                                requests++;
                                console.log('request number: ', requests);
                                if (checkRequests(requests, maxRequests)) {
                                    console.log('too many requests: ', requests);
                                    return Response.json({ error: 'Too many requests' }, { status: 500 });
                                }

                                requestStartTime = new Date().getTime();
                                const requestUrl = protocol + normalizedLink;
                                console.log(`request (${requestUrl})`);

                                let errors = {
                                    err_404: false,
                                    err_503: false
                                }

                                let data
                                try {
                                    data = (await axios.get(requestUrl)).data;
                                }
                                catch (error: AxiosError | TypeError | any) {
                                    // Handle any errors
                                    // console.log(error);
                                    timePassed = (new Date().getTime() - crawlStartTime);

                                    if (error instanceof AxiosError) {
                                        if (error.code === 'ERR_BAD_REQUEST') {
                                            if (error.response?.status == 404) {
                                                errors.err_404 = true;
                                                error404Occured = true;
                                                error404Links.push(normalizedLink);
                                            }
                                            console.log('error: 404', requestUrl)
                                        }
                                        else if (error.code === 'ERR_BAD_RESPONSE') {
                                            if (error.response?.status == 503) {
                                                errors.err_503 = true;
                                                error503Occured = true;
                                            }
                                            console.log('error:503', requestUrl)
                                        }
                                    }
                                    else {
                                        throw error;
                                    }
                                }
                                requestTime = new Date().getTime() - requestStartTime;
                                console.log(`request time (${requestUrl}): ${new Date().getTime() - requestStartTime}`);

                                const strongestErrorCode = getStrongestErrorCode(errors);
                                await pushLink(links[i].foundOnPath, normalizedLink, warningDoubleSlash, domain.id, linkType.page, requestTime, strongestErrorCode);

                                if (!data) continue;
                                const $ = cheerio.load(data);
                                const aElements = $('a').toArray();

                                for (let element of aElements) {
                                    const href = $(element).attr('href');
                                    if (href) {
                                        links.push({ path: href, foundOnPath: requestUrl });
                                    }
                                }
                            }
                            else {
                                // add images and documents
                                console.log('push to internal links: ' + normalizedLink);
                                await pushLink(links[i].foundOnPath, normalizedLink, warningDoubleSlash, domain.id, linkType.page, requestTime, null);
                            }
                        }
                        else {
                            console.log('push to external links: ' + normalizedLink);
                            await pushExternalLink(links[i].foundOnPath, normalizedLink, domain.id);
                        }
                    }
                }
            }
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