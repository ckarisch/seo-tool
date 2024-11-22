import { QuickAnalysisIssue } from "@/types/logs";
import { QuickAnalysisMetrics } from "./scoreCalculator";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

async function storeQuickAnalysisHistory(
    domainId: string,
    domainScore: number,
    quickAnalysisScore: number,
    metrics: QuickAnalysisMetrics,
    issues: QuickAnalysisIssue[],
    crawlTime: number,
    status: string
) {
    try {
        await prisma.$transaction(async (tx) => {
            await tx.quickAnalysisHistory.create({
                data: {
                    domainId,
                    score: quickAnalysisScore,
                    metrics: metrics as unknown as Prisma.JsonObject,
                    issues: issues as unknown as Prisma.JsonArray,
                    crawlTime,
                    status,
                    // Store detailed metrics separately
                    timeToInteractive: metrics.timeToInteractive || null,
                    firstContentfulPaint: metrics.firstContentfulPaint || null,
                    totalBytes: metrics.totalBytes || null,
                    scriptCount: metrics.scriptCount || null,
                    styleCount: metrics.styleCount || null,
                    imageCount: metrics.imageCount || null,
                    totalResources: metrics.totalResources || null
                }
            });

            // Create domain metrics entries for each score type
            await tx.domainMetrics.create({
                data: {
                    domain: { connect: { id: domainId } },
                    type: 'DOMAIN_SCORE',
                    score: domainScore,
                    timestamp: new Date(),
                    metadata: { source: 'quick_analysis' }
                }
            });

            await tx.domainMetrics.create({
                data: {
                    domain: { connect: { id: domainId } },
                    type: 'QUICK_CHECK',
                    score: quickAnalysisScore,
                    timestamp: new Date(),
                    metadata: { source: 'quick_analysis' }
                }
            });

            // Also update the domain with the latest metrics
            await tx.domain.update({
                where: { id: domainId },
                data: {
                    timeToInteractive: metrics.timeToInteractive || null,
                    firstContentfulPaint: metrics.firstContentfulPaint || null,
                    totalBytes: metrics.totalBytes || null,
                    scriptCount: metrics.scriptCount || null,
                    styleCount: metrics.styleCount || null,
                    imageCount: metrics.imageCount || null,
                    totalResources: metrics.totalResources || null,
                    lastMetricsUpdate: new Date()
                }
            });
        });
    } catch (error) {
        console.error('Error storing quick analysis history:', error);
        throw error;
    }
}


export {
    storeQuickAnalysisHistory
};