// src/lib/aiContextHelper.ts
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase/clientApp';
import {
    calculateAge,
    calculateBMR,
    calculateTDEE,
    calculateCalorieTarget,
    calculateMacronutrients,
    FitnessGoal
} from '@/lib/utils/fitnessCalculations';

export interface AiContextUserProfile {
    fitnessGoal?: string;
    activityLevel?: string;
    targetCalories?: number;
    targetProteinGrams?: number;
    targetCarbGrams?: number;
    targetFatGrams?: number;
    // You can add weightKg for more precise AI exercise calorie estimations if needed
    weightKg?: number;
}

export interface AiContextDailySummary { // Renamed for clarity
    consumedCalories: number;
    consumedProtein: number;
    consumedCarbs: number;
    consumedFat: number;
    exerciseCaloriesBurned: number; // New field
    netCaloriesConsumed: number; // New field: consumedCalories - exerciseCaloriesBurned
}

// getUserProfileAndTargetsForAI can remain largely the same, but ensure it fetches weightKg if AI might use it
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
                weightKg: data.weightKg ? parseFloat(data.weightKg) : undefined, // Add weight
            };

            if (data.targetCalories && data.targetProteinGrams && data.targetCarbGrams && data.targetFatGrams) {
                profileForAI.targetCalories = data.targetCalories;
                profileForAI.targetProteinGrams = data.targetProteinGrams;
                profileForAI.targetCarbGrams = data.targetCarbGrams;
                profileForAI.targetFatGrams = data.targetFatGrams;
            }
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


// Updated function to get a more complete daily summary
export async function getDailyNutritionalSummaryForAI(userId: string): Promise<AiContextDailySummary> {
    const summary: AiContextDailySummary = {
        consumedCalories: 0,
        consumedProtein: 0,
        consumedCarbs: 0,
        consumedFat: 0,
        exerciseCaloriesBurned: 0,
        netCaloriesConsumed: 0,
    };
    if (!userId) return summary;

    const todayStr = new Date().toISOString().split('T')[0];

    try {
        // Fetch food entries
        const foodEntriesQuery = query(
            collection(firestore, 'users', userId, 'foodEntries'),
            where('date', '==', todayStr)
        );
        const foodSnapshot = await getDocs(foodEntriesQuery);
        foodSnapshot.forEach((doc) => {
            const entry = doc.data();
            summary.consumedCalories += entry.calories || 0;
            summary.consumedProtein += entry.proteinGrams || 0;
            summary.consumedCarbs += entry.carbGrams || 0;
            summary.consumedFat += entry.fatGrams || 0;
        });

        // Fetch exercise entries
        const exerciseEntriesQuery = query(
            collection(firestore, 'users', userId, 'exerciseEntries'),
            where('date', '==', todayStr)
        );
        const exerciseSnapshot = await getDocs(exerciseEntriesQuery);
        exerciseSnapshot.forEach((doc) => {
            summary.exerciseCaloriesBurned += doc.data().caloriesBurned || 0;
        });

        summary.netCaloriesConsumed = summary.consumedCalories - summary.exerciseCaloriesBurned;

        console.log("[aiContextHelper] Fetched daily nutritional summary for AI:", summary);
    } catch (error) {
        console.error("[aiContextHelper] Error fetching daily nutritional summary for AI:", error);
    }
    return summary;
}