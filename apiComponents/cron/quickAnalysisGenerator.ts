import { env } from "process";
import { createLogger } from "../dev/logger";
import { LogEntry } from "../dev/StreamingLogViewer";
import { crawlDomainResponse } from "@/app/api/seo/domains/[domainName]/crawl/crawlDomain";
import { CronJob, PrismaClient, Prisma } from "@prisma/client";
import { domainIntervalGenerator, domainIntervalResponse } from "./domainInterval";
import { quickAnalysis, quickAnalysisResponse } from "@/app/api/seo/domains/[domainName]/crawl/quickAnalysis";
import { checkTimeout } from "@/app/api/seo/domains/[domainName]/crawl/crawlLinkHelper";
import { CustomLogEntry } from "@/types/logs";

const prisma = new PrismaClient();

const resetCrawlTime = 3600000; // 1h
const maxDomainCrawls = 5;
const fallbackInterval = 1420; // nearly a day

interface QuickAnalysisMetrics {
    loadTime: number;
    resourceCount: number;
    errors: number;
    warnings: number;
    performanceScore: number | null;
    seoScore: number | null;
    accessibility: number | null;
    bestPractices: number | null;
}

interface QuickAnalysisIssue {
    type: string;
    severity: string;
    message: string;
}


async function storeQuickAnalysisHistory(
    domainId: string,
    score: number,
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
                    score,
                    metrics: metrics as unknown as Prisma.JsonObject,
                    issues: issues as unknown as Prisma.JsonArray,
                    crawlTime,
                    status,
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

    if (metrics.performanceScore !== null) {
        score += metrics.performanceScore;
        factors++;
    }
    if (metrics.seoScore !== null) {
        score += metrics.seoScore;
        factors++;
    }
    if (metrics.accessibility !== null) {
        score += metrics.accessibility;
        factors++;
    }
    if (metrics.bestPractices !== null) {
        score += metrics.bestPractices;
        factors++;
    }

    if (factors === 0) {
        const baseScore = 100;
        const errorPenalty = metrics.errors * 10;
        const warningPenalty = metrics.warnings * 2;
        return Math.max(0, Math.min(100, baseScore - errorPenalty - warningPenalty)) / 100;
    }

    return score / (factors);
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
            user: { select: { role: true } },
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
                    seoScore: null,
                    accessibility: null,
                    bestPractices: null
                };

                const collectedIssues: QuickAnalysisIssue[] = [];
                let result: IteratorResult<CustomLogEntry, quickAnalysisResponse>;

                do {
                    result = await subfunctionGenerator.next();
                    if (!result.done) {
                        // Convert CustomLogEntry to LogEntry and yield
                        yield { text: result.value.text };

                        // Process metrics and issues
                        if (result.value.type === 'metric' && result.value.performance) {
                            const perf = result.value.performance;
                            aggregatedMetrics.loadTime = perf.loadTime;
                            aggregatedMetrics.performanceScore = perf.performanceScore || null;
                            aggregatedMetrics.resourceCount = perf.totalResources || 0;
                        } else if (result.value.type === 'issue') {
                            if (result.value.issueSeverity === 'error') {
                                aggregatedMetrics.errors++;
                            } else if (result.value.issueSeverity === 'warning') {
                                aggregatedMetrics.warnings++;
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

                await prisma.$transaction(async (tx) => {
                    // First update the scores
                    await tx.domain.update({
                        where: { id: domain.id },
                        data: {
                            quickCheckScore: finalScore,
                        }
                    });
                
                    // Then get the domain to calculate score
                    const updatedDomain = await tx.domain.findUnique({
                        where: { id: domain.id },
                        select: {
                            quickCheckScore: true,
                            performanceScore: true
                        }
                    });
                
                    if (!updatedDomain || !updatedDomain.quickCheckScore || !updatedDomain.performanceScore) return;
                
                    // Update the score based on the new values
                    await tx.domain.update({
                        where: { id: domain.id },
                        data: {
                            score: (updatedDomain.quickCheckScore + updatedDomain.performanceScore) / 2
                        }
                    });
                });

                await storeQuickAnalysisHistory(
                    domain.id,
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
                        message: `Quick analysis completed for ${domain.domainName} (score: ${finalScore * 100})`,
                        domainId: domain.id,
                        userId: domain.userId,
                    },
                });

                yield { text: `Analysis completed for domain: ${domain.domainName} (score: ${finalScore * 100})` };

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

                await storeQuickAnalysisHistory(
                    domain.id,
                    0,
                    {
                        loadTime: 0,
                        resourceCount: 0,
                        errors: 1,
                        warnings: 0,
                        performanceScore: null,
                        seoScore: null,
                        accessibility: null,
                        bestPractices: null
                    },
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