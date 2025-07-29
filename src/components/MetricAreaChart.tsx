'use client';
import React from 'react';
import { ResponsiveContainer, Tooltip, YAxis, ReferenceLine, CartesianGrid, ComposedChart, Area, Legend } from 'recharts';
import type { TooltipProps } from 'recharts';

interface MetricPoint {
  date: string;
  value: number;
}

interface MetricAreaChartProps {
  data: MetricPoint[];
  label: string;
}

const CustomTooltip: React.FC<TooltipProps<number, string> & { label: string }> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-slate-700 text-white p-2 rounded-md border border-slate-600 shadow-lg text-xs">
        <p className="font-bold">{new Date(d.date).toLocaleDateString()}</p>
        <p style={{ color: '#facc15' }}>{`${label}: ${d.value}`}</p>
      </div>
    );
  }
  return null;
};

const CustomizedDot = ({ cx, cy }: { cx?: number; cy?: number }) => (
  <circle cx={cx} cy={cy} r={1.5} fill="#6366f1" />
);

const MetricAreaChart: React.FC<MetricAreaChartProps> = ({ data, label }) => {
  const chartData = [...data].reverse();
  const average = chartData.length > 0 ? chartData.reduce((sum, item) => sum + item.value, 0) / chartData.length : 0;
  const maxVal = Math.max(10, ...chartData.map(d => d.value));

  return (
    <div style={{ width: '100%', height: 120 }}>
      <ResponsiveContainer>
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="#4b5563" strokeDasharray="3 3" vertical={false} />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            domain={[0, maxVal]}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip label={label} />} wrapperStyle={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
          <ReferenceLine y={average} stroke="#94a3b8" strokeDasharray="4 4" />
          <Area type="monotone" dataKey="value" fill="#facc15" stroke="#facc15" name={label} fillOpacity={0.2} dot={<CustomizedDot />} activeDot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default React.memo(MetricAreaChart);
