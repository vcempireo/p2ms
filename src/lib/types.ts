export interface WorkoutResult {
  set: number;
  reps: number;
  weight: number;
}

export interface Workout {
  id: string;
  date: string; // Changed from Date to string for serialization
  menu: string;
  name: string;
  goal: string;
  results: WorkoutResult[];
}

export interface WorkoutPattern {
  id: string;
  name: string;
  exercises: { name: string; goal: string }[];
}
