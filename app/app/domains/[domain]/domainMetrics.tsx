import React, { useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <p className="font-medium text-gray-900">
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
      {JSON.stringify(domainScores)}
      <CardHeader>
        <CardTitle>Domain Metrics History (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={domainScores}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date: string) => format(new Date(date), 'MMM d')}
                interval="preserveStartEnd"
              />
              <YAxis 
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="linear"
                dataKey="domainScore"
                name="Overall Score"
                stroke="#0ea5e9"
                strokeWidth={2}
                dot={{ r: 4, fill: "#0ea5e9" }}
                activeDot={{ r: 6 }}
                connectNulls={true}
              />
              <Line
                type="linear"
                dataKey="performanceScore"
                name="Performance"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 4, fill: "#22c55e" }}
                activeDot={{ r: 6 }}
                connectNulls={true}
              />
              <Line
                type="linear"
                dataKey="quickCheckScore"
                name="Quick Check"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ r: 4, fill: "#f59e0b" }}
                activeDot={{ r: 6 }}
                connectNulls={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default DomainMetrics;