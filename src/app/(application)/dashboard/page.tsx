'use client';

import React, { useEffect, useState } from 'react';
import {
    Button, Typography, Container, Box, CircularProgress, Grid, // Grid is imported
    Card, CardContent, LinearProgress,
    List,
    ListItem,
    ListItemText, Divider, Alert
} from '@mui/material';
import { useRouter } from 'next/navigation'; // Assuming next/navigation for useRouter
import { useAuth } from '@/context/AuthContext'; // Corrected path based on your usage
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth'; // Import from 'firebase/auth'
import { auth, firestore } from '@/lib/firebase/clientApp'; // Corrected path based on your usage

// --- Helper functions (assuming these are defined elsewhere or should be added) ---
// FitnessGoal enum/type (replace with your actual definition if different)
enum FitnessGoal {
    WEIGHT_LOSS = 'weight_loss',
    MUSCLE_GAIN = 'muscle_gain',
    MAINTENANCE = 'maintenance',
// Add other goals as needed
}

// Make sure these functions are defined or imported. Placeholder definitions:
const calculateAge = (birthDate: string): number => {
// Simple age calculation, consider a robust library for production
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

const calculateBMR = (weightKg: number, heightCm: number, age: number, gender: string): number => {
    if (gender === 'male') {
        return 88.362 + (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * age);
    } else if (gender === 'female') {
        return 447.593 + (9.247 * weightKg) + (3.098 * heightCm) - (4.330 * age);
    }
    return 0; // Default or throw error
};

const calculateTDEE = (bmr: number, activityLevel: string): number => {
    const activityMultipliers: { [key: string]: number } = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725,
        very_active: 1.9,
    };
    return bmr * (activityMultipliers[activityLevel] || 1.2);
};

const calculateCalorieTarget = (tdee: number, fitnessGoal: FitnessGoal): { calorieTarget: number } => {
    let calorieTarget = tdee;
    if (fitnessGoal === FitnessGoal.WEIGHT_LOSS) {
        calorieTarget -= 500; // Example: 500 calorie deficit
    } else if (fitnessGoal === FitnessGoal.MUSCLE_GAIN) {
        calorieTarget += 300; // Example: 300 calorie surplus
    }
    return { calorieTarget };
};

const calculateMacronutrients = (calorieTarget: number, fitnessGoal: FitnessGoal): { proteinGrams: number; carbGrams: number; fatGrams: number } => {
// Example macronutrient split (this can be much more sophisticated)
    let proteinPercentage = 0.3; // 30%
    let carbPercentage = 0.4; // 40%
    let fatPercentage = 0.3; // 30%

    if (fitnessGoal === FitnessGoal.MUSCLE_GAIN) {
        proteinPercentage = 0.35;
        carbPercentage = 0.45;
        fatPercentage = 0.20;
    } else if (fitnessGoal === FitnessGoal.WEIGHT_LOSS) {
        proteinPercentage = 0.30;
        carbPercentage = 0.35;
        fatPercentage = 0.35;
    }

    const proteinGrams = (calorieTarget * proteinPercentage) / 4;
    const carbGrams = (calorieTarget * carbPercentage) / 4;
    const fatGrams = (calorieTarget * fatPercentage) / 9;

    return { proteinGrams, carbGrams, fatGrams };
};
// --- End of Helper functions ---


interface FoodEntry {
    id?: string;
    foodName: string;
    date: string; // Should be ISO string YYYY-MM-DD
    mealType: string;
    calories: number;
    proteinGrams: number;
    carbGrams: number;
    fatGrams: number;
}

interface UserProfile {
    birthDate?: string | Timestamp; // Keep Timestamp as a possibility from Firestore
    weightKg?: number | string;
    heightCm?: number | string;
    gender?: string;
    activityLevel?: string;
    fitnessGoal?: FitnessGoal;
    targetCalories?: number;
    targetProteinGrams?: number;
    targetCarbGrams?: number;
    targetFatGrams?: number;
}

interface DailyTargets {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
}
interface ExerciseEntry {
    id?: string;
    exerciseName: string;
    caloriesBurned: number;
    date: string; // Should be ISO string YYYY-MM-DD
}


const calculateProgress = (consumed: number, target: number) => {
    if (target <= 0) return 0;
    const progress = (consumed / target) * 100;
    return Math.max(0, Math.min(progress, 100));
};


