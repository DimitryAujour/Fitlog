'use client';

import React, { useEffect, useState } from 'react';
import {
    Box, Button, Container, TextField, Typography, CircularProgress,
    Alert, Paper, Select, MenuItem, InputLabel, FormControl
} from '@mui/material'; // Added Select, MenuItem, InputLabel, FormControl
import { useAuth } from '@/context/AuthContext';
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore'; // Added Timestamp
import { firestore } from '@/lib/firebase/clientApp';

// At the top of src/app/(application)/profile/page.tsx
import {
    calculateAge,
    calculateBMR,
    calculateTDEE,
    calculateCalorieTarget,
    calculateMacronutrients,
    FitnessGoal // Assuming you exported FitnessGoal type as well
} from '@/lib/utils/fitnessCalculations';

interface UserProfile {
    displayName?: string;
    email?: string;
    photoURL?: string;
    birthDate?: string; // ISO string for input
    weightKg?: number | string;
    heightCm?: number | string;
    gender?: string;
    activityLevel?: string;
    fitnessGoal?: string;
    // Add other fields from your schema here
}

// Define options for select inputs
const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
];

const activityLevelOptions = [ // Based on plan section 4.1
    { value: 'sedentary', label: 'Sedentary (little or no exercise)' },
    { value: 'light', label: 'Lightly active (exercise 1-3 days/week)' }, // Corrected label from plan source
    { value: 'moderate', label: 'Moderately active (exercise 3-5 days/week)' }, // Corrected label from plan source
    { value: 'active', label: 'Very active (exercise 6-7 days/week)' }, // Corrected label from plan source ('active' in schema, 'very_active' in plan text)
    { value: 'very_active', label: 'Extra active (very intense exercise daily or physical job)' }, // Corrected label from plan source ('very_active' in schema, 'extra active' in plan text)
];

const fitnessGoalOptions = [
    { value: 'weightLoss', label: 'Weight Loss' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'muscleGain', label: 'Muscle Gain' },
];


export default function ProfilePage() {
    const { user, loading: authLoading } = useAuth();
    const [profile, setProfile] = useState<UserProfile>({
        // Initialize all fields to prevent uncontrolled to controlled input warning
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

    // Moved these state declarations inside the component
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
                        // Ensure all fields in UserProfile are handled
                        setProfile({
                            displayName: data.displayName || user.displayName || '',
                            email: data.email || user.email || '', // Email typically from auth
                            photoURL: data.photoURL || user.photoURL || '',
                            birthDate: data.birthDate && data.birthDate.toDate ? data.birthDate.toDate().toISOString().split('T')[0] : '',
                            weightKg: data.weightKg || '',
                            heightCm: data.heightCm || '',
                            gender: data.gender || '',
                            activityLevel: data.activityLevel || '',
                            fitnessGoal: data.fitnessGoal || '',
                        });
                    } else {
                        console.log('No such profile document! Setting defaults from auth.');
                        setProfile(prev => ({
                            ...prev, // keep any partially filled form state
                            email: user.email || '',
                            displayName: user.displayName || '',
                            photoURL: user.photoURL || '',
                        }));
                    }
                } catch (err) {
                    console.error("Error fetching profile:", err);
                    setError("Failed to fetch profile data.");
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
                // Reset if inputs are not valid for calculation
                setBmr(null);
                setTdee(null);
                setCalorieTargetInfo(null);
                setMacroTargets(null);
            }
        }
    }, [profile]); // Note: React state setter functions (setCalculatedAge, setBmr, etc.) are stable and don't need to be in the dependency array.

    const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | (Event & { target: { name: string; value: unknown } } ) ) => { // Adjusted for Select
        const { name, value } = event.target as { name: string; value: string }; // Type assertion
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
            const dataToSave: any = {
                ...profile,
                // Ensure numeric fields are stored as numbers
                weightKg: profile.weightKg ? parseFloat(profile.weightKg as string) : null,
                heightCm: profile.heightCm ? parseFloat(profile.heightCm as string) : null,
                // Convert birthDate string back to Firestore Timestamp
                birthDate: profile.birthDate ? Timestamp.fromDate(new Date(profile.birthDate)) : null,
                updatedAt: serverTimestamp(),
            };

            const docSnap = await getDoc(profileDocRef);
            if (!docSnap.exists()) {
                dataToSave.createdAt = serverTimestamp();
                dataToSave.email = user.email; // Ensure email is saved for new profiles
            }

            await setDoc(profileDocRef, dataToSave, { merge: true });
            setSuccess("Profile updated successfully!");
        } catch (err) {
            console.error("Error updating profile:", err);
            setError("Failed to update profile.");
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading || (isLoading && !user) ) { // Adjusted loading condition slightly
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!user) {
        return <Typography sx={{textAlign: 'center', mt: 5}}>Please log in to view your profile.</Typography>;
    }

    return (
        <Container maxWidth="md">
            <Paper sx={{ my: 4, p: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom>
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

                    {/* Gender Select */}
                    <FormControl fullWidth margin="normal">
                        <InputLabel id="gender-label">Gender</InputLabel>
                        <Select
                            labelId="gender-label"
                            id="gender"
                            name="gender"
                            value={profile.gender || ''}
                            label="Gender"
                            onChange={handleChange as any} // Cast for MUI Select's event type
                        >
                            {genderOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Activity Level Select */}
                    <FormControl fullWidth margin="normal">
                        <InputLabel id="activityLevel-label">Activity Level</InputLabel>
                        <Select
                            labelId="activityLevel-label"
                            id="activityLevel"
                            name="activityLevel"
                            value={profile.activityLevel || ''}
                            label="Activity Level"
                            onChange={handleChange as any}
                        >
                            {activityLevelOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Fitness Goal Select */}
                    <FormControl fullWidth margin="normal">
                        <InputLabel id="fitnessGoal-label">Fitness Goal</InputLabel>
                        <Select
                            labelId="fitnessGoal-label"
                            id="fitnessGoal"
                            name="fitnessGoal"
                            value={profile.fitnessGoal || ''}
                            label="Fitness Goal"
                            onChange={handleChange as any}
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
            {/* Display Estimated Targets */}
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