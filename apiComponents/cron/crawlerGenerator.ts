import { env } from "process";
import { createLogger } from "../dev/logger";
import { LogEntry } from "../dev/StreamingLogViewer";
import {
  crawlDomain,
  crawlDomainResponse,
} from "@/app/api/seo/domains/[domainName]/crawl/crawlDomain";
import { CronJob, UserRole } from "@prisma/client";
import {
  domainIntervalGenerator,
  domainIntervalResponse,
} from "./domainInterval";
import { prisma } from '@/lib/prisma';

const resetCrawlTime = 3600000; // 1h
const maxDomainCrawls = 2;
const fallbackInterval = 1420; // nearly a day

export async function* crawlerGenerator(
  maxExecutionTime: number,
  host: string,
  cron: CronJob
): AsyncGenerator<LogEntry> {

  const crawlerStartTime = new Date().getTime();
  let timePassed = new Date().getTime() - crawlerStartTime;
  let timeLeft = maxExecutionTime - timePassed;

  const mainLogger = createLogger("CRAWL_START");

  let domainsCrawled = 0;

  if (env.NODE_ENV == "development") {
    yield* mainLogger.log(`cron in dev mode`);
  }

  yield* mainLogger.log("start auto crawl");
  const domains = await prisma.domain.findMany({
    orderBy: { lastCrawl: "asc" },
    select: {
      id: true,
      name: true,
      domainName: true,
      domainVerificationKey: true,
      domainVerified: true,
      lastCrawl: true,
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
  yield* mainLogger.log("domains loaded");

  if (!domains || domains.length === 0) {
    yield* mainLogger.log("no auto crawls found");
    return Response.json({ error: "no auto crawls found" }, { status: 404 });
  }

  for (const domain of domains) {
    if (domainsCrawled >= maxDomainCrawls) {
      yield* mainLogger.log(`stop crawling (crawled = ${domainsCrawled})`);
      break;
    }

    if (!domain.crawlEnabled) {
      yield* mainLogger.log(`➥  ${domain.domainName}: crawling disabled`);
      continue;
    }

    // Check for partial crawl
    const partialCrawl = await prisma.domainCrawl.findFirst({
      where: {
        domainId: domain.id,
        isPartial: true,
        status: 'partial'
      },
      orderBy: {
        startTime: 'desc'
      }
    });

    let domainInterval = fallbackInterval;
    let diffMinutes = 0;

    // Only check interval if there's no partial crawl
    if (!partialCrawl) {
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

      if (domainInterval > 0) {
        let lastCrawl = domain.lastCrawl;
        if (!lastCrawl) {
          lastCrawl = new Date("01-01-1970");
        }
        const now = new Date();
        const diff = now.getTime() - lastCrawl.getTime();
        diffMinutes = Math.floor(diff / 60000);
      } else {
        yield* mainLogger.log(
          "❗ auto crawl: " + domain.domainName + " has no crawl interval"
        );
        break;
      }
    }

    if (!domain.domainVerified) {
      if (domain.user.role === UserRole.ADMIN) {
        yield* mainLogger.log(
          `❗✅ admin mode (not verified): domain ${domain.domainName}`
        );
      } else {
        yield* mainLogger.log(
          `❌ not verified: domain ${domain.domainName} ${!partialCrawl ? `(${diffMinutes} / ${domainInterval} m)` : '(partial crawl)'}`
        );
        continue;
      }
    }
    yield* mainLogger.log(
      `✅ domain ${domain.domainName}: verified ${!partialCrawl ? `(${diffMinutes} / ${domainInterval} m)` : '(partial crawl)'}`
    );

    if (domain.crawlStatus === "crawling") {
      if (
        domain.lastCrawl &&
        Date.now() - domain.lastCrawl.getTime() > resetCrawlTime
      ) {
        console.error(
          `➝  crawling status of domain ${domain.name} (${domain.domainName}) reset`
        );
        await prisma.domain.update({
          where: { id: domain.id },
          data: { crawlStatus: "idle" },
        });
      }
      yield* mainLogger.error(
        "➝  auto crawl: " + domain.domainName + " is already crawling"
      );
      continue;
    }

    // Proceed with crawl if there's a partial crawl or if the interval check passes
    if (partialCrawl || (domain.crawlEnabled && diffMinutes >= domainInterval)) {
      yield* mainLogger.log(
        partialCrawl
          ? `➝  auto crawl: ${domain.domainName} continuing partial crawl`
          : `➝  auto crawl: ${domain.domainName} last crawl was ${diffMinutes} / ${domainInterval} minutes ago`
      );

      const depth = 2;
      const followLinks = true;

      timePassed = new Date().getTime() - crawlerStartTime;
      timeLeft = maxExecutionTime - timePassed;
      yield* mainLogger.log(`➝  domain ${domain.domainName}: start (${timeLeft}ms left)`);
      yield* mainLogger.log(`➝  name ${domain.name}`);

      /* subfunction */
      const subfunctionGenerator = crawlDomain(
        domain,
        depth,
        followLinks,
        timeLeft,
        true
      );

      let result: IteratorResult<LogEntry, crawlDomainResponse>;
      do {
        result = await subfunctionGenerator.next();
        if (!result.done) {
          yield result.value;
        }
      } while (!result.done);

      let subfunctionResult: crawlDomainResponse | undefined = undefined;
      subfunctionResult = result.value;
      /* end subfunction */

      yield* mainLogger.log("➝  " + domain.domainName + " crawl ended");

      domainsCrawled += 1;

      await prisma.adminLog.create({
        data: {
          createdAt: new Date(),
          message: `domain ${domain.domainName} crawled (score: ${(domain.score ? domain.score : 0) * 100
            }), host: ${host}`,
          domainId: domain.id,
          userId: domain.userId,
        },
      });

      yield* mainLogger.log(
        `➝  domain ${domain.domainName}: end (crawled = ${domainsCrawled})`
      );
      continue;
    } else {
      yield* mainLogger.log(
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
