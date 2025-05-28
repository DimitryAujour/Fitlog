// src/app/(application)/dashboard/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import {
    Button, Typography, Container, Box, CircularProgress, Paper, Grid,
    Card, CardContent, LinearProgress,
    List,
    ListItem,
    ListItemText, Divider, Alert
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth, firestore } from '@/lib/firebase/clientApp';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import {
    calculateAge,
    calculateBMR,
    calculateTDEE,
    calculateCalorieTarget,
    calculateMacronutrients,
    FitnessGoal
} from '@/lib/utils/fitnessCalculations';

// Interfaces
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
    birthDate?: string;
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
    const [consumedNutrients, setConsumedNutrients] = useState<DailyTargets>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        if (user) {
            const fetchUserProfile = async () => {
                const profileDocRef = doc(firestore, 'users', user.uid);
                const docSnap = await getDoc(profileDocRef);
                if (docSnap.exists()) {
                    const profileData = docSnap.data() as UserProfile;
                    if (profileData.birthDate && typeof profileData.birthDate !== 'string' && (profileData.birthDate as any).toDate) {
                        profileData.birthDate = (profileData.birthDate as unknown as Timestamp).toDate().toISOString().split('T')[0];
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
            else if (userProfile.birthDate && userProfile.weightKg && userProfile.heightCm && userProfile.gender && userProfile.activityLevel && userProfile.fitnessGoal) {
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

    // Adjusted loading condition slightly to avoid premature render if profile is fast but targets are not yet set
    if (authLoading || (isLoadingData && !userProfile && !dailyTargets)) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
    }

    if (!user) {
        if (typeof window !== 'undefined') {
            router.push('/login');
        }
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
    }

    const remaining = dailyTargets ? {
        calories: dailyTargets.calories - consumedNutrients.calories,
        protein: dailyTargets.protein - consumedNutrients.protein,
        carbs: dailyTargets.carbs - consumedNutrients.carbs,
        fat: dailyTargets.fat - consumedNutrients.fat,
    } : null;

    return (
        <Container maxWidth="lg">
            <Box sx={{ my: 4 }}>
                {/* Header section - kept as original, it should be okay */}
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

                {/* Alerts - kept as original */}
                {!userProfile && !isLoadingData && <Alert severity="warning" sx={{mb:2}}>Please complete your profile to see personalized targets.</Alert>}
                {!dailyTargets && userProfile && !isLoadingData && <Alert severity="info" sx={{mb:2}}>Calculating targets... Ensure your profile is complete for accuracy.</Alert>}
                {dailyTargets === null && userProfile && !isLoadingData && (!userProfile.birthDate || !userProfile.weightKg || !userProfile.heightCm || !userProfile.gender || !userProfile.activityLevel || !userProfile.fitnessGoal) && (
                    <Alert severity="warning" sx={{mb:2}}>
                        Profile incomplete. Cannot calculate daily targets. Please <Button size="small" variant="outlined" onClick={() => router.push('/profile')}>complete your profile</Button>.
                    </Alert>
                )}

                {/* Main content grids - MODIFIED FOR CENTERING */}
                <Grid container spacing={3} sx={{ mt: 2, justifyContent: 'center' }}> {/* Added justifyContent: 'center' */}
                    {dailyTargets && remaining && (
                        // Changed xs from 12 to 11 (or 10 for more noticeable centering) to make the card not full-width on mobile
                        <Grid item xs={11} sm={10} md={6}>
                            <Card>
                                <CardContent> {/* Content within card remains left-aligned by default */}
                                    <Typography variant="h6" gutterBottom>Daily Goals</Typography>
                                    {/* Calories */}
                                    <Box sx={{ mb: 2 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="subtitle1">Calories</Typography>
                                            <Typography variant="subtitle1">{consumedNutrients.calories.toFixed(0)} / {dailyTargets.calories.toFixed(0)} kcal</Typography>
                                        </Box>
                                        <LinearProgress variant="determinate" value={calculateProgress(consumedNutrients.calories, dailyTargets.calories)} sx={{ height: 10, borderRadius: 5, my: 0.5 }} />
                                        <Typography variant="caption" display="block" textAlign="right">Remaining: {remaining.calories.toFixed(0)} kcal</Typography>
                                    </Box>
                                    <Divider sx={{my:1}}/>
                                    {/* Protein */}
                                    <Box sx={{ mb: 2 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="subtitle1">Protein</Typography>
                                            <Typography variant="subtitle1">{consumedNutrients.protein.toFixed(1)} / {dailyTargets.protein.toFixed(1)} g</Typography>
                                        </Box>
                                        <LinearProgress color="secondary" variant="determinate" value={calculateProgress(consumedNutrients.protein, dailyTargets.protein)} sx={{ height: 10, borderRadius: 5, my: 0.5 }}/>
                                        <Typography variant="caption" display="block" textAlign="right">Remaining: {remaining.protein.toFixed(1)} g</Typography>
                                    </Box>
                                    <Divider sx={{my:1}}/>
                                    {/* Carbs */}
                                    <Box sx={{ mb: 2 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="subtitle1">Carbs</Typography>
                                            <Typography variant="subtitle1">{consumedNutrients.carbs.toFixed(1)} / {dailyTargets.carbs.toFixed(1)} g</Typography>
                                        </Box>
                                        <LinearProgress color="success" variant="determinate" value={calculateProgress(consumedNutrients.carbs, dailyTargets.carbs)} sx={{ height: 10, borderRadius: 5, my: 0.5 }}/>
                                        <Typography variant="caption" display="block" textAlign="right">Remaining: {remaining.carbs.toFixed(1)} g</Typography>
                                    </Box>
                                    <Divider sx={{my:1}}/>
                                    {/* Fat */}
                                    <Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="subtitle1">Fat</Typography>
                                            <Typography variant="subtitle1">{consumedNutrients.fat.toFixed(1)} / {dailyTargets.fat.toFixed(1)} g</Typography>
                                        </Box>
                                        <LinearProgress color="warning" variant="determinate" value={calculateProgress(consumedNutrients.fat, dailyTargets.fat)} sx={{ height: 10, borderRadius: 5, my: 0.5 }}/>
                                        <Typography variant="caption" display="block" textAlign="right">Remaining: {remaining.fat.toFixed(1)} g</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    )}

                    {/* Changed xs from 12 to 11 (or 10) */}
                    <Grid item xs={11} sm={10} md={dailyTargets ? 6 : 12}>
                        <Card>
                            <CardContent> {/* Content within card remains left-aligned by default */}
                                <Typography variant="h6">Today's Logged Food</Typography>
                                {dailyFoodEntries.length > 0 ? (
                                    <List sx={{ maxHeight: 300, overflow: 'auto', mt: 1 }}>
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
                    </Grid>
                </Grid>

                {/* Buttons at the bottom - this already centers them */}
                <Box sx={{mt: 3, display: 'flex', gap: 2, justifyContent: 'center'}}>
                    <Button variant="contained" size="large" onClick={() => router.push('/log/food')}>Log More Food</Button>
                    <Button variant="outlined" size="large" onClick={() => router.push('/profile')}>My Profile</Button>
                </Box>
            </Box>
        </Container>
    );
}