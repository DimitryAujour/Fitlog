'use client';

import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Container,
    TextField,
    Typography,
    List,
    ListItemButton, // Changed from ListItem button prop to ListItemButton for better semantics
    ListItemText,
    CircularProgress,
    Alert,
    Paper,
    Grid, // For layout
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    // Divider, // Divider was imported but not used in the provided complex version's search results. Keep or remove as needed.
} from '@mui/material';
import { useAuth } from '@/context/AuthContext';

// Firebase imports for logging food
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase/clientApp';

// Define a type for the product data we expect from our API route
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
        fiber_100g?: number | null;
        sugars_100g?: number | null;
    };
    serving_size?: string;
}

// This interface can be used for type consistency if you fetch logged entries later
interface LoggedFoodEntry {
    foodName: string;
    foodApiId: string | null;
    date: string; // YYYY-MM-DD
    mealType: string;
    quantity: number; // This was the old field, new data structure uses servingsConsumed
    unit: string;
    calories: number;
    proteinGrams: number;
    carbGrams: number;
    fatGrams: number;
    // Fields from new handleLogFood if you want to align this interface:
    // userId?: string;
    // servingSizeDescription?: string;
    // servingsConsumed?: number;
    // loggedAt?: any; // Firestore Timestamp
}


const mealTypeOptions = ["Breakfast", "Lunch", "Dinner", "Snack"];

