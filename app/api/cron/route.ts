import { PrismaClient } from "@prisma/client";
import { env } from "process";

export const maxDuration = 300; // in seconds
import { NextResponse } from "next/server";
import {
  generateStreamingLogViewer,
  LogEntry,
  streamLogs,
} from "@/apiComponents/dev/StreamingLogViewer";
import { createLogger } from "@/apiComponents/dev/logger";
import { crawlerGenerator } from "@/apiComponents/cron/crawlerGenerator";
import { lighthouseGenerator } from "@/apiComponents/cron/lighthouseGenerator";
import { quickAnalysisGenerator } from "@/apiComponents/cron/quickAnalysisGenerator";
import { checkTimeout } from "../seo/domains/[domainName]/crawl/crawlLinkHelper";
import { userGenerator } from "@/apiComponents/cron/userGenerator";
const prisma = new PrismaClient();

export async function GET(request: Request) {
  const host = request.headers.get("host") || "Unknown host";

  // maxExecutionTime ist 20 seconds lower than maxDuration to prevent hard timeouts
  const maxDurationInMilliseconds = maxDuration * 1000;
  const maxExecutionTime = 220000; // in milliseconds
  const cronStartTime = new Date().getTime();
  let timePassed = new Date().getTime() - cronStartTime;
  let timeLeft = maxExecutionTime - timePassed;

  const cronJobs = await prisma.cronJob.findMany();
  const sortedCronJobs = cronJobs.sort((a, b) => {
    const order = {
      'crawl': 1,
      'lighthouse': 2,
      'quick': 3,
      'user': 4
    };

    // Get order value, default to 999 for unknown types
    const orderA = order[a.type] || 999;
    const orderB = order[b.type] || 999;

    return orderA - orderB;
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const html = generateStreamingLogViewer({
        title: "Application Logs",
        styles: {
          maxHeight: "500px",
          width: "900px",
        },
      });
      controller.enqueue(encoder.encode(html));
      const cronLogger = createLogger("CRON");

      if (
        env.NODE_ENV !== "development" &&
        request.headers.get("Authorization") !==
        `Bearer ${process.env.CRON_SECRET}`
      ) {
        return Response.json({ error: "unauthorized" }, { status: 401 });
      }

      async function* cronJobGenerator(): AsyncGenerator<LogEntry> {
        yield* cronLogger.log(`start cron jobs`);
        if (!sortedCronJobs.length) {
          yield* cronLogger.error(`no cron jobs available`);
        }
        for (const cron of sortedCronJobs) {
          timePassed = new Date().getTime() - cronStartTime;
          timeLeft = maxExecutionTime - timePassed;
          if (checkTimeout(timePassed, maxExecutionTime)) {
            yield* cronLogger.log(`${cron.name}: timeout, time left: ${timeLeft}`);
            return;
          }
          yield* cronLogger.log(`${cron.name}: time left: ${timeLeft}`);

          if (cron.status === "running") {
            const timePassedSinceLastEndInHours = Math.floor(
              (Date.now() - cron.lastEnd.getTime()) / 1000 / 60 / 60
            );

            if (timePassedSinceLastEndInHours >= 24) {
              yield* cronLogger.error(`${cron.name}: found stale running job (${timePassedSinceLastEndInHours}h), resetting to idle`);
              await prisma.cronJob.update({
                where: { id: cron.id },
                data: { status: "idle" },
              });
              // Continue with normal execution after reset
            }
          }

          if (cron.acitve) {
            yield* cronLogger.log(`${cron.name}: active`);
            if (cron.status === "running") {
              yield* cronLogger.error(`${cron.name}: abort - still running`);
            } else {
              const timePassedSinceLastExecutionInMinutes = Math.floor(
                (Date.now() - cron.lastEnd.getTime()) / 1000 / 60
              );
              yield* cronLogger.log(
                `${cron.name}: time passed ${timePassedSinceLastExecutionInMinutes}m / ${cron.interval}m`
              );
              if (timePassedSinceLastExecutionInMinutes >= cron.interval) {
                yield* cronLogger.verbose(
                  `${cron.name}: starting (interval ${cron.interval})`
                );
                await prisma.cronJob.update({
                  where: { id: cron.id },
                  data: { status: "running" },
                });
                // convert ms to minutes, interval in minutes
                if (cron.type === "crawl") {
                  yield* cronLogger.log(`${cron.name}: starting crawl`);
                  await streamLogs(
                    controller,
                    encoder,
                    crawlerGenerator(timeLeft, host, cron)
                  );
                }
                if (cron.type === "lighthouse") {
                  yield* cronLogger.log(`${cron.name}: starting lighthouse`);
                  await streamLogs(
                    controller,
                    encoder,
                    lighthouseGenerator(timeLeft, host, cron)
                  );
                }
                if (cron.type === "quick") {
                  yield* cronLogger.log(
                    `${cron.name}: starting quick analysis`
                  );
                  await streamLogs(
                    controller,
                    encoder,
                    quickAnalysisGenerator(timeLeft, host, cron)
                  );
                }
                if (cron.type === "user") {
                  yield* cronLogger.log(
                    `${cron.name}: starting quick analysis`
                  );
                  await streamLogs(
                    controller,
                    encoder,
                    userGenerator(timeLeft, host, cron)
                  );
                }
                await prisma.cronJob.update({
                  where: { id: cron.id },
                  data: { status: "idle", lastEnd: new Date() },
                });
                yield* cronLogger.log(`${cron.name}: status idle`);
              }
            }
          } else {
            yield* cronLogger.log(`${cron.name}: not active`);
          }
        }
      }

      await streamLogs(controller, encoder, cronJobGenerator());

      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
