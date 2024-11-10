// app/domains/[domain]/errors/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import styles from './page.module.scss';
import Section from '@/components/layout/section';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Clock, AlertTriangle, CheckCircle, BarChart2 } from 'lucide-react';
import { format } from 'date-fns';

interface ErrorSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface ErrorTrend {
  date: string;
  count: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

interface ErrorType {
  code: string;
  name: string;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  count: number;
  lastOccurrence: string;
}

interface ErrorsData {
  summary: ErrorSummary;
  trends: ErrorTrend[];
  topErrors: ErrorType[];
  lastUpdate: string;
  errorTypes: {
    [key: string]: number;
  };
}

export default function ErrorsDashboard({ params }: { params: { domain: string } }) {
  const { data: session, status } = useSession({
    required: true,
    onUnauthenticated() {
      // Handle unauthenticated state
    },
  });

  const [errorsData, setErrorsData] = useState<ErrorsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d'>('7d');

  useEffect(() => {
    if (status !== "loading") {
      fetch(`/api/seo/domains/${params.domain}/errors?period=${selectedPeriod}`)
        .then(res => res.json())
        .then((data: ErrorsData) => {
          setErrorsData(data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error fetching errors data:', error);
          setLoading(false);
        });
    }
  }, [status, params.domain, selectedPeriod]);

  if (loading) {
    return (
      <Section>
        <div className={styles.loadingState}>Loading error data...</div>
      </Section>
    );
  }

  if (!errorsData) {
    return (
      <Section>
        <div className={styles.errorState}>No error data available</div>
      </Section>
    );
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertCircle className={styles.critical} />;
      case 'HIGH':
        return <AlertCircle className={styles.high} />;
      case 'MEDIUM':
        return <AlertTriangle className={styles.medium} />;
      case 'LOW':
        return <AlertTriangle className={styles.low} />;
      default:
        return <CheckCircle className={styles.info} />;
    }
  };

  return (
    <Section>
      <div className={styles.errorsDashboard}>
        {/* Summary Cards */}
        <div className={styles.summaryGrid}>
          <Card className={styles.summaryCard}>
            <CardContent>
              <div className={styles.summaryContent}>
                <AlertCircle className={styles.critical} size={24} />
                <div className={styles.summaryInfo}>
                  <div className={styles.summaryValue}>{errorsData.summary.critical}</div>
                  <div className={styles.summaryLabel}>Critical Errors</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={styles.summaryCard}>
            <CardContent>
              <div className={styles.summaryContent}>
                <AlertCircle className={styles.high} size={24} />
                <div className={styles.summaryInfo}>
                  <div className={styles.summaryValue}>{errorsData.summary.high}</div>
                  <div className={styles.summaryLabel}>High Priority</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={styles.summaryCard}>
            <CardContent>
              <div className={styles.summaryContent}>
                <AlertTriangle className={styles.medium} size={24} />
                <div className={styles.summaryInfo}>
                  <div className={styles.summaryValue}>{errorsData.summary.medium}</div>
                  <div className={styles.summaryLabel}>Medium Priority</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={styles.summaryCard}>
            <CardContent>
              <div className={styles.summaryContent}>
                <AlertTriangle className={styles.low} size={24} />
                <div className={styles.summaryInfo}>
                  <div className={styles.summaryValue}>{errorsData.summary.low}</div>
                  <div className={styles.summaryLabel}>Low Priority</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Time Period Selector */}
        <div className={styles.periodSelector}>
          <button
            onClick={() => setSelectedPeriod('24h')}
            className={`${styles.periodButton} ${selectedPeriod === '24h' ? styles.active : ''}`}
          >
            24 Hours
          </button>
          <button
            onClick={() => setSelectedPeriod('7d')}
            className={`${styles.periodButton} ${selectedPeriod === '7d' ? styles.active : ''}`}
          >
            7 Days
          </button>
          <button
            onClick={() => setSelectedPeriod('30d')}
            className={`${styles.periodButton} ${selectedPeriod === '30d' ? styles.active : ''}`}
          >
            30 Days
          </button>
        </div>

        {/* Error Types Breakdown */}
        <Card className={styles.breakdownCard}>
          <CardHeader>
            <CardTitle>Error Types Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.errorTypesList}>
              {Object.entries(errorsData.errorTypes).map(([type, count]) => (
                <div key={type} className={styles.errorTypeItem}>
                  <div className={styles.errorTypeBar}>
                    <div 
                      className={styles.errorTypeProgress}
                      style={{ 
                        width: `${(count / errorsData.summary.total) * 100}%`
                      }}
                    />
                    <span className={styles.errorTypeName}>{type}</span>
                  </div>
                  <span className={styles.errorTypeCount}>{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Errors Table */}
        <Card className={styles.topErrorsCard}>
          <CardHeader>
            <CardTitle>Recent Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={styles.topErrorsList}>
              {errorsData.topErrors.map((error, index) => (
                <div key={index} className={styles.errorItem}>
                  <div className={styles.errorIcon}>
                    {getSeverityIcon(error.severity)}
                  </div>
                  <div className={styles.errorInfo}>
                    <div className={styles.errorHeader}>
                      <span className={styles.errorCode}>{error.code}</span>
                      <span className={styles.errorName}>{error.name}</span>
                    </div>
                    <div className={styles.errorMeta}>
                      <span className={styles.errorCategory}>{error.category}</span>
                      <span className={styles.errorCount}>{error.count} occurrences</span>
                      <span className={styles.errorTime}>
                        Last seen: {format(new Date(error.lastOccurrence), 'PPp')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className={styles.lastUpdate}>
          <Clock size={14} />
          Last updated: {format(new Date(errorsData.lastUpdate), 'PPp')}
        </div>
      </div>
    </Section>
  );
}