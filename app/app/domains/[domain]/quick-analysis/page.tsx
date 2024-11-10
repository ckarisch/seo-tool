// app/domains/[domain]/quick-analysis/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import styles from './page.module.scss';
import Section from '@/components/layout/section';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Issue {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
}

interface Metrics {
  loadTime: number;
  resourceCount: number;
  errors: number;
  warnings: number;
}

interface QuickAnalysisData {
  lastAnalysisTime: string;
  score: number;
  issues: Issue[];
  metrics: Metrics;
}

interface PageProps {
  params: {
    domain: string;
  };
}

export default function QuickAnalysis({ params }: PageProps) {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      // Handle unauthenticated state
    },
  });

  const [analysisData, setAnalysisData] = useState<QuickAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "loading") {
      fetch(`/api/seo/domains/${params.domain}/quick-analysis`)
        .then(res => res.json())
        .then((data: QuickAnalysisData) => {
          setAnalysisData(data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error fetching analysis data:', error);
          setLoading(false);
        });
    }
  }, [status, params.domain]);

  if (loading) {
    return (
      <Section>
        <div className={styles.loadingState}>Loading analysis data...</div>
      </Section>
    );
  }

  if (!analysisData) {
    return (
      <Section>
        <div className={styles.loadingState}>No analysis data available</div>
      </Section>
    );
  }

  const getSeverityColor = (severity: Issue['severity']): string => {
    switch (severity) {
      case 'critical': return 'text-red-500';
      case 'warning': return 'text-amber-500';
      case 'info': return 'text-blue-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <Section>
      <div className={styles.quickAnalysis}>
        {/* Overview Card */}
        <Card className={styles.scoreCard}>
          <CardHeader>
            <CardTitle>Quick Analysis Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.scoreValue}>
              {(analysisData.score * 100).toFixed(0)}
            </div>
            <div className={styles.lastUpdate}>
              <Clock size={16} />
              Last updated: {format(new Date(analysisData.lastAnalysisTime), 'PPp')}
            </div>
          </CardContent>
        </Card>

        {/* Metrics Grid */}
        <div className={styles.metricsGrid}>
          <Card>
            <CardContent>
              <div className={styles.metricItem}>
                <span className={styles.metricLabel}>Load Time</span>
                <span className={styles.metricValue}>
                  {analysisData.metrics.loadTime}ms
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className={styles.metricItem}>
                <span className={styles.metricLabel}>Resources</span>
                <span className={styles.metricValue}>
                  {analysisData.metrics.resourceCount}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <div className={styles.metricItem}>
                <span className={styles.metricLabel}>Issues</span>
                <span className={styles.metricValue}>
                  {analysisData.metrics.errors + analysisData.metrics.warnings}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Issues List */}
        <Card className={styles.issuesCard}>
          <CardHeader>
            <CardTitle>Found Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.issuesList}>
              {analysisData.issues.map((issue, index) => (
                <div 
                  key={index} 
                  className={`${styles.issueItem} ${styles[issue.severity]}`}
                >
                  <div className={styles.issueIcon}>
                    {issue.severity === 'critical' ? (
                      <AlertCircle size={20} />
                    ) : issue.severity === 'warning' ? (
                      <AlertCircle size={20} />
                    ) : (
                      <CheckCircle size={20} />
                    )}
                  </div>
                  <div className={styles.issueContent}>
                    <div className={styles.issueType}>{issue.type}</div>
                    <div className={styles.issueMessage}>{issue.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}