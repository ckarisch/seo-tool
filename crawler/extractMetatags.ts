import { load } from "cheerio";

export const extractMetatags = (data: any) => {
    const metatagsInfo = {
        robots: {
            index: false,
            follow: false
        }
    }
    let startTime: number;
    console.log('extracting links');
    const $ = load(data);
    const metaTags = $('meta').toArray();

    startTime = new Date().getTime();
    for (let element of metaTags) {
        const name = $(element).attr('name');
        if (name) {
            if (name == 'robots') {
                const content = $(element).attr('content');
                if (content) {
                    const info = extractRobotsInfo(content);
                    metatagsInfo.robots.follow = info.follow;
                    metatagsInfo.robots.index = info.index;
                }
            }
        }
    }
    console.log(`extracting metatags operation time: ${new Date().getTime() - startTime}`);
    return metatagsInfo;
}

function extractRobotsInfo(content: string): { index: boolean; follow: boolean } {
    const directives = content.split(',').map(d => d.trim());

    return {
        index: !directives.includes('noindex'),
        follow: !directives.includes('nofollow')
    };
}

// Example usage:
const metaTag = '<meta name="robots" content="noindex, follow">';
console.log(extractRobotsInfo(metaTag)); // { index: false, follow: true }