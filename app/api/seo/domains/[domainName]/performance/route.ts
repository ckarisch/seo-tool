import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MetricType } from '@prisma/client';

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

    // Fetch all metric types together
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

    console.log('Raw metrics:', historicalMetrics); // Debug log

    // Process historical data with better date handling
    const historicalData = historicalMetrics.reduce((acc: Record<string, any>, metric) => {
      const date = metric.timestamp.toISOString().split('T')[0];
      
      if (!acc[date]) {
        acc[date] = {
          date,
          domainScore: null,
          performanceScore: null,
          quickCheckScore: null
        };
      }
      
      // Map the metric type to the corresponding score field
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
    }, {});

    // Filter out incomplete data points and ensure proper number formatting
    const processedData = Object.values(historicalData)
      .filter((dataPoint: any) => {
        return dataPoint.domainScore !== null || 
               dataPoint.performanceScore !== null || 
               dataPoint.quickCheckScore !== null;
      })
      .map((dataPoint: any) => ({
        date: dataPoint.date,
        domainScore: dataPoint.domainScore ?? 0,
        performanceScore: dataPoint.performanceScore ?? 0,
        quickCheckScore: dataPoint.quickCheckScore ?? 0
      }));

    console.log('Processed data:', processedData); // Debug log

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

    const response = {
      currentScore: domain.performanceScore || 0,
      lastCheck: domain.lastPerformanceCheck || new Date().toISOString(),
      metrics: latestMetrics,
      historicalData: processedData
    };

    console.log('Final response:', response); // Debug log

    return NextResponse.json(response);

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