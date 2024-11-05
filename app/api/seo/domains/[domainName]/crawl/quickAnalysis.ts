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
import { recursiveCrawl, recursiveCrawlResponse } from "@/crawler/recursiveCrawl";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CrawlResponseYieldType, createLogger, isLogEntry, Logger, LoggerFunctionWithReturn } from "@/apiComponents/dev/logger";
import { LogEntry } from "@/apiComponents/dev/StreamingLogViewer";
import { lighthouseAnalysis, lighthouseAnalysisResponse } from "@/crawler/lighthouseAnalysis";
import { extractMetatags } from "@/crawler/extractMetatags";
import { calculateDomainHealth } from "./calculateDomainHealth";

const prisma = new PrismaClient();
// export type LoggerFunction = (logger: Logger, url: string, depth: number, followLinks: boolean, maxDuration: number) => AsyncGenerator<boolean | Generator<LogEntry, any, any>, Response, unknown>;

export type quickAnalysisResponse = {
    error?: string | null,
    domains?: any[],
    links?: any[]
}

export async function* quickAnalysis(
    url: string,
    depth: number,
    followLinks: boolean,
    maxDuration: number,
    adminMode?: boolean
): AsyncGenerator<LogEntry, quickAnalysisResponse> {

    const crawlStartTime = new Date().getTime();
    const maxCrawlTime = maxDuration - 1000; // milliseconds
    const seconds = 30; // min seconds between crawls

    const logger = createLogger('QUICK ' + url);

    let analyzedUrl = analyzeLink(url, url);
    let extractedDomain = analyzedUrl.linkDomain;
    let timePassed, requestStartTime, requestTime;
    let index = false;
    let follow = false;
    let errorOccured = false;


    const domain = await prisma.domain.findFirst({ where: { domainName: extractedDomain } });
    const user = await prisma.user.findFirst({ where: { id: domain?.userId }, include: { notificationContacts: true } });

    if (!domain) {
        yield* logger.log('error: domain not found');
        return { error: 'domain not found' };
    }


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

        if (sessionUser.role !== 'admin') {
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

    let targetURL = 'https://' + extractedDomain; // URL of the website you want to crawl
    const protocol = 'https://';

    if (domain.crawlStatus === 'crawling') {
        yield* logger.log('domain currently crawling: ' + (new Date().getTime() - (domain.lastCrawl?.getTime() ?? 0)));
        return { error: 'domain currently crawling' };
    }

    if (domain.lastCrawl && (new Date().getTime() - (domain.lastCrawl?.getTime() ?? 0)) < 1000 * seconds) {
        yield* logger.log('Crawling too soon: ' + (new Date().getTime() - (domain.lastCrawl?.getTime() ?? 0)));
        return { error: 'crawling too soon' };
    }


    try {
        yield* logger.log('Crawling: ' + targetURL + `depth ${depth}, followLinks ${followLinks}, maxDuration ${maxDuration}`);

        // Fetch the HTML content from the target URL
        timePassed = (new Date().getTime() - crawlStartTime);

        requestStartTime = new Date().getTime();

        const {
            data,
            finalURL,
            finalURLObject
        } = await initialCrawl(domain, targetURL, maxCrawlTime, crawlStartTime, true, user, analyzedUrl);


        requestTime = new Date().getTime() - requestStartTime;
        yield* logger.log(`request time (${targetURL}): ${requestTime}`);

        targetURL = finalURLObject.hostname;
        analyzedUrl = analyzeLink(targetURL, targetURL);
        extractedDomain = analyzedUrl.linkDomain;
        yield* logger.log(`now using finalURL ${targetURL}`);


        const metatagsInfo = extractMetatags(data);
        index = metatagsInfo.robots.index;
        follow = metatagsInfo.robots.follow;

        const indexString = metatagsInfo.robots.index ? 'index' : 'noindex';
        const followString = metatagsInfo.robots.follow ? 'follow' : 'nofollow'
        yield* logger.log(`updating robots: ${indexString}, ${followString}`);

        const domainHealth = await calculateDomainHealth(domain);
        yield* logger.log(`domain health: ${JSON.stringify(domainHealth)}`);

        await prisma.domain.update({
            where: { id: domain.id },
            data: {
                robotsIndex: metatagsInfo.robots.index,
                robotsFollow: metatagsInfo.robots.follow,
                timeoutPercentage: domainHealth.timeoutPercentage,
                badRequestPercentage: domainHealth.badRequestPercentage,
                typeErrorPercentage: domainHealth.typeErrorPercentage,
            }
        });

    } catch (error: AxiosError | TypeError | any) {
        errorOccured = true;
        // Handle any errors
        yield* logger.log(error);
        timePassed = (new Date().getTime() - crawlStartTime);

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

        }
        return { error: 'Error fetching data' };
    }
    finally {
        timePassed = (new Date().getTime() - crawlStartTime);

        await prisma.domain.update({
            where: { id: domain.id },
            data: {
                lastQuickAnalysis: new Date()
            }
        });

        const updatedDomain = await prisma.domain.findUnique({ where: { id: domain.id } });

        const score = await CalculateScore(domain.id);

        if (!domain.disableNotifications && !errorOccured) {
            if (domain.robotsIndex !== index || domain.robotsFollow != follow) {
                // score change
                await crawlNotification(user, domain, crawlNotificationType.Robots, !index, domain.domainName, [analyzedUrl.normalizedLink], score, updatedDomain);
            }
        }

        yield* logger.log('crawling done: ' + timePassed);
        return { error: null, domains: [] };
    }
}
