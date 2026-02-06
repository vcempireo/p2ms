import Image from 'next/image';

interface UserProfileProps {
  profile: {
    name: string;
    avatarUrl: string;
    targetWeight: number;
    targetBodyFat: number;
  };
}

const UserProfile: React.FC<UserProfileProps> = ({ profile }) => {
  return (
    <div className="flex flex-col items-center text-center p-6 bg-pms-card-bg rounded-2xl shadow-lg mb-6">
      <div className="relative w-24 h-24">
        <Image
          src={profile.avatarUrl}
          alt="User Avatar"
          layout="fill"
          objectFit="cover"
          className="rounded-full"
        />
        <div className="absolute inset-0 rounded-full border-4 border-pms-accent-3"></div>
      </div>
      <h1 className="text-3xl font-bold mt-4 text-pms-text-primary">{profile.name}</h1>
      <p className="text-pms-text-secondary mt-1">目標: {profile.targetWeight}kg / 体脂肪率 {profile.targetBodyFat}%</p>
    </div>
  );
};

export default UserProfile;
