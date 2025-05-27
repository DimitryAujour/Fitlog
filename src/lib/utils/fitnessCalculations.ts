
/**
 * Calculates age based on a birth date string.
 * @param birthDateString - The birth date in YYYY-MM-DD format.
 * @returns The age in years.
 */
export const calculateAge = (birthDateString: string): number => {
    if (!birthDateString) return 0;
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

/**
 * Calculates Basal Metabolic Rate (BMR) using the Mifflin-St Jeor equation.
 * @param weightKg - Weight in kilograms.
 * @param heightCm - Height in centimeters.
 * @param age - Age in years.
 * @param gender - Gender ("male" or "female").
 * @returns The BMR value.
 */
export const calculateBMR = (
    weightKg: number,
    heightCm: number,
    age: number,
    gender: 'male' | 'female' | string // Allow string for flexibility, but logic handles male/female
): number => {
    if (!weightKg || !heightCm || !age || !gender) return 0;

    if (gender.toLowerCase() === 'male') {
        // BMR = (10 × weight in kg) + (6.25 × height in cm) − (5 × age in years) + 5 [cite: 137]
        return (10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5;
    } else if (gender.toLowerCase() === 'female') {
        // BMR = (10 × weight in kg) + (6.25 × height in cm) − (5 × age in years) − 161 [cite: 137]
        return (10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161;
    }
    return 0; // Return 0 if gender is not specified or other
};

/**
 * Calculates Total Daily Energy Expenditure (TDEE).
 * @param bmr - Basal Metabolic Rate.
 * @param activityLevel - A string representing the activity level.
 * Expected values: "sedentary", "light", "moderate", "active", "very_active".
 * @returns The TDEE value.
 */
export const calculateTDEE = (
    bmr: number,
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | string
): number => {
    if (!bmr || !activityLevel) return 0;

    let multiplier = 1.2; // Default to sedentary

    switch (activityLevel.toLowerCase()) {
        case 'sedentary': // Sedentary: BMR × 1.2 [cite: 140]
            multiplier = 1.2;
            break;
        case 'light': // Lightly active (exercise 1-3 days/week): BMR × 1.375 [cite: 140]
            multiplier = 1.375;
            break;
        case 'moderate': // Moderately active (exercise 3-5 days/week): BMR × 1.550 [cite: 140]
            multiplier = 1.550;
            break;
        case 'active': // Very active (exercise 6-7 days/week): BMR × 1.725 [cite: 140]
            // Note: Your schema used 'active' and 'very_active'.
            // Plan text refers to "Very active" for 1.725 and "Extra active" for 1.9
            // Mapping 'active' from schema to the "Very active" multiplier here.
            multiplier = 1.725;
            break;
        case 'very_active': // Extra active (very intense exercise daily or physical job): BMR × 1.9 [cite: 140]
            // Mapping 'very_active' from schema to the "Extra active" multiplier here.
            multiplier = 1.9;
            break;
        default:
            multiplier = 1.2; // Fallback to sedentary if unknown value
    }

    return bmr * multiplier;
};
export type FitnessGoal = 'weightLoss' | 'maintenance' | 'muscleGain' | string;

interface CalorieTargetResult {
    calorieTarget: number;
    deficitOrSurplus: number; // e.g., -500, 0, +300
}

/**
 * Calculates the daily calorie target based on TDEE and fitness goal.
 * @param tdee - Total Daily Energy Expenditure.
 * @param fitnessGoal - The user's fitness goal ("weightLoss", "maintenance", "muscleGain").
 * @returns An object containing the calorieTarget and the deficitOrSurplus.
 */
export const calculateCalorieTarget = (
    tdee: number,
    fitnessGoal: FitnessGoal
): CalorieTargetResult => {
    if (!tdee) return { calorieTarget: 0, deficitOrSurplus: 0 };

    let calorieTarget = tdee;
    let deficitOrSurplus = 0;

    switch (fitnessGoal.toLowerCase()) {
        case 'weightloss': // Matched to fitnessGoalOptions value
            deficitOrSurplus = -500; // Example deficit [cite: 151]
            calorieTarget = tdee + deficitOrSurplus;
            break;
        case 'musclegain': // Matched to fitnessGoalOptions value
            deficitOrSurplus = 300; // Example surplus, plan suggests 300-500 [cite: 151]
            calorieTarget = tdee + deficitOrSurplus;
            break;
        case 'maintenance': // Matched to fitnessGoalOptions value
            deficitOrSurplus = 0;
            calorieTarget = tdee; // [cite: 151]
            break;
        default:
            // Default to maintenance if goal is not recognized
            calorieTarget = tdee;
            deficitOrSurplus = 0;
    }
    return { calorieTarget, deficitOrSurplus };
};

interface MacronutrientTargets {
    proteinGrams: number;
    carbGrams: number;
    fatGrams: number;
    proteinPercentage: number;
    carbPercentage: number;
    fatPercentage: number;
}

// Define default macro ratios based on goals
// These percentages should sum to 100 for each goal
const macroRatiosByGoal = {
    weightloss: { protein: 0.30, carbs: 0.40, fat: 0.30 }, // Example: 30% P, 40% C, 30% F [cite: 152]
    musclegain: { protein: 0.30, carbs: 0.50, fat: 0.20 }, // Example: 30% P, 50% C, 20% F [cite: 152]
    maintenance: { protein: 0.25, carbs: 0.55, fat: 0.20 }, // Example: 25% P, 55% C, 20% F [cite: 153]
};

/**
 * Calculates macronutrient targets in grams based on total calorie target and goal.
 * @param calorieTarget - The total daily calorie target.
 * @param fitnessGoal - The user's fitness goal.
 * @param customRatios - Optional custom ratios { protein: 0-1, carbs: 0-1, fat: 0-1 }.
 * @returns An object with protein, carb, and fat targets in grams and their percentages.
 */
export const calculateMacronutrients = (
    calorieTarget: number,
    fitnessGoal: FitnessGoal,
    customRatios?: { protein: number; carbs: number; fat: number }
): MacronutrientTargets => {
    if (!calorieTarget) return { proteinGrams: 0, carbGrams: 0, fatGrams: 0, proteinPercentage: 0, carbPercentage: 0, fatPercentage: 0 };

    let ratios = customRatios;
    if (!ratios) {
        const goalKey = fitnessGoal.toLowerCase() as keyof typeof macroRatiosByGoal;
        ratios = macroRatiosByGoal[goalKey] || macroRatiosByGoal.maintenance; // Default to maintenance ratios
    }

    const proteinCalories = calorieTarget * ratios.protein;
    const carbCalories = calorieTarget * ratios.carbs;
    const fatCalories = calorieTarget * ratios.fat;

    // Conversion to grams: Protein & Carbs: 4 kcal/g; Fat: 9 kcal/g [cite: 153]
    const proteinGrams = Math.round(proteinCalories / 4);
    const carbGrams = Math.round(carbCalories / 4);
    const fatGrams = Math.round(fatCalories / 9);

    return {
        proteinGrams,
        carbGrams,
        fatGrams,
        proteinPercentage: ratios.protein * 100,
        carbPercentage: ratios.carbs * 100,
        fatPercentage: ratios.fat * 100,
    };
};