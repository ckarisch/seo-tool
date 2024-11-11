import { Prisma, PrismaClient, User, NotificationContact } from "@prisma/client";
import axios, { AxiosError } from 'axios';
import { NextResponse } from 'next/server';
import { analyzeLink } from "../../../../../../apiComponents/crawler/linkTools";
import { crawlNotification, crawlNotificationType } from "./crawlNotification";
import { CalculateScore } from "@/apiComponents/domain/calculateScore";
import { initialCrawl } from "@/crawler/initialCrawl";
import { extractMetatags } from "@/crawler/extractMetatags";
import { calculateDomainHealth } from "./calculateDomainHealth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createLogger, Logger } from "@/apiComponents/dev/logger";
import { LogEntry } from "@/apiComponents/dev/StreamingLogViewer";
import { CustomLogEntry, IssueLogEntry, LogMessageEntry, MetricLogEntry, QuickAnalysisMetrics } from "@/types/logs";

const prisma = new PrismaClient();

type IssueSeverity = 'critical' | 'error' | 'warning' | 'info';

type UserWithContacts = User & {
    notificationContacts: NotificationContact[];
};

export type quickAnalysisResponse = {
    error?: string | null;
    domains?: any[];
    links?: any[];
    metrics?: QuickAnalysisMetrics;
}

interface ErrorDetails {
    code: string;
    message: string;
    severity: IssueSeverity;
}

const ErrorSeverityMap: Record<string, IssueSeverity> = {
    'ERR_BAD_REQUEST': 'error',
    'ERR_BAD_RESPONSE': 'error',
    'ECONNREFUSED': 'critical',
    'ECONNABORTED': 'error',
    'ETIMEDOUT': 'warning',
    'ERR_NETWORK': 'error',
    'ERR_BAD_SSL': 'critical',
    'CERT_HAS_EXPIRED': 'error',
    'ERR_INVALID_URL': 'error',
    'ERR_TOO_MANY_REDIRECTS': 'warning',
    'DOMAIN_NOT_FOUND': 'critical',
    'AUTH_ERROR': 'critical',
    'USER_NOT_FOUND': 'critical',
    'DOMAIN_UNVERIFIED': 'error',
    'NO_USER': 'error',
    'UNAUTHORIZED': 'error',
    'CRAWL_IN_PROGRESS': 'warning',
    'CRAWL_TOO_SOON': 'warning',
    'ROBOTS_NOINDEX': 'warning',
    'ROBOTS_NOFOLLOW': 'warning',
    'UNKNOWN_ERROR': 'critical'
} as const;

