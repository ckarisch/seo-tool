import { load } from "cheerio";

/**
 * Extracts robots meta tag directives, defaulting to permissive behavior
 * when directives are not explicitly specified
 */
function extractRobotsInfo(content: string): { index: boolean; follow: boolean } {
    const directives = content.toLowerCase().split(',').map(d => d.trim());
    
    // Default to true (permissive) if directive is not explicitly specified
    return {
        index: !directives.includes('noindex'),
        follow: !directives.includes('nofollow')
    };
}

/**
 * Extracts metadata information from HTML content
 * @param data HTML content to analyze
 * @returns Object containing metadata information
 */
export const extractMetatags = (data: any) => {
    const metatagsInfo = {
        robots: {
            // Default to true (permissive) if no robots meta tag is found
            index: true,
            follow: true
        }
    }

    let startTime: number;
    console.log('extracting metatags');
    const $ = load(data);
    const metaTags = $('meta').toArray();

    startTime = new Date().getTime();
    for (let element of metaTags) {
        const name = $(element).attr('name');
        if (name && name.toLowerCase() === 'robots') {
            const content = $(element).attr('content');
            if (content) {
                const info = extractRobotsInfo(content);
                metatagsInfo.robots.follow = info.follow;
                metatagsInfo.robots.index = info.index;
            }
        }
    }
    
    console.log(`extracting metatags operation time: ${new Date().getTime() - startTime}`);
    return metatagsInfo;
}

// Example usage:
const metaTag = '<meta name="robots" content="noindex, follow">';
console.log(extractRobotsInfo(metaTag)); // { index: false, follow: true }