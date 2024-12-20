import { ErrorLog, Prisma, Severity } from '@prisma/client';
import { consolidatedCrawlNotification, crawlNotificationType } from '@/mail/EnhancedEmailer';
import { prisma } from '@/lib/prisma';
import { error } from 'console';
import { JsonValue } from '@prisma/client/runtime/library';

interface QuickAnalysisMetrics {
    loadTime: number;
    resourceCount: number;
    errors: number;
    warnings: number;
    performanceScore: number | null;
    seoScore: number | null;
    accessibility: null;
    bestPractices: null;
    timeToInteractive: number | null;
    firstContentfulPaint: number | null;
    totalBytes: number | null;
    scriptCount: number | null;
    styleCount: number | null;
    imageCount: number | null;
    totalResources: number | null;
}

interface NotificationItem {
    type: crawlNotificationType;
    errorPresent: boolean;
    urls: string[];
    additionalData?: any;
}

interface ErrorLogWithDetails {
    id: string;
    createdAt: Date;
    resolvedAt: Date | null;
    metadata: Prisma.JsonValue;
    errorType: {
        code: string;
        name: string;
        category: string;
        severity: Severity;
    };
    internalLink?: {
        path: string;
    } | null;
}

// Helper function to aggregate errors by type and page
async function aggregateErrorLogs(domainId: string, onlyNotNotified = false) {
    const where: {
        domainId: string,
        notified?: boolean
    } = {
        domainId: domainId
    }

    if (onlyNotNotified) {
        where.notified = false;
    }
    const approach3 = await prisma.errorLog.findMany({
        where,
        include: {
            errorType: true,
            internalLink: true,
        },
    });
    // If we find errors, use approach 3 and filter in memory
    const errors = approach3.filter(error => error.resolvedAt === null);

    // Create a map using composite key of errorType.code + page path
    const errorMap = new Map<string, typeof errors[0]>();

    errors.forEach(error => {
        if (!error.errorType) {
            console.log('Error without errorType:', error.id);
            return;
        }

        const pagePath = error.internalLink?.path || 'unknown';
        const key = `${error.errorType.code}_${pagePath}`;

        // Only keep the most recent error of each type per page
        if (!errorMap.has(key)) {
            errorMap.set(key, { ...error });
        }
    });

    const result = Array.from(errorMap.values());

    return result;
}

function calculateScore(metrics: QuickAnalysisMetrics, errors: ErrorLogWithDetails[]): number {
    let score = 0;
    let factors = 0;
    const useQuickCheckPerformanceMetrics = false;

    // Base metrics scoring
    if (metrics.performanceScore !== null) {
        score += metrics.performanceScore;
        factors++;
    }
    if (metrics.seoScore !== null) {
        score += metrics.seoScore;
        factors++;
    }

    // Performance metrics scoring
    if (useQuickCheckPerformanceMetrics) {
        if (metrics.timeToInteractive !== null && metrics.loadTime > 0) {
            const ttiScore = Math.max(0, 1 - (metrics.timeToInteractive / 5000));
            score += ttiScore;
            factors++;
        }

        if (metrics.firstContentfulPaint !== null && metrics.loadTime > 0) {
            const fcpScore = Math.max(0, 1 - (metrics.firstContentfulPaint / 2000));
            score += fcpScore;
            factors++;
        }

        if (metrics.totalResources !== null && metrics.totalBytes !== null) {
            const resourceScore = Math.max(0, 1 - (metrics.totalResources / 100)) *
                Math.max(0, 1 - (metrics.totalBytes / (2 * 1024 * 1024)));
            score += resourceScore;
            factors++;
        }
    }

    // Error-based scoring
    if (errors.length > 0) {
        const errorScore = calculateErrorScore(errors);
        score += errorScore;
        factors++;
    }

    // Fallback scoring if no other factors
    if (factors === 0) {
        const baseScore = 100;
        const errorPenalty = metrics.errors * 10;
        const warningPenalty = metrics.warnings * 2;
        return Math.max(0, Math.min(100, baseScore - errorPenalty - warningPenalty)) / 100;
    }

    return score / factors;
}

// Helper function to calculate error-based score
function calculateErrorScore(errors: ErrorLogWithDetails[]): number {
    const severityWeights: Record<Severity, number> = {
        CRITICAL: 1.0,
        HIGH: 0.7,
        MEDIUM: 0.4,
        LOW: 0.2,
        INFO: 0.1
    };

    let totalPenalty = 0;
    errors.forEach(error => {
        const weight = severityWeights[error.errorType.severity];
        totalPenalty += weight;
    });

    // Calculate score where 0 errors = 1.0 and more errors = lower score
    const baseScore = 1.0;
    const maxPenalty = 1.0;
    const normalizedPenalty = Math.min(maxPenalty, totalPenalty / 10); // Normalize penalty
    return Math.max(0, baseScore - normalizedPenalty);
}

interface DomainWithDetails {
    id: string;
    domainName: string;
}

// Modified notification preparation function
async function prepareErrorNotifications(
    domainId: string,
    domain: DomainWithDetails,
    notifications: NotificationItem[]
): Promise<NotificationItem[]> {
    const aggregatedErrors = await aggregateErrorLogs(domainId, true);

    // Group errors by severity for notification
    const errorsBySeverity = aggregatedErrors.reduce((acc, error) => {
        const severity = error.errorType.severity;
        if (!acc[severity]) {
            acc[severity] = [];
        }
        acc[severity].push({
            type: error.errorType.code,
            message: error.errorType.name,
            url: error.internalLink?.path ? `https://${domain.domainName}${error.internalLink.path}` : domain.domainName,
            category: error.errorType.category,
            metadata: error.metadata
        });
        return acc;
    }, {} as Record<Severity, Array<{
        type: string;
        message: string;
        url: string;
        category: string;
        metadata: Prisma.JsonValue;
    }>>);

    // Add consolidated error notifications
    Object.entries(errorsBySeverity).forEach(([severity, errors]) => {
        notifications.push({
            type: crawlNotificationType.GeneralError,
            errorPresent: true,
            urls: errors.map(e => e.url),
            additionalData: {
                severity,
                errors: errors.map(e => ({
                    type: e.type,
                    message: e.message,
                    category: e.category,
                    metadata: e.metadata
                }))
            }
        });
    });

    return notifications;
}