export async function* quickAnalysis(
    url: string,
    depth: number,
    followLinks: boolean,
    maxDuration: number,
    adminMode?: boolean
): AsyncGenerator<CustomLogEntry, quickAnalysisResponse> {
    const crawlStartTime = new Date().getTime();
    const maxCrawlTime = maxDuration - 1000;
    const seconds = 30;
    const logger = createLogger('QUICK ' + url);

    const metrics: QuickAnalysisMetrics = {
        loadTime: 0,
        resourceCount: 0,
        errors: 0,
        warnings: 0,
        performanceScore: null,
        seoScore: null,
        accessibility: null,
        bestPractices: null
    };

    let analyzedUrl = analyzeLink(url, url);
    let extractedDomain = analyzedUrl.linkDomain;
    let timePassed;
    let index = false;
    let follow = false;
    let errorOccurred = false;
    let targetURL = 'https://' + extractedDomain;

    const domain = await prisma.domain.findFirst({ where: { domainName: extractedDomain } });
    const user = await prisma.user.findFirst({
        where: { id: domain?.userId },
        include: { notificationContacts: true }
    }) as UserWithContacts | null;

    if (!domain) {
        const issueEntry: IssueLogEntry = {
            type: 'issue',
            issueType: 'DOMAIN_NOT_FOUND',
            issueSeverity: ErrorSeverityMap['DOMAIN_NOT_FOUND'],
            issueMessage: 'Domain not found in database',
            timestamp: new Date().toISOString(),
            text: 'DOMAIN_NOT_FOUND'
        };
        yield issueEntry;
        return { error: 'domain not found' };
    }

    if (!user) {
        const issueEntry: IssueLogEntry = {
            type: 'issue',
            issueType: 'NO_USER',
            issueSeverity: ErrorSeverityMap['NO_USER'],
            issueMessage: 'User not found for domain',
            timestamp: new Date().toISOString(),
            text: 'NO_USER'
        };
        yield issueEntry;
        return { error: 'user not found' };
    }

    if (!adminMode) {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            const issueEntry: IssueLogEntry = {
                type: 'issue',
                issueType: 'AUTH_ERROR',
                issueSeverity: ErrorSeverityMap['AUTH_ERROR'],
                issueMessage: 'Authentication required',
                timestamp: new Date().toISOString(),
                text: 'AUTH_ERROR'
            };
            yield issueEntry;
            return { error: 'Not authenticated', domains: [] };
        }

        const sessionUser = await prisma.user.findFirst({ where: { email: session.user.email! } });
        if (!sessionUser) {
            const issueEntry: IssueLogEntry = {
                type: 'issue',
                issueType: 'USER_NOT_FOUND',
                issueSeverity: ErrorSeverityMap['USER_NOT_FOUND'],
                issueMessage: 'Session user not found',
                timestamp: new Date().toISOString(),
                text: 'USER_NOT_FOUND'
            };
            yield issueEntry;
            return { error: 'user not found' };
        }

        if (sessionUser.role !== 'admin') {
            if (!domain.domainVerified) {
                const issueEntry: IssueLogEntry = {
                    type: 'issue',
                    issueType: 'DOMAIN_UNVERIFIED',
                    issueSeverity: ErrorSeverityMap['DOMAIN_UNVERIFIED'],
                    issueMessage: 'Domain not verified',
                    timestamp: new Date().toISOString(),
                    text: 'DOMAIN_UNVERIFIED'
                };
                yield issueEntry;
                return { error: 'Domain not verified', domains: [] };
            }

            if (domain.userId !== user.id) {
                const issueEntry: IssueLogEntry = {
                    type: 'issue',
                    issueType: 'UNAUTHORIZED',
                    issueSeverity: ErrorSeverityMap['UNAUTHORIZED'],
                    issueMessage: 'User not authorized for this domain',
                    timestamp: new Date().toISOString(),
                    text: 'UNAUTHORIZED'
                };
                yield issueEntry;
                return { error: 'not allowed', domains: [] };
            }
        }
    }

    try {
        for await (const logItem of logger.log('Starting crawl: ' + targetURL)) {
            const logEntry: LogMessageEntry = {
                type: 'log',
                timestamp: new Date().toISOString(),
                text: JSON.stringify(logItem)
            };
            yield logEntry;
        }

        const crawlResult = await initialCrawl(
            domain,
            targetURL,
            maxCrawlTime,
            crawlStartTime,
            user,
            analyzedUrl
        );

        if (crawlResult.error) {
            metrics.errors++;
            const issueEntry: IssueLogEntry = {
                type: 'issue',
                issueType: crawlResult.error.code,
                issueSeverity: getSeverityForError(crawlResult.error.code),
                issueMessage: crawlResult.error.message,
                timestamp: new Date().toISOString(),
                text: crawlResult.error.message
            };
            yield issueEntry;
            errorOccurred = true;
        }

        if (crawlResult.performanceMetrics) {
            metrics.loadTime = crawlResult.performanceMetrics.loadTime;
            metrics.resourceCount = crawlResult.performanceMetrics.totalResources || 0;
            metrics.performanceScore = crawlResult.performanceMetrics.performanceScore || null;

            const metricEntry: MetricLogEntry = {
                type: 'metric',
                metricType: 'performance',
                performance: crawlResult.performanceMetrics,
                timestamp: new Date().toISOString(),
                text: String(crawlResult.performanceMetrics)
            };
            yield metricEntry;
        }

        if (crawlResult.data) {
            const metatagsInfo = extractMetatags(crawlResult.data);
            index = metatagsInfo.robots.index;
            follow = metatagsInfo.robots.follow;

            if (!index) {
                const issueEntry: IssueLogEntry = {
                    type: 'issue',
                    issueType: 'ROBOTS_NOINDEX',
                    issueSeverity: ErrorSeverityMap['ROBOTS_NOINDEX'],
                    issueMessage: 'Page is set to noindex in robots meta tag',
                    timestamp: new Date().toISOString(),
                    text: String('Page is set to noindex in robots meta tag')
                };
                yield issueEntry;
                metrics.warnings++;
            }

            if (!follow) {
                const issueEntry: IssueLogEntry = {
                    type: 'issue',
                    issueType: 'ROBOTS_NOFOLLOW',
                    issueSeverity: ErrorSeverityMap['ROBOTS_NOFOLLOW'],
                    issueMessage: 'Page is set to nofollow in robots meta tag',
                    timestamp: new Date().toISOString(),
                    text: String('Page is set to nofollow in robots meta tag')
                };
                yield issueEntry;
                metrics.warnings++;
            }

            const domainHealth = await calculateDomainHealth(domain);
            const healthEntry: MetricLogEntry = {
                type: 'metric',
                metricType: 'domainHealth',
                metrics: domainHealth,
                timestamp: new Date().toISOString(),
                text: String(domainHealth)
            };
            yield healthEntry;

            await prisma.domain.update({
                where: { id: domain.id },
                data: {
                    robotsIndex: index,
                    robotsFollow: follow,
                    timeoutPercentage: domainHealth.timeoutPercentage,
                    badRequestPercentage: domainHealth.badRequestPercentage,
                    typeErrorPercentage: domainHealth.typeErrorPercentage,
                    // performanceScore is not updated by quickAnalysis. The exact score is calculated with lighthouse
                    // other quickCheckScore is updated in generator
                    lastQuickAnalysis: new Date()
                }
            });
        }

    } catch (error) {
        errorOccurred = true;
        metrics.errors++;
        for await (const errorEntry of handleError(error, logger)) {
            yield errorEntry;
        }

        timePassed = (new Date().getTime() - crawlStartTime);
        await updateDomainWithError(domain.id, error, timePassed);

        return { error: 'Error fetching data', metrics };
    }

    const finalMetricEntry: MetricLogEntry = {
        type: 'metric',
        metricType: 'finalMetrics',
        metrics,
        timestamp: new Date().toISOString(),
        text: String(metrics)
    };
    yield finalMetricEntry;

    return {
        error: null,
        domains: [],
        metrics
    };
}

