'use client';

import React, { useEffect, useState } from 'react';
import {
    Button, Typography, Container, Box, CircularProgress, Grid,
    Card, CardContent, CardHeader, LinearProgress, List, ListItem,
    ListItemText, Divider, Alert, Stack, ListItemIcon, Paper
} from '@mui/material';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, firestore } from '@/lib/firebase/clientApp';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// --- Helper Functions & Interfaces ---

enum FitnessGoal {
    WEIGHT_LOSS = 'weight_loss',
    MUSCLE_GAIN = 'muscle_gain',
    MAINTENANCE = 'maintenance',
}

interface FoodEntry {
    id?: string;
    foodName: string;
    date: string;
    mealType: string;
    calories: number;
    proteinGrams: number;
    carbGrams: number;
    fatGrams: number;
}

interface UserProfile {
    birthDate?: string | Timestamp;
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
    date: string;
}

const calculateAge = (birthDate: string): number => {
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
    return 0;
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
        calorieTarget -= 500;
    } else if (fitnessGoal === FitnessGoal.MUSCLE_GAIN) {
        calorieTarget += 300;
    }
    return { calorieTarget };
};

const calculateMacronutrients = (calorieTarget: number, fitnessGoal: FitnessGoal): { proteinGrams: number; carbGrams: number; fatGrams: number } => {
    let proteinPercentage = 0.3;
    let carbPercentage = 0.4;
    let fatPercentage = 0.3;
    if (fitnessGoal === FitnessGoal.MUSCLE_GAIN) {
        proteinPercentage = 0.35; carbPercentage = 0.45; fatPercentage = 0.20;
    } else if (fitnessGoal === FitnessGoal.WEIGHT_LOSS) {
        proteinPercentage = 0.30; carbPercentage = 0.35; fatPercentage = 0.35;
    }
    const proteinGrams = (calorieTarget * proteinPercentage) / 4;
    const carbGrams = (calorieTarget * carbPercentage) / 4;
    const fatGrams = (calorieTarget * fatPercentage) / 9;
    return { proteinGrams, carbGrams, fatGrams };
};

const calculateProgress = (consumed: number, target: number) => {
    if (target <= 0) return 0;
    const progress = (consumed / target) * 100;
    return Math.max(0, Math.min(progress, 100));
};

// --- Sub-components ---

const NutrientProgress = ({ name, consumed, target, unit, color }: { name: string, consumed: number, target: number, unit: string, color: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'inherit' }) => (
    <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" fontWeight="500">{name}</Typography>
            <Typography variant="body2" color="text.secondary">{consumed.toFixed(1)}{unit} / {target.toFixed(1)}{unit}</Typography>
        </Stack>
        <LinearProgress
            color={color}
            variant="determinate"
            value={calculateProgress(consumed, target)}
            sx={{ height: 8, borderRadius: 5, mt: 0.5, mb: 1 }}
        />
    </Box>
);

const MacroDoughnutChart = ({ data }: { data: { protein: number, carbs: number, fat: number } }) => {
    const chartData = [
        { name: 'Protein', value: data.protein, color: '#f44336' }, // Corresponds to secondary color
        { name: 'Carbs', value: data.carbs, color: '#4caf50' },   // Corresponds to success color
        { name: 'Fat', value: data.fat, color: '#ff9800' },     // Corresponds to warning color
    ].filter(item => item.value > 0);

    if ((data.protein + data.carbs + data.fat) === 0) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
                <Typography color="text.secondary">Log food to see macro breakdown</Typography>
            </Box>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={200}>
            <PieChart>
                <Tooltip formatter={(value, name) => [`${Number(value).toFixed(1)}g`, name]} />
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                >
                    {chartData.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={entry.color} />
                    ))}
                </Pie>
            </PieChart>
        </ResponsiveContainer>
    );
};


