import { PrismaClient } from '@prisma/client';
import * as cheerio from 'cheerio';

const prisma = new PrismaClient();

const isDevelopment = process.env.NODE_ENV?.toLowerCase() === 'development'
    || process.env.NODE_ENV?.toLowerCase() === 'local';

const isTest = isDevelopment && (
    process.env.NEXT_PUBLIC_TEST_MODE === 'true'
)

interface PageCheckParams {
    data: string;               // HTML content from axios
    domainId?: string;          // ID of the domain being checked
    internalLinkId?: string;    // ID of the page/internal link being checked
    domainCrawlId?: string;     // ID of the current crawl
    url: string;               // URL of the page being checked
}

interface ErrorResult {
    found: boolean;
    details?: {
        count?: number;
        locations?: string[];
        message?: string;
    };
}

/**
 * Checks for multiple H1 tags in the page
 */
async function checkMultipleH1(html: string): Promise<ErrorResult> {
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

/**
 * Logs an error to the database if it's found and properly implemented
 */
async function logError(params: {
    errorCode: string;
    domainId: string;
    internalLinkId?: string;
    domainCrawlId?: string;
    metadata?: any;
}) {
    // Check if error type exists and is properly implemented
    const errorType = await prisma.errorType.findUnique({
        where: { code: params.errorCode }
    });

    if (!errorType) return;

    // Check implementation status based on environment
    if (isTest) {
        // In test mode, accept TEST, DEVELOPMENT, and PRODUCTION implementations
        if (errorType.implementation !== 'TEST' &&
            errorType.implementation !== 'DEVELOPMENT' &&
            errorType.implementation !== 'PRODUCTION') {
            return;
        }
    } else if (isDevelopment) {
        // In development, accept both DEVELOPMENT and PRODUCTION implementations
        if (errorType.implementation !== 'DEVELOPMENT' &&
            errorType.implementation !== 'PRODUCTION') {
            return;
        }
    } else {
        // In production, only accept PRODUCTION implementations
        if (errorType.implementation !== 'PRODUCTION') {
            return;
        }
    }

    // Build the create data object conditionally
    const createData: any = {
        errorType: { connect: { id: errorType.id } },
        domain: { connect: { id: params.domainId } },
    };

    // Only add internalLink connection if ID is provided
    if (params.internalLinkId) {
        createData.internalLink = { connect: { id: params.internalLinkId } };
    }

    // Only add domainCrawl connection if ID is provided
    if (params.domainCrawlId) {
        createData.domainCrawl = { connect: { id: params.domainCrawlId } };
    }

    // Add metadata if provided
    if (params.metadata) {
        createData.metadata = params.metadata;
    }

    // Create error log with conditional connections
    await prisma.errorLog.create({
        data: createData
    });

    // Log to console in development environment
    if (isDevelopment) {
        console.log(`[${errorType.implementation}] Logged error: ${errorType.code}`);
    }
}

/**
 * Main function to run all implemented error checks
 */
export async function runErrorChecks({
    data,
    domainId,
    internalLinkId,
    domainCrawlId,
    url
}: PageCheckParams) {
    // Check for multiple H1 tags
    const multipleH1Result = await checkMultipleH1(data);

    const results = {
        multipleH1Result
    }

    if (!domainId) {
        // to not create database entries for public requests
        return results;
    }

    if (multipleH1Result.found) {
        await logError({
            errorCode: 'MULTIPLE_H1',
            domainId,
            internalLinkId,
            domainCrawlId,
            metadata: {
                url,
                ...multipleH1Result.details
            }
        });
    }
    return results;
}

export default runErrorChecks;