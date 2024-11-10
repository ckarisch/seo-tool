// app/api/seo/domains/[domainName]/errors/route.ts
import { authOptions } from '@/lib/auth';
import { PrismaClient, Severity, Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

interface ErrorSummary {
  code: string;
  name: string;
  category: string;
  severity: Severity;
  count: number;
  lastOccurrence: Date | null;
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

    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';

    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    switch (period) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      default: // '7d'
        startDate.setDate(startDate.getDate() - 7);
    }

    // Get domain
    const domain = await prisma.domain.findFirst({
      where: {
        domainName: params.domainName,
        user: {
          email: session.user.email
        }
      }
    });

    if (!domain) {
      return NextResponse.json(
        { error: "Domain not found" },
        { status: 404 }
      );
    }

    // Get error logs for the period
    const errorLogs = await prisma.errorLog.findMany({
      where: {
        domainId: domain.id,
        createdAt: {
          gte: startDate,
          lte: now
        }
      },
      include: {
        errorType: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate summary
    const summary = {
      total: errorLogs.length,
      critical: errorLogs.filter(log => log.errorType.severity === Severity.CRITICAL).length,
      high: errorLogs.filter(log => log.errorType.severity === Severity.HIGH).length,
      medium: errorLogs.filter(log => log.errorType.severity === Severity.MEDIUM).length,
      low: errorLogs.filter(log => log.errorType.severity === Severity.LOW).length
    };

    // Calculate error type distribution
    const errorTypes = errorLogs.reduce((acc, log) => {
      const category = log.errorType.category;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // First, get the error counts and latest occurrences
    const errorTypeCounts = await prisma.errorLog.groupBy({
      by: ['errorTypeId'],
      where: {
        domainId: domain.id,
        createdAt: {
          gte: startDate,
          lte: now
        }
      },
      _count: true,
      _max: {
        createdAt: true
      },
      orderBy: [
        {
          _count: {
            errorTypeId: 'desc'
          }
        }
      ],
      take: 10
    });

    // Then, fetch the error type details for each grouped result
    const topErrorsWithDetails: ErrorSummary[] = await Promise.all(
      errorTypeCounts.map(async (error): Promise<ErrorSummary> => {
        const errorType = await prisma.errorType.findUnique({
          where: { id: error.errorTypeId }
        });

        return {
          code: errorType?.code || 'UNKNOWN',
          name: errorType?.name || 'Unknown Error',
          category: errorType?.category || 'Unknown',
          severity: errorType?.severity || Severity.LOW,
          count: error._count,
          lastOccurrence: error._max.createdAt
        };
      })
    );

    return NextResponse.json({
      summary,
      errorTypes,
      topErrors: topErrorsWithDetails,
      lastUpdate: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching error data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}