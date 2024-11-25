import { prisma } from '@/lib/prisma';
import { ImplementationStatus, UserRole } from '@prisma/client';
import { checkMultipleH1 } from './checks/checkMultipleH1';

const isDevelopment = process.env.NODE_ENV?.toLowerCase() === 'development'
    || process.env.NODE_ENV?.toLowerCase() === 'local';

const isTest = isDevelopment && (
    process.env.NEXT_PUBLIC_TEST_MODE === 'true'
);

interface PageCheckParams {
    data: string;              
    domainId?: string;         
    internalLinkId?: string;   
    domainCrawlId?: string;    
    url: string;               
}

export interface ErrorResult {
    found: boolean;
    details?: {
        count?: number;
        locations?: string[];
        message?: string;
    };
}

/**
 * Determines if an error type should be executed based on its implementation status,
 * current environment, and user's role
 */
function shouldExecuteCheck(
    implementation: ImplementationStatus,
    checkUserRole: UserRole,
    userRole: UserRole
): boolean {
    // First check if implementation status allows execution
    const implementationAllowed = isTest
        ? ['TEST', 'DEVELOPMENT', 'PRODUCTION'].includes(implementation)
        : isDevelopment
            ? ['DEVELOPMENT', 'PRODUCTION'].includes(implementation)
            : implementation === 'PRODUCTION';

    if (!implementationAllowed) {
        return false;
    }

    // Then check if user has sufficient privileges
    switch (userRole) {
        case 'ADMIN':
            return true; // Admin can access all checks
        case 'PREMIUM':
            return checkUserRole !== 'ADMIN'; // Premium can access Premium and Standard checks
        case 'STANDARD':
            return checkUserRole === 'STANDARD'; // Standard can only access Standard checks
        default:
            return false;
    }
}

/**
 * Creates or updates an error log entry
 */
async function logError(
    errorType: { id: string; code: string; implementation: ImplementationStatus; userRole: UserRole },
    errorResult: ErrorResult,
    params: PageCheckParams
) {
    const now = new Date();
    const { domainId, internalLinkId, domainCrawlId, url } = params;

    // Find existing error
    const existingError = await prisma.errorLog.findFirst({
        where: {
            domainId,
            internalLinkId,
            errorType: { code: errorType.code }
        }
    });

    if (existingError) {
        // Update existing error
        await prisma.errorLog.update({
            where: { id: existingError.id },
            data: {
                occurrence: { increment: 1 },
                lastOccurrence: now
            }
        });
        return;
    }

    // Create new error log
    const createData: any = {
        errorType: { connect: { id: errorType.id } },
        domain: { connect: { id: domainId } },
        occurrence: 1,
        notified: false,
        metadata: {
            url,
            ...errorResult.details
        }
    };

    // Add optional connections
    if (internalLinkId) {
        createData.internalLink = { connect: { id: internalLinkId } };
    }
    if (domainCrawlId) {
        createData.domainCrawl = { connect: { id: domainCrawlId } };
    }

    await prisma.errorLog.create({ data: createData });

    if (isDevelopment) {
        console.log(`[${errorType.implementation}] [${errorType.userRole}] Logged error: ${errorType.code}`);
    }
}

/**
 * Main function to run all implemented error checks
 */
export async function runErrorChecks(params: PageCheckParams, userRole: UserRole = 'STANDARD') {
    const results: Record<string, ErrorResult> = {};
    
    // Skip database operations for public requests
    if (!params.domainId) {
        const multipleH1Result = await checkMultipleH1(params.data);
        return { multipleH1Result };
    }

    // Get error type configuration
    const multipleH1ErrorType = await prisma.errorType.findUnique({
        where: { code: 'MULTIPLE_H1' },
        select: {
            id: true,
            code: true,
            implementation: true,
            userRole: true
        }
    });

    // Only run check if error type exists and should be executed
    if (multipleH1ErrorType && shouldExecuteCheck(
        multipleH1ErrorType.implementation,
        multipleH1ErrorType.userRole,
        userRole
    )) {
        const multipleH1Result = await checkMultipleH1(params.data);
        results.multipleH1Result = multipleH1Result;

        if (multipleH1Result.found) {
            await logError(multipleH1ErrorType, multipleH1Result, params);
        }
    }

    return results;
}

export default runErrorChecks;