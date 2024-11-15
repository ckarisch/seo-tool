import { env } from "process";
import { createLogger } from "../dev/logger";
import { LogEntry } from "../dev/StreamingLogViewer";
import { CronJob, PrismaClient } from "@prisma/client";
import {
  lighthouseAnalysis,
  lighthouseAnalysisResponse,
} from "@/crawler/lighthouseAnalysis";
import {
  domainIntervalGenerator,
  domainIntervalResponse,
} from "./domainInterval";
import { checkTimeout } from "@/app/api/seo/domains/[domainName]/crawl/crawlLinkHelper";
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

  yield* lighthouseLogger.log("start auto crawl");
  const domains = await prisma.domain.findMany({
    orderBy: { lastLighthouseAnalysis: "asc" },
    include: { user: { select: { role: true } } },
  });

  if (!domains || domains.length === 0) {
    yield* lighthouseLogger.log("no auto crawls found");
    return Response.json({ error: "no auto crawls found" }, { status: 404 });
  }

  for (const domain of domains) {
    timePassed = new Date().getTime() - lighthouseStartTime;
    timeLeft = maxExecutionTime - timePassed;
    if (checkTimeout(timePassed, maxExecutionTime)) {
      yield* lighthouseLogger.log(`timeout`);
      return;
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
      if (domain.user.role === "admin") {
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
          lighthouseResult.insights &&
          lighthouseResult.insights.lighthouseResult.categories.performance
        ) {
          lighthouseScore =
            lighthouseResult.insights.lighthouseResult.categories.performance
              .score;
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
}
