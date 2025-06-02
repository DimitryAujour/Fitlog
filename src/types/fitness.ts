// src/types/fitness.ts (or directly in the page component)
import { Timestamp } from 'firebase/firestore';

export interface ExerciseEntry {
    id?: string; // Optional: Firestore document ID
    userId: string;
    exerciseName: string;
    caloriesBurned: number;
    date: string; // Format: "YYYY-MM-DD"
    durationMinutes?: number; // Optional
    loggedAt: Timestamp;
}