export {
    aggregateErrorLogs,
    calculateScore,
    calculateErrorScore,
    prepareErrorNotifications,
    type QuickAnalysisMetrics,
    type NotificationItem,
    type ErrorLogWithDetails
};

interface ErrorChange {
    added: Array<{
        id: string;
        type: string;
        message: string;
        url: string;
        severity: string;
        category: string;
    }>;
    resolved: Array<{
        id: string;
        type: string;
        message: string;
        url: string;
        severity: string;
        category: string;
    }>;
}

export async function checkErrorChanges(
    currentErrors: Prisma.ErrorLogGetPayload<{
        include: {
            errorType: true,
            internalLink: true
        }
    }>[], domainId: string, domain: any): Promise<ErrorChange> {

    // Get resolved errors that need notification
    const resolvedErrorLogs = await prisma.errorLog.findMany({
        where: {
            domainId: domainId,
            notified: true,
        },
        include: {
            errorType: true,
            internalLink: true
        }
    });

    // Filter resolved errors in JavaScript
    const filteredResolvedErrors = resolvedErrorLogs.filter(error =>
        !!error.resolvedAt &&
        !error.resolutionNotified
    );

    // Convert current errors to a comparable format
    const currentErrorMap = new Map(
        currentErrors.map(error => {
            const url = error.internalLink?.path; // internalLink.path includes domain
            if (!error.internalLink) {
                console.log('internalLink not found');
            }
            else if (!error.internalLink.path) {
                console.log('internalLink path not found');
            }
            const errorMetadata: JsonValue & { url?: string } = error.metadata ?? { url: undefined };
            return [
                `${error.errorType.code}_${url}`,
                {
                    id: error.id,
                    type: error.errorType.code,
                    message: error.errorType.name,
                    url: url ?? errorMetadata.url ?? '',
                    severity: error.errorType.severity,
                    category: error.errorType.category
                }
            ];
        })
    );

    // Find new errors (present in current but not in previous)
    const newErrors = Array.from(currentErrorMap.entries())
        .map(([_, error]) => error);

    // Format resolved errors
    const resolvedErrors = filteredResolvedErrors.map(error => {
        const url = error.internalLink?.path; // internalLink.path includes domain
        if (!error.internalLink) {
            console.log('internalLink not found (resolved error)');
        }
        else if (!error.internalLink.path) {
            console.log('internalLink path not found (resolved error)');
        }
        const errorMetadata: JsonValue & { url?: string } = error.metadata ?? { url: undefined };
        return {
            id: error.id,
            type: error.errorType.code,
            message: error.errorType.name,
            url: url ?? errorMetadata.url ?? '',
            severity: error.errorType.severity,
            category: error.errorType.category
        }
    });

    console.log('Current errors:', currentErrorMap.size);
    console.log('New errors:', newErrors.length);
    console.log('Resolved errors:', resolvedErrors.length);

    return {
        added: newErrors,
        resolved: resolvedErrors
    };
}

export async function getErrorChangeNotifications(
    changes: ErrorChange
) {
    if (changes.added.length === 0 && changes.resolved.length === 0) {
        return;
    }

    // Prepare notifications array
    const notifications: NotificationItem[] = [];

    // Add notifications for new errors
    if (changes.added.length > 0) {
        // Group the new errors by severity
        const errorsBySeverity = changes.added.reduce((acc, error) => {
            if (!acc[error.severity]) {
                acc[error.severity] = [];
            }
            acc[error.severity].push(error);
            return acc;
        }, {} as Record<string, typeof changes.added>);

        // Create notifications for each severity group
        Object.entries(errorsBySeverity).forEach(([severity, errors]) => {
            notifications.push({
                type: crawlNotificationType.NewError,
                errorPresent: true,
                urls: errors.map(e => e.url), // URLs are already properly formatted from checkErrorChanges
                additionalData: {
                    severity,
                    errors: errors.map(e => ({
                        type: e.type,
                        message: e.message,
                        category: e.category,
                        url: e.url // Include URL in error details as well
                    }))
                }
            });
        });
    }

    // Add notifications for resolved errors
    if (changes.resolved.length > 0) {
        notifications.push({
            type: crawlNotificationType.ErrorResolved,
            errorPresent: false,
            urls: changes.resolved.map(e => e.url), // URLs are already properly formatted
            additionalData: {
                errors: changes.resolved.map(e => ({
                    type: e.type,
                    message: e.message,
                    category: e.category,
                    severity: e.severity,
                    url: e.url // Include URL in resolved error details
                }))
            }
        });
        const resolvedErrorIds = changes.resolved.map(error => error.id);

        // Update all resolved errors to set resolutionNotified to true
        await prisma.errorLog.updateMany({
            where: {
                id: {
                    in: resolvedErrorIds
                }
            },
            data: {
                resolutionNotified: true
            }
        });
    }

    // Send notification if we have any changes
    if (notifications.length > 0) {
        console.log(`Sending error change notifications: ${notifications.length} notifications`);
        console.log('New errors:', changes.added.length);
        console.log('Resolved errors:', changes.resolved.length);

    }
    return notifications;
}