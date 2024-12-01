// app/api/seo/domains/[domain]/metrics/history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { subDays, startOfDay, format, addDays } from 'date-fns';
import { MetricType } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { domainName: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const thirtyDaysAgo = startOfDay(subDays(new Date(), 30));

    const metrics = await prisma.domainMetrics.findMany({
      where: {
        domain: {
          domainName: params.domainName,
          userId: (session.user as any).id,
        },
        timestamp: {
          gte: thirtyDaysAgo,
        },
      },
      // Remove the orderBy clause
      select: {
        timestamp: true,
        score: true,
        type: true,
      },
    });

    // Sort in JavaScript instead
    const sortedMetrics = metrics.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Create a map of dates to ensure we have entries for all days
    const dateMap = new Map();

    // Initialize the date range
    let currentDate = thirtyDaysAgo;
    while (currentDate <= new Date()) {
      const dateKey = format(currentDate, 'yyyy-MM-dd');
      dateMap.set(dateKey, {
        date: dateKey,
        domainScore: null,
        performanceScore: null,
        quickCheckScore: null,
      });
      currentDate = addDays(currentDate, 1);
    }

    // Process metrics and update the map
    sortedMetrics.forEach(metric => {
      const dateKey = format(metric.timestamp, 'yyyy-MM-dd');
      let entry = dateMap.get(dateKey);

      if (!entry) {
        entry = {
          date: dateKey,
          domainScore: null,
          performanceScore: null,
          quickCheckScore: null,
        };
        dateMap.set(dateKey, entry);
      }

      // Update the appropriate score
      const score = Math.round(metric.score * 100);
      switch (metric.type) {
        case 'DOMAIN_SCORE':
          entry.domainScore = score;
          break;
        case 'PERFORMANCE':
          entry.performanceScore = score;
          break;
        case 'QUICK_CHECK':
          entry.quickCheckScore = score;
          break;
      }
    });

    // Convert map to array and sort by date
    const formattedMetrics = Array.from(dateMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Remove trailing days with no data
    let lastDataIndex = formattedMetrics.length - 1;
    while (lastDataIndex >= 0 &&
      !formattedMetrics[lastDataIndex].domainScore &&
      !formattedMetrics[lastDataIndex].performanceScore &&
      !formattedMetrics[lastDataIndex].quickCheckScore) {
      lastDataIndex--;
    }

    // Remove leading days with no data
    let firstDataIndex = 0;
    while (firstDataIndex < formattedMetrics.length &&
      !formattedMetrics[firstDataIndex].domainScore &&
      !formattedMetrics[firstDataIndex].performanceScore &&
      !formattedMetrics[firstDataIndex].quickCheckScore) {
      firstDataIndex++;
    }

    const trimmedMetrics = formattedMetrics.slice(firstDataIndex, lastDataIndex + 1);

    return NextResponse.json(trimmedMetrics);
  } catch (error) {
    console.error('Error fetching metrics history:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}