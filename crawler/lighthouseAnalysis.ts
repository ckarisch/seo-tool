import { analyzeLink } from "@/apiComponents/crawler/linkTools";
import { createLogger, LogEntry, Logger } from "@/apiComponents/dev/logger";
import { PartialDomainWithDomainName } from "@/interfaces/domain";
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

async function getPageSpeedInsights(httpLink: string): Promise<lighthouseResultTpe> {
    const apiKey = process.env.PAGE_SPEED_INSIGHTS_API_KEY;
    if (!apiKey) {
        throw new Error('PageSpeed Insights API key is undefined');
    }
    if (!httpLink.startsWith('http')) {
        throw new Error('No valid HTTP link provided');
    }

    try {
        const response = await fetch(
            `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(httpLink)}&key=${encodeURIComponent(apiKey)}`,
            {
                // Add timeout to prevent hanging
                signal: AbortSignal.timeout(30000) // 30 second timeout
            }
        );

        if (!response.ok) {
            throw new Error(`PageSpeed Insights API returned status ${response.status}: ${response.statusText}`);
        }

        const data: lighthouseResultTpe = await response.json();

        if (!data?.lighthouseResult) {
            throw new Error('Invalid or empty response from PageSpeed Insights API');
        }

        return data;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to fetch PageSpeed Insights: ${error.message}`);
        }
        throw new Error('Failed to fetch PageSpeed Insights: Unknown error');
    }
}

export async function* lighthouseAnalysis(
    prisma: PrismaClient,
    domain: PartialDomainWithDomainName
): AsyncGenerator<LogEntry, lighthouseAnalysisResponse, unknown> {

    const logger = createLogger('Lighthouse ' + domain.domainName);

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

    try {
        const insights = await getPageSpeedInsights(normalizedHttpsLink);

        // Check if we have valid insights data
        if (!insights?.lighthouseResult?.categories?.performance?.score) {
            yield* logger.log('Lighthouse error: Invalid insights data structure');
            response.error = true;
            return response;
        }

        const image = insights.lighthouseResult.fullPageScreenshot?.screenshot?.data;
        if (!image) {
            yield* logger.log(`Lighthouse error: screenshot not present`);
            response.error = true;
            return response;
        }

        // calculate performanceScore and average it
        let performanceScore = (
            insights.lighthouseResult.categories.performance.score +
            (domain.performanceScore ?? insights.lighthouseResult.categories.performance.score)
        ) / 2;

        if (performanceScore === 0.005) {
            // if performanceScore falls from 1% to 0%, set it to 0%
            performanceScore = 0;
        }

        yield* logger.log(`PerformanceScore: ${performanceScore}`);

        await prisma.domain.update({
            where: { id: domain.id },
            data: {
                image,
                performanceScore,
                lastLighthouseAnalysis: new Date()
            }
        });

        yield* logger.log(`Lighthouse stopped: ${new Date().getTime() - requestStartTime}`);

        response.insights = insights;
        return response;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        yield* logger.log(`Lighthouse error: Failed to fetch or process PageSpeed Insights - ${errorMessage}`);

        // Update domain to indicate failed analysis
        await prisma.domain.update({
            where: { id: domain.id },
            data: {
                lastLighthouseAnalysis: new Date(),
                // Optionally, don't update performance score on error to keep the last valid score
            }
        });

        response.error = true;
        return response;
    }
}