import { prisma } from '@/lib/prisma';
import { ImplementationStatus, UserRole } from '@prisma/client';
import { checkMultipleH1 } from './checks/checkMultipleH1';
import { checkEmailExposed } from './checks/checkEmailExposed';

export const isDevelopment = process.env.NODE_ENV?.toLowerCase() === 'development'
    || process.env.NODE_ENV?.toLowerCase() === 'local';

export const isTest = isDevelopment && (
    process.env.NEXT_PUBLIC_TEST_MODE === 'true'
);

export enum HttpErrorCode {
    ERROR_404 = 'ERROR_404',
    ERROR_503 = 'ERROR_503',
    ERROR_500 = 'ERROR_500',
    ERROR_403 = 'ERROR_403',
    ERROR_301 = 'ERROR_301',
    ERROR_UNKNOWN = 'ERROR_UNKNOWN'
}

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
        statusCode?: number;
        stack?: string;
    };
}

export interface ErrorCheckSummary {
    errorCount: number;
    warningCount: number;
    details?: {
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
        console.log(`Skipping check - Implementation status '${implementation}' not allowed in current environment (${isTest ? 'test' : isDevelopment ? 'development' : 'production'})`);
        return false;
    }

    // Then check if user has sufficient privileges
    const hasPermission = (() => {
        switch (userRole) {
            case 'ADMIN':
                return true;
            case 'PREMIUM':
                return checkUserRole !== 'ADMIN';
            case 'STANDARD':
                return checkUserRole === 'STANDARD';
            default:
                return false;
        }
    })();

    if (!hasPermission) {
        console.log(`Skipping check - User role '${userRole}' does not have permission for check requiring '${checkUserRole}' role`);
    }

    return hasPermission;
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
                lastOccurrence: now,
                metadata: {
                    url,
                    ...errorResult.details
                }
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
    console.log(`[${errorType.implementation}] [${errorType.userRole}] Logged error: ${errorType.code}`);
}

/**
 * Gets error message based on HTTP error code
 */
function getHttpErrorMessage(errorCode: HttpErrorCode): string {
    switch (errorCode) {
        case HttpErrorCode.ERROR_404:
            return 'Page not found (404)';
        case HttpErrorCode.ERROR_503:
            return 'Service unavailable (503)';
        case HttpErrorCode.ERROR_500:
            return 'Internal server error (500)';
        case HttpErrorCode.ERROR_403:
            return 'Forbidden access (403)';
        case HttpErrorCode.ERROR_301:
            return 'Permanent redirect chain (301)';
        case HttpErrorCode.ERROR_UNKNOWN:
            return 'Unknown HTTP error';
    }
}

/**
 * Logs HTTP errors to the error log
 */
export async function logHttpError(
    errorCode: HttpErrorCode,
    params: PageCheckParams,
    userRole: UserRole = 'STANDARD'
): Promise<void> {
    if (!params.domainId) return; // Skip if no domain ID (public request)

    const errorType = await prisma.errorType.findFirst({
        where: { code: errorCode },
        select: {
            id: true,
            code: true,
            implementation: true,
            userRole: true
        }
    });

    if (!errorType) {
        console.error(`Error type not found for code: ${errorCode}`);
        return;
    }

    if (!shouldExecuteCheck(errorType.implementation, errorType.userRole, userRole)) {
        return;
    }

    const errorResult: ErrorResult = {
        found: true,
        details: {
            message: getHttpErrorMessage(errorCode),
            locations: [params.url],
            ...params.data ? JSON.parse(params.data) : {}
        }
    };

    await logError(errorType, errorResult, params);
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
                warningCount: warnings.length,
                details: {
                    errors,
                    warnings
                }
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

    // Get existing unresolved errors for this page
    const existingErrors = await prisma.errorLog.findMany({
        where: {
            domainId: params.domainId,
            internalLinkId: params.internalLinkId,
        },
        include: {
            errorType: true
        }
    });
    
    // Filter for unresolved errors in JavaScript
    const unresolvedErrors = existingErrors.filter(error => !error.resolvedAt);

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
                    } else {
                        // If error not found, resolve any existing errors of this type
                        const unresolvedError = unresolvedErrors.find(
                            error => error.errorType.code === 'MULTIPLE_H1'
                        );
                        if (unresolvedError) {
                            await prisma.errorLog.update({
                                where: { id: unresolvedError.id },
                                data: {
                                    resolvedAt: new Date(),
                                    resolutionNotified: false // Reset notification flag for resolution
                                }
                            });
                        }
                    }
                    break;
                case 'EMAIL_EXPOSED':
                    result = await checkEmailExposed(params.data);
                    results.emailExposedResult = result;
                    if (result.found) {
                        errorType.severity === 'HIGH' || errorType.severity === 'CRITICAL'
                            ? errors.push(errorType.code)
                            : warnings.push(errorType.code);
                    } else {
                        // If error not found, resolve any existing errors of this type
                        const unresolvedError = unresolvedErrors.find(
                            error => error.errorType.code === 'EMAIL_EXPOSED'
                        );
                        if (unresolvedError) {
                            await prisma.errorLog.update({
                                where: { id: unresolvedError.id },
                                data: {
                                    resolvedAt: new Date(),
                                    resolutionNotified: false // Reset notification flag for resolution
                                }
                            });
                        }
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