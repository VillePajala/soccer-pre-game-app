'use client';
import React from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, Tooltip, YAxis } from 'recharts';

interface MetricTrendPoint {
  date: string;
  value: number;
}

interface MetricTrendChartProps {
  data: MetricTrendPoint[];
}

const MetricTrendChart: React.FC<MetricTrendChartProps> = ({ data }) => {
  const chartData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const max = Math.max(10, ...chartData.map(d => d.value));
  return (
    <div style={{ width: '100%', height: 60 }}>
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#4b5563" strokeDasharray="3 3" vertical={false} />
          <YAxis hide domain={[0, max]} />
          <Tooltip
            cursor={{ stroke: '#334155' }}
            labelFormatter={(v) => new Date(v as string).toLocaleDateString()}
            wrapperStyle={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}
          />
          <Line type="monotone" dataKey="value" stroke="#facc15" dot={false} activeDot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MetricTrendChart;
