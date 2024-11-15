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

export default function MetricsOverview({ domain, loading = false }: MetricsOverviewProps) {
  const [historicalData, setHistoricalData] = useState([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistoricalData = async () => {
      if (!domain.domainName) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/seo/domains/${domain.domainName}/metrics/history`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setHistoricalData(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching historical data:', error);
        setError('Failed to load historical data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistoricalData();
  }, [domain.domainName]);

  const metrics = [
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
        <p className={styles.tooltipDate}>
          {format(new Date(label), 'MMM d, yyyy')}
        </p>
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
            <div className={`${styles.metricValue} ${getScoreClass(metric.value)}`}>
              {loading ? '-' : metric.value ? Math.round(metric.value * 100) : '0'}
            </div>
            <div className={styles.metricLabel}>{metric.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.graphContainer}>
        <h3 className={styles.graphTitle}>Domain Metrics History (Last 30 Days)</h3>
        {isLoading ? (
          <div className={styles.errorMessage}>Loading...</div>
        ) : error ? (
          <div className={styles.errorMessage}>{error}</div>
        ) : historicalData.length === 0 ? (
          <div className={styles.errorMessage}>No historical data available</div>
        ) : (
          <div className={styles.graph}>
            <ResponsiveContainer width="100%" height={300} key={historicalData.length}>
              <LineChart
                data={historicalData}
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => format(new Date(date), 'MMM d')}
                  interval="preserveStartEnd"
                  minTickGap={20}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} />
                <Line
                  type="linear"
                  dataKey="domainScore"
                  name="Overall Score"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={{ fill: "#0ea5e9", r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
                <Line
                  type="linear"
                  dataKey="performanceScore"
                  name="Performance"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: "#22c55e", r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
                <Line
                  type="linear"
                  dataKey="quickCheckScore"
                  name="Quick Check"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: "#f59e0b", r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}