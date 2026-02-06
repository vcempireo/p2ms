'use client';

import { useState } from 'react';
import FoodForm from './FoodForm';
import WorkoutConsole from './WorkoutForm';

const ActionTabs = () => {
  const [activeTab, setActiveTab] = useState('workout');

  const tabStyles = "py-3 px-6 text-center font-semibold transition-all duration-300 w-1/2 rounded-lg";
  const activeStyles = "bg-pms-accent-cyan text-pms-bg-dark shadow-glow-cyan";
  const inactiveStyles = "bg-transparent text-pms-text-secondary hover:text-pms-text-primary";

  return (
    <div className="bg-pms-bg-light p-2 rounded-2xl shadow-glow-white">
      <div className="flex bg-pms-bg-dark rounded-lg mb-4 p-1 space-x-1">
        <button
          onClick={() => setActiveTab('food')}
          className={`${tabStyles} ${activeTab === 'food' ? activeStyles : inactiveStyles}`}
        >
          食事
        </button>
        <button
          onClick={() => setActiveTab('workout')}
          className={`${tabStyles} ${activeTab === 'workout' ? activeStyles : inactiveStyles}`}
        >
          トレーニング
        </button>
      </div>
      <div className="p-1">
        {activeTab === 'food' && <FoodForm />}
        {activeTab === 'workout' && <WorkoutConsole />}
      </div>
    </div>
  );
};

export default ActionTabs;
