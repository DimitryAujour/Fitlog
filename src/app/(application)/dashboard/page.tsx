// src/app/(application)/dashboard/page.tsx
'use client';
import React, { useEffect, useState } from 'react';
import { Button, Typography, Container, Box, CircularProgress, Card, CardContent, LinearProgress, List, ListItem, ListItemText, Divider, Alert, Grid } from '@mui/material';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth, firestore } from '@/lib/firebase/clientApp';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { calculateAge, calculateBMR, calculateTDEE, calculateCalorieTarget, calculateMacronutrients, FitnessGoal } from '@/lib/utils/fitnessCalculations';

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

const calculateProgress = (consumed: number, target: number) => {
    if (target <= 0) return 0;
    const progress = (consumed / target) * 100;
    return Math.max(0, Math.min(progress, 100));
};

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [dailyFoodEntries, setDailyFoodEntries] = useState<FoodEntry[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [dailyTargets, setDailyTargets] = useState<DailyTargets | null>(null);
    const [consumedNutrients, setConsumedNutrients] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        if (user) {
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
            fetchUserProfile();
        } else {
            setUserProfile(null);
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
            }
            else if (userProfile.birthDate && typeof userProfile.birthDate === 'string' && userProfile.weightKg && userProfile.heightCm && userProfile.gender && userProfile.activityLevel && userProfile.fitnessGoal) {
                const age = calculateAge(userProfile.birthDate);
                const weight = parseFloat(userProfile.weightKg as string);
                const height = parseFloat(userProfile.heightCm as string);
                if (age > 0 && weight > 0 && height > 0 && (userProfile.gender === 'male' || userProfile.gender === 'female')) {
                    const bmr = calculateBMR(weight, height, age, userProfile.gender);
                    const tdee = calculateTDEE(bmr, userProfile.activityLevel);
                    const { calorieTarget } = calculateCalorieTarget(tdee, userProfile.fitnessGoal);
                    const macros = calculateMacronutrients(calorieTarget, userProfile.fitnessGoal);
                    setDailyTargets({
                        calories: calorieTarget,
                        protein: macros.proteinGrams,
                        carbs: macros.carbGrams,
                        fat: macros.fatGrams,
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
        if (user) {
            setIsLoadingData(true);
            const todayStr = new Date().toISOString().split('T')[0];
            const foodEntriesQuery = query(
                collection(firestore, 'users', user.uid, 'foodEntries'),
                where('date', '==', todayStr)
            );
            getDocs(foodEntriesQuery)
                .then((querySnapshot) => {
                    const entries: FoodEntry[] = [];
                    querySnapshot.forEach((doc) => {
                        entries.push({ id: doc.id, ...doc.data() } as FoodEntry);
                    });
                    setDailyFoodEntries(entries);
                })
                .catch((error) => {
                    console.error("Error fetching today's food entries: ", error);
                })
                .finally(() => {
                    setIsLoadingData(false);
                });
        } else {
            setDailyFoodEntries([]);
            setIsLoadingData(false);
        }
    }, [user]);

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

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    if (authLoading || (isLoadingData && !userProfile && !dailyTargets)) {
        return <CircularProgress />;
    }

    if (!user) {
        if (typeof window !== 'undefined') {
            router.push('/login');
        }
        return <CircularProgress />;
    }

    const remaining = dailyTargets ? {
        calories: dailyTargets.calories - consumedNutrients.calories,
        protein: dailyTargets.protein - consumedNutrients.protein,
        carbs: dailyTargets.carbs - consumedNutrients.carbs,
        fat: dailyTargets.fat - consumedNutrients.fat,
    } : null;

    return (
        <Container maxWidth="md">
            <Box sx={{ my: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Daily Dashboard
                </Typography>
                <Button variant="outlined" color="secondary" onClick={handleLogout}>
                    Logout
                </Button>
            </Box>
            {user.email && (
                <Typography variant="body1" sx={{ mb: 2 }}>
                    Logged in as: {user.email}
                </Typography>
            )}
            {!userProfile && !isLoadingData && <Alert severity="info" sx={{ mb: 2 }}>Please complete your profile to see personalized targets.</Alert>}
            {!dailyTargets && userProfile && !isLoadingData && <Alert severity="info" sx={{ mb: 2 }}>Calculating targets... Ensure your profile is complete for accuracy.</Alert>}
            {dailyTargets === null && userProfile && !isLoadingData && (!userProfile.birthDate || !userProfile.weightKg || !userProfile.heightCm || !userProfile.gender || !userProfile.activityLevel || !userProfile.fitnessGoal) && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Profile incomplete. Cannot calculate daily targets. Please <Button onClick={() => router.push('/profile')}>complete your profile.</Button>
                </Alert>
            )}

            <Grid container spacing={3}>
                {dailyTargets && remaining && (
                    <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                            <CardContent>
                                <Typography variant="h6" component="h2" gutterBottom>
                                    Daily Goals
                                </Typography>
                                {/* Calories */}
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="body2">
                                        Calories
                                        <Box component="span" sx={{ float: 'right' }}>
                                            {consumedNutrients.calories.toFixed(0)} / {dailyTargets.calories.toFixed(0)} kcal
                                        </Box>
                                    </Typography>
                                    <LinearProgress variant="determinate" value={calculateProgress(consumedNutrients.calories, dailyTargets.calories)} sx={{ height: 10, borderRadius: 5 }} />
                                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                        Remaining: {remaining.calories.toFixed(0)} kcal
                                    </Typography>
                                </Box>
                                {/* Protein */}
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="body2">
                                        Protein
                                        <Box component="span" sx={{ float: 'right' }}>
                                            {consumedNutrients.protein.toFixed(1)} / {dailyTargets.protein.toFixed(1)} g
                                        </Box>
                                    </Typography>
                                    <LinearProgress variant="determinate" value={calculateProgress(consumedNutrients.protein, dailyTargets.protein)} sx={{ height: 10, borderRadius: 5 }} />
                                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                        Remaining: {remaining.protein.toFixed(1)} g
                                    </Typography>
                                </Box>
                                {/* Carbs */}
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="body2">
                                        Carbs
                                        <Box component="span" sx={{ float: 'right' }}>
                                            {consumedNutrients.carbs.toFixed(1)} / {dailyTargets.carbs.toFixed(1)} g
                                        </Box>
                                    </Typography>
                                    <LinearProgress variant="determinate" value={calculateProgress(consumedNutrients.carbs, dailyTargets.carbs)} sx={{ height: 10, borderRadius: 5 }} />
                                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                        Remaining: {remaining.carbs.toFixed(1)} g
                                    </Typography>
                                </Box>
                                {/* Fat */}
                                <Box>
                                    <Typography variant="body2">
                                        Fat
                                        <Box component="span" sx={{ float: 'right' }}>
                                            {consumedNutrients.fat.toFixed(1)} / {dailyTargets.fat.toFixed(1)} g
                                        </Box>
                                    </Typography>
                                    <LinearProgress variant="determinate" value={calculateProgress(consumedNutrients.fat, dailyTargets.fat)} sx={{ height: 10, borderRadius: 5 }} />
                                    <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                                        Remaining: {remaining.fat.toFixed(1)} g
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                )}
                <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="h6" component="h2" gutterBottom>
                                Today&apos;s Logged Food
                            </Typography>
                            {dailyFoodEntries.length > 0 ? (
                                <List>
                                    {dailyFoodEntries.map(entry => (
                                        <React.Fragment key={entry.id}>
                                            <ListItem>
                                                <ListItemText
                                                    primary={`${entry.foodName} (${entry.mealType})`}
                                                    secondary={`Cals: ${entry.calories.toFixed(0)}, P: ${entry.proteinGrams.toFixed(1)}g, C: ${entry.carbGrams.toFixed(1)}g, F: ${entry.fatGrams.toFixed(1)}g`}
                                                />
                                            </ListItem>
                                            <Divider component="li" />
                                        </React.Fragment>
                                    ))}
                                </List>
                            ) : (
                                <Typography variant="body2">No food logged for today yet.</Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-around' }}>
                <Button variant="contained" onClick={() => router.push('/log/food')}>Log Food</Button>
                <Button variant="contained" onClick={() => router.push('/ai-chat')}>AI Coach</Button>
                <Button variant="contained" onClick={() => router.push('/profile')}>My Profile</Button>
            </Box>
        </Container>
    );
}