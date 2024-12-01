import { PrismaClient, UserRole } from "@prisma/client";
import { AxiosError } from "axios";
import { HttpErrorCode, isDevelopment, isTest, logHttpError } from "../errorChecker";
import { linkType, pushLink } from "@/app/api/seo/domains/[domainName]/crawl/crawlLinkHelper";

interface HttpErrorHandlingParams {
    error: AxiosError;
    prisma: PrismaClient;
    domainId: string | null;
    domainCrawlId: string | undefined;
    normalizedLink: string;
    foundOnPath: string;
    requestUrl: string;
    requestTime: number;
    userRole: UserRole;
    pushLinksToDomain: boolean;
}

interface HttpErrorResult {
    internalLinkId?: string;
    errorCode?: HttpErrorCode;
    shouldSkip: boolean;
    errorLogged: boolean;
}

/**
 * Handles HTTP errors during crawling, manages permissions, and handles link pushing
 * @returns Object containing results of error handling operations
 */
export async function handleHttpError({
    error,
    prisma,
    domainId,
    domainCrawlId,
    normalizedLink,
    foundOnPath,
    requestUrl,
    requestTime,
    userRole,
    pushLinksToDomain
}: HttpErrorHandlingParams): Promise<HttpErrorResult> {
    // Determine error type based on status code
    const errorCode = error.response?.status === 404 
        ? HttpErrorCode.ERROR_404 
        : error.response?.status === 503 
            ? HttpErrorCode.ERROR_503 
            : undefined;

    if (!errorCode) {
        return { shouldSkip: true, errorLogged: false };
    }

    // Get error type configuration
    const errorType = await prisma.errorType.findFirst({
        where: { code: errorCode },
        select: {
            implementation: true,
            userRole: true
        }
    });

    if (!errorType) {
        if (isDevelopment) {
            console.log(`Error type not found for code: ${errorCode}`);
        }
        return { shouldSkip: true, errorLogged: false };
    }

    // Check implementation status permission
    const implementationAllowed = isTest
        ? ['TEST', 'DEVELOPMENT', 'PRODUCTION'].includes(errorType.implementation)
        : isDevelopment
            ? ['DEVELOPMENT', 'PRODUCTION'].includes(errorType.implementation)
            : errorType.implementation === 'PRODUCTION';

    // Check user role permission
    const hasPermission = (() => {
        switch (userRole) {
            case 'ADMIN':
                return true;
            case 'PREMIUM':
                return errorType.userRole !== 'ADMIN';
            case 'STANDARD':
                return errorType.userRole === 'STANDARD';
            default:
                return false;
        }
    })();

    // Log skip reasons in development
    if (!implementationAllowed || !hasPermission) {
        if (isDevelopment) {
            if (!implementationAllowed) {
                console.log(`Skipping error check and push - Implementation status '${errorType.implementation}' not allowed in current environment (${isTest ? 'test' : isDevelopment ? 'development' : 'production'})`);
            }
            if (!hasPermission) {
                console.log(`Skipping error check and push - User role '${userRole}' does not have permission for check requiring '${errorType.userRole}' role`);
            }
        }
        return { shouldSkip: true, errorLogged: false };
    }

    // Push link if permissions allow
    let internalLinkId: string | undefined;
    if (pushLinksToDomain && domainId) {
        const internalLink = await pushLink(
            prisma,
            foundOnPath,
            normalizedLink,
            false,
            domainId,
            linkType.page,
            requestTime,
            null
        );
        internalLinkId = internalLink.id;
    }

    // Log error if we have necessary IDs
    let errorLogged = false;
    if (domainId && internalLinkId) {
        await logHttpError(
            errorCode,
            {
                data: '',
                domainId,
                internalLinkId,
                domainCrawlId,
                url: requestUrl
            },
            userRole
        );
        errorLogged = true;
    }

    return {
        internalLinkId,
        errorCode,
        shouldSkip: false,
        errorLogged
    };
}