// --- Main Dashboard Component ---

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
                const foodEntriesData: FoodEntry[] = foodSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FoodEntry));
                setDailyFoodEntries(foodEntriesData);

                const exerciseEntriesQuery = query(
                    collection(firestore, 'users', user.uid, 'exerciseEntries'),
                    where('date', '==', todayStr)
                );
                const exerciseSnapshot = await getDocs(exerciseEntriesQuery);
                const exerciseEntriesData: ExerciseEntry[] = exerciseSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExerciseEntry));
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

                if (age > 0 && weight > 0 && height > 0) {
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
        if (typeof window !== 'undefined') {
            router.push('/login');
        }
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
    }

    const netCaloriesConsumed = consumedNutrients.calories - caloriesBurnedToday;
    const remainingCalories = dailyTargets ? dailyTargets.calories - netCaloriesConsumed : 0;
    const calorieProgress = dailyTargets ? calculateProgress(netCaloriesConsumed, dailyTargets.calories) : 0;

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h4" component="h1" fontWeight="bold">
                    Daily Dashboard
                </Typography>
                <Button variant="outlined" onClick={handleLogout}>Logout</Button>
            </Stack>

            {!userProfile && <Alert severity="warning" sx={{ mb: 2 }}>Please complete your profile to see personalized targets.</Alert>}
            {userProfile && !dailyTargets && <Alert severity="warning" sx={{ mb: 2 }}>Profile incomplete. Cannot calculate daily targets. Please <Button size="small" variant="text" onClick={() => router.push('/profile')}>complete your profile</Button>.</Alert>}

            <Grid container spacing={3} sx={{ mt: 1 }}>
                {dailyTargets && (
                    <Grid size={{ xs: 12, md: 5, lg: 4 }}>
                        <Card sx={{ height: '100%' }}>
                            <CardHeader title="Calorie Goal" />
                            <CardContent sx={{ pt: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
                                    <CircularProgress variant="determinate" value={100} size={180} thickness={2} sx={{ color: 'grey.300' }}/>
                                    <CircularProgress
                                        variant="determinate"
                                        value={calorieProgress}
                                        size={180}
                                        thickness={2.5}
                                        sx={{ position: 'absolute', left: 0, color: 'primary.main' }}
                                    />
                                    <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                        <Typography variant="h4" component="div" color="primary.main" fontWeight="bold">
                                            {remainingCalories.toFixed(0)}
                                        </Typography>
                                        <Typography variant="body1" color="text.secondary">Remaining</Typography>
                                    </Box>
                                </Box>
                                <Stack spacing={1} sx={{ width: '100%' }}>
                                    <Divider><Typography variant="caption">Summary</Typography></Divider>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography>Base Goal</Typography>
                                        <Typography>{dailyTargets.calories.toFixed(0)}</Typography>
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography>Food</Typography>
                                        <Typography>{consumedNutrients.calories.toFixed(0)}</Typography>
                                    </Stack>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography>Exercise</Typography>
                                        <Typography>-{caloriesBurnedToday.toFixed(0)}</Typography>
                                    </Stack>
                                    <Divider />
                                    <Stack direction="row" justifyContent="space-between" sx={{fontWeight: 'bold'}}>
                                        <Typography fontWeight="bold">Net</Typography>
                                        <Typography fontWeight="bold">{netCaloriesConsumed.toFixed(0)}</Typography>
                                    </Stack>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                )}

                <Grid size={{ xs: 12, md: 7, lg: 8 }}>
                    <Stack spacing={3}>
                        {dailyTargets && (
                            <Card>
                                <CardHeader title="Macronutrients" />
                                <CardContent>
                                    <Grid container spacing={3} alignItems="center">
                                        <Grid size={{ xs: 12, sm: 5 }}>
                                            <MacroDoughnutChart data={{ protein: consumedNutrients.protein, carbs: consumedNutrients.carbs, fat: consumedNutrients.fat }} />
                                        </Grid>
                                        <Grid size={{ xs: 12, sm: 7 }}>
                                            <Stack spacing={2}>
                                                <NutrientProgress name="Protein" consumed={consumedNutrients.protein} target={dailyTargets.protein} unit="g" color="secondary" />
                                                <NutrientProgress name="Carbs" consumed={consumedNutrients.carbs} target={dailyTargets.carbs} unit="g" color="success" />
                                                <NutrientProgress name="Fat" consumed={consumedNutrients.fat} target={dailyTargets.fat} unit="g" color="warning" />
                                            </Stack>
                                        </Grid>
                                    </Grid>
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader title="Today's Log" />
                            <CardContent>
                                <Typography variant="h6" fontSize="1.1rem" gutterBottom>Food</Typography>
                                {dailyFoodEntries.length > 0 ? (
                                    <List dense sx={{ maxHeight: 180, overflow: 'auto' }}>
                                        {dailyFoodEntries.map(entry => (
                                            <ListItem key={entry.id} divider>
                                                <ListItemIcon sx={{minWidth: 40}}><RestaurantMenuIcon fontSize="small" /></ListItemIcon>
                                                <ListItemText
                                                    primary={`${entry.foodName} (${entry.mealType})`}
                                                    secondary={`Cals: ${entry.calories.toFixed(0)}, P: ${entry.proteinGrams.toFixed(1)}g, C: ${entry.carbGrams.toFixed(1)}g, F: ${entry.fatGrams.toFixed(1)}g`}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Typography sx={{fontStyle: 'italic', color: 'text.secondary', ml: 2}}>No food logged yet.</Typography>
                                )}

                                <Divider sx={{ my: 2 }} />

                                <Typography variant="h6" fontSize="1.1rem" gutterBottom>Exercise</Typography>
                                {dailyExerciseEntries.length > 0 ? (
                                    <List dense sx={{ maxHeight: 180, overflow: 'auto' }}>
                                        {dailyExerciseEntries.map(entry => (
                                            <ListItem key={entry.id} divider>
                                                <ListItemIcon sx={{minWidth: 40}}><FitnessCenterIcon fontSize="small" /></ListItemIcon>
                                                <ListItemText
                                                    primary={entry.exerciseName}
                                                    secondary={`Calories Burned: ${entry.caloriesBurned.toFixed(0)} kcal`}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                ) : (
                                    <Typography sx={{fontStyle: 'italic', color: 'text.secondary', ml: 2}}>No exercise logged yet.</Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Stack>
                </Grid>
            </Grid>

            <Paper elevation={3} sx={{ p: 2, mt: 4 }}>
                <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="center" useFlexGap>
                    <Button variant="contained" size="large" onClick={() => router.push('/log/food')}>Log Food</Button>
                    <Button variant="contained" color="info" size="large" onClick={() => router.push('/log/exercise')}>Log Exercise</Button>
                    <Button variant="contained" color="secondary" size="large" onClick={() => router.push('/ai-chat')}>AI Coach</Button>
                    <Button variant="outlined" size="large" onClick={() => router.push('/profile')}>My Profile</Button>
                </Stack>
            </Paper>
        </Container>
    );
}