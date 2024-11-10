// app/api/seo/domains/[domainName]/quick-analysis/route.ts
import { authOptions } from '@/lib/auth';
import { PrismaClient, Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

interface QuickAnalysisMetrics {
  loadTime: number;
  resourceCount: number;
  errors: number;
  warnings: number;
}

interface ErrorMetadata {
  message: string;
  details?: string;
  code?: string;
}

// Type guard for ErrorMetadata
function isErrorMetadata(value: unknown): value is ErrorMetadata {
  if (!value || typeof value !== 'object') {
    return false;
  }
  
  const metadata = value as Record<string, unknown>;
  return typeof metadata.message === 'string';
}

// Type guard for JsonObject
function isJsonObject(value: Prisma.JsonValue): value is Prisma.JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Type guard for QuickAnalysisMetrics
function isQuickAnalysisMetrics(value: unknown): value is QuickAnalysisMetrics {
  if (!value || typeof value !== 'object') {
    return false;
  }
  
  const metrics = value as Record<string, unknown>;
  return (
    typeof metrics.loadTime === 'number' &&
    typeof metrics.resourceCount === 'number' &&
    typeof metrics.errors === 'number' &&
    typeof metrics.warnings === 'number'
  );
}

export async function GET(
  request: Request,
  { params }: { params: { domainName: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get domain with latest quick analysis data
    const domain = await prisma.domain.findFirst({
      where: {
        domainName: params.domainName,
        user: {
          email: session.user.email
        }
      },
      include: {
        metrics: {
          where: {
            type: 'QUICK_CHECK',
          },
          orderBy: {
            timestamp: 'desc'
          },
          take: 1
        }
      }
    });

    if (!domain) {
      return NextResponse.json(
        { error: "Domain not found" },
        { status: 404 }
      );
    }

    // Get recent issues
    const recentIssues = await prisma.errorLog.findMany({
      where: {
        domainId: domain.id,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      include: {
        errorType: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    // Process issues into the required format
    const issues = recentIssues.map(issue => {
      let errorMessage = 'No additional details available';
      
      if (issue.metadata !== null) {
        if (isJsonObject(issue.metadata) && isErrorMetadata(issue.metadata)) {
          errorMessage = issue.metadata.message;
        }
      }

      return {
        type: issue.errorType.name,
        severity: issue.errorType.severity.toLowerCase(),
        message: errorMessage
      };
    });

    // Get metrics from the latest quick analysis with type safety
    const defaultMetrics: QuickAnalysisMetrics = {
      loadTime: domain.lastCrawlTime || 0,
      resourceCount: 0,
      errors: 0,
      warnings: 0
    };

    let metrics: QuickAnalysisMetrics = defaultMetrics;

    if (domain.metrics[0]?.metadata !== null && 
        isJsonObject(domain.metrics[0]?.metadata) && 
        isQuickAnalysisMetrics(domain.metrics[0]?.metadata)) {
      metrics = {
        loadTime: domain.metrics[0].metadata.loadTime,
        resourceCount: domain.metrics[0].metadata.resourceCount,
        errors: domain.metrics[0].metadata.errors,
        warnings: domain.metrics[0].metadata.warnings
      };
    }

    return NextResponse.json({
      lastAnalysisTime: domain.lastQuickCheck || new Date().toISOString(),
      score: domain.quickCheckScore || 0,
      issues,
      metrics
    });

  } catch (error) {
    console.error('Error fetching quick analysis data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}