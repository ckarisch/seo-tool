
import axios, { AxiosError } from 'axios';
import cheerio from 'cheerio';
import { Prisma, PrismaClient } from "@prisma/client";
import { crawlNotification, crawlNotificationType } from '@/app/api/seo/domains/[domainName]/crawl/crawlNotification';


export const initialCrawl = async (targetURL: string, maxCrawlTime: number, crawlStartTime: number, sendNotification: boolean, user: any, analyzedUrl: any) => {
    let data;
    let timePassed = (new Date().getTime() - crawlStartTime);
    try {
        data = (await axios.get(targetURL, { timeout: maxCrawlTime - timePassed })).data;
    }
    catch (error: AxiosError | TypeError | any) {
        // Handle any errors
        // console.log(error);
        timePassed = (new Date().getTime() - crawlStartTime);

        if (error instanceof AxiosError) {
            if (error.code === 'ERR_BAD_REQUEST') {
                if (error.response?.status == 404 && sendNotification && user) {
                    crawlNotification(user, crawlNotificationType.Error404, analyzedUrl.normalizedLink, [analyzedUrl.normalizedLink]);
                }
                console.log('error: 404', targetURL)
            }
            else if (error.code === 'ERR_BAD_RESPONSE') {
                if (error.response?.status == 503 && sendNotification && user) {
                    crawlNotification(user, crawlNotificationType.Error503, analyzedUrl.normalizedLink, [analyzedUrl.normalizedLink]);
                }
                console.log('error:503', targetURL)
            }
        }
        else {
            throw error;
        }
    }

    return data;
}