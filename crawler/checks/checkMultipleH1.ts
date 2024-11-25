import { ErrorResult } from "../errorChecker";
import * as cheerio from 'cheerio';

/**
 * Checks for multiple H1 tags in the page
 */
export async function checkMultipleH1(html: string): Promise<ErrorResult> {
    const $ = cheerio.load(html);
    const h1Elements = $('h1');

    if (h1Elements.length <= 1) {
        return { found: false };
    }

    // Get locations/content of H1s for error details
    const h1Details = h1Elements.map((i, el) => {
        const h1Text = $(el).text().trim();
        return `"${h1Text.substring(0, 50)}${h1Text.length > 50 ? '...' : ''}"`;
    }).get();

    return {
        found: true,
        details: {
            count: h1Elements.length,
            locations: h1Details,
            message: `Found ${h1Elements.length} H1 tags: ${h1Details.join(', ')}`
        }
    };
}