function getSeverityForError(errorCode: string): IssueSeverity {
    return ErrorSeverityMap[errorCode as keyof typeof ErrorSeverityMap] || 'error';
}

async function* handleError(error: unknown, logger: Logger): AsyncGenerator<CustomLogEntry> {
    let errorDetails: ErrorDetails = {
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred',
        severity: 'critical'
    };

    if (error instanceof AxiosError) {
        errorDetails = {
            code: error.code || 'NETWORK_ERROR',
            message: error.message,
            severity: getSeverityForError(error.code || '')
        };
    } else if (error instanceof Error) {
        errorDetails = {
            code: error.name,
            message: error.message,
            severity: 'error'
        };
    }

    for await (const logItem of logger.log(`Error: ${errorDetails.code} - ${errorDetails.message}`)) {
        const logEntry: LogMessageEntry = {
            type: 'log',
            text: JSON.stringify(logItem),
            timestamp: new Date().toISOString()
        };
        yield logEntry;
    }

    const issueEntry: IssueLogEntry = {
        type: 'issue',
        issueType: errorDetails.code,
        issueSeverity: errorDetails.severity,
        issueMessage: errorDetails.message,
        timestamp: new Date().toISOString(),
        text: errorDetails.message
    };
    yield issueEntry;

    if(errorDetails.code === 'UNKNOWN_ERROR'){
        throw error;
    }
}

async function updateDomainWithError(domainId: string, error: unknown, timePassed: number) {
    const updateData: Prisma.DomainUpdateInput = {
        crawlStatus: 'idle',
        lastErrorTime: new Date(),
        lastCrawlTime: timePassed,
        errorUnknown: true,
        lastErrorType: 'unknown',
        lastErrorMessage: ''
    };

    if (error instanceof AxiosError) {
        updateData.lastErrorType = error.code || error.name;
        updateData.lastErrorMessage = error.message;
    } else if (error instanceof Error) {
        updateData.lastErrorType = error.name;
        updateData.lastErrorMessage = error.message;
    }

    await prisma.domain.update({
        where: { id: domainId },
        data: updateData
    });
}