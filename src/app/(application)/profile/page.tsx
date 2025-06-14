'use client';

import React, { useEffect, useState } from 'react';
import {
    Avatar,
    Box, Button, Container, TextField, Typography, CircularProgress,
    Alert, Paper, Select, MenuItem, InputLabel, FormControl,
    SelectChangeEvent
} from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp, FieldValue } from 'firebase/firestore';
import { firestore } from '@/lib/firebase/clientApp';
import {
    calculateAge,
    calculateBMR,
    calculateTDEE,
    calculateCalorieTarget,
    calculateMacronutrients,
    FitnessGoal
} from '@/lib/utils/fitnessCalculations';

interface UserProfile {
    displayName?: string;
    email?: string;
    photoURL?: string;
    birthDate?: string;
    weightKg?: number | string;
    heightCm?: number | string;
    gender?: string;
    activityLevel?: string;
    fitnessGoal?: string;
}

interface ProfileDataToSave {
    displayName?: string;
    email?: string;
    photoURL?: string;
    birthDate: Timestamp | null;
    weightKg: number | null;
    heightCm: number | null;
    gender?: string;
    activityLevel?: string;
    fitnessGoal?: string;
    updatedAt: FieldValue;
    createdAt?: FieldValue;
}

const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
];

const activityLevelOptions = [
    { value: 'sedentary', label: 'Sedentary (little or no exercise)' },
    { value: 'light', label: 'Lightly active (exercise 1-3 days/week)' },
    { value: 'moderate', label: 'Moderately active (exercise 3-5 days/week)' },
    { value: 'active', label: 'Very active (exercise 6-7 days/week)' },
    { value: 'very_active', label: 'Extra active (very intense exercise daily or physical job)' },
];

const fitnessGoalOptions = [
    { value: 'weightLoss', label: 'Weight Loss' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'muscleGain', label: 'Muscle Gain' },
];

export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState<UserProfile>({
        displayName: '',
        email: '',
        photoURL: '',
        birthDate: '',
        weightKg: '',
        heightCm: '',
        gender: '',
        activityLevel: '',
        fitnessGoal: '',
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [calculatedAge, setCalculatedAge] = useState<number | null>(null);
    const [bmr, setBmr] = useState<number | null>(null);
    const [tdee, setTdee] = useState<number | null>(null);
    const [calorieTargetInfo, setCalorieTargetInfo] = useState<{ calorieTarget: number; deficitOrSurplus: number } | null>(null);
    const [macroTargets, setMacroTargets] = useState<{ proteinGrams: number; carbGrams: number; fatGrams: number; proteinPercentage: number; carbPercentage: number; fatPercentage: number; } | null>(null);

    useEffect(() => {
        if (user) {
            const fetchProfile = async () => {
                setIsLoading(true);
                setError(null);
                const profileDocRef = doc(firestore, 'users', user.uid);
                try {
                    const docSnap = await getDoc(profileDocRef);
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setProfile({
                            displayName: data.displayName || user.displayName || '',
                            email: data.email || user.email || '',
                            photoURL: data.photoURL || user.photoURL || '',
                            birthDate: data.birthDate?.toDate ? data.birthDate.toDate().toISOString().split('T')[0] : '',
                            weightKg: data.weightKg !== undefined ? String(data.weightKg) : '',
                            heightCm: data.heightCm !== undefined ? String(data.heightCm) : '',
                            gender: data.gender || '',
                            activityLevel: data.activityLevel || '',
                            fitnessGoal: data.fitnessGoal || '',
                        });
                    } else {
                        setProfile(prev => ({
                            ...prev,
                            email: user.email || '',
                            displayName: user.displayName || '',
                            photoURL: user.photoURL || '',
                        }));
                    }
                } catch (err) {
                    console.error("Error fetching profile:", err);
                    setError(err instanceof Error ? err.message : "An unknown error occurred.");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchProfile();
        } else if (!authLoading) {
            setIsLoading(false);
        }
    }, [user, authLoading]);

    useEffect(() => {
        if (profile.birthDate && profile.weightKg && profile.heightCm && profile.gender && profile.activityLevel && profile.fitnessGoal) {
            const age = calculateAge(profile.birthDate);
            setCalculatedAge(age);

            const weight = parseFloat(profile.weightKg as string);
            const height = parseFloat(profile.heightCm as string);

            if (age > 0 && weight > 0 && height > 0 && (profile.gender === 'male' || profile.gender === 'female')) {
                const calculatedBmr = calculateBMR(weight, height, age, profile.gender);
                setBmr(calculatedBmr);

                const calculatedTdee = calculateTDEE(calculatedBmr, profile.activityLevel);
                setTdee(calculatedTdee);

                const ctInfo = calculateCalorieTarget(calculatedTdee, profile.fitnessGoal as FitnessGoal);
                setCalorieTargetInfo(ctInfo);

                if (ctInfo.calorieTarget > 0) {
                    const macros = calculateMacronutrients(ctInfo.calorieTarget, profile.fitnessGoal as FitnessGoal);
                    setMacroTargets(macros);
                } else {
                    setMacroTargets(null);
                }
            } else {
                setBmr(null);
                setTdee(null);
                setCalorieTargetInfo(null);
                setMacroTargets(null);
            }
        }
    }, [profile]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
        const { name, value } = event.target;
        setProfile(prevProfile => ({
            ...prevProfile,
            [name]: value,
        }));
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!user) {
            setError("You must be logged in to update your profile.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        const profileDocRef = doc(firestore, 'users', user.uid);
        try {
            const dataToSave: ProfileDataToSave = {
                displayName: profile.displayName || '',
                email: profile.email || user.email || '',
                photoURL: profile.photoURL || '',
                weightKg: profile.weightKg ? parseFloat(profile.weightKg as string) : null,
                heightCm: profile.heightCm ? parseFloat(profile.heightCm as string) : null,
                birthDate: profile.birthDate ? Timestamp.fromDate(new Date(profile.birthDate)) : null,
                gender: profile.gender || '',
                activityLevel: profile.activityLevel || '',
                fitnessGoal: profile.fitnessGoal || '',
                updatedAt: serverTimestamp(),
            };

            const docSnap = await getDoc(profileDocRef);
            if (!docSnap.exists()) {
                dataToSave.createdAt = serverTimestamp();
            }

            await setDoc(profileDocRef, dataToSave, { merge: true });
            setSuccess("Profile updated successfully!");
        } catch (err) {
            console.error("Error updating profile:", err);
            setError(err instanceof Error ? err.message : "Failed to update profile.");
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading || (isLoading && !user)) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!user) {
        return <Typography sx={{ textAlign: 'center', mt: 5 }}>Please log in to view your profile.</Typography>;
    }

    return (
        <Container maxWidth="md">
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
                <Avatar
                    src={profile.photoURL || undefined}
                    sx={{ width: 100, height: 100, fontSize: '3rem' }}
                    // Add the 'imgProps' prop like this
                    imgProps={{
                        referrerPolicy: "no-referrer"
                    }}
                >
                    {!profile.photoURL && profile.displayName ? profile.displayName.charAt(0).toUpperCase() : null}
                </Avatar>
            </Box>

            <Paper sx={{ my: 4, p: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center' }}>
                    Your Profile
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        fullWidth
                        id="displayName"
                        label="Display Name"
                        name="displayName"
                        value={profile.displayName || ''}
                        onChange={handleChange}
                        InputLabelProps={{ shrink: !!profile.displayName }}
                    />
                    <TextField
                        margin="normal"
                        fullWidth
                        id="email"
                        label="Email Address"
                        name="email"
                        value={profile.email || ''}
                        disabled
                        InputLabelProps={{ shrink: !!profile.email }}
                    />
                    <TextField
                        margin="normal"
                        fullWidth
                        name="weightKg"
                        label="Weight (kg)"
                        type="number"
                        id="weightKg"
                        value={profile.weightKg || ''}
                        onChange={handleChange}
                        InputLabelProps={{ shrink: !!profile.weightKg }}
                    />
                    <TextField
                        margin="normal"
                        fullWidth
                        name="heightCm"
                        label="Height (cm)"
                        type="number"
                        id="heightCm"
                        value={profile.heightCm || ''}
                        onChange={handleChange}
                        InputLabelProps={{ shrink: !!profile.heightCm }}
                    />
                    <TextField
                        margin="normal"
                        fullWidth
                        name="birthDate"
                        label="Birth Date"
                        type="date"
                        id="birthDate"
                        value={profile.birthDate || ''}
                        onChange={handleChange}
                        InputLabelProps={{ shrink: true }}
                    />

                    <FormControl fullWidth margin="normal">
                        <InputLabel id="gender-label">Gender</InputLabel>
                        <Select
                            labelId="gender-label"
                            id="gender"
                            name="gender"
                            value={profile.gender || ''}
                            label="Gender"
                            onChange={handleChange}
                        >
                            {genderOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth margin="normal">
                        <InputLabel id="activityLevel-label">Activity Level</InputLabel>
                        <Select
                            labelId="activityLevel-label"
                            id="activityLevel"
                            name="activityLevel"
                            value={profile.activityLevel || ''}
                            label="Activity Level"
                            onChange={handleChange}
                        >
                            {activityLevelOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth margin="normal">
                        <InputLabel id="fitnessGoal-label">Fitness Goal</InputLabel>
                        <Select
                            labelId="fitnessGoal-label"
                            id="fitnessGoal"
                            name="fitnessGoal"
                            value={profile.fitnessGoal || ''}
                            label="Fitness Goal"
                            onChange={handleChange}
                        >
                            {fitnessGoalOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                        disabled={isLoading || authLoading}
                    >
                        {(isLoading || authLoading) ? <CircularProgress size={24} /> : 'Save Profile'}
                    </Button>
                </Box>
            </Paper>

            {bmr !== null && tdee !== null && calorieTargetInfo !== null && macroTargets !== null && calculatedAge !== null && (
                <Paper sx={{ mt: 4, p: 3 }}>
                    <Typography variant="h5" component="h2" gutterBottom>
                        Your Estimated Targets
                    </Typography>
                    <Typography variant="body1">Calculated Age: {calculatedAge} years</Typography>
                    <Typography variant="body1">Estimated BMR: {bmr.toFixed(0)} calories/day</Typography>
                    <Typography variant="body1">Estimated TDEE (Maintenance): {tdee.toFixed(0)} calories/day</Typography>
                    <Typography variant="h6" sx={{ mt: 2 }}>
                        Daily Calorie Target ({profile.fitnessGoal && fitnessGoalOptions.find(opt => opt.value === profile.fitnessGoal)?.label}): {calorieTargetInfo.calorieTarget.toFixed(0)} calories
                    </Typography>
                    {calorieTargetInfo.deficitOrSurplus !== 0 && (
                        <Typography variant="caption">
                            (This includes a {calorieTargetInfo.deficitOrSurplus > 0 ? '+' : ''}{calorieTargetInfo.deficitOrSurplus.toFixed(0)} calorie {calorieTargetInfo.deficitOrSurplus > 0 ? 'surplus' : 'deficit'} from your TDEE)
                        </Typography>
                    )}
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle1">Macronutrient Targets:</Typography>
                        <Typography>Protein: {macroTargets.proteinGrams.toFixed(0)}g ({macroTargets.proteinPercentage.toFixed(0)}%)</Typography>
                        <Typography>Carbohydrates: {macroTargets.carbGrams.toFixed(0)}g ({macroTargets.carbPercentage.toFixed(0)}%)</Typography>
                        <Typography>Fat: {macroTargets.fatGrams.toFixed(0)}g ({macroTargets.fatPercentage.toFixed(0)}%)</Typography>
                    </Box>
                </Paper>
            )}
        </Container>
    );
}