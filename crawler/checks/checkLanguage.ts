// checks/checkLanguage.ts
import { load } from "cheerio";

interface LanguageCheckResult {
    language: string | null;
}

export function checkLanguage(data: string): LanguageCheckResult {
    const $ = load(data);
    const htmlElement = $('html');
    const language = htmlElement.attr('lang');

    return {
        language: language || null
    };
}