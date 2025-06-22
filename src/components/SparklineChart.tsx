'use client';

import React from 'react';
import { ResponsiveContainer, Tooltip, YAxis, ReferenceLine, CartesianGrid, ComposedChart, Area, Legend } from 'recharts';
import type { TooltipProps } from 'recharts';

interface SparklineChartProps {
  data: { date: string; points: number; goals: number; assists: number; result: 'W' | 'L' | 'D' | 'N/A' }[];
}

const CustomTooltip: React.FC<TooltipProps<number, string>> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-700 text-white p-2 rounded-md border border-slate-600 shadow-lg text-xs">
        <p className="font-bold">{new Date(data.date).toLocaleDateString()}</p>
        <p style={{ color: '#22c55e' }}>{`Goals: ${data.goals}`}</p>
        <p style={{ color: '#3b82f6' }}>{`Assists: ${data.assists}`}</p>
      </div>
    );
  }
  return null;
};

interface DotProps {
  cx?: number;
  cy?: number;
  value?: number;
  index?: number;
  payload?: Record<string, unknown>;
}

const CustomizedDot = ({ cx, cy }: DotProps) => {
  return (
    <circle cx={cx} cy={cy} r={1.5} fill="#6366f1" />
  );
};

const SparklineChart: React.FC<SparklineChartProps> = ({ data }) => {
  const chartData = [...data].reverse();
  const averagePoints = chartData.length > 0 ? chartData.reduce((sum, item) => sum + item.points, 0) / chartData.length : 0;
  const maxPoints = Math.max(...chartData.map(d => d.points), 3); // Ensure y-axis is at least 3

  return (
    <div style={{ width: '100%', height: 120 }}>
      <ResponsiveContainer>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
        >
          <CartesianGrid stroke="#4b5563" strokeDasharray="3 3" vertical={false} />
          <YAxis 
            tick={{ fill: '#94a3b8', fontSize: 12 }} 
            axisLine={false} 
            tickLine={false}
            domain={[0, maxPoints]}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} 
          />
          <ReferenceLine y={averagePoints} stroke="#94a3b8" strokeDasharray="4 4" />
          <Area type="monotone" dataKey="goals" fill="#22c55e" stroke="#22c55e" name="Goals" fillOpacity={0.2} dot={<CustomizedDot />} />
          <Area type="monotone" dataKey="assists" fill="#3b82f6" stroke="#3b82f6" name="Assists" fillOpacity={0.2} dot={<CustomizedDot />} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SparklineChart; 