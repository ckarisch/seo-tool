// generators/quickAnalysisGenerator.ts
import { env } from "process";
import { createLogger } from "../dev/logger";
import { LogEntry } from "../dev/StreamingLogViewer";
import { crawlDomainResponse } from "@/app/api/seo/domains/[domainName]/crawl/crawlDomain";
import { CronJob, PrismaClient, Prisma } from "@prisma/client";
import {
  domainIntervalGenerator,
  domainIntervalResponse,
} from "./domainInterval";
import { quickAnalysis } from "@/app/api/seo/domains/[domainName]/crawl/quickAnalysis";
import { checkTimeout } from "@/app/api/seo/domains/[domainName]/crawl/crawlLinkHelper";

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

interface PerformanceMetrics {
  loadTime: number;
  timeToInteractive?: number;
  firstContentfulPaint?: number;
  performanceScore?: number;
  totalResources?: number;
  totalBytes?: number;
}

interface MetricLogEntry extends LogEntry {
  metricType: string;
  metricValue: number;
}

interface PerformanceLogEntry extends LogEntry {
  performance: PerformanceMetrics;
}

interface IssueLogEntry extends LogEntry {
  issueType: string;
  issueSeverity: string;
  issueMessage: string;
}

function isMetricLogEntry(entry: LogEntry): entry is MetricLogEntry {
  return 'metricType' in entry && 'metricValue' in entry;
}

function isPerformanceLogEntry(entry: LogEntry): entry is PerformanceLogEntry {
  return 'performance' in entry && entry.performance !== null;
}

function isIssueLogEntry(entry: LogEntry): entry is IssueLogEntry {
  return 'issueType' in entry && 'issueSeverity' in entry && 'issueMessage' in entry;
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
      // Store history entry
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

      // Update domain
      await tx.domain.update({
        where: { id: domainId },
        data: {
          lastQuickAnalysis: new Date(),
          quickCheckScore: score,
          performanceScore: metrics.performanceScore || undefined,
          score: score,
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

  return score / (factors * 100);
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

  if (env.NODE_ENV == "development") {
    yield* quickAnalysisLogger.log(`cron in dev mode`);
  }

  yield* quickAnalysisLogger.log("start auto crawl");
  
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
    yield* quickAnalysisLogger.log("no auto crawls found");
    return Response.json({ error: "no auto crawls found" }, { status: 404 });
  }

  for (const domain of domains) {
    timePassed = new Date().getTime() - lighthouseStartTime;
    timeLeft = maxExecutionTime - timePassed;
    
    if (checkTimeout(timePassed, maxExecutionTime)) {
      yield* quickAnalysisLogger.log(`timeout`);
      return;
    }
    
    if (domainsCrawled >= maxDomainCrawls) {
      yield* quickAnalysisLogger.log(`stop crawling (crawled = ${domainsCrawled})`);
      break;
    }

    if (!domain.crawlEnabled) {
      yield* quickAnalysisLogger.log(
        `➥  crawling disabled: domain ${domain.domainName}`
      );
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

    let diffMinutes = 0;
    if (domainInterval > 0) {
      const lastQuickAnalysis = domain.lastQuickAnalysis || new Date("01-01-1970");
      const now = new Date();
      const diff = now.getTime() - lastQuickAnalysis.getTime();
      diffMinutes = Math.floor(diff / 60000);
    } else {
      yield* quickAnalysisLogger.log(
        "❗ auto crawl: " + domain.domainName + " has no crawl interval"
      );
      break;
    }

    if (!domain.domainVerified) {
      if (domain.user.role === "admin") {
        yield* quickAnalysisLogger.log(
          `❗✅ admin mode (not verified): domain ${domain.domainName}`
        );
      } else {
        yield* quickAnalysisLogger.log(
          `❌ not verified: domain ${domain.domainName} (${diffMinutes} / ${domainInterval} m)`
        );
        continue;
      }
    }

    yield* quickAnalysisLogger.log(
      `✅ domain ${domain.domainName}: verified (${diffMinutes} / ${domainInterval} m)`
    );

    if (domain.crawlEnabled && diffMinutes >= domainInterval) {
      const analysisStartTime = new Date().getTime();

      yield* quickAnalysisLogger.log(
        `➝  auto crawl: ${domain.domainName} last crawl was ${diffMinutes} / ${domainInterval} minutes ago`
      );

      try {
        const depth = 2;
        const followLinks = true;
        
        yield* quickAnalysisLogger.log(`➝  domain ${domain.domainName}: start`);

        const subfunctionGenerator = quickAnalysis(
          domain.domainName,
          depth,
          followLinks,
          maxExecutionTime,
          true
        );

        let result: IteratorResult<LogEntry, crawlDomainResponse>;
        let aggregatedMetrics: QuickAnalysisMetrics = {
          loadTime: 0,
          resourceCount: 0,
          errors: 0,
          warnings: 0,
          performanceScore: null,
          seoScore: null,
          accessibility: null,
          bestPractices: null
        };

        let collectedIssues: QuickAnalysisIssue[] = [];
        let hasPerformanceData = false;

        do {
          result = await subfunctionGenerator.next();
          if (!result.done) {
            yield result.value;
            
            if (isMetricLogEntry(result.value)) {
              switch (result.value.metricType) {
                case 'loadTime':
                  aggregatedMetrics.loadTime = result.value.metricValue;
                  break;
                case 'resourceCount':
                  aggregatedMetrics.resourceCount = result.value.metricValue;
                  break;
                case 'performanceScore':
                  aggregatedMetrics.performanceScore = result.value.metricValue;
                  break;
                case 'seoScore':
                  aggregatedMetrics.seoScore = result.value.metricValue;
                  break;
                case 'accessibility':
                  aggregatedMetrics.accessibility = result.value.metricValue;
                  break;
                case 'bestPractices':
                  aggregatedMetrics.bestPractices = result.value.metricValue;
                  break;
              }
            }

            if (isPerformanceLogEntry(result.value) && !hasPerformanceData) {
              const perf = result.value.performance;
              hasPerformanceData = true;
              aggregatedMetrics.loadTime = perf.loadTime;
              aggregatedMetrics.performanceScore = perf.performanceScore || null;
              aggregatedMetrics.resourceCount = perf.totalResources || 0;
            }

            if (isIssueLogEntry(result.value)) {
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
            message: `domain ${domain.domainName} quick analysis (score: ${
              finalScore * 100
            }), host: ${host}`,
            domainId: domain.id,
            userId: domain.userId,
          },
        });

        yield* quickAnalysisLogger.log(
          `➝  domain ${domain.domainName}: end (crawled = ${domainsCrawled})`
        );
      } catch (err: unknown) {
        const error = err as Error;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        yield* quickAnalysisLogger.log(
          `❌ Error analyzing ${domain.domainName}: ${errorMessage}`
        );
        
        await prisma.adminLog.create({
          data: {
            createdAt: new Date(),
            message: `Error in quick analysis for ${domain.domainName}: ${errorMessage}`,
            domainId: domain.id,
            userId: domain.userId,
          },
        });
      
        // Optionally store failed analysis with error status
        await storeQuickAnalysisHistory(
          domain.id,
          0, // zero score for failed analysis
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
      yield* quickAnalysisLogger.log(
        "➥  skip auto crawl: " +
          domain.domainName +
          " last crawl was " +
          diffMinutes +
          " / " +
          domainInterval +
          " minutes ago"
      );
    }
  }
}