import { env } from "process";
import { createLogger } from "../dev/logger";
import { LogEntry } from "../dev/StreamingLogViewer";
import { CronJob, Prisma } from "@prisma/client";
import { domainIntervalGenerator, domainIntervalResponse } from "./domainInterval";
import { quickAnalysis, quickAnalysisResponse } from "@/app/api/seo/domains/[domainName]/crawl/quickAnalysis";
import { checkTimeout } from "@/app/api/seo/domains/[domainName]/crawl/crawlLinkHelper";
import { CustomLogEntry } from "@/types/logs";
import { consolidatedCrawlNotification, crawlNotificationType } from "@/mail/EnhancedEmailer";
import { prisma } from '@/lib/prisma';

const resetCrawlTime = 3600000; // 1h
const maxDomainCrawls = 7;
const fallbackInterval = 1420; // nearly a day
const scoreDifferenceThreshold = 0.1; // 10% threshold for score notifications

interface QuickAnalysisMetrics {
    loadTime: number;
    resourceCount: number;
    errors: number;
    warnings: number;
    performanceScore: number | null;
    seoScore: number | null;
    accessibility: null;
    bestPractices: null;
    timeToInteractive: number | null;
    firstContentfulPaint: number | null;
    totalBytes: number | null;
    scriptCount: number | null;
    styleCount: number | null;
    imageCount: number | null;
    totalResources: number | null;
}

interface QuickAnalysisIssue {
    type: string;
    severity: string;
    message: string;
}

interface NotificationItem {
    type: crawlNotificationType;
    errorPresent: boolean;
    urls: string[];
    additionalData?: any;
}

async function storeQuickAnalysisHistory(
    domainId: string,
    domainScore: number,
    quickAnalysisScore: number,
    metrics: QuickAnalysisMetrics,
    issues: QuickAnalysisIssue[],
    crawlTime: number,
    status: string
) {
    try {
        await prisma.$transaction(async (tx) => {
            await tx.quickAnalysisHistory.create({
                data: {
                    domainId,
                    score: quickAnalysisScore,
                    metrics: metrics as unknown as Prisma.JsonObject,
                    issues: issues as unknown as Prisma.JsonArray,
                    crawlTime,
                    status,
                    // Store detailed metrics separately
                    timeToInteractive: metrics.timeToInteractive || null,
                    firstContentfulPaint: metrics.firstContentfulPaint || null,
                    totalBytes: metrics.totalBytes || null,
                    scriptCount: metrics.scriptCount || null,
                    styleCount: metrics.styleCount || null,
                    imageCount: metrics.imageCount || null,
                    totalResources: metrics.totalResources || null
                }
            });

            // Create domain metrics entries for each score type
            await tx.domainMetrics.create({
                data: {
                    domain: { connect: { id: domainId } },
                    type: 'DOMAIN_SCORE',
                    score: domainScore,
                    timestamp: new Date(),
                    metadata: { source: 'quick_analysis' }
                }
            });

            // if (metrics.performanceScore !== null) {
            //     await tx.domainMetrics.create({
            //         data: {
            //             domain: { connect: { id: domainId } },
            //             type: 'PERFORMANCE',
            //             score: metrics.performanceScore,
            //             timestamp: new Date(),
            //             metadata: { source: 'quick_analysis' }
            //         }
            //     });
            // }

            await tx.domainMetrics.create({
                data: {
                    domain: { connect: { id: domainId } },
                    type: 'QUICK_CHECK',
                    score: quickAnalysisScore,
                    timestamp: new Date(),
                    metadata: { source: 'quick_analysis' }
                }
            });

            // Also update the domain with the latest metrics
            await tx.domain.update({
                where: { id: domainId },
                data: {
                    timeToInteractive: metrics.timeToInteractive || null,
                    firstContentfulPaint: metrics.firstContentfulPaint || null,
                    totalBytes: metrics.totalBytes || null,
                    scriptCount: metrics.scriptCount || null,
                    styleCount: metrics.styleCount || null,
                    imageCount: metrics.imageCount || null,
                    totalResources: metrics.totalResources || null,
                    lastMetricsUpdate: new Date()
                }
            });
        });
    } catch (error) {
        console.error('Error storing quick analysis history:', error);
        throw error;
    }
}

