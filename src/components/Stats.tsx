interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, unit }) => (
  <div className="bg-pms-card-bg p-6 rounded-2xl shadow-lg text-center flex-1">
    <p className="text-sm text-pms-text-secondary">{label}</p>
    <p className="text-4xl font-bold text-pms-text-primary mt-2">{value}<span className="text-lg font-medium text-pms-text-secondary ml-1">{unit}</span></p>
  </div>
);

interface StatsProps {
  stats: {
    weight: number;
    bodyFat: number;
  };
}

const Stats: React.FC<StatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 gap-4 md:gap-6">
      <StatCard label="現在の体重" value={stats.weight} unit="kg" />
      <StatCard label="体脂肪率" value={stats.bodyFat} unit="%" />
    </div>
  );
};

export default Stats;
