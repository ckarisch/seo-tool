import { env } from "process";
import { createLogger } from "../dev/logger";
import { LogEntry } from "../dev/StreamingLogViewer";
import { CronJob, PrismaClient, UserRole } from "@prisma/client";
import {
  lighthouseAnalysis,
  lighthouseAnalysisResponse,
} from "@/crawler/lighthouseAnalysis";
import {
  domainIntervalGenerator,
  domainIntervalResponse,
} from "./domainInterval";
import { checkTimeout } from "@/app/api/seo/domains/[domainName]/crawl/crawlLinkHelper";
import { calculateOverallScore } from "@/util/calculateOverallScore";
import { analyzeLink } from "../crawler/linkTools";
const prisma = new PrismaClient();

const resetCrawlTime = 3600000; // 1h
const maxDomainCrawls = 6; // 1h
const fallbackInterval = 1420; // nearly a day

export async function* lighthouseGenerator(
  maxExecutionTime: number,
  host: string,
  cron: CronJob
): AsyncGenerator<LogEntry> {
  const lighthouseLogger = createLogger("Lighthouse_START");

  const lighthouseStartTime = new Date().getTime();
  let timePassed = new Date().getTime() - lighthouseStartTime;
  let timeLeft = maxExecutionTime - timePassed;

  let domainsCrawled = 0;

  if (env.NODE_ENV == "development") {
    yield* lighthouseLogger.log(`cron in dev mode`);
  }

  yield* lighthouseLogger.log("start lighthouse");
  const domains = await prisma.domain.findMany({
    orderBy: { lastLighthouseAnalysis: "asc" },
    select: {
      id: true,
      name: true,
      domainName: true,
      domainVerificationKey: true,
      domainVerified: true,
      lastLighthouseAnalysis: true,
      crawlEnabled: true,
      crawlDepth: true,
      crawlStatus: true,
      crawlInterval: true,
      userId: true,
      score: true,
      user: {
        select: {
          role: true
        }
      }
    }
  });

  if (!domains || domains.length === 0) {
    yield* lighthouseLogger.log("no domains found");
    return;
  }

  for (const domain of domains) {
    timePassed = new Date().getTime() - lighthouseStartTime;
    timeLeft = maxExecutionTime - timePassed;
    if (checkTimeout(timePassed, maxExecutionTime)) {
      yield* lighthouseLogger.log(`timeout`);
      return;
    }


    const { isLocalTestHttpLink } = analyzeLink(domain.domainName, domain.domainName);
    if (isLocalTestHttpLink) {
      yield* lighthouseLogger.log(`skipping local domain`);
      
      await prisma.domain.update({
        where: { id: domain.id },
        data: {
          performanceScore: 1,
          lastLighthouseAnalysis: new Date()
        }
      });
    }

    let domainInterval = fallbackInterval;

    /* subfunction */
    const generateInterval = domainIntervalGenerator(
      domain.user.role,
      domain,
      cron,
      fallbackInterval
    );

    let lighthouseIteratorResult: IteratorResult<
      LogEntry,
      domainIntervalResponse
    >;
    do {
      lighthouseIteratorResult = await generateInterval.next();
      if (!lighthouseIteratorResult.done) {
        yield lighthouseIteratorResult.value;
      }
    } while (!lighthouseIteratorResult.done);

    domainInterval = lighthouseIteratorResult.value.domainInterval;
    /* end subfunction */

    if (domainsCrawled >= maxDomainCrawls) {
      yield* lighthouseLogger.log(`stop crawling (crawled = ${domainsCrawled})`);
      break;
    }
    let diffMinutes = 0;
    if (domainInterval > 0) {
      let lastLighthouseAnalysis = domain.lastLighthouseAnalysis;
      if (!lastLighthouseAnalysis) {
        lastLighthouseAnalysis = new Date("01-01-1970");
      }
      const now = new Date();
      const diff = now.getTime() - lastLighthouseAnalysis.getTime();
      diffMinutes = Math.floor(diff / 60000);
    }
    if (!domain.domainVerified) {
      if (domain.user.role === UserRole.ADMIN) {
        yield* lighthouseLogger.log(
          `❗✅ admin mode (not verified): domain ${domain.domainName}`
        );
      } else {
        yield* lighthouseLogger.log(
          `❌ not verified: domain ${domain.domainName} (${diffMinutes} / ${domainInterval} m)`
        );
        continue;
      }
    }
    yield* lighthouseLogger.log(
      `✅ domain ${domain.domainName}: verified (${diffMinutes} / ${domainInterval} m)`
    );

    if (domain.crawlEnabled) {
      yield* lighthouseLogger.log(`➝  domain ${domain.domainName}: crawl enabled`);

      if (diffMinutes >= domainInterval) {
        yield* lighthouseLogger.log(
          "➝  auto crawl: " +
          domain.domainName +
          " last crawl was " +
          diffMinutes +
          " / " +
          domainInterval +
          " minutes ago"
        );
        yield* lighthouseLogger.log(`➝  domain ${domain.domainName}: start`);

        /* subfunction */
        const lighthouseGenerator = lighthouseAnalysis(prisma, domain);

        let lighthouseIteratorResult: IteratorResult<
          LogEntry,
          lighthouseAnalysisResponse
        >;
        do {
          lighthouseIteratorResult = await lighthouseGenerator.next();
          if (!lighthouseIteratorResult.done) {
            yield lighthouseIteratorResult.value;
          }
        } while (!lighthouseIteratorResult.done);

        let lighthouseResult: lighthouseAnalysisResponse | undefined =
          undefined;
        lighthouseResult = lighthouseIteratorResult.value;
        /* end subfunction */

        // await crawlDomain(domain.domainName, depth, followLinks, maxExecutionTime);
        domainsCrawled += 1;

        let lighthouseScore = 0;
        if (
          lighthouseResult?.insights?.lighthouseResult?.categories?.performance?.score !== undefined &&
          typeof lighthouseResult.insights.lighthouseResult.categories.performance.score === 'number'
        ) {
          lighthouseScore =
            lighthouseResult.insights.lighthouseResult.categories.performance
              .score;

          try {
            await prisma.$transaction(async (tx) => {
              // Create performance metric entry
              await tx.domainMetrics.create({
                data: {
                  domain: { connect: { id: domain.id } },
                  type: 'PERFORMANCE',
                  score: lighthouseScore,
                  timestamp: new Date(),
                  metadata: {
                    source: 'lighthouse_analysis',
                    categories: lighthouseResult.insights?.lighthouseResult.categories
                  }
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
                quickCheckScore: domainData?.quickCheckScore,
                performanceScore: lighthouseScore
              });

              // Update domain with new scores
              await tx.domain.update({
                where: { id: domain.id },
                data: {
                  performanceScore: lighthouseScore,
                  lastLighthouseAnalysis: new Date(),
                  ...(overallScore !== null && { score: overallScore })
                }
              });
            });
          } catch (error) {
            yield* lighthouseLogger.log(
              `❌ Error storing performance metrics for ${domain.domainName}: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
          }
        } else {
          yield* lighthouseLogger.log(
            `⚠️ No valid performance score available for ${domain.domainName}`
          );
        }

        await prisma.adminLog.create({
          data: {
            createdAt: new Date(),
            message: `domain ${domain.domainName
              } lighthouse (performanceScore: ${lighthouseScore * 100
              }), host: ${host}`,
            domainId: domain.id,
            userId: domain.userId,
          },
        });

        yield* lighthouseLogger.log(
          `➝  domain ${domain.domainName}: end (crawled = ${domainsCrawled})`
        );
        continue;
      } else {
        yield* lighthouseLogger.log(
          "➥  skip lighthouse: " +
          domain.domainName +
          " last lighthouse check was " +
          diffMinutes +
          " / " +
          domainInterval +
          " minutes ago"
        );
      }
    }
  }
}