function calculateScore(metrics: QuickAnalysisMetrics): number {
    let score = 0;
    let factors = 0;
    const useQuickCheckPerformanceMetrics = false;

    // Base metrics
    if (metrics.performanceScore !== null) {
        score += metrics.performanceScore;
        factors++;
    }
    if (metrics.seoScore !== null) {
        score += metrics.seoScore;
        factors++;
    }

    if (useQuickCheckPerformanceMetrics) {
        // Additional performance factors
        if (metrics.timeToInteractive !== null && metrics.loadTime > 0) {
            const ttiScore = Math.max(0, 1 - (metrics.timeToInteractive / 5000)); // 5s benchmark
            score += ttiScore;
            factors++;
        }

        if (metrics.firstContentfulPaint !== null && metrics.loadTime > 0) {
            const fcpScore = Math.max(0, 1 - (metrics.firstContentfulPaint / 2000)); // 2s benchmark
            score += fcpScore;
            factors++;
        }

        // Resource optimization score
        if (metrics.totalResources !== null && metrics.totalBytes !== null) {
            const resourceScore = Math.max(0, 1 - (metrics.totalResources / 100)) * // 100 resources benchmark
                Math.max(0, 1 - (metrics.totalBytes / (2 * 1024 * 1024))); // 2MB benchmark
            score += resourceScore;
            factors++;
        }
    }

    if (factors === 0) {
        const baseScore = 100;
        const errorPenalty = metrics.errors * 10;
        const warningPenalty = metrics.warnings * 2;
        return Math.max(0, Math.min(100, baseScore - errorPenalty - warningPenalty)) / 100;
    }

    return score / factors;
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
                                } else {
                                    notifications.push({
                                        type: crawlNotificationType.GeneralError,
                                        errorPresent: true,
                                        urls: [`https://${domain.domainName}`],
                                        additionalData: {
                                            errorType: result.value.issueType,
                                            errorMessage: result.value.issueMessage
                                        }
                                    });
                                }
                            } else if (result.value.issueSeverity === 'warning') {
                                aggregatedMetrics.warnings++;
                            }

                            if(result.value.issueType === 'ROBOTS_NOINDEX') {
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
                const finalScore = calculateScore(aggregatedMetrics);
                const oldScore = domain.score || 0;
                let newScore = 0;

                await prisma.$transaction(async (tx) => {
                    // Update quick check score
                    await tx.domain.update({
                        where: { id: domain.id },
                        data: {
                            quickCheckScore: finalScore,
                            lastQuickAnalysis: new Date()
                        }
                    });

                    // Calculate and update overall score
                    const updatedDomain = await tx.domain.findUnique({
                        where: { id: domain.id },
                        select: {
                            quickCheckScore: true,
                            performanceScore: true
                        }
                    });

                    if (!updatedDomain || !updatedDomain.quickCheckScore || !updatedDomain.performanceScore) return;

                    newScore = (updatedDomain.quickCheckScore + updatedDomain.performanceScore) / 2;

                    await tx.domain.update({
                        where: { id: domain.id },
                        data: {
                            score: newScore
                        }
                    });
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

                // Fetch unnotified error logs
                const unnotifiedErrors = await prisma.errorLog.findMany({
                    where: {
                        domainId: domain.id,
                        resolvedAt: null,
                        notified: false
                    },
                    include: {
                        errorType: true
                    }
                });

                // Add error log notifications to the notifications array
                if (unnotifiedErrors.length > 0) {
                    const errorsByCategory = unnotifiedErrors.reduce((acc, error) => {
                        if (!acc[error.errorType.category]) {
                            acc[error.errorType.category] = [];
                        }
                        acc[error.errorType.category].push(error);
                        return acc;
                    }, {} as Record<string, typeof unnotifiedErrors>);

                    // Add categorized errors to notifications
                    Object.entries(errorsByCategory).forEach(([category, errors]) => {
                        notifications.push({
                            type: crawlNotificationType.GeneralError,
                            errorPresent: true,
                            urls: [`https://${domain.domainName}`],
                            additionalData: {
                                category,
                                errors: errors.map(error => ({
                                    name: error.errorType.name,
                                    severity: error.errorType.severity,
                                    metadata: error.metadata
                                }))
                            }
                        });
                    });
                }

                // Add initial message notification if this is the first analysis
                if (!domain.initialMessageSent) {
                    notifications.push({
                        type: crawlNotificationType.InitialMessage,
                        errorPresent: false,
                        urls: [`https://${domain.domainName}`],
                        additionalData: {
                            totalErrors: unnotifiedErrors.length,
                            quickCheckScore: finalScore,
                            performanceScore: aggregatedMetrics.performanceScore
                        }
                    });
                }

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

                    const notificationResult = await consolidatedCrawlNotification(
                        completeUser,
                        domain,
                        notifications,
                        !domain.lastQuickAnalysis,
                        !domain.lastQuickAnalysis || !domain.lastCrawl || !domain.lastLighthouseAnalysis
                    );

                    // Mark error logs as notified
                    if (unnotifiedErrors.length > 0) {
                        await prisma.errorLog.updateMany({
                            where: {
                                id: {
                                    in: unnotifiedErrors.map(error => error.id)
                                }
                            },
                            data: {
                                notified: true
                            }
                        });
                    }

                    // Mark initial message as sent if this was the first analysis
                    if (!domain.initialMessageSent) {
                        await prisma.domain.update({
                            where: { id: domain.id },
                            data: { initialMessageSent: true }
                        });
                    }

                    if (notificationResult.sent) {
                        yield { text: `Sent consolidated notifications for ${notifications.length} issues` };
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

                // In the catch block of quickAnalysisGenerator:
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