"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import styles from './page.module.scss';
import Section from '@/components/layout/section';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Cpu, HardDrive, Network } from 'lucide-react';
import DomainMetrics from '../domainMetrics';

interface PerformanceMetrics {
  timestamp: string;
  loadTime?: number | null;
  firstContentfulPaint?: number | null;
  largestContentfulPaint?: number | null;
  timeToInteractive?: number | null;
  totalBlockingTime?: number | null;
  cumulativeLayoutShift?: number | null;
  resourceSummary?: {
    totalResources?: number | null;
    totalBytes?: number | null;
    coverage?: number | null;
  };
}

interface PerformanceData {
  currentScore: number;
  lastCheck: string;
  metrics: PerformanceMetrics;
  historicalData: Array<{
    date: string;
    domainScore: number;
    performanceScore: number;
    quickCheckScore: number;
  }>;
}

export default function PerformanceDashboard({ params }: { params: { domain: string } }) {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      // Handle unauthenticated state
    },
  });

  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "loading") {
      fetch(`/api/seo/domains/${params.domain}/performance`)
        .then(res => res.json())
        .then((data: PerformanceData) => {
          setPerformanceData(data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error fetching performance data:', error);
          setLoading(false);
        });
    }
  }, [status, params.domain]);

  if (loading) {
    return (
      <Section>
        <div className={styles.loadingState}>Loading performance data...</div>
      </Section>
    );
  }

  if (!performanceData) {
    return (
      <Section>
        <div className={styles.errorState}>No performance data available</div>
      </Section>
    );
  }

  const formatBytes = (bytes: number | undefined | null): string => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (value: number | undefined | null, decimals: number = 2, unit: string = ''): string => {
    if (value === undefined || value === null) return 'N/A';
    return `${value.toFixed(decimals)}${unit}`;
  };

  return (
    <Section>
      <div className={styles.performanceDashboard}>
        {/* Overall Score Card */}
        <Card className={styles.scoreCard}>
          <CardHeader>
            <CardTitle>Performance Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.scoreValue}>
              {formatNumber(performanceData.currentScore * 100, 0)}
            </div>
            <div className={styles.lastUpdate}>
              <Clock size={16} />
              Last checked: {new Date(performanceData.lastCheck).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics Grid */}
        <div className={styles.metricsGrid}>
          <Card>
            <CardContent>
              <div className={styles.metricItem}>
                <div className={styles.metricIcon}>
                  <Network />
                </div>
                <span className={styles.metricLabel}>Load Time</span>
                <span className={styles.metricValue}>
                  {formatNumber(performanceData.metrics.loadTime, 2, 's')}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className={styles.metricItem}>
                <div className={styles.metricIcon}>
                  <Cpu />
                </div>
                <span className={styles.metricLabel}>Time to Interactive</span>
                <span className={styles.metricValue}>
                  {formatNumber(performanceData.metrics.timeToInteractive, 2, 's')}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className={styles.metricItem}>
                <div className={styles.metricIcon}>
                  <HardDrive />
                </div>
                <span className={styles.metricLabel}>Resources</span>
                <span className={styles.metricValue}>
                  {performanceData.metrics.resourceSummary?.totalResources ?? 'N/A'}
                  <span className={styles.metricSubtext}>
                    {formatBytes(performanceData.metrics.resourceSummary?.totalBytes)}
                  </span>
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Historical Trends */}
        <Card className={styles.trendsCard}>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <DomainMetrics
              domainScores={performanceData.historicalData}
            />
          </CardContent>
        </Card>

        {/* Detailed Metrics */}
        <Card className={styles.detailedMetrics}>
          <CardHeader>
            <CardTitle>Core Web Vitals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.metricsTable}>
              <div className={styles.metricRow}>
                <span className={styles.metricName}>First Contentful Paint</span>
                <span className={styles.metricValue}>
                  {formatNumber(performanceData.metrics.firstContentfulPaint, 2, 's')}
                </span>
              </div>
              <div className={styles.metricRow}>
                <span className={styles.metricName}>Largest Contentful Paint</span>
                <span className={styles.metricValue}>
                  {formatNumber(performanceData.metrics.largestContentfulPaint, 2, 's')}
                </span>
              </div>
              <div className={styles.metricRow}>
                <span className={styles.metricName}>Total Blocking Time</span>
                <span className={styles.metricValue}>
                  {formatNumber(performanceData.metrics.totalBlockingTime, 2, 'ms')}
                </span>
              </div>
              <div className={styles.metricRow}>
                <span className={styles.metricName}>Cumulative Layout Shift</span>
                <span className={styles.metricValue}>
                  {formatNumber(performanceData.metrics.cumulativeLayoutShift, 3)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}