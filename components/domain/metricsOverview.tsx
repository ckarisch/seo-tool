// components/domain/metricsOverview.tsx
import { useState, useEffect } from 'react';
import styles from './metricsOverview.module.scss';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

interface MetricsOverviewProps {
  domain: {
    score?: number | null;
    performanceScore?: number | null;
    quickCheckScore?: number | null;
    domainName?: string;
  };
  loading?: boolean;
}

interface MetricData {
  value: number | null | undefined;
  label: string;
}

interface HistoricalDataPoint {
  date: string;
  domainScore: number | null;
  performanceScore: number | null;
  quickCheckScore: number | null;
}

export default function MetricsOverview({ domain, loading = false }: MetricsOverviewProps) {
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistoricalData = async () => {
      if (!domain.domainName) return;
      
      try {
        const response = await fetch(`/api/seo/domains/${domain.domainName}/metrics/history`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setHistoricalData(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching historical data:', error);
        setError('Failed to load historical data');
      }
    };

    if (!loading) {
      fetchHistoricalData();
    }
  }, [domain.domainName, loading]);

  const metrics: MetricData[] = [
    { value: domain.score, label: 'Overall Score' },
    { value: domain.performanceScore, label: 'Performance' },
    { value: domain.quickCheckScore, label: 'Quick Check' },
  ];

  const getScoreClass = (score?: number | null): string => {
    if (!score) return styles.bad;
    if (score > 0.8) return styles.veryGood;
    if (score > 0.5) return styles.good;
    return styles.bad;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className={styles.customTooltip}>
        <p className={styles.tooltipDate}>{format(new Date(label), 'MMM d, yyyy HH:mm')}</p>
        {payload.map((entry: any, index: number) => (
          <p 
            key={index} 
            className={styles.tooltipScore}
            style={{ color: entry.color }}
          >
            {entry.name}: {entry.value}%
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.metricsContainer}>
      <div className={styles.metricsGrid}>
        {metrics.map((metric, index) => (
          <div key={index} className={styles.metricCard}>
            <div className={[styles.metricValue, getScoreClass(metric.value)].join(' ')}>
              {loading ? '-' : metric.value ? Math.round(metric.value * 100) : '0'}
            </div>
            <div className={styles.metricLabel}>{metric.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.graphContainer}>
        <h3 className={styles.graphTitle}>Domain Metrics History (Last 30 Days)</h3>
        {error ? (
          <div className={styles.errorMessage}>{error}</div>
        ) : (
          <div className={styles.graph}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historicalData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => format(new Date(date), 'MMM d')}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="domainScore"
                  name="Overall Score"
                  stroke="#0466c8"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="performanceScore"
                  name="Performance"
                  stroke="#16a34a"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="quickCheckScore"
                  name="Quick Check"
                  stroke="#d97706"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}