'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface WeightHistory {
  month: string;
  weight: number;
}

interface WeightChartProps {
  history: WeightHistory[];
}

const WeightChart: React.FC<WeightChartProps> = ({ history }) => {
  return (
    <div className="bg-pms-card-bg p-4 sm:p-6 rounded-2xl shadow-lg h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={history}>
          <CartesianGrid strokeDasharray="3 3" stroke="#4A4A4A" />
          <XAxis dataKey="month" stroke="#A0A0A0" />
          <YAxis stroke="#A0A0A0" domain={['dataMin - 2', 'dataMax + 2']} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(30, 30, 30, 0.8)', 
              borderColor: '#5A5A5A',
              color: '#FFFFFF',
              borderRadius: '12px'
            }} 
            labelStyle={{ fontWeight: 'bold' }}
          />
          <Legend wrapperStyle={{ color: '#E0E0E0' }}/>
          <Line 
            type="monotone" 
            dataKey="weight" 
            name="体重"
            stroke="#FF8FA3" 
            strokeWidth={3} 
            activeDot={{ r: 8, strokeWidth: 2, fill: '#FF8FA3' }} 
            dot={{ r: 5, strokeWidth: 1, fill: '#FF8FA3' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default WeightChart;
