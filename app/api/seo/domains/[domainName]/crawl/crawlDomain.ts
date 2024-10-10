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
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { LoggerFunction } from "@/apiComponents/dev/logger";

const prisma = new PrismaClient();


export async function performDatabaseOperation(): Promise<LoggerFunction> {
    return async function* (logger) {
        yield* logger.log('Connecting to database...');
        yield* logger.log('Executing query...');
        yield* logger.error('Failed to retrieve data');
        yield* logger.log('Closing database connection...');
    };
}

export const crawlDomain = async (url: string, depth: number, followLinks: boolean, maxDuration: number): Promise<LoggerFunction> => {
    const crawlStartTime = new Date().getTime();
    const maxCrawlTime = maxDuration - 1000; // milliseconds
    const seconds = 30; // min seconds between crawls
    const maxRequests = 100;
    const maxLinkEntries = 300; // with documents and images

    return async function* (logger) {

        let analyzedUrl = analyzeLink(url, url);
        let extractedDomain = analyzedUrl.linkDomain;

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


        const session = await getServerSession(authOptions);

        if (!session || !session!.user) {
            yield* logger.log('error: no session');
            return Response.json({ error: 'Not authenticated', domains: [] }, { status: 401 })
        }

        const sessionUser = await prisma.user.findFirst({ where: { email: session.user.email! } })

        const domain = await prisma.domain.findFirst({ where: { domainName: extractedDomain } });
        const user = await prisma.user.findFirst({ where: { id: domain?.userId }, include: { notificationContacts: true } });

        if (!domain) {
            return Response.json({ error: 'domain not found' }, { status: 404 })
        }

        if (sessionUser && sessionUser.role !== 'admin') {
            // admins are allowed to crawl unverified domains
            if (!domain.domainVerified) {
                yield* logger.log('error: domain not verified');
                return Response.json({ error: 'Domain not verified', domains: [] }, { status: 401 })
            }

            if (!user) {
                return Response.json({ error: 'domain has no user' }, { status: 500 })
            }
        }

        let targetURL = 'https://' + extractedDomain; // URL of the website you want to crawl
        const protocol = 'https://';

        if (domain.crawlStatus === 'crawling') {
            yield* logger.log('domain currently crawling: ' + (new Date().getTime() - (domain.lastCrawl?.getTime() ?? 0)));
            return Response.json({ error: 'domain currently crawling' }, { status: 500 })
        }

        if (domain.lastCrawl && (new Date().getTime() - (domain.lastCrawl?.getTime() ?? 0)) < 1000 * seconds) {
            yield* logger.log('Crawling too soon: ' + (new Date().getTime() - (domain.lastCrawl?.getTime() ?? 0)));
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
            yield* logger.log('Crawling: ' + targetURL + `depth ${depth}, followLinks ${followLinks}, maxDuration ${maxDuration}`);

            // Fetch the HTML content from the target URL
            timePassed = (new Date().getTime() - crawlStartTime);
            if (await checkTimeoutAndPush(prisma, timePassed, maxCrawlTime, domainCrawl.id, domain.id)) {
                Response.json({ error: 'Timeout' }, { status: 500 });
            }

            requestStartTime = new Date().getTime();

            const {
                data,
                finalURL,
                finalURLObject
            } = await initialCrawl(targetURL, maxCrawlTime, crawlStartTime, true, user, analyzedUrl);

            requestTime = new Date().getTime() - requestStartTime;
            yield* logger.log(`request time (${targetURL}): ${requestTime}`);

            // extractedDomain = analyzeLink(targetURL, '').linkDomain;
            // extractedDomain
            targetURL = finalURLObject.hostname;
            analyzedUrl = analyzeLink(targetURL, targetURL);
            extractedDomain = analyzedUrl.linkDomain;
            yield* logger.log(`now using finalURL ${targetURL}`);
            const analyzedFinalUrl = analyzeLink(finalURL, extractedDomain);


            // links.push({ path: '/', foundOnPath: '/' });
            await pushLink(prisma, '', analyzedFinalUrl.normalizedLink, false, domain.id, linkType.page, requestTime, null);

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

            links.push(...extractLinks(data, targetURL, targetURL));

            // const addSlash = targetURL.endsWith('/') ? '' : '/';

            yield* logger.log('start recursive craw');
            const recursiveCrawlResponse = await recursiveCrawl(prisma, links, crawledLinks, depth, analyzedUrl, extractedDomain, crawlStartTime, maxCrawlTime, maxLinkEntries, maxRequests, extractedDomain, domain.id, true, requestStartTime);
            yield* logger.log('end recursive craw');

            if (recursiveCrawlResponse.timeout) {
                return Response.json({ error: 'Timeout' }, { status: 500 });
            }
            else if (recursiveCrawlResponse.tooManyRequests) {
                return Response.json({ error: 'Too many link entries' }, { status: 500 });
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
            yield* logger.log(error);
            timePassed = (new Date().getTime() - crawlStartTime);
            errorUnknownOccured = true;

            if (error instanceof AxiosError) {
                yield* logger.log('set axios update')
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
                yield* logger.log('set type update')
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
                yield* logger.log('set unknown update')
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

            yield* logger.log('crawling done: ' + timePassed);
        }
    };
}