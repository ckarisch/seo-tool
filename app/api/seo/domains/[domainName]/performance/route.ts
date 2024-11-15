// app/api/seo/domains/[domainName]/performance/route.ts
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // Get domain with latest metrics
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
            type: 'PERFORMANCE',
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

    // Get historical metrics for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const historicalMetrics = await prisma.domainMetrics.findMany({
      where: {
        domainId: domain.id,
        timestamp: {
          gte: thirtyDaysAgo
        }
      },
      orderBy: {
        timestamp: 'asc'
      }
    });

    // Process historical data to include all three score types
    const historicalData = historicalMetrics.reduce((acc, metric) => {
      const date = metric.timestamp.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = {
          date,
          domainScore: 0,
          performanceScore: 0,
          quickCheckScore: 0
        };
      }
      
      switch (metric.type) {
        case 'DOMAIN_SCORE':
          acc[date].domainScore = metric.score;
          break;
        case 'PERFORMANCE':
          acc[date].performanceScore = metric.score;
          break;
        case 'QUICK_CHECK':
          acc[date].quickCheckScore = metric.score;
          break;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Extract the last performance metrics
    const latestMetrics = domain.metrics[0]?.metadata as any || {
      loadTime: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      timeToInteractive: 0,
      totalBlockingTime: 0,
      cumulativeLayoutShift: 0,
      resourceSummary: {
        totalResources: 0,
        totalBytes: 0,
        coverage: 0
      }
    };

    return NextResponse.json({
      currentScore: domain.performanceScore || 0,
      lastCheck: domain.lastPerformanceCheck || new Date().toISOString(),
      metrics: latestMetrics,
      historicalData: Object.values(historicalData)
    });

  } catch (error) {
    console.error('Error fetching performance data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}