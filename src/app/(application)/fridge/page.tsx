'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Button,
    Container,
    TextField,
    Typography,
    List,
    ListItem,
    ListItemText,
    CircularProgress,
    Alert,
    Paper,
    Grid,
    IconButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { useAuth } from '@/context/AuthContext';
import {collection, addDoc, serverTimestamp, getDocs, doc, deleteDoc, Timestamp} from 'firebase/firestore';
import { firestore } from '@/lib/firebase/clientApp';

// Interface for search results (same as food log page)
interface FoodProduct {
    id: string;
    name: string;
    brands?: string;
    imageUrl?: string;
}

// Interface for items stored in the user's fridge collection
interface FridgeItem {
    id: string; // Firestore document ID
    userId: string;
    foodName: string;
    foodApiId: string;
    brand?: string;
    addedAt: Timestamp;
}

export default function FridgePage() {
    const { user } = useAuth();

    // State for managing current fridge items
    const [fridgeItems, setFridgeItems] = useState<FridgeItem[]>([]);
    const [isLoadingFridge, setIsLoadingFridge] = useState(true);

    // State for search functionality
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FoodProduct[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // State for user feedback
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Fetch existing fridge items from Firestore
    const fetchFridgeItems = useCallback(async () => {
        if (!user) return;
        setIsLoadingFridge(true);
        try {
            const fridgeCollectionRef = collection(firestore, 'users', user.uid, 'fridgeItems');
            const querySnapshot = await getDocs(fridgeCollectionRef);
            const items: FridgeItem[] = [];
            querySnapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() } as FridgeItem);
            });
            setFridgeItems(items);
        } catch (err) {
            console.error("Error fetching fridge items:", err);
            setError("Could not load your fridge items.");
        } finally {
            setIsLoadingFridge(false);
        }
    }, [user]);

    useEffect(() => {
        fetchFridgeItems();
    }, [fetchFridgeItems]);

    // Handle searching for new food items to add
    const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        setError(null);
        setSuccess(null);
        setSearchResults([]);

        try {
            const response = await fetch(`/api/food/search?query=${encodeURIComponent(searchQuery)}`);
            if (!response.ok) throw new Error('Failed to fetch food data.');
            const data = await response.json();
            setSearchResults(data.products || []);
            if ((data.products || []).length === 0) {
                setError('No results found.');
            }
        } catch (err) {
            console.error("Food search error:", err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsSearching(false);
        }
    };

    // Handle adding a selected item to the fridge
    const handleAddFridgeItem = async (product: FoodProduct) => {
        if (!user) return;

        // Prevent adding duplicates based on foodApiId
        const isAlreadyInFridge = fridgeItems.some(item => item.foodApiId === product.id);
        if (isAlreadyInFridge) {
            setError(`"${product.name}" is already in your fridge.`);
            setSuccess(null);
            return;
        }

        const fridgeItemData = {
            userId: user.uid,
            foodName: product.name,
            foodApiId: product.id,
            brand: product.brands || '',
            addedAt: serverTimestamp(),
        };

        try {
            const fridgeCollectionRef = collection(firestore, 'users', user.uid, 'fridgeItems');
            await addDoc(fridgeCollectionRef, fridgeItemData);
            setSuccess(`Added "${product.name}" to your fridge!`);
            setError(null);
            fetchFridgeItems(); // Refresh the fridge list
        } catch (err) {
            console.error("Error adding item to fridge:", err);
            setError("Failed to add item. Please try again.");
        }
    };

    // Handle removing an item from the fridge
    const handleRemoveFridgeItem = async (itemId: string) => {
        if (!user) return;
        try {
            const itemDocRef = doc(firestore, 'users', user.uid, 'fridgeItems', itemId);
            await deleteDoc(itemDocRef);
            setSuccess("Item removed from your fridge.");
            setError(null);
            fetchFridgeItems(); // Refresh the fridge list
        } catch (err) {
            console.error("Error removing item from fridge:", err);
            setError("Failed to remove item. Please try again.");
        }
    };

    return (
        <Container maxWidth="lg">
            <Typography variant="h4" component="h1" sx={{ my: 4 }}>
                My Fridge
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Grid container spacing={4}>
                {/* Left Side: Search and Add Items */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>Add Items to Fridge</Typography>
                        <Box component="form" onSubmit={handleSearch} sx={{ display: 'flex', gap: 1, mb: 2 }}>
                            <TextField label="Search for food" variant="outlined" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} fullWidth size="small"/>
                            <Button type="submit" variant="contained" disabled={isSearching}>
                                {isSearching ? <CircularProgress size={24} /> : 'Search'}
                            </Button>
                        </Box>
                        <Box sx={{ minHeight: 300, maxHeight: 400, overflow: 'auto' }}>
                            {isSearching && <Box sx={{textAlign: 'center'}}><CircularProgress /></Box>}
                            <List>
                                {searchResults.map((product) => (
                                    <ListItem
                                        key={product.id}
                                        secondaryAction={
                                            <IconButton edge="end" aria-label="add" onClick={() => handleAddFridgeItem(product)}>
                                                <AddCircleOutlineIcon color="primary" />
                                            </IconButton>
                                        }
                                        divider
                                    >
                                        <ListItemText primary={product.name} secondary={product.brands || 'No brand'} />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    </Paper>
                </Grid>

                {/* Right Side: Current Fridge Contents */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>Items in Your Fridge</Typography>
                        <Box sx={{ minHeight: 300, maxHeight: 400, overflow: 'auto' }}>
                            {isLoadingFridge ? (
                                <Box sx={{textAlign: 'center'}}><CircularProgress /></Box>
                            ) : fridgeItems.length > 0 ? (
                                <List>
                                    {fridgeItems.map((item) => (
                                        <ListItem
                                            key={item.id}
                                            secondaryAction={
                                                <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveFridgeItem(item.id)}>
                                                    <DeleteIcon color="error" />
                                                </IconButton>
                                            }
                                            divider
                                        >
                                            <ListItemText primary={item.foodName} secondary={item.brand || 'No brand'} />
                                        </ListItem>
                                    ))}
                                </List>
                            ) : (
                                <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
                                    Your fridge is empty. Use the search on the left to add items.
                                </Typography>
                            )}
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
}