export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [dailyFoodEntries, setDailyFoodEntries] = useState<FoodEntry[]>([]);
    const [dailyExerciseEntries, setDailyExerciseEntries] = useState<ExerciseEntry[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [dailyTargets, setDailyTargets] = useState<DailyTargets | null>(null);
    const [consumedNutrients, setConsumedNutrients] = useState<DailyTargets>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    const [caloriesBurnedToday, setCaloriesBurnedToday] = useState<number>(0);
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        if (user) {
            setIsLoadingData(true);
            const fetchUserProfile = async () => {
                const profileDocRef = doc(firestore, 'users', user.uid);
                const docSnap = await getDoc(profileDocRef);
                if (docSnap.exists()) {
                    const profileData = docSnap.data() as UserProfile;
                    if (profileData.birthDate && typeof profileData.birthDate !== 'string' && (profileData.birthDate as Timestamp).toDate) {
                        profileData.birthDate = (profileData.birthDate as Timestamp).toDate().toISOString().split('T')[0];
                    }
                    setUserProfile(profileData);
                } else {
                    console.log("No user profile found for target calculation.");
                    setUserProfile(null);
                }
            };

            const todayStr = new Date().toISOString().split('T')[0];
            const fetchTodaysEntries = async () => {
                const foodEntriesQuery = query(
                    collection(firestore, 'users', user.uid, 'foodEntries'),
                    where('date', '==', todayStr)
                );
                const foodSnapshot = await getDocs(foodEntriesQuery);
                const foodEntriesData: FoodEntry[] = [];
                foodSnapshot.forEach((doc) => {
                    foodEntriesData.push({ id: doc.id, ...doc.data() } as FoodEntry);
                });
                setDailyFoodEntries(foodEntriesData);

                const exerciseEntriesQuery = query(
                    collection(firestore, 'users', user.uid, 'exerciseEntries'),
                    where('date', '==', todayStr)
                );
                const exerciseSnapshot = await getDocs(exerciseEntriesQuery);
                const exerciseEntriesData: ExerciseEntry[] = [];
                exerciseSnapshot.forEach((doc) => {
                    exerciseEntriesData.push({ id: doc.id, ...doc.data() } as ExerciseEntry);
                });
                setDailyExerciseEntries(exerciseEntriesData);
            };

            Promise.all([fetchUserProfile(), fetchTodaysEntries()])
                .catch(error => console.error("Error fetching dashboard data:", error))
                .finally(() => setIsLoadingData(false));

        } else {
            setUserProfile(null);
            setDailyFoodEntries([]);
            setDailyExerciseEntries([]);
            setIsLoadingData(false);
        }
    }, [user]);

    useEffect(() => {
        if (userProfile) {
            if (userProfile.targetCalories && userProfile.targetProteinGrams && userProfile.targetCarbGrams && userProfile.targetFatGrams) {
                setDailyTargets({
                    calories: userProfile.targetCalories,
                    protein: userProfile.targetProteinGrams,
                    carbs: userProfile.targetCarbGrams,
                    fat: userProfile.targetFatGrams,
                });
            } else if (userProfile.birthDate && typeof userProfile.birthDate === 'string' && userProfile.weightKg && userProfile.heightCm && userProfile.gender && userProfile.activityLevel && userProfile.fitnessGoal) {
                const age = calculateAge(userProfile.birthDate);
                const weight = parseFloat(userProfile.weightKg as string);
                const height = parseFloat(userProfile.heightCm as string);

                if (age > 0 && weight > 0 && height > 0 && (userProfile.gender === 'male' || userProfile.gender === 'female')) {
                    const bmr = calculateBMR(weight, height, age, userProfile.gender);
                    const tdee = calculateTDEE(bmr, userProfile.activityLevel);
                    const { calorieTarget } = calculateCalorieTarget(tdee, userProfile.fitnessGoal);
                    const macros = calculateMacronutrients(calorieTarget, userProfile.fitnessGoal);
                    setDailyTargets({
                        calories: parseFloat(calorieTarget.toFixed(0)),
                        protein: parseFloat(macros.proteinGrams.toFixed(1)),
                        carbs: parseFloat(macros.carbGrams.toFixed(1)),
                        fat: parseFloat(macros.fatGrams.toFixed(1)),
                    });
                } else {
                    setDailyTargets(null);
                }
            } else {
                console.log("Insufficient profile data to calculate targets.");
                setDailyTargets(null);
            }
        } else {
            setDailyTargets(null);
        }
    }, [userProfile]);


    useEffect(() => {
        const totals = dailyFoodEntries.reduce(
            (acc, entry) => {
                acc.calories += entry.calories || 0;
                acc.protein += entry.proteinGrams || 0;
                acc.carbs += entry.carbGrams || 0;
                acc.fat += entry.fatGrams || 0;
                return acc;
            },
            { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );
        setConsumedNutrients(totals);
    }, [dailyFoodEntries]);

    useEffect(() => {
        const totalBurned = dailyExerciseEntries.reduce(
            (acc, entry) => acc + (entry.caloriesBurned || 0),
            0
        );
        setCaloriesBurnedToday(totalBurned);
    }, [dailyExerciseEntries]);


    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    if (authLoading || isLoadingData) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
    }

    if (!user) {
// Client-side redirect
        if (typeof window !== 'undefined') {
            router.push('/login');
        }
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>; // Show loader while redirecting
    }

    const netCaloriesConsumed = consumedNutrients.calories - caloriesBurnedToday;
    const remainingCalories = dailyTargets ? dailyTargets.calories - netCaloriesConsumed : null;


    return (
        <Container maxWidth="lg">
            <Box sx={{ my: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h4" component="h1" color="primary">
                        Daily Dashboard
                    </Typography>
                    <Button variant="outlined" onClick={handleLogout}>Logout</Button>
                </Box>
                {user.email && (
                    <Typography variant="subtitle1" gutterBottom color="textSecondary">
                        Logged in as: {user.email}
                    </Typography>
                )}

                {!userProfile && <Alert severity="warning" sx={{mb:2}}>Please complete your profile to see personalized targets.</Alert>}
                {userProfile && !dailyTargets && <Alert severity="info" sx={{mb:2}}>Calculating targets... Ensure your profile is complete for accuracy.</Alert>}
                {userProfile && dailyTargets === null && (!userProfile.birthDate || !userProfile.weightKg || !userProfile.heightCm || !userProfile.gender || !userProfile.activityLevel || !userProfile.fitnessGoal) && (
                    <Alert severity="warning" sx={{mb:2}}>
                        Profile incomplete. Cannot calculate daily targets. Please <Button size="small" variant="outlined" onClick={() => router.push('/profile')}>complete your profile</Button>.
                    </Alert>
                )}

                {/* UPDATED GRID USAGE STARTS HERE */}
                <Grid container spacing={3} justifyContent="center" sx={{ mt: 2 }}>
                    {dailyTargets && remainingCalories !== null && (
                        <Grid size={{ xs: 11, sm: 10, md: 6 }}> {/* Changed from item xs/sm/md */}
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>Daily Goals</Typography>
                                    {/* Calories Section */}
                                    <Box sx={{ mb: 2 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="subtitle1">Net Calories</Typography>
                                            <Typography variant="subtitle1">
                                                {netCaloriesConsumed.toFixed(0)} / {dailyTargets.calories.toFixed(0)} kcal
                                            </Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={calculateProgress(netCaloriesConsumed, dailyTargets.calories)}
                                            sx={{ height: 10, borderRadius: 5, my: 0.5 }}
                                        />
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                                            <Typography variant="caption">
                                                Food: {consumedNutrients.calories.toFixed(0)} kcal
                                            </Typography>
                                            <Typography variant="caption">
                                                Exercise: -{caloriesBurnedToday.toFixed(0)} kcal
                                            </Typography>
                                        </Box>
                                        <Typography variant="caption" display="block" textAlign="right" sx={{mt: 0.5}}>
                                            Remaining: {remainingCalories.toFixed(0)} kcal
                                        </Typography>
                                    </Box>
                                    <Divider sx={{my:1}}/>
                                    {/* Protein */}
                                    <Box sx={{ mb: 2 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="subtitle1">Protein</Typography>
                                            <Typography variant="subtitle1">{consumedNutrients.protein.toFixed(1)} / {dailyTargets.protein.toFixed(1)} g</Typography>
                                        </Box>
                                        <LinearProgress color="secondary" variant="determinate" value={calculateProgress(consumedNutrients.protein, dailyTargets.protein)} sx={{ height: 10, borderRadius: 5, my: 0.5 }}/>
                                        <Typography variant="caption" display="block" textAlign="right">Remaining: {(dailyTargets.protein - consumedNutrients.protein).toFixed(1)} g</Typography>
                                    </Box>
                                    <Divider sx={{my:1}}/>
                                    {/* Carbs */}
                                    <Box sx={{ mb: 2 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="subtitle1">Carbs</Typography>
                                            <Typography variant="subtitle1">{consumedNutrients.carbs.toFixed(1)} / {dailyTargets.carbs.toFixed(1)} g</Typography>
                                        </Box>
                                        <LinearProgress color="success" variant="determinate" value={calculateProgress(consumedNutrients.carbs, dailyTargets.carbs)} sx={{ height: 10, borderRadius: 5, my: 0.5 }}/>
                                        <Typography variant="caption" display="block" textAlign="right">Remaining: {(dailyTargets.carbs - consumedNutrients.carbs).toFixed(1)} g</Typography>
                                    </Box>
                                    <Divider sx={{my:1}}/>
                                    {/* Fat */}
                                    <Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="subtitle1">Fat</Typography>
                                            <Typography variant="subtitle1">{consumedNutrients.fat.toFixed(1)} / {dailyTargets.fat.toFixed(1)} g</Typography>
                                        </Box>
                                        <LinearProgress color="warning" variant="determinate" value={calculateProgress(consumedNutrients.fat, dailyTargets.fat)} sx={{ height: 10, borderRadius: 5, my: 0.5 }}/>
                                        <Typography variant="caption" display="block" textAlign="right">Remaining: {(dailyTargets.fat - consumedNutrients.fat).toFixed(1)} g</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    )}

                    <Grid size={{ xs: 11, sm: 10, md: (dailyTargets ? 6 : 12) }}> {/* Changed from item xs/sm/md */}
                        {/* Today's Logged Food Card */}
                        <Card sx={{ mb: 3 }}>
                            <CardContent>
                                {/* CORRECTED LINE BELOW */}
                                <Typography variant="h6">Today&apos;s Logged Food</Typography>
                                {dailyFoodEntries.length > 0 ? (
                                    <List sx={{ maxHeight: 150, overflow: 'auto', mt: 1 }}>
                                        {dailyFoodEntries.map(entry => (
                                            <ListItem key={entry.id} divider sx={{py: 0.5}}>
                                                <ListItemText
                                                    primary={`${entry.foodName} (${entry.mealType})`}
                                                    secondary={`Cals: ${entry.calories.toFixed(0)}, P: ${entry.proteinGrams.toFixed(1)}g, C: ${entry.carbGrams.toFixed(1)}g, F: ${entry.fatGrams.toFixed(1)}g`}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Typography sx={{mt:1, fontStyle: 'italic'}}>No food logged for today yet.</Typography>
                                )}
                            </CardContent>
                        </Card>
                        {/* Today's Logged Exercise Card */}
                        <Card>
                            <CardContent>
                                {/* CORRECTED LINE BELOW */}
                                <Typography variant="h6">Today&apos;s Logged Exercise</Typography>
                                {dailyExerciseEntries.length > 0 ? (
                                    <List sx={{ maxHeight: 150, overflow: 'auto', mt: 1 }}>
                                        {dailyExerciseEntries.map(entry => (
                                            <ListItem key={entry.id} divider sx={{py: 0.5}}>
                                                <ListItemText
                                                    primary={entry.exerciseName}
                                                    secondary={`Calories Burned: ${entry.caloriesBurned.toFixed(0)} kcal`}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Typography sx={{mt:1, fontStyle: 'italic'}}>No exercise logged for today yet.</Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
                {/* UPDATED GRID USAGE ENDS HERE */}

                <Box sx={{mt: 3, display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center'}}>
                    <Button variant="contained" size="large" onClick={() => router.push('/log/food')}>Log Food</Button>
                    <Button variant="contained" color="info" size="large" onClick={() => router.push('/log/exercise')}>Log Exercise</Button>
                    <Button variant="contained" color="secondary" size="large" onClick={() => router.push('/ai-chat')}>AI Coach</Button>
                    <Button variant="outlined" size="large" onClick={() => router.push('/profile')}>My Profile</Button>
                </Box>
            </Box>
        </Container>
    );
}