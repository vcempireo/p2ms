'use client';

import { useState, useMemo } from 'react';
import { PlusCircleIcon, TrashIcon } from '@heroicons/react/24/solid';
import dummyProfile from '../lib/pms-profile.json';
import ExerciseHistoryModal from './ExerciseHistoryModal';

interface Set {
  reps: number | '';
  weight: number | '';
}

interface HistoryRecord {
  date: string;
  performance: string;
}

interface ExerciseProps {
  exerciseId: string;
  exerciseName: string;
  lastEffectiveReps: string | number;
  onOpenHistory: () => void;
}

const Exercise = ({ exerciseId, exerciseName, lastEffectiveReps, onOpenHistory }: ExerciseProps) => {
  const [sets, setSets] = useState<Set[]>([{ reps: '', weight: '' }]);

  const addSet = () => {
    setSets([...sets, { reps: '', weight: '' }]);
  };

  const removeSet = (index: number) => {
    const newSets = sets.filter((_, i) => i !== index);
    setSets(newSets);
  };

  const handleInputChange = (index: number, field: keyof Set, value: string) => {
    const newSets = [...sets];
    const numValue = value === '' ? '' : Number(value);
    if (numValue === '' || (numValue >= 0 && !isNaN(numValue))) {
        newSets[index][field] = numValue;
        setSets(newSets);
    }
  };

  return (
    <div className="bg-pms-bg-dark p-4 rounded-xl mb-4 border border-pms-border">
      <div onDoubleClick={onOpenHistory} className="flex justify-between items-center mb-3 cursor-pointer">
        <h4 className="font-bold text-pms-text-primary text-lg">{exerciseName}</h4>
        <span className="text-xs text-pms-text-secondary bg-pms-bg-light px-2 py-1 rounded-md">前回: {lastEffectiveReps}</span>
      </div>
      <div className="space-y-3">
        {sets.map((set, index) => (
          <div key={index} className="flex items-center space-x-3">
            <span className="text-pms-text-secondary w-12 text-sm">Set {index + 1}</span>
            <input
              type="number"
              placeholder="回数"
              value={set.reps}
              onChange={(e) => handleInputChange(index, 'reps', e.target.value)}
              className="input-base flex-1"
            />
            <input
              type="number"
              placeholder="重量 (kg)"
              value={set.weight}
              onChange={(e) => handleInputChange(index, 'weight', e.target.value)}
              className="input-base flex-1"
            />
            <button onClick={() => removeSet(index)} className="text-pms-text-secondary hover:text-pms-accent-error transition-colors">
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>
      <button onClick={addSet} className="mt-4 flex items-center text-sm text-pms-accent-cyan hover:brightness-125 font-semibold transition-all">
        <PlusCircleIcon className="h-5 w-5 mr-1" />
        セットを追加
      </button>
    </div>
  );
};

const WorkoutConsole = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedExercise, setSelectedExercise] = useState<{id: string, name: string} | null>(null);

    const todaysWorkoutId = dummyProfile.workout_schedule[String(dayOfWeek) as keyof typeof dummyProfile.workout_schedule];

    const workoutPlan = useMemo(() => {
        return dummyProfile.workout_library.find(w => w.workout_id === todaysWorkoutId);
    }, [todaysWorkoutId]);

    const lastLogs = useMemo(() => {
        const logMap = new Map<string, string>();
        if (!workoutPlan) return logMap;

        const sortedLogs = [...dummyProfile.daily_logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        for (const exercise of workoutPlan.exercises) {
            const relevantLog = sortedLogs.find(log => 
                log.workout_performed && log.workout_performed.some(ex => ex.exercise_id === exercise.exercise_id)
            );

            if (relevantLog && relevantLog.workout_performed) {
                const lastWorkoutForExercise = relevantLog.workout_performed.find((ex: any) => ex.exercise_id === exercise.exercise_id);
                if (lastWorkoutForExercise) {
                    logMap.set(exercise.exercise_id, `${lastWorkoutForExercise.effective_reps} 回`);
                }
            }
        }
        return logMap;
    }, [workoutPlan]);
    
    const exerciseHistory = useMemo(() => {
        if (!selectedExercise) return [];
        const history: HistoryRecord[] = [];
        
        const sortedLogs = [...dummyProfile.daily_logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        for (const log of sortedLogs) {
            if (log.workout_performed) {
                const performed = log.workout_performed.find(p => p.exercise_id === selectedExercise.id);
                if (performed) {
                    history.push({
                        date: log.date,
                        performance: `${performed.effective_reps} 回 x ${performed.sets[0]?.weight || 0} kg`
                    });
                }
            }
        }
        return history;
    }, [selectedExercise]);

    const handleOpenHistory = (exerciseId: string, exerciseName: string) => {
        setSelectedExercise({ id: exerciseId, name: exerciseName });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedExercise(null);
    };

    if (todaysWorkoutId === "rest" || !workoutPlan) {
        return (
            <div className="p-6 rounded-2xl">
                <h3 className="text-xl font-bold text-pms-text-primary mb-4">今日のワークアウト</h3>
                <div className="text-center py-16 bg-pms-bg-dark border border-pms-border rounded-xl">
                    <p className="text-pms-text-secondary text-lg">今日は休息日です</p>
                    <p className="text-pms-text-secondary text-sm mt-1">お疲れ様でした！</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-2 md:p-6 rounded-2xl">
            <h3 className="text-xl font-bold text-pms-text-primary mb-2">今日のワークアウト</h3>
            <p className="text-pms-text-secondary mb-6">{workoutPlan.workout_name}</p>
            <div>
                {workoutPlan.exercises.map(exercise => (
                    <Exercise
                        key={exercise.exercise_id}
                        exerciseId={exercise.exercise_id}
                        exerciseName={exercise.exercise_name}
                        lastEffectiveReps={lastLogs.get(exercise.exercise_id) || "N/A"}
                        onOpenHistory={() => handleOpenHistory(exercise.exercise_id, exercise.exercise_name)}
                    />
                ))}
            </div>
            <ExerciseHistoryModal 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                exerciseName={selectedExercise?.name || ''}
                history={exerciseHistory}
            />
        </div>
    );
};

export default WorkoutConsole;
