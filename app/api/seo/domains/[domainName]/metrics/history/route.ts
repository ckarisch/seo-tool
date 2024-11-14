// app/api/seo/domains/[domain]/metrics/history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { subDays } from 'date-fns';
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

    const thirtyDaysAgo = subDays(new Date(), 30);

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
      orderBy: {
        timestamp: 'asc',
      },
      select: {
        timestamp: true,
        score: true,
        type: true,
        metadata: true
      },
    });

    // Group metrics by timestamp for the graph
    const formattedMetrics = metrics.reduce((acc: any[], metric) => {
      const date = metric.timestamp.toISOString();
      const existingEntry = acc.find(entry => entry.date === date);

      if (existingEntry) {
        switch (metric.type) {
          case 'DOMAIN_SCORE':
            existingEntry.domainScore = Math.round(metric.score * 100);
            break;
          case 'PERFORMANCE':
            existingEntry.performanceScore = Math.round(metric.score * 100);
            break;
          case 'QUICK_CHECK':
            existingEntry.quickCheckScore = Math.round(metric.score * 100);
            break;
        }
      } else {
        const newEntry = {
          date,
          domainScore: metric.type === 'DOMAIN_SCORE' ? Math.round(metric.score * 100) : null,
          performanceScore: metric.type === 'PERFORMANCE' ? Math.round(metric.score * 100) : null,
          quickCheckScore: metric.type === 'QUICK_CHECK' ? Math.round(metric.score * 100) : null,
        };
        acc.push(newEntry);
      }

      return acc;
    }, []);

    return NextResponse.json(formattedMetrics);
  } catch (error) {
    console.error('Error fetching metrics history:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}