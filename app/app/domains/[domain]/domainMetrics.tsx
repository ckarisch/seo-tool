import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import styles from './domainMetrics.module.scss';

interface MetricsDataPoint {
  date: string;
  domainScore: number;
  performanceScore: number;
  quickCheckScore: number;
}

interface DomainMetricsProps {
  domainScores: MetricsDataPoint[];
  className?: string;
}

const DomainMetrics: React.FC<DomainMetricsProps> = ({ domainScores, className = "" }) => {
  if (!domainScores || domainScores.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No metrics data available
      </div>
    );
  }

  // Multiply scores by 100 to convert to percentages
  const formattedData = domainScores.map(score => ({
    date: score.date,
    domainScore: Math.round(score.domainScore * 100),
    performanceScore: Math.round(score.performanceScore * 100),
    quickCheckScore: Math.round(score.quickCheckScore * 100)
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) {
      return null;
    }

    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <p className="font-medium text-gray-900 mb-2">
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.stroke }}
            />
            <p className="text-sm text-gray-600">
              {entry.name}: {entry.value}%
            </p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.trendsCard}>
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={formattedData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
            <XAxis 
              dataKey="date"
              tick={{ fill: '#666' }}
              tickLine={{ stroke: '#666' }}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              unit="%"
              tick={{ fill: '#666' }}
              tickLine={{ stroke: '#666' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="domainScore"
              name="Overall Score"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={{ r: 4, fill: "#0ea5e9" }}
              activeDot={{ r: 6 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="performanceScore"
              name="Performance"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 4, fill: "#22c55e" }}
              activeDot={{ r: 6 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="quickCheckScore"
              name="Quick Check"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 4, fill: "#f59e0b" }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DomainMetrics;