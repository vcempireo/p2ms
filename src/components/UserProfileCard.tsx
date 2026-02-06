'use client';

import Image from 'next/image';

interface UserProfile {
  name: string;
  avatar_url: string;
}

interface Targets {
  weight: number;
  targetWeight: number;
}

interface UserProfileCardProps {
  user: UserProfile;
  currentTargets: Targets;
}

const UserProfileCard = ({ user, currentTargets }: UserProfileCardProps) => {
  const { name, avatar_url } = user;
  const { weight, targetWeight } = currentTargets;

  return (
    <div className="bg-pms-bg-light p-6 rounded-2xl shadow-glow-cyan flex flex-col items-center text-center">
      <Image 
        src={avatar_url}
        alt={name}
        width={96}
        height={96}
        className="rounded-full border-4 border-pms-accent-cyan object-cover"
      />
      <h1 className="text-2xl font-bold text-pms-text-primary mt-4">{name}</h1>
      <p className="text-sm text-pms-text-secondary">P²MS User</p>

      <div className="mt-6 w-full">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-xs text-pms-text-secondary">現在体重</p>
            <p className="text-3xl font-bold text-pms-text-primary">{weight}<span className="text-lg ml-1">kg</span></p>
          </div>
          <div>
            <p className="text-xs text-pms-text-secondary">目標体重</p>
            <p className="text-xl font-semibold text-pms-accent-cyan">{targetWeight}<span className="text-sm ml-1">kg</span></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileCard;
