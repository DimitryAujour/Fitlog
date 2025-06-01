// src/lib/aiContextHelper.ts
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase/clientApp'; // Your existing Firebase setup
import {
    calculateAge,
    calculateBMR,
    calculateTDEE,
    calculateCalorieTarget,
    calculateMacronutrients,
    FitnessGoal
} from '@/lib/utils/fitnessCalculations'; // Your existing fitness calculation utilities

// Interface for the structured profile and target data we want for the AI
export interface AiContextUserProfile {
    fitnessGoal?: string;
    activityLevel?: string;
    targetCalories?: number;
    targetProteinGrams?: number;
    targetCarbGrams?: number;
    targetFatGrams?: number;
    // Optional: Add other details if useful for AI, e.g., age, specific dietary preferences
    // For example:
    // age?: number;
    // gender?: string;
    // weightKg?: number;
    // heightCm?: number;
}

// Interface for the summary of today's nutritional intake
export interface AiContextTodaysLogSummary {
    consumedCalories: number;
    consumedProtein: number;
    consumedCarbs: number;
    consumedFat: number;
}

/**
 * Fetches the user's profile and calculates/retrieves their daily targets.
 * This adapts logic from your profile/page.tsx.
 */
export async function getUserProfileAndTargetsForAI(userId: string): Promise<AiContextUserProfile | null> {
    if (!userId) return null;
    const profileDocRef = doc(firestore, 'users', userId);
    try {
        const docSnap = await getDoc(profileDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            const profileForAI: AiContextUserProfile = {
                fitnessGoal: data.fitnessGoal,
                activityLevel: data.activityLevel,
            };

            // Prefer directly stored targets if available (as set by profile page)
            if (data.targetCalories && data.targetProteinGrams && data.targetCarbGrams && data.targetFatGrams) {
                profileForAI.targetCalories = data.targetCalories;
                profileForAI.targetProteinGrams = data.targetProteinGrams;
                profileForAI.targetCarbGrams = data.targetCarbGrams;
                profileForAI.targetFatGrams = data.targetFatGrams;
            }
            // Else, if enough profile data exists, calculate them
            else if (data.birthDate && data.weightKg && data.heightCm && data.gender && data.activityLevel && data.fitnessGoal) {
                const birthDateStr = data.birthDate instanceof Timestamp
                    ? data.birthDate.toDate().toISOString().split('T')[0]
                    : data.birthDate as string;
                const age = calculateAge(birthDateStr);
                const weight = parseFloat(data.weightKg as string);
                const height = parseFloat(data.heightCm as string);

                if (age > 0 && weight > 0 && height > 0 && (data.gender === 'male' || data.gender === 'female')) {
                    const bmr = calculateBMR(weight, height, age, data.gender);
                    const tdee = calculateTDEE(bmr, data.activityLevel);
                    const { calorieTarget } = calculateCalorieTarget(tdee, data.fitnessGoal as FitnessGoal);
                    const macros = calculateMacronutrients(calorieTarget, data.fitnessGoal as FitnessGoal);

                    profileForAI.targetCalories = parseFloat(calorieTarget.toFixed(0));
                    profileForAI.targetProteinGrams = parseFloat(macros.proteinGrams.toFixed(1));
                    profileForAI.targetCarbGrams = parseFloat(macros.carbGrams.toFixed(1));
                    profileForAI.targetFatGrams = parseFloat(macros.fatGrams.toFixed(1));
                    // You could also add age to profileForAI if desired:
                    // profileForAI.age = age;
                }
            }
            console.log("[aiContextHelper] Fetched profile for AI:", profileForAI);
            return profileForAI;
        } else {
            console.warn("[aiContextHelper] No user profile document found for user:", userId);
            return null;
        }
    } catch (error) {
        console.error("[aiContextHelper] Error fetching user profile for AI:", error);
        return null;
    }
}

/**
 * Fetches and summarizes the user's food log entries for today.
 * This adapts logic from your dashboard/page.tsx.
 */
export async function getTodaysFoodLogSummaryForAI(userId: string): Promise<AiContextTodaysLogSummary> {
    const summary: AiContextTodaysLogSummary = {
        consumedCalories: 0,
        consumedProtein: 0,
        consumedCarbs: 0,
        consumedFat: 0,
    };
    if (!userId) return summary;

    const todayStr = new Date().toISOString().split('T')[0];
    const foodEntriesQuery = query(
        collection(firestore, 'users', userId, 'foodEntries'),
        where('date', '==', todayStr)
    );

    try {
        const querySnapshot = await getDocs(foodEntriesQuery);
        querySnapshot.forEach((doc) => {
            const entry = doc.data();
            summary.consumedCalories += entry.calories || 0;
            summary.consumedProtein += entry.proteinGrams || 0;
            summary.consumedCarbs += entry.carbGrams || 0;
            summary.consumedFat += entry.fatGrams || 0;
        });
        console.log("[aiContextHelper] Fetched today's log summary for AI:", summary);
    } catch (error) {
        console.error("[aiContextHelper] Error fetching today's food log summary for AI:", error);
        // Return empty summary on error
    }
    return summary;
}