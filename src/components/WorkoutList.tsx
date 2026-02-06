"use client";

import { useState } from 'react';
import { Workout } from '../lib/types';

// This component handles the interactive parts of the workout page.
const WorkoutCard = ({ workout }: { workout: Workout }) => {
  // State to hold the input values for the sets
  const [set1, setSet1] = useState('');
  const [set2, setSet2] = useState('');
  const [set3, setSet3] = useState('');

  const handleSave = () => {
    // Here you would typically save the data to Firestore.
    // For now, we'll just log it to the console.
    console.log(`Saving results for ${workout.name}:`,
      {
        set1: parseInt(set1, 10) || 0,
        set2: parseInt(set2, 10) || 0,
        set3: parseInt(set3, 10) || 0,
      });
    alert("Results saved to console!");
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6 transform hover:scale-105 transition-transform duration-300">
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-sm text-gray-400">{new Date(workout.date).toLocaleDateString()}</p>
          <h2 className="text-2xl font-bold text-white tracking-tight">{workout.name}</h2>
        </div>
        <div className="text-right flex-shrink-0 ml-4">
          <p className="text-sm font-semibold text-blue-400 bg-blue-900/50 px-2 py-1 rounded">{workout.menu}</p>
          <p className="text-lg text-gray-300 mt-1">{workout.goal}</p>
        </div>
      </div>
      <div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <input 
            type="number" 
            placeholder="Set 1 Reps" 
            value={set1}
            onChange={(e) => setSet1(e.target.value)}
            className="bg-gray-700 text-white rounded p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
          />
          <input 
            type="number" 
            placeholder="Set 2 Reps" 
            value={set2}
            onChange={(e) => setSet2(e.target.value)}
            className="bg-gray-700 text-white rounded p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
          />
          <input 
            type="number" 
            placeholder="Set 3 Reps" 
            value={set3}
            onChange={(e) => setSet3(e.target.value)}
            className="bg-gray-700 text-white rounded p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
          />
        </div>
        <button 
          onClick={handleSave}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
        >
          Save Results
        </button>
      </div>
    </div>
  );
};

// This component receives the initial data from the server and renders the list.
export default function WorkoutList({ initialWorkouts }: { initialWorkouts: Workout[] }) {
  return (
    <div className="w-full max-w-2xl space-y-6">
      {initialWorkouts.map((workout) => (
        <WorkoutCard key={workout.id} workout={workout} />
      ))}
    </div>
  );
}
