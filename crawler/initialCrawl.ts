import axios, { AxiosError, AxiosResponse } from 'axios';
import { Domain, User } from '@prisma/client';
import { load } from 'cheerio';

interface PerformanceMetrics {
    loadTime: number;
    timeToInteractive?: number;
    firstContentfulPaint?: number;
    performanceScore?: number;
    totalResources?: number;
    totalBytes?: number;
}

interface CrawlError {
    code: string;
    message: string;
    status?: number;
}

interface CrawlResponse {
    data: string | null;
    finalURL: string;
    finalURLObject: URL;
    performanceMetrics: PerformanceMetrics;
    error?: CrawlError;
    headers?: Record<string, string>;
}

interface ResourceMetrics {
    scriptCount: number;
    styleCount: number;
    imageCount: number;
    totalResources: number;
}

const formatFinalUrl = (urlObj: URL): string => {
    let formattedUrl = urlObj.hostname;

    // Add port if it exists and isn't the default port
    if (urlObj.port) {
        formattedUrl += `:${urlObj.port}`;
    }

    // Add pathname, but ensure it starts with '/'
    formattedUrl += urlObj.pathname || '/';

    // Add search params if they exist
    if (urlObj.search) {
        formattedUrl += urlObj.search;
    }

    return formattedUrl;
};

export const initialCrawl = async (
    domain: Partial<Domain>,
    targetURL: string,
    maxCrawlTime: number,
    crawlStartTime: number,
    user: User & { notificationContacts: any[] } | null,
    analyzedUrl: { normalizedLink: string }
): Promise<CrawlResponse> => {
    let timePassed = (new Date().getTime() - crawlStartTime);
    const urlObject = new URL(targetURL);
    let finalURLObject = new URL(targetURL);
    let finalURL = formatFinalUrl(finalURLObject);
    let responseHeaders: Record<string, string> = {};
    let startTime = Date.now();

    try {
        // First make a HEAD request to check for redirects
        const headResponse = await axios.head(targetURL, {
            timeout: maxCrawlTime - timePassed,
            maxRedirects: 0,
            validateStatus: (status) => status >= 200 && status < 400,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0; +https://example.com/bot)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });

        responseHeaders = headResponse.headers as Record<string, string>;

        // Handle redirects
        if (headResponse.status >= 300 && headResponse.status < 400) {
            const redirectUrl = headResponse.headers.location;
            if (!redirectUrl.startsWith('http')) {
                finalURLObject = new URL(redirectUrl, urlObject.origin);
            } else {
                finalURLObject = new URL(redirectUrl);
            }
            finalURL = formatFinalUrl(finalURLObject);
        }

        // Make the actual GET request
        timePassed = (new Date().getTime() - crawlStartTime);
        const response = await axios.get(`${urlObject.protocol}//${finalURL}`, {
            timeout: maxCrawlTime - timePassed,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0; +https://example.com/bot)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });

        // Rest of the function remains the same...
        const endTime = Date.now();
        const loadTime = endTime - startTime;
        const resourceMetrics = countResources(response.data);
        const initialScore = calculateInitialPerformanceScore(loadTime, resourceMetrics);

        const performanceMetrics: PerformanceMetrics = {
            loadTime,
            totalResources: resourceMetrics.totalResources,
            totalBytes: parseInt(response.headers['content-length'] || '0'),
            performanceScore: initialScore,
            timeToInteractive: calculateTimeToInteractive(loadTime, resourceMetrics),
            firstContentfulPaint: calculateFirstContentfulPaint(loadTime, resourceMetrics)
        };

        return {
            data: response.data,
            finalURL,
            finalURLObject,
            performanceMetrics,
            headers: responseHeaders
        };

    } catch (error) {
        const errorResponse: CrawlResponse = {
            data: null,
            finalURL,
            finalURLObject,
            performanceMetrics: {
                loadTime: Date.now() - startTime
            },
            headers: responseHeaders
        };

        if (error instanceof AxiosError) {
            errorResponse.error = {
                code: error.code || 'UNKNOWN_ERROR',
                message: error.message,
                status: error.response?.status
            };
        } else {
            errorResponse.error = {
                code: 'UNKNOWN_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }

        console.log('errorResponse in initialCrawl:');
        console.log(JSON.stringify(errorResponse));

        return errorResponse;
    }
};

function countResources(html: string): ResourceMetrics {
    const $ = load(html);

    const scriptCount = $('script').length;
    const styleCount = $('link[rel="stylesheet"]').length + $('style').length;
    const imageCount = $('img').length;
    const iframeCount = $('iframe').length;
    const fontCount = $('link[rel="preload"][as="font"]').length;

    return {
        scriptCount,
        styleCount,
        imageCount,
        totalResources: scriptCount + styleCount + imageCount + iframeCount + fontCount
    };
}

function calculateInitialPerformanceScore(loadTime: number, metrics: ResourceMetrics): number {
    // Base score starts at 100
    let score = 100;

    // Deduct points based on load time
    if (loadTime > 3000) { // Over 3 seconds
        score -= Math.min(30, Math.floor((loadTime - 3000) / 100));
    }

    // Deduct points for excessive resources
    if (metrics.totalResources > 50) {
        score -= Math.min(20, Math.floor((metrics.totalResources - 50) / 5));
    }
    if (metrics.scriptCount > 15) {
        score -= Math.min(15, metrics.scriptCount - 15);
    }

    // Normalize score to 0-1 range
    return Math.max(0, Math.min(100, score)) / 100;
}

function calculateTimeToInteractive(loadTime: number, metrics: ResourceMetrics): number {
    // Estimate TTI based on load time and script count
    const scriptDelay = metrics.scriptCount * 50; // Assume 50ms per script
    return loadTime + scriptDelay;
}

function calculateFirstContentfulPaint(loadTime: number, metrics: ResourceMetrics): number {
    // Estimate FCP based on load time and critical resources
    const criticalResourceDelay = (metrics.styleCount * 30) + (metrics.imageCount * 20);
    return Math.min(loadTime, loadTime * 0.8 + criticalResourceDelay);
}