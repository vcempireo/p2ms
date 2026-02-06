import profileData from '../../lib/pms-profile.json';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  change?: string;
  changeColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, unit, change, changeColor }) => (
  <div className="bg-pms-card-bg p-4 rounded-xl shadow-sm flex flex-col justify-between">
    <div>
        <p className="text-pms-text-secondary text-sm">{label}</p>
        <p className="text-pms-text-primary text-2xl font-bold mt-1">{value}<span className="text-base ml-1">{unit}</span></p>
    </div>
    {change && <p className={`text-xs mt-2 ${changeColor}`}>{change}</p>}
  </div>
);

const MyPage = () => {
  const { profile, game_status } = profileData;
  const bmi = 22.3; // Placeholder
  const bodyFatPercentage = 17.5; // Placeholder
  const leanBodyMass = 50.5; // Placeholder

  return (
    <div className="p-4 space-y-6 text-pms-text-primary">

      {/* Goal Card */}
      <div className="bg-pms-card-bg p-5 rounded-xl shadow-sm">
        <p className="text-pms-text-secondary text-sm">目標</p>
        <p className="text-pms-text-primary text-5xl font-bold mt-1">63.3<span className="text-2xl ml-1">kg</span></p>
        <div className="bg-pms-purple-notification text-purple-800 text-sm font-medium px-3 py-1 rounded-full mt-3 inline-block">
          先週に比べ体重に変化が増えているよ
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2">
        {['体重', '食事', '睡眠', 'トレーニング'].map(tab => (
          <button
            key={tab}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-200 ${tab === '体重' ? 'bg-pms-text-primary text-white' : 'bg-pms-card-bg text-pms-text-secondary hover:bg-gray-100'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="体重" value="63.3" unit="kg" change="前日比 -0.2kg" changeColor="text-green-500"/>
        <StatCard label="BMI" value={bmi} change="前日比 -0.1" changeColor="text-green-500"/>
        <StatCard label="体脂肪率" value={bodyFatPercentage} unit="%" change="前日比 -0.1%" changeColor="text-green-500"/>
        <StatCard label="除脂肪体重" value={leanBodyMass} unit="kg" change="前日比 +0.1kg" changeColor="text-red-500"/>
      </div>

    </div>
  );
};

export default MyPage;
