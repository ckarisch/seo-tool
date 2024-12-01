import { load } from "cheerio";

interface CanonicalCheckResult {
    hasCanonical: boolean;
    canonicalUrl?: string | null;
}

export function checkCanonical(data: string): CanonicalCheckResult {
    const $ = load(data);
    const canonicalElement = $('link[rel="canonical"]');
    const canonicalUrl = canonicalElement.attr('href');

    return {
        hasCanonical: !!canonicalUrl,
        canonicalUrl
    };
}