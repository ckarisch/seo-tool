import axios, { AxiosError, AxiosResponse } from 'axios';
import { crawlNotification, crawlNotificationType } from '@/app/api/seo/domains/[domainName]/crawl/crawlNotification';
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

export const initialCrawl = async (
    domain: Domain,
    targetURL: string,
    maxCrawlTime: number,
    crawlStartTime: number,
    sendNotification: boolean,
    user: User & { notificationContacts: any[] } | null,
    analyzedUrl: { normalizedLink: string }
): Promise<CrawlResponse> => {
    let timePassed = (new Date().getTime() - crawlStartTime);
    let finalURL = targetURL;
    const urlObject = new URL(targetURL);
    let finalURLObject = new URL(finalURL, urlObject.origin);
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
            finalURL = headResponse.headers.location;
            finalURLObject = new URL(finalURL, urlObject.origin);

            if (!finalURL.startsWith('http')) {
                finalURLObject = new URL(finalURL, urlObject.origin);
                finalURL = finalURLObject.toString();
            }
        }

        // Make the actual GET request
        timePassed = (new Date().getTime() - crawlStartTime);
        const response = await axios.get(finalURL, {
            timeout: maxCrawlTime - timePassed,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; SEOBot/1.0; +https://example.com/bot)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });

        const endTime = Date.now();
        const loadTime = endTime - startTime;

        // Parse HTML and count resources
        const resourceMetrics = countResources(response.data);
        
        // Calculate initial performance score
        const initialScore = calculateInitialPerformanceScore(loadTime, resourceMetrics);
        
        // Calculate comprehensive performance metrics
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

            if (error.code === 'ERR_BAD_REQUEST' && error.response?.status === 404) {
                if (sendNotification && user) {
                    await crawlNotification(
                        user,
                        domain,
                        crawlNotificationType.Error404,
                        true,
                        domain.domainName,
                        [analyzedUrl.normalizedLink],
                        domain.score ?? 0
                    );
                }
            } else if (error.code === 'ERR_BAD_RESPONSE' && error.response?.status === 503) {
                if (sendNotification && user) {
                    await crawlNotification(
                        user,
                        domain,
                        crawlNotificationType.Error503,
                        true,
                        domain.domainName,
                        [analyzedUrl.normalizedLink],
                        domain.score ?? 0
                    );
                }
            }
        } else {
            errorResponse.error = {
                code: 'UNKNOWN_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }

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
    // This is a simplified estimation; real TTI would require browser metrics
    const scriptDelay = metrics.scriptCount * 50; // Assume 50ms per script
    return loadTime + scriptDelay;
}

function calculateFirstContentfulPaint(loadTime: number, metrics: ResourceMetrics): number {
    // Estimate FCP based on load time and critical resources
    // This is a simplified estimation; real FCP would require browser metrics
    const criticalResourceDelay = (metrics.styleCount * 30) + (metrics.imageCount * 20);
    return Math.min(loadTime, loadTime * 0.8 + criticalResourceDelay);
}