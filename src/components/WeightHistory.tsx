'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface WeightData {
  month: string;
  weight: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-ios-label/90 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-xl">
      <p className="font-semibold">{payload[0].value} kg</p>
      <p className="text-white/70">{label}</p>
    </div>
  );
};

const WeightHistory = ({ data }: { data: WeightData[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-ios-tertiary text-sm">データなし</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 4, left: -32, bottom: 0 }}>
        <XAxis
          dataKey="month"
          tick={{ fill: '#8E8E93', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fill: '#8E8E93', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          domain={['dataMin - 1', 'dataMax + 1']}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="weight"
          stroke="#007AFF"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, fill: '#007AFF', strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default WeightHistory;