export default function FoodLogPage() {
    const { user, loading: authLoading } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FoodProduct[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null); // For success messages

    // State for the selected food item and logging form
    const [selectedFood, setSelectedFood] = useState<FoodProduct | null>(null);
    const [quantity, setQuantity] = useState<string>('100');
    const [unit, setUnit] = useState<string>('g');
    const [mealType, setMealType] = useState<string>(mealTypeOptions[0]);
    const [logDate, setLogDate] = useState<string>(new Date().toISOString().split('T')[0]);

    // State for calculated nutrients of the selected amount
    const [consumedNutrients, setConsumedNutrients] = useState<{calories: number, protein: number, carbs: number, fat: number} | null>(null);


    const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!searchQuery.trim()) {
            setError('Please enter a food to search.');
            setSuccess(null);
            return;
        }
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        setSearchResults([]);
        setSelectedFood(null);
        setConsumedNutrients(null);

        try {
            const response = await fetch(`/api/food/search?query=${encodeURIComponent(searchQuery)}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to fetch food: ${response.statusText}`);
            }
            const data = await response.json();
            setSearchResults(data.products || []);
            if ((data.products || []).length === 0) {
                setError('No results found for your query.');
            }
        } catch (err: any) {
            console.error('Food search error:', err);
            setError(err.message || 'An error occurred while searching for food.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectFood = (food: FoodProduct) => {
        setSelectedFood(food);
        setQuantity('100');
        setUnit('g');
        setError(null);
        setSuccess(null);
    };

    useEffect(() => {
        if (selectedFood && selectedFood.nutriments && quantity) {
            const numQuantity = parseFloat(quantity);
            if (!isNaN(numQuantity) && numQuantity > 0) {
                const ratio = (unit === 'g') ? (numQuantity / 100) : numQuantity;
                setConsumedNutrients({
                    calories: (selectedFood.nutriments.calories_100g || 0) * ratio,
                    protein: (selectedFood.nutriments.protein_100g || 0) * ratio,
                    carbs: (selectedFood.nutriments.carbs_100g || 0) * ratio,
                    fat: (selectedFood.nutriments.fat_100g || 0) * ratio,
                });
            } else {
                setConsumedNutrients(null);
            }
        } else {
            setConsumedNutrients(null);
        }
    }, [selectedFood, quantity, unit]);


    const handleLogFood = async () => { // Made async
        if (!selectedFood || !consumedNutrients || !user) {
            setError("Please select a food and ensure all details are correct.");
            setSuccess(null);
            return;
        }

        setIsLoading(true); // Indicate loading state during save
        setError(null);
        setSuccess(null);

        // Prepare the data object
        const foodEntryData = {
            userId: user.uid,
            foodName: selectedFood.name,
            foodApiId: selectedFood.id || null,
            date: logDate, // YYYY-MM-DD string
            mealType: mealType,
            servingSizeDescription: `${quantity} ${unit}`,
            servingsConsumed: parseFloat(quantity) || 0,
            unit: unit,
            calories: parseFloat(consumedNutrients.calories.toFixed(1)),
            proteinGrams: parseFloat(consumedNutrients.protein.toFixed(1)),
            carbGrams: parseFloat(consumedNutrients.carbs.toFixed(1)),
            fatGrams: parseFloat(consumedNutrients.fat.toFixed(1)),
            loggedAt: serverTimestamp(), // Firestore server timestamp
        };

        try {
            const foodEntriesCollectionRef = collection(firestore, 'users', user.uid, 'foodEntries');
            const docRef = await addDoc(foodEntriesCollectionRef, foodEntryData);

            console.log("Food entry logged with ID: ", docRef.id, foodEntryData);
            setSuccess("Food item logged successfully!");

            // Clear the form/selection after successful logging
            setSelectedFood(null);
            setSearchQuery(''); // Optionally clear search query
            setSearchResults([]); // Optionally clear search results
            setQuantity('100');
            setUnit('g'); // Reset unit to default
            setMealType(mealTypeOptions[0]);
            setLogDate(new Date().toISOString().split('T')[0]); // Reset date to today
            setConsumedNutrients(null);

        } catch (err: any) {
            console.error("Error logging food to Firestore:", err);
            setError(err.message || "Failed to log food item. Please try again.");
        } finally {
            setIsLoading(false); // Stop loading indicator
        }
    };


    if (authLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
    }
    if (!user) {
        return <Typography sx={{ textAlign: 'center', mt: 5 }}>Please log in to log food.</Typography>;
    }

    return (
        <Container maxWidth="md">
            <Paper sx={{ my: 4, p: 3 }}>
                <Typography variant="h4" component="h1" gutterBottom>Log Food</Typography>

                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
                    <TextField label="Search for food" variant="outlined" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} fullWidth size="small"/>
                    <Button type="submit" variant="contained" disabled={isLoading && !selectedFood}>{isLoading && !selectedFood ? <CircularProgress size={24} /> : 'Search'}</Button>
                </Box>


                <Grid container spacing={3}>
                    <Grid item xs={12} md={selectedFood ? 6 : 12}>
                        {searchResults.length > 0 && !selectedFood && (
                            <Box>
                                <Typography variant="h6" gutterBottom>Search Results:</Typography>
                                <List sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                                    {searchResults.map((product) => (
                                        <ListItemButton key={product.id} onClick={() => handleSelectFood(product)} divider>
                                            <ListItemText primary={product.name} secondary={product.brands || 'No brand'} />
                                        </ListItemButton>
                                    ))}
                                </List>
                            </Box>
                        )}
                        {searchResults.length === 0 && !isLoading && searchQuery && !error && !success && ( // don't show "no results" if success message is shown
                            <Typography>No results found for "{searchQuery}". Try a different search term.</Typography>
                        )}
                    </Grid>

                    {selectedFood && (
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6" gutterBottom>Log: {selectedFood.name}</Typography>
                            {selectedFood.brands && <Typography variant="caption" display="block" gutterBottom>Brand: {selectedFood.brands}</Typography>}
                            {selectedFood.nutriments && (
                                <Box sx={{ mb: 2, p: 1, border: '1px dashed grey', borderRadius: 1 }}>
                                    <Typography variant="subtitle2">Nutritional Info (per 100g or as base):</Typography>
                                    <Typography variant="body2">Calories: {selectedFood.nutriments.calories_100g?.toFixed(0) || 'N/A'} kcal</Typography>
                                    <Typography variant="body2">Protein: {selectedFood.nutriments.protein_100g?.toFixed(1) || 'N/A'}g</Typography>
                                    <Typography variant="body2">Carbs: {selectedFood.nutriments.carbs_100g?.toFixed(1) || 'N/A'}g</Typography>
                                    <Typography variant="body2">Fat: {selectedFood.nutriments.fat_100g?.toFixed(1) || 'N/A'}g</Typography>
                                </Box>
                            )}
                            <TextField
                                label="Date"
                                type="date"
                                value={logDate}
                                onChange={(e) => { setLogDate(e.target.value); setSuccess(null); setError(null); }}
                                fullWidth
                                margin="normal"
                                InputLabelProps={{ shrink: true }}
                            />
                            <Grid container spacing={1} alignItems="flex-end">
                                <Grid item xs={8}>
                                    <TextField
                                        label="Quantity"
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => { setQuantity(e.target.value); setSuccess(null); setError(null); }}
                                        fullWidth
                                        margin="normal"
                                        InputProps={{ inputProps: { min: 0, step: "any" } }}
                                    />
                                </Grid>
                                <Grid item xs={4}>
                                    <FormControl fullWidth margin="normal">
                                        <InputLabel id="unit-label">Unit</InputLabel>
                                        <Select
                                            labelId="unit-label"
                                            value={unit}
                                            label="Unit"
                                            onChange={(e) => { setUnit(e.target.value as string); setSuccess(null); setError(null); }}
                                        >
                                            <MenuItem value="g">grams (g)</MenuItem>
                                            <MenuItem value="serving">serving(s)</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>

                            <FormControl fullWidth margin="normal">
                                <InputLabel id="mealType-label">Meal Type</InputLabel>
                                <Select
                                    labelId="mealType-label"
                                    value={mealType}
                                    label="Meal Type"
                                    onChange={(e) => { setMealType(e.target.value as string); setSuccess(null); setError(null); }}
                                >
                                    {mealTypeOptions.map(opt => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
                                </Select>
                            </FormControl>

                            {consumedNutrients && (
                                <Box sx={{ mt: 2, p: 1, backgroundColor: 'action.hover', borderRadius: 1 }}>
                                    <Typography variant="subtitle1">Calculated for your portion:</Typography>
                                    <Typography variant="body2">Calories: {consumedNutrients.calories.toFixed(0)} kcal</Typography>
                                    <Typography variant="body2">Protein: {consumedNutrients.protein.toFixed(1)}g</Typography>
                                    <Typography variant="body2">Carbs: {consumedNutrients.carbs.toFixed(1)}g</Typography>
                                    <Typography variant="body2">Fat: {consumedNutrients.fat.toFixed(1)}g</Typography>
                                </Box>
                            )}

                            <Button
                                onClick={handleLogFood}
                                variant="contained"
                                color="primary"
                                sx={{ mt: 2 }}
                                fullWidth
                                disabled={!consumedNutrients || isLoading} // Disable if no nutrients or if already loading (saving)
                            >
                                {isLoading && selectedFood ? <CircularProgress size={24} /> : 'Log This Food'}
                            </Button>
                            <Button
                                onClick={() => { setSelectedFood(null); setSuccess(null); setError(null);}}
                                variant="outlined"
                                color="secondary"
                                sx={{ mt: 1 }}
                                fullWidth
                            >
                                Cancel / Search Again
                            </Button>
                        </Grid>
                    )}
                </Grid>
            </Paper>
        </Container>
    );
}