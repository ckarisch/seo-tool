import { env } from "process";
import { createLogger } from "../dev/logger";
import { LogEntry } from "../dev/StreamingLogViewer";
import { CronJob, Prisma, Severity } from "@prisma/client";
import { domainIntervalGenerator, domainIntervalResponse } from "./domainInterval";
import { quickAnalysis, quickAnalysisResponse } from "@/app/api/seo/domains/[domainName]/crawl/quickAnalysis";
import { checkTimeout } from "@/app/api/seo/domains/[domainName]/crawl/crawlLinkHelper";
import { CustomLogEntry } from "@/types/logs";
import { consolidatedCrawlNotification, crawlNotificationType } from "@/mail/EnhancedEmailer";
import { prisma } from '@/lib/prisma';
import { calculateOverallScore } from "@/util/calculateOverallScore";
import { aggregateErrorLogs, calculateErrorScore, calculateScore, checkErrorChanges, NotificationItem, QuickAnalysisMetrics, sendErrorChangeNotification } from "@/crawler/scoreCalculator";
import { storeQuickAnalysisHistory } from "@/crawler/scoreData";

const resetCrawlTime = 3600000; // 1h
const maxDomainCrawls = 7;
const fallbackInterval = 1420; // nearly a day
const scoreDifferenceThreshold = 0.1; // 10% threshold for score notifications

interface QuickAnalysisIssue {
    type: string;
    severity: string;
    message: string;
}

export async function* quickAnalysisGenerator(
    maxExecutionTime: number,
    host: string,
    cron: CronJob
): AsyncGenerator<LogEntry> {
    const quickAnalysisLogger = createLogger("Quick_START");

    const lighthouseStartTime = new Date().getTime();
    let timePassed = new Date().getTime() - lighthouseStartTime;
    let timeLeft = maxExecutionTime - timePassed;
    let domainsCrawled = 0;

    yield { text: `Starting quick analysis generator (max execution time: ${maxExecutionTime}ms)` };

    if (env.NODE_ENV == "development") {
        yield { text: 'Running in development mode' };
    }

    const domains = await prisma.domain.findMany({
        orderBy: { lastQuickAnalysis: "asc" },
        include: {
            user: {
                include: {
                    notificationContacts: true
                }
            },
            quickAnalysisHistory: {
                orderBy: { timestamp: 'desc' },
                take: 1,
            }
        },
    });

    if (!domains || domains.length === 0) {
        yield { text: "No domains found for analysis" };
        return;
    }

    for (const domain of domains) {
        timePassed = new Date().getTime() - lighthouseStartTime;
        timeLeft = maxExecutionTime - timePassed;

        if (checkTimeout(timePassed, maxExecutionTime)) {
            yield { text: 'Execution time limit reached, stopping analysis' };
            return;
        }

        if (domainsCrawled >= maxDomainCrawls) {
            yield { text: `Maximum domain crawl limit reached (${domainsCrawled})` };
            break;
        }

        if (!domain.crawlEnabled) {
            yield { text: `Crawling disabled for domain: ${domain.domainName}` };
            continue;
        }

        let domainInterval = fallbackInterval;
        const generateInterval = domainIntervalGenerator(
            domain.user.role,
            domain,
            cron,
            fallbackInterval
        );

        let intervalIteratorResult: IteratorResult<LogEntry, domainIntervalResponse>;
        do {
            intervalIteratorResult = await generateInterval.next();
            if (!intervalIteratorResult.done) {
                yield intervalIteratorResult.value;
            }
        } while (!intervalIteratorResult.done);

        domainInterval = intervalIteratorResult.value.domainInterval;
        if (domainInterval <= 0) {
            yield { text: `No valid crawl interval for domain: ${domain.domainName}` };
            continue;
        }

        const lastQuickAnalysis = domain.lastQuickAnalysis || new Date("01-01-1970");
        const now = new Date();
        const diff = now.getTime() - lastQuickAnalysis.getTime();
        const diffMinutes = Math.floor(diff / 60000);

        if (!domain.domainVerified && domain.user.role !== "admin") {
            yield { text: `Domain not verified: ${domain.domainName}` };
            continue;
        }

        if (domain.crawlEnabled && diffMinutes >= domainInterval) {
            const analysisStartTime = new Date().getTime();
            yield { text: `Starting analysis for domain: ${domain.domainName}` };

            try {
                const notifications: NotificationItem[] = [];
                const subfunctionGenerator = quickAnalysis(
                    domain.domainName,
                    2, // depth
                    true, // followLinks
                    maxExecutionTime,
                    true // adminMode
                );

                const aggregatedMetrics: QuickAnalysisMetrics = {
                    loadTime: 0,
                    resourceCount: 0,
                    errors: 0,
                    warnings: 0,
                    performanceScore: null,
                    seoScore: 1,
                    accessibility: null,
                    bestPractices: null,
                    timeToInteractive: null,
                    firstContentfulPaint: null,
                    totalBytes: null,
                    scriptCount: null,
                    styleCount: null,
                    imageCount: null,
                    totalResources: null
                };

                const collectedIssues: QuickAnalysisIssue[] = [];
                let result: IteratorResult<CustomLogEntry, quickAnalysisResponse>;

                do {
                    result = await subfunctionGenerator.next();
                    if (!result.done) {
                        yield { text: result.value.text };

                        // Collect metrics and issues
                        if (result.value.type === 'metric' && result.value.performance) {
                            const perf = result.value.performance;
                            aggregatedMetrics.loadTime = perf.loadTime;
                            aggregatedMetrics.performanceScore = perf.performanceScore || null;
                            aggregatedMetrics.resourceCount = perf.totalResources || 0;
                            aggregatedMetrics.timeToInteractive = perf.timeToInteractive || null;
                            aggregatedMetrics.firstContentfulPaint = perf.firstContentfulPaint || null;
                            aggregatedMetrics.totalBytes = perf.totalBytes || null;
                            aggregatedMetrics.scriptCount = perf.scriptCount || null;
                            aggregatedMetrics.styleCount = perf.styleCount || null;
                            aggregatedMetrics.imageCount = perf.imageCount || null;
                            aggregatedMetrics.totalResources = perf.totalResources || null;
                        } else if (result.value.type === 'issue') {
                            if (result.value.issueSeverity === 'error') {
                                aggregatedMetrics.errors++;

                                // Add to notifications based on issue type
                                if (result.value.issueType === 'ERR_BAD_REQUEST' && result.value.text.includes('404')) {
                                    notifications.push({
                                        type: crawlNotificationType.Error404,
                                        errorPresent: true,
                                        urls: [`https://${domain.domainName}`]
                                    });
                                } else if (result.value.issueType === 'ERR_BAD_RESPONSE' && result.value.text.includes('503')) {
                                    notifications.push({
                                        type: crawlNotificationType.Error503,
                                        errorPresent: true,
                                        urls: [`https://${domain.domainName}`]
                                    });
                                }
                            } else if (result.value.issueSeverity === 'warning') {
                                aggregatedMetrics.warnings++;
                            }

                            if (result.value.issueType === 'ROBOTS_NOINDEX') {
                                aggregatedMetrics.seoScore = 0;
                            }

                            collectedIssues.push({
                                type: result.value.issueType,
                                severity: result.value.issueSeverity,
                                message: result.value.issueMessage
                            });
                        }
                    }
                } while (!result.done);

                const analysisEndTime = new Date().getTime();

                // Get aggregated errors and calculate scores
                const aggregatedErrors = await aggregateErrorLogs(domain.id);
                console.log('Raw aggregated errors:', aggregatedErrors.map(e => ({
                    id: e.id,
                    path: e.internalLink?.path,
                    type: e.errorType.code
                })));
                aggregatedMetrics.errors = aggregatedErrors.length;  // Update error count based on actual errors

                const finalScore = calculateScore(aggregatedMetrics, aggregatedErrors);
                const oldScore = domain.score || 0;
                let newScore = finalScore;
                await prisma.$transaction(async (tx) => {
                    // Update quick check score
                    await tx.domain.update({
                        where: { id: domain.id },
                        data: {
                            quickCheckScore: finalScore,
                            lastQuickAnalysis: new Date()
                        }
                    });

                    // Get current domain data
                    const domainData = await tx.domain.findUnique({
                        where: { id: domain.id },
                        select: {
                            quickCheckScore: true,
                            performanceScore: true
                        }
                    });

                    // Calculate overall score
                    const overallScore = calculateOverallScore({
                        quickCheckScore: finalScore,
                        performanceScore: domainData?.performanceScore
                    });

                    if (overallScore !== null) {
                        newScore = overallScore;
                        await tx.domain.update({
                            where: { id: domain.id },
                            data: {
                                score: overallScore
                            }
                        });
                    }
                });

                // Add score change notification if threshold exceeded
                const scoreDifference = Math.abs(newScore - oldScore);
                yield { text: `Score difference: ${scoreDifference} (${oldScore} -> ${newScore})` };
                if (scoreDifference >= scoreDifferenceThreshold) {
                    notifications.push({
                        type: crawlNotificationType.Score,
                        errorPresent: false,
                        urls: [`https://${domain.domainName}`],
                        additionalData: {
                            oldScore,
                            newScore,
                            metrics: aggregatedMetrics,
                            issues: collectedIssues
                        }
                    });
                }

                // Group aggregated errors by severity for notifications
                const errorsBySeverity = aggregatedErrors.reduce((acc, error) => {
                    const severity = error.errorType.severity;
                    if (!acc[severity]) {
                        acc[severity] = [];
                    }

                    // Fix URL construction - strip domain from path if present
                    let path = error.internalLink?.path || '';
                    if (path.startsWith(domain.domainName)) {
                        path = path.substring(domain.domainName.length);
                    }
                    if (!path.startsWith('/')) {
                        path = '/' + path;
                    }

                    const url = `https://${domain.domainName}${path}`;

                    acc[severity].push({
                        type: error.errorType.code,
                        message: error.errorType.name,
                        url: url, // Now properly formatted
                        category: error.errorType.category,
                        metadata: error.metadata
                    });
                    return acc;
                }, {} as Record<Severity, Array<{
                    type: string;
                    message: string;
                    url: string;
                    category: string;
                    metadata: Prisma.JsonValue;
                }>>);

                // Log the final errorsBySeverity structure
                Object.entries(errorsBySeverity).forEach(([severity, errors]) => {
                    console.log(`Severity ${severity} has ${errors.length} errors with URLs:`,
                        errors.map(e => e.url)
                    );
                });

                // Add consolidated error notifications
                Object.entries(errorsBySeverity).forEach(([severity, errors]) => {
                    // Extract URLs directly from errors array
                    const urls = errors.map(e => e.url);

                    console.log(`Creating notification for severity ${severity} with ${urls.length} URLs`);

                    notifications.push({
                        type: crawlNotificationType.GeneralError,
                        errorPresent: true,
                        urls: urls, // Pass the actual URLs array
                        additionalData: {
                            severity,
                            errors: errors.map(e => ({
                                type: e.type,
                                message: e.message,
                                category: e.category,
                                metadata: e.metadata,
                                url: e.url
                            }))
                        }
                    });
                });

                // Add initial message notification if this is the first analysis
                if (!domain.initialMessageSent) {
                    notifications.push({
                        type: crawlNotificationType.InitialMessage,
                        errorPresent: false,
                        urls: [`https://${domain.domainName}`],
                        additionalData: {
                            totalErrors: aggregatedErrors.length,
                            quickCheckScore: finalScore,
                            performanceScore: domain.performanceScore,
                            seoScore: 0,
                            accessibility: 0,
                        }
                    });
                }
                console.log('notifications', notifications);

                // Send consolidated notifications if any exist
                if (notifications.length > 0 && domain.user) {
                    const completeUser = {
                        id: domain.user.id,
                        name: domain.user.name,
                        email: domain.user.email,
                        role: domain.user.role,
                        image: null,
                        password: null,
                        salt: null,
                        stripeCustomers: [],
                        emailVerified: null,
                        createdAt: null,
                        updatedAt: null,
                        notificationContacts: domain.user.notificationContacts || []
                    };

                    const errorChanges = await checkErrorChanges(domain.id, domain);
                    await sendErrorChangeNotification(domain, completeUser, errorChanges);

                    const notificationResult = {
                        sent: true
                    }
                    // const notificationResult = await consolidatedCrawlNotification(
                    //     completeUser,
                    //     domain,
                    //     notifications,
                    //     !domain.initialMessageSent,
                    //     !domain.lastQuickAnalysis || !domain.lastCrawl || !domain.lastLighthouseAnalysis
                    // );

                    // Mark all reported errors as notified
                    if (aggregatedErrors.length > 0) {
                        await prisma.errorLog.updateMany({
                            where: {
                                id: {
                                    in: aggregatedErrors.map(error => error.id)
                                }
                            },
                            data: {
                                notified: true
                            }
                        });
                    }

                    if (notificationResult.sent) {
                        yield { text: `Sent consolidated notifications for ${notifications.length} issues` };

                        // Mark initial message as sent if this was the first analysis
                        if (!domain.initialMessageSent) {
                            await prisma.domain.update({
                                where: { id: domain.id },
                                data: { initialMessageSent: true }
                            });
                        }
                    }
                    else {
                        yield { text: `Nothing sent` };
                    }
                }

                await storeQuickAnalysisHistory(
                    domain.id,
                    newScore,
                    finalScore,
                    aggregatedMetrics,
                    collectedIssues,
                    analysisEndTime - analysisStartTime,
                    'completed'
                );

                domainsCrawled++;

                await prisma.adminLog.create({
                    data: {
                        createdAt: new Date(),
                        message: `Quick analysis completed for ${domain.domainName} (score: ${(finalScore * 100).toFixed(1)}%, overall: ${(newScore * 100).toFixed(1)}%)`,
                        domainId: domain.id,
                        userId: domain.userId,
                    },
                });

                yield { text: `Quick analysis completed for domain: ${domain.domainName} (score: ${(finalScore * 100).toFixed(1)}%, overall: ${(newScore * 100).toFixed(1)}%)` };

            } catch (err) {
                const error = err as Error;
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

                yield { text: `Error analyzing domain ${domain.domainName}: ${errorMessage}` };

                await prisma.adminLog.create({
                    data: {
                        createdAt: new Date(),
                        message: `Error in quick analysis for ${domain.domainName}: ${errorMessage}`,
                        domainId: domain.id,
                        userId: domain.userId,
                    },
                });

                // Create complete metrics object with all required fields set to null/0
                const errorMetrics: QuickAnalysisMetrics = {
                    loadTime: 0,
                    resourceCount: 0,
                    errors: 1,
                    warnings: 0,
                    performanceScore: null,
                    seoScore: null,
                    accessibility: null,
                    bestPractices: null,
                    timeToInteractive: null,
                    firstContentfulPaint: null,
                    totalBytes: null,
                    scriptCount: null,
                    styleCount: null,
                    imageCount: null,
                    totalResources: null
                };

                await storeQuickAnalysisHistory(
                    domain.id,
                    0,
                    0,
                    errorMetrics,
                    [{
                        type: 'error',
                        severity: 'critical',
                        message: errorMessage
                    }],
                    0,
                    'failed'
                );
            }
        } else {
            yield { text: `Skipping analysis for ${domain.domainName} (last analysis: ${diffMinutes}/${domainInterval} minutes ago)` };
        }
    }

    yield { text: `Quick analysis generator completed (domains analyzed: ${domainsCrawled})` };
}