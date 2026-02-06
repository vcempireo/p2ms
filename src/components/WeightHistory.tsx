'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import resolveConfig from 'tailwindcss/resolveConfig';
import tailwindConfig from '../../tailwind.config.js';

// Resolve the full Tailwind config
const fullConfig = resolveConfig(tailwindConfig);

// Type guard to check for colors
function isColorObject(colors: any): colors is { [key: string]: string | { [key: string]: string } } {
    return typeof colors === 'object' && colors !== null;
}

// Safely access nested color values
const getThemeColor = (path: string): string => {
    if (!fullConfig.theme?.colors || !isColorObject(fullConfig.theme.colors)) {
        return '#000'; // Fallback color
    }
    const keys = path.split('.');
    let current: any = fullConfig.theme.colors;
    for (const key of keys) {
        if (typeof current === 'object' && current !== null && key in current) {
            current = current[key];
        } else {
            return '#000'; // Fallback if path is invalid
        }
    }
    return typeof current === 'string' ? current : '#000';
};


interface WeightData {
  month: string;
  weight: number;
}

interface WeightHistoryProps {
  data: WeightData[];
}

const WeightHistory = ({ data }: WeightHistoryProps) => {

  const colors = {
    textSecondary: getThemeColor('pms-text-secondary'),
    accentPink: getThemeColor('pms-accent-pink'),
    bgDark: getThemeColor('pms-bg-dark'),
    border: getThemeColor('pms-border'),
    textPrimary: getThemeColor('pms-text-primary'),
  };

  if (!data || data.length === 0) {
    return (
        <div className="bg-pms-bg-light p-6 rounded-2xl shadow-glow-pink">
            <h3 className="text-lg font-semibold text-pms-text-primary mb-4">体重履歴</h3>
            <div className="text-center text-pms-text-secondary py-8">
                データがありません
            </div>
        </div>
    );
  }

  return (
    <div className="bg-pms-bg-light p-6 rounded-2xl shadow-glow-pink">
      <h3 className="text-lg font-semibold text-pms-text-primary mb-4">体重履歴 (過去6ヶ月)</h3>
      <div style={{ width: '100%', height: 200 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis dataKey="month" tick={{ fill: colors.textSecondary }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: colors.textSecondary }} tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: colors.bgDark,
                borderColor: colors.border,
                borderRadius: '0.75rem',
                color: colors.textPrimary,
              }} 
              labelStyle={{ fontWeight: 'bold' }}
              itemStyle={{ color: colors.accentPink }}
            />
            <Line type="monotone" dataKey="weight" stroke={colors.accentPink} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WeightHistory;
