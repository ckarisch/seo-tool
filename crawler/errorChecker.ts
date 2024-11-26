import { prisma } from '@/lib/prisma';
import { ImplementationStatus, UserRole } from '@prisma/client';
import { checkMultipleH1 } from './checks/checkMultipleH1';
import { checkEmailExposed } from './checks/checkEmailExposed';

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

export interface ErrorCheckSummary {
    errorCount: number;     // Count of different error types found
    warningCount: number;   // Count of different warning types found
    details?: {            // Only included for authenticated users
        errors?: string[];
        warnings?: string[];
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
export async function runErrorChecks(
    params: PageCheckParams, 
    userRole: UserRole = 'STANDARD'
): Promise<{ results: Record<string, ErrorResult>, summary: ErrorCheckSummary }> {
    const results: Record<string, ErrorResult> = {};
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Skip database operations for public requests
    if (!params.domainId) {
        const multipleH1Result = await checkMultipleH1(params.data);
        const emailExposedResult = await checkEmailExposed(params.data);
        
        if (multipleH1Result.found) errors.push('MULTIPLE_H1');
        if (emailExposedResult.found) errors.push('EMAIL_EXPOSED');

        return {
            results: { multipleH1Result, emailExposedResult },
            summary: {
                errorCount: errors.length,
                warningCount: warnings.length
            }
        };
    }

    // Get error type configurations
    const errorTypes = await prisma.errorType.findMany({
        where: {
            code: {
                in: ['MULTIPLE_H1', 'EMAIL_EXPOSED']
            }
        },
        select: {
            id: true,
            code: true,
            implementation: true,
            userRole: true,
            severity: true
        }
    });

    // Run checks based on error type configurations
    for (const errorType of errorTypes) {
        if (shouldExecuteCheck(errorType.implementation, errorType.userRole, userRole)) {
            let result: ErrorResult;

            switch (errorType.code) {
                case 'MULTIPLE_H1':
                    result = await checkMultipleH1(params.data);
                    results.multipleH1Result = result;
                    if (result.found) {
                        errorType.severity === 'HIGH' || errorType.severity === 'CRITICAL' 
                            ? errors.push(errorType.code)
                            : warnings.push(errorType.code);
                    }
                    break;
                case 'EMAIL_EXPOSED':
                    result = await checkEmailExposed(params.data);
                    results.emailExposedResult = result;
                    if (result.found) {
                        errorType.severity === 'HIGH' || errorType.severity === 'CRITICAL'
                            ? errors.push(errorType.code)
                            : warnings.push(errorType.code);
                    }
                    break;
            }

            if (result!.found) {
                await logError(errorType, result!, params);
            }
        }
    }

    const summary: ErrorCheckSummary = {
        errorCount: errors.length,
        warningCount: warnings.length
    };

    // Only include detailed error/warning information for authenticated users
    if (params.domainId) {
        summary.details = {
            errors,
            warnings
        };
    }

    return { results, summary };
}

export default runErrorChecks;