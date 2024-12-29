import { analyzeLink } from "@/apiComponents/crawler/linkTools";
import { Link } from "@/app/api/seo/domains/[domainName]/crawl/crawlLinkHelper";
import { load } from "cheerio";

export const extractLinks = (data: any, url: string, targetURL: string) => {
    const links: Link[] = [];
    let startTime: number;
    const $ = load(data);
    const aElements = $('a').toArray();

    startTime = new Date().getTime();
    for (let element of aElements) {
        const href = $(element).attr('href');
        if (href) {
            const { normalizedLink } = analyzeLink(href, url);
            links.push({ path: normalizedLink, foundOnPath: targetURL, ignoreCanonical: false });
        }
    }
    return links;
}