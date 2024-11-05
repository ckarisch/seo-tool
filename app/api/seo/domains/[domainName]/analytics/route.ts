// app/api/domains/[id]/analytics/route.ts
import { authOptions } from "@/lib/auth";
import { PrismaClient } from '@prisma/client';
import { getServerSession } from "next-auth";
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

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

    // Get the last 30 days timestamp
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Fetch domain with crawls for last 30 days
    const domain = await prisma.domain.findFirst({
      where: {
        domainName: params.domainName,
        user: {
          email: session.user.email
        }
      },
      include: {
        domainCrawls: {
          where: {
            startTime: {
              gte: thirtyDaysAgo
            }
          },
          orderBy: {
            startTime: 'desc'
          }
        }
      }
    });

    if (!domain) {
      return NextResponse.json(
        { error: "Domain not found or access denied" },
        { status: 404 }
      );
    }

    const crawls = domain.domainCrawls;
    const totalCrawls = crawls.length;

    console.log(`Found ${totalCrawls} crawls for domain ${domain.id}`);

    // Initialize daily data with Map for easier date handling
    const dailyData = new Map();
    
    // Fill the map with dates for the last 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateStr = date.toISOString().split('T')[0];
      dailyData.set(dateStr, {
        date: dateStr,
        total: 0,
        errors: 0,
        warnings: 0,
        success: 0
      });
    }

    // Process each crawl
    crawls.forEach(crawl => {
      if (!crawl.startTime) return;

      const crawlDate = new Date(crawl.startTime);
      crawlDate.setHours(0, 0, 0, 0);
      const dateStr = crawlDate.toISOString().split('T')[0];
      
      const dayData = dailyData.get(dateStr);
      if (dayData) {
        dayData.total++;
        
        // Determine the status
        if (crawl.error === true || crawl.error404 === true || crawl.error503 === true || crawl.status === 'error') {
          dayData.errors++;
        } else if (crawl.warningDoubleSlash === true || crawl.status === 'warning') {
          dayData.warnings++;
        } else {
          dayData.success++;
        }

        // Update the map
        dailyData.set(dateStr, dayData);
      }
    });

    // Calculate error and warning counts
    const errorsCount = crawls.filter(crawl => 
      crawl.error === true || 
      crawl.error404 === true || 
      crawl.error503 === true || 
      crawl.status === 'error'
    ).length;

    const warningsCount = crawls.filter(crawl => 
      crawl.warningDoubleSlash === true || 
      crawl.status === 'warning'
    ).length;

    // Calculate average crawl time
    const completedCrawls = crawls.filter(crawl => 
      crawl.endTime && 
      crawl.startTime && 
      crawl.crawlTime && 
      crawl.crawlTime > 0
    );

    const averageCrawlTime = completedCrawls.length > 0
      ? completedCrawls.reduce((sum, crawl) => sum + (crawl.crawlTime || 0), 0) / completedCrawls.length
      : 0;

    // Get error types breakdown
    const errorTypes = {
      error404: crawls.filter(crawl => crawl.error404 === true).length,
      error503: crawls.filter(crawl => crawl.error503 === true).length,
      doubleSlash: crawls.filter(crawl => crawl.warningDoubleSlash === true).length,
      other: crawls.filter(crawl => 
        crawl.error === true && 
        !crawl.error404 && 
        !crawl.error503
      ).length
    };

    // Convert map to array and sort by date
    const monthlyTrend = Array.from(dailyData.values())
      .sort((a, b) => a.date.localeCompare(b.date));

    console.log('Sample crawl:', crawls[0]);
    console.log('Monthly trend data for today:', dailyData.get(new Date().toISOString().split('T')[0]));
    
    const response = {
      totalCrawls,
      errorRate: totalCrawls > 0 ? errorsCount / totalCrawls : 0,
      warningRate: totalCrawls > 0 ? warningsCount / totalCrawls : 0,
      averageCrawlTime,
      monthlyTrend,
      errorTypes
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Analytics error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}