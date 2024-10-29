import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from 'recharts';
import styles from './page.module.scss';
import { DomainStats } from './page';

const StatisticsSection = ({ domainStats }: {domainStats: DomainStats}) => {
  const getChartData = (stats : DomainStats) => {
    return [
      {
        name: 'Error Rate',
        value: Math.round(stats.errorRate * 100)
      },
      {
        name: 'Warning Rate',
        value: Math.round(stats.warningRate * 100)
      },
      {
        name: 'Success Rate',
        value: Math.round((1 - stats.errorRate - stats.warningRate) * 100)
      }
    ];
  };

  const getBarColor = (index: number) => {
    const colors = ['#ef4444', '#f59e0b', '#10b981'];
    return colors[index];
  };

  // Process trend data to show last 7 days
  const getTrendData = () => {
    if (!domainStats.monthlyTrend) return [];
    return domainStats.monthlyTrend.slice(-7).map(day => ({
      ...day,
      date: new Date(day.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    }));
  };

  return (
    <div className={styles.statsSection}>
      <div className={styles.chartsWrapper}>
        {/* Status Distribution Chart */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Status Distribution</h3>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getChartData(domainStats)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis unit="%" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="value">
                  {getChartData(domainStats).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Trend Chart */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Weekly Trend</h3>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getTrendData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="success" 
                  stroke="#10b981" 
                  name="Success"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="warnings" 
                  stroke="#f59e0b" 
                  name="Warnings"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="errors" 
                  stroke="#ef4444" 
                  name="Errors"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <h4>Total Crawls</h4>
          </div>
          <div className={styles.metricValue}>
            {domainStats.totalCrawls}
          </div>
        </div>
        
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <h4>Average Time</h4>
          </div>
          <div className={styles.metricValue}>
            {Math.round(domainStats.averageCrawlTime / 1000)}s
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <h4>404 Errors</h4>
          </div>
          <div className={styles.metricValue}>
            {domainStats.errorTypes?.error404 || 0}
          </div>
        </div>

        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <h4>Other Errors</h4>
          </div>
          <div className={styles.metricValue}>
            {(domainStats.errorTypes?.other || 0) + (domainStats.errorTypes?.error503 || 0)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsSection;