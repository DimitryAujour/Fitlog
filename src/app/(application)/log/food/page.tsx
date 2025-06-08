// src/app/(application)/log/food/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
    Box, Button, Container, TextField, Typography, List, ListItemButton,
    ListItemText, CircularProgress, Alert, Paper, Grid, ListItemAvatar, Avatar, InputAdornment,
    Stack,
    // NEW: Import components for the reworked UI
    Stepper, Step, StepLabel, ToggleButtonGroup, ToggleButton, Chip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
// NEW: Import icons for Chips
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import EggIcon from '@mui/icons-material/Egg'; // for protein
import GrassIcon from '@mui/icons-material/Grass'; // for carbs
import OilBarrelIcon from '@mui/icons-material/OilBarrel'; // for fat
import { useAuth } from '@/context/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase/clientApp';
import { useRouter } from 'next/navigation';

// Interfaces remain the same
interface FoodProduct {
    id: string;
    name: string;
    brands?: string;
    imageUrl?: string;
    nutriments?: {
        calories_100g: number | null;
        protein_100g: number | null;
        carbs_100g: number | null;
        fat_100g: number | null;
    };
    serving_size?: string;
}

const mealTypeOptions = ["Breakfast", "Lunch", "Dinner", "Snack"];
const steps = ['Find Food', 'Customize Serving', 'Confirm & Log'];

export default function FoodLogPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    console.log(router);

    // --- State Management ---
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FoodProduct[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [selectedFood, setSelectedFood] = useState<FoodProduct | null>(null);
    const [quantity, setQuantity] = useState<string>('100');
    const [unit, setUnit] = useState<string>('g');
    const [mealType, setMealType] = useState<string>(mealTypeOptions[0]);
    const [logDate, setLogDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [consumedNutrients, setConsumedNutrients] = useState<{calories: number, protein: number, carbs: number, fat: number} | null>(null);

    // NEW: State for the stepper
    const [activeStep, setActiveStep] = useState(0);

    // --- Handlers ---
    const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!searchQuery.trim()) return;
        setIsLoading(true);
        setError(null);
        setSearchResults([]);
        try {
            const response = await fetch(`/api/food/search?query=${encodeURIComponent(searchQuery)}`);
            if (!response.ok) throw new Error((await response.json()).error || 'Failed to fetch food');
            const data = await response.json();
            if (!data.products || data.products.length === 0) setError('No results found.');
            setSearchResults(data.products || []);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown error occurred during search.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectFood = (food: FoodProduct) => {
        setSelectedFood(food);
        // Reset serving details for the new food
        setQuantity(food.serving_size ? food.serving_size.replace(/[^0-9.]/g, '') || '100' : '100');
        setUnit(food.serving_size?.includes('g') ? 'g' : 'serving');
        setError(null);
        setSuccess(null);
        setActiveStep(1); // Move to the next step
    };


    const handleLogFood = async () => {
        if (!selectedFood || !consumedNutrients || !user) return;
        setIsLoading(true);
        setError(null);
        try {
            await addDoc(collection(firestore, 'users', user.uid, 'foodEntries'), {
                userId: user.uid,
                foodName: selectedFood.name,
                date: logDate,
                mealType,
                calories: parseFloat(consumedNutrients.calories.toFixed(1)),
                proteinGrams: parseFloat(consumedNutrients.protein.toFixed(1)),
                carbGrams: parseFloat(consumedNutrients.carbs.toFixed(1)),
                fatGrams: parseFloat(consumedNutrients.fat.toFixed(1)),
                loggedAt: serverTimestamp(),
            });
            setSuccess(`"${selectedFood.name}" logged successfully!`);
            handleReset();
        } catch (err) { // FIX: Changed from 'err: any' to 'err'
            // FIX: Added type check for robust error handling
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to log food item.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    // NEW: Reset handler to go back to the start
    const handleReset = () => {
        setActiveStep(0);
        setSelectedFood(null);
        setSearchQuery('');
        setSearchResults([]);
        setConsumedNutrients(null);
    };

    useEffect(() => {
        if (selectedFood?.nutriments) {
            const numQuantity = parseFloat(quantity);
            if (!isNaN(numQuantity) && numQuantity > 0) {
                const ratio = (unit === 'g') ? (numQuantity / 100) : numQuantity;
                setConsumedNutrients({
                    calories: (selectedFood.nutriments.calories_100g || 0) * ratio,
                    protein: (selectedFood.nutriments.protein_100g || 0) * ratio,
                    carbs: (selectedFood.nutriments.carbs_100g || 0) * ratio,
                    fat: (selectedFood.nutriments.fat_100g || 0) * ratio,
                });
                if(activeStep === 1) setActiveStep(2); // Auto-move to confirm step once nutrients are calculated
            } else {
                setConsumedNutrients(null);
            }
        }
    }, [selectedFood, quantity, unit, activeStep]);


    if (authLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
    if (!user) return <Typography sx={{ textAlign: 'center', mt: 5 }}>Please log in to log food.</Typography>;

    // REWORKED: Styles are fine, but we'll apply them to the new components
    const darkPaperStyles = {
        backgroundColor: '#1A1629',
        color: '#E0E0E0',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'rgba(255, 255, 255, 0.12)',
    };
    const darkInputStyles = {
        '& .MuiInputBase-root': { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
        '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.23)' } },
        '& .MuiInputLabel-root': { color: 'grey.400' },
    };

    return (
        <Box sx={{ backgroundColor: '#0D0B14', minHeight: 'calc(100vh - 64px)', p: {xs: 2, md: 4} }}>
            <Container maxWidth="md">
                <Typography variant="h4" component="h1" gutterBottom sx={{ color: '#fff', mb: 4, textAlign: 'center' }}>
                    Log Your Meal
                </Typography>

                <Paper elevation={8} sx={{ ...darkPaperStyles, p: {xs: 2, sm: 3, md: 4} }}>
                    <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4, '& .MuiStepLabel-label': { color: 'grey.400', '&.Mui-active': { color: 'primary.main' }, '&.Mui-completed': { color: 'white' } } }}>
                        {steps.map((label) => (
                            <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                    {/* Step 1: Search for Food */}
                    {activeStep === 0 && (
                        <Box>
                            <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                <TextField label="Search for food..." variant="outlined" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} fullWidth sx={darkInputStyles} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{color: 'grey.400'}} /></InputAdornment>)}} />
                                <Button type="submit" variant="contained" disabled={isLoading || !searchQuery.trim()} sx={{ px: 4 }}>
                                    {isLoading ? <CircularProgress size={24} /> : 'Search'}
                                </Button>
                            </Box>
                            <Box sx={{ maxHeight: '50vh', overflowY: 'auto' }}>
                                {searchResults.length > 0 ? (
                                    <List>
                                        {searchResults.map((product) => (
                                            <ListItemButton key={product.id} onClick={() => handleSelectFood(product)} sx={{ mb: 1, borderRadius: 2 }}>
                                                <ListItemAvatar><Avatar variant="rounded" src={product.imageUrl || undefined} /></ListItemAvatar>
                                                <ListItemText primary={product.name} secondary={<Typography variant="caption" color="grey.400">{product.brands || 'No brand info'}</Typography>} />
                                            </ListItemButton>
                                        ))}
                                    </List>
                                ) : (
                                    <Typography sx={{textAlign: 'center', color: 'grey.500', mt: 4}}>Search results will appear here.</Typography>
                                )}
                            </Box>
                        </Box>
                    )}

                    {/* Step 2 & 3: Configure and Log */}
                    {activeStep > 0 && selectedFood && (
                        <Stack spacing={4}>
                            <Box>
                                <Typography variant="h5">{selectedFood.name}</Typography>
                                <Typography variant="body2" color="grey.400">Brand: {selectedFood.brands || 'N/A'}</Typography>
                            </Box>

                            <Grid container spacing={3}>
                                <Grid size={{xs:12, sm:6}}>
                                    <TextField label="Date" type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} sx={darkInputStyles}/>
                                </Grid>
                                <Grid size={{xs:12, sm:6}}>
                                    {/* NEW: ToggleButtonGroup for Meal Type */}
                                    <ToggleButtonGroup value={mealType} exclusive onChange={(_, v) => v && setMealType(v)} fullWidth color="primary">
                                        {mealTypeOptions.map(opt => <ToggleButton key={opt} value={opt} sx={{color: 'grey.300'}}>{opt}</ToggleButton>)}
                                    </ToggleButtonGroup>
                                </Grid>
                                <Grid size={{xs:12, sm:6}}>
                                    <TextField label="Quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} fullWidth InputProps={{ inputProps: { min: 0 } }} sx={darkInputStyles}/>
                                </Grid>
                                <Grid size={{xs:12, sm:6}}>
                                    {/* NEW: ToggleButtonGroup for Unit */}
                                    <ToggleButtonGroup value={unit} exclusive onChange={(_, v) => v && setUnit(v)} fullWidth color="primary">
                                        <ToggleButton value="g" sx={{color: 'grey.300'}}>Grams (g)</ToggleButton>
                                        <ToggleButton value="serving" sx={{color: 'grey.300'}}>Serving</ToggleButton>
                                    </ToggleButtonGroup>
                                </Grid>
                            </Grid>

                            {consumedNutrients && (
                                <Box>
                                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Calculated Intake:</Typography>
                                    {/* NEW: Chips for nutrient display */}
                                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                                        <Chip icon={<LocalFireDepartmentIcon />} label={`${consumedNutrients.calories.toFixed(0)} kcal`} color="warning" />
                                        <Chip icon={<EggIcon />} label={`${consumedNutrients.protein.toFixed(1)} g Protein`} color="error" />
                                        <Chip icon={<GrassIcon />} label={`${consumedNutrients.carbs.toFixed(1)} g Carbs`} color="success" />
                                        <Chip icon={<OilBarrelIcon />} label={`${consumedNutrients.fat.toFixed(1)} g Fat`} color="info" />
                                    </Stack>
                                </Box>
                            )}

                            <Stack direction="row" spacing={2} sx={{pt:2}}>
                                <Button onClick={handleReset} variant="outlined" color="secondary" fullWidth>
                                    Start Over
                                </Button>
                                <Button onClick={handleLogFood} variant="contained" color="primary" fullWidth disabled={activeStep < 2 || isLoading || !consumedNutrients}>
                                    {isLoading ? <CircularProgress size={24} color="inherit" /> : 'Log This Food'}
                                </Button>
                            </Stack>
                        </Stack>
                    )}
                </Paper>
            </Container>
        </Box>
    );
}