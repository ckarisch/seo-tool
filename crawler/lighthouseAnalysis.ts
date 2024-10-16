import { analyzeLink } from "@/apiComponents/crawler/linkTools";
import { createLogger, LogEntry, Logger } from "@/apiComponents/dev/logger";
import { Domain, Prisma, PrismaClient } from "@prisma/client";

export interface lighthouseAnalysisResponse {
    error: boolean,
    insights?: lighthouseResultTpe
}

export type lighthouseResultTpe = {
    lighthouseResult: {
        fullPageScreenshot: {
            screenshot: {
                data: string
            }
        },
        categories: {
            performance: {
                id: string,
                title: string,
                score: number
            }
        }
    }
}

async function getPageSpeedInsights(httpLink: string) {
    const apiKey = process.env.PAGE_SPEED_INSIGHTS_API_KEY;
    if (!apiKey) {
        throw new Error('api key undefined');
    }
    if (!httpLink.startsWith('http')) {
        throw new Error('no valid http link provided');
    }
    const response = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(httpLink)}&key=${encodeURIComponent(apiKey)}`);

    if (!response.ok) {
        throw new Error('Failed to fetch PageSpeed Insights');
    }

    const data: lighthouseResultTpe = await response.json();
    return data;
}

export async function* lighthouseAnalysis(
    prisma: PrismaClient,
    domain: Domain
): AsyncGenerator<LogEntry, lighthouseAnalysisResponse, unknown> {

    const logger = createLogger('Lighthoues ' + domain.domainName);

    yield* logger.log('Lighthouse started');
    const requestStartTime = new Date().getTime();

    let response: lighthouseAnalysisResponse = {
        error: false
    }

    const analyzedLink = analyzeLink(domain.domainName, domain.domainName);
    const { normalizedHttpsLink } = analyzedLink;
    yield* logger.log(JSON.stringify(analyzedLink));

    if (!normalizedHttpsLink) {
        yield* logger.log(`Lighthouse error: domain not valid (no https link possible)`);
        response.error = true;
        return response;
    }

    const insights = await getPageSpeedInsights(normalizedHttpsLink);
    const image = insights.lighthouseResult.fullPageScreenshot.screenshot.data;
    const performanceScore = insights.lighthouseResult.categories.performance.score;
    yield* logger.log(`PerformanceScore: ${performanceScore}`);
    if (image && performanceScore) {
        await prisma.domain.update({ where: { id: domain.id }, data: { image, performanceScore, lastLighthouseAnalysis: new Date() } });
    }
    else {
        yield* logger.log(`Lighthouse error: screenshot not present`);
        response.error = true;
        return response;
    }

    yield* logger.log(`Lighthouse stopped: ${new Date().getTime() - requestStartTime}`);

    return response;
}