import { Prisma, PrismaClient } from "@prisma/client";

import axios, { AxiosError } from 'axios';
import cheerio from 'cheerio';
import { NextResponse } from 'next/server';
import { analyzeLink } from "./linkTools";
import { crawlNotification, crawlNotificationType } from "./crawlNotification";

const prisma = new PrismaClient();

export enum linkType {
    anchor,
    page
}

const pushLink = (href: string, domainId: string, type: linkType, requestTime: number, errorCode: 404 | null) => {
    return prisma.internalLink.upsert({
        create: {
            path: href,
            domain: {
                connect: {
                    id: domainId
                }
            },
            lastCheck: new Date(),
            lastLoadTime: requestTime,
            type: linkType[type],
            errorCode
        },
        update: {
            lastCheck: new Date(),
            lastLoadTime: requestTime,
            type: linkType[type],
            errorCode
        },
        where: { domainId_path: { domainId, path: href } }
    });
}

const pushExternalLink = (href: string, domainId: string) => {
    return prisma.externalLink.upsert({
        create: {
            url: href,
            domain: {
                connect: {
                    id: domainId
                }
            },
            lastCheck: new Date(),
        },
        update: {
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

export const crawlDomain = async (url: string, depth: number, followLinks: boolean, maxDuration: number): Promise<Response> => {
    const crawlStartTime = new Date().getTime();
    const maxCrawlTime = maxDuration - 1000; // milliseconds
    const seconds = 30; // min seconds between crawls
    const maxRequests = 100;

    const analyzedUrl = analyzeLink(url, url);

    const links: (string | undefined)[] = [];
    const externalLinks: (string | undefined)[] = [];
    const crawledLinks: (string)[] = ['/'];

    let timePassed, requestStartTime, requestTime;
    let requests = 0;
    let warningDoubleSlashOccured = false;
    let error404Occured = false;

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
            lastCrawl: new Date(),
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
        const { data } = await axios.get(targetURL, { timeout: maxCrawlTime - timePassed });
        requestTime = new Date().getTime() - requestStartTime;
        console.log(`request time (${targetURL}): ${requestTime}`);

        links.push('/');
        await pushLink('/', domain.id, linkType.page, requestTime, null);

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
                const { isInternalPage, normalizedLink } = analyzeLink(href, url);
                if (isInternalPage) {
                    links.push(normalizedLink);
                }
                else {
                    externalLinks.push(normalizedLink);
                }
            }
        }
        requestTime = new Date().getTime() - requestStartTime;
        console.log(`extracting links operation time: ${new Date().getTime() - requestStartTime}`);
        console.log('extracted links count (internal, external): ', links.length, externalLinks.length)


        // const addSlash = targetURL.endsWith('/') ? '' : '/';

        for (let j = 0; j < depth; j++) {
            for (let i = 0; i < links.length; i++) {
                if (typeof links[i] !== 'undefined' && links[i]) { // Check if the link is defined
                    const { subdomain, normalizedLink, isInternalPage, warningDoubleSlash } = analyzeLink(links[i]!, url);
                    if (warningDoubleSlash) warningDoubleSlashOccured = true;

                    if (isInternalPage) {
                        if (isInternalPage && !crawledLinks.includes(normalizedLink)) {
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
                                err_404: false
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
                                        }
                                    }
                                    console.log('error: 404', requestUrl)
                                }
                                else {
                                    throw error;
                                }
                            }

                            requestTime = new Date().getTime() - requestStartTime;
                            console.log(`request time (${requestUrl}): ${new Date().getTime() - requestStartTime}`);

                            await pushLink(normalizedLink, domain.id, linkType.page, requestTime, errors.err_404 ? 404 : null);

                            if (!data) continue;
                            const $ = cheerio.load(data);
                            const aElements = $('a').toArray();

                            for (let element of aElements) {
                                const href = $(element).attr('href');
                                if (href) {
                                    const { isInternalPage } = analyzeLink(href, url);
                                    if (isInternalPage) {
                                        links.push(href);
                                    }
                                    else {
                                        externalLinks.push(href);
                                    }
                                }
                            }
                        }
                    }
                    else {
                        if (!crawledLinks.includes(normalizedLink)) {
                            crawledLinks.push(normalizedLink);
                            await pushExternalLink(normalizedLink, domain.id);
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

        if (error404Occured) {
            crawlNotification(user, crawlNotificationType.Error404, analyzedUrl.normalizedLink);
        }


        // Send the extracted data as a response
        return NextResponse.json({ links }, { status: 200 })

    } catch (error: AxiosError | TypeError | any) {
        // Handle any errors
        console.log(error);
        timePassed = (new Date().getTime() - crawlStartTime);

        if (error instanceof AxiosError) {
            console.log('set axios update')
            await prisma.domain.update({
                where: { id: domain.id },
                data: {
                    crawlStatus: 'idle',
                    lastErrorTime: new Date(),
                    lastErrorType: error.code ? error.code : error.name,
                    lastErrorMessage: error.cause?.message,
                    lastCrawlTime: timePassed
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
                    lastCrawlTime: timePassed
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
                    lastCrawlTime: timePassed
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
        await prisma.domain.update({
            where: { id: domain.id },
            data: {
                crawlStatus: 'idle',
                lastCrawlTime: timePassed
            }
        });

        console.log('crawling done: ', timePassed);
    }

}