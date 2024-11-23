import { analyzeLink } from "@/apiComponents/crawler/linkTools";
import { load } from "cheerio";

export const extractLinks = (data: any, url: string, targetURL: string) => {
    const links: { path: string, foundOnPath: string }[] = [];
    let startTime: number;
    console.log('extracting links');
    const $ = load(data);
    const aElements = $('a').toArray();

    startTime = new Date().getTime();
    for (let element of aElements) {
        const href = $(element).attr('href');
        if (href) {
            const { normalizedLink } = analyzeLink(href, url);
            links.push({ path: normalizedLink, foundOnPath: targetURL });
        }
    }
    console.log(`extracting links operation time: ${new Date().getTime() - startTime}`);
    return links;
}