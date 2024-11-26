import { ErrorResult } from "../errorChecker";
import * as cheerio from 'cheerio';

/**
 * Checks for exposed email addresses in plaintext and mailto links
 */
export async function checkEmailExposed(html: string): Promise<ErrorResult> {
    const $ = cheerio.load(html);

    // Regular expression for email matching
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

    // Find plaintext emails in the body text
    const bodyText = $('body').text();
    const plaintextEmails: string[] = bodyText.match(emailRegex) || [];

    // Find mailto links
    const mailtoLinks = $('a[href^="mailto:"]').map((_, el) => {
        const href = $(el).attr('href');
        return href?.replace('mailto:', '');
    }).get();

    // Combine and deduplicate found emails
    const allEmails = [...new Set([...plaintextEmails, ...mailtoLinks])];

    if (allEmails.length === 0) {
        return { found: false };
    }

    // Create details about found emails
    const emailDetails = allEmails.map(email => {
        const inPlaintext = plaintextEmails.includes(email);
        const inMailto = mailtoLinks.includes(email);
        return `${email} (${inPlaintext && inMailto
            ? 'plaintext & mailto'
            : inPlaintext
                ? 'plaintext'
                : 'mailto'})`;
    });

    return {
        found: true,
        details: {
            count: allEmails.length,
            locations: emailDetails,
            message: `Found ${allEmails.length} exposed email address${allEmails.length > 1 ? 'es' : ''}: ${emailDetails.join(', ')}`
        }
    };
}