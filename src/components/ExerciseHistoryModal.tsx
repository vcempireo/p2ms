'use client';

import { XMarkIcon } from '@heroicons/react/24/solid';
import { format } from 'date-fns';

interface HistoryRecord {
  date: string;
  performance: string;
}

interface ExerciseHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  history: HistoryRecord[];
}

const ExerciseHistoryModal = ({ isOpen, onClose, exerciseName, history }: ExerciseHistoryModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center p-4">
      <div className="bg-pms-bg-dark border border-pms-border rounded-2xl shadow-glow-white max-w-lg w-full p-6 relative animate-fade-in">
        <h3 className="text-2xl font-bold text-pms-text-primary mb-4">{exerciseName} の履歴</h3>
        <button onClick={onClose} className="absolute top-4 right-4 text-pms-text-secondary hover:text-pms-accent-error transition-colors">
          <XMarkIcon className="h-7 w-7" />
        </button>
        <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
          {history.length > 0 ? (
            history.map((record, index) => (
              <div key={index} className="bg-pms-bg-light p-3 rounded-lg flex justify-between items-center border border-pms-border/50">
                <span className="text-pms-text-secondary font-medium">{format(new Date(record.date), 'yyyy/MM/dd')}</span>
                <span className="text-pms-text-primary font-semibold">{record.performance}</span>
              </div>
            ))
          ) : (
            <p className="text-pms-text-secondary text-center py-8">この種目の過去の記録はありません。</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExerciseHistoryModal;
