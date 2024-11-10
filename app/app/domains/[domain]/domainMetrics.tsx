// components/domain/DomainMetrics.tsx
import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

const DomainMetrics: React.FC<DomainMetricsProps> = ({ 
  domainScores, 
  className = "" 
}) => {
  const CustomTooltip: React.FC<TooltipProps> = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length || !label) {
      return null;
    }

    return (
      <div className="bg-white p-4 rounded-lg shadow border border-gray-100">
        <p className="font-medium text-sm text-gray-900">
          {format(new Date(label), 'MMM d, yyyy')}
        </p>
        {payload.map((entry, index) => (
          <p 
            key={index} 
            className="text-sm"
            style={{ color: entry.color }}
          >
            {entry.name}: {entry.value.toFixed(1)}%
          </p>
        ))}
      </div>
    );
  };

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle>Domain Performance Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={domainScores}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date: string) => format(new Date(date), 'MMM d')}
              />
              <YAxis domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="domainScore"
                name="Domain Score"
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
      </CardContent>
    </Card>
  );
};

export default DomainMetrics;