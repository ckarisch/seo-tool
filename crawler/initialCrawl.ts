
import axios, { AxiosError } from 'axios';
import { crawlNotification, crawlNotificationType } from '@/app/api/seo/domains/[domainName]/crawl/crawlNotification';
import { Domain } from '@prisma/client';


export const initialCrawl = async (domain: Domain, targetURL: string, maxCrawlTime: number, crawlStartTime: number, sendNotification: boolean, user: any, analyzedUrl: any): Promise<{
    data: any,
    finalURL: string,
    finalURLObject: any
}> => {
    let timePassed = (new Date().getTime() - crawlStartTime);
    let finalURL = targetURL;
    const urlObject = new URL(targetURL);
    let finalURLObject;
    finalURLObject = new URL(finalURL, urlObject.origin);
    let data;

    try {
        // First make a HEAD request to check for redirects
        const headResponse = await axios.head(targetURL, {
            timeout: maxCrawlTime - timePassed,
            maxRedirects: 0, // Prevent automatic redirects
            validateStatus: (status) => {
                return status >= 200 && status < 400; // Accept 3xx status codes
            }
        });

        // If we detect a redirect
        if (headResponse.status >= 300 && headResponse.status < 400) {
            finalURL = headResponse.headers.location;
            finalURLObject = new URL(finalURL, urlObject.origin);

            // If the location is a relative URL, resolve it
            if (!finalURL.startsWith('http')) {
                finalURLObject = new URL(finalURL, urlObject.origin);
                finalURL = finalURLObject.toString();
            }

            console.log(`Redirect detected from ${targetURL} to ${finalURL}`);
        }

        // Now make the actual GET request to the final URL
        timePassed = (new Date().getTime() - crawlStartTime);
        data = (await axios.get(finalURL, {
            timeout: maxCrawlTime - timePassed
        })).data;

        return {
            data,
            finalURL,
            finalURLObject
        };
    } catch (error: AxiosError | TypeError | any) {
        timePassed = (new Date().getTime() - crawlStartTime);

        if (error instanceof AxiosError) {
            if (error.code === 'ERR_BAD_REQUEST') {
                if (error.response?.status == 404 && sendNotification && user) {
                    crawlNotification(
                        user,
                        domain,
                        crawlNotificationType.Error404,
                        true,
                        domain.domainName,
                        [analyzedUrl.normalizedLink],
                        domain.score ? domain.score : 0
                    );
                }
                console.log('error: 404', finalURL);
            }
            else if (error.code === 'ERR_BAD_RESPONSE') {
                if (error.response?.status == 503 && sendNotification && user) {
                    crawlNotification(
                        user,
                        domain,
                        crawlNotificationType.Error503,
                        true,
                        domain.domainName,
                        [analyzedUrl.normalizedLink],
                        domain.score ? domain.score : 0
                    );
                }
                console.log('error: 503', finalURL);
            }
        } else {
            throw error;
        }
        return {
            data: null,
            finalURL,
            finalURLObject
        };
    }
}