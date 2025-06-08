// src/app/(application)/log/exercise/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Button, Container, TextField, Typography, List, ListItemButton,
    ListItemText, CircularProgress, Alert, Paper, Stack, Grid,
    Tabs, Tab, Avatar, IconButton, InputAdornment, Chip, Stepper, Step, StepLabel
} from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { firestore } from '@/lib/firebase/clientApp';

// --- ICONS ---
import SearchIcon from '@mui/icons-material/Search';
import SendIcon from '@mui/icons-material/Send';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import TimerIcon from '@mui/icons-material/Timer';

// --- INTERFACES ---
interface Exercise {
    id: string;
    name: string;
    metValue: number; // Metabolic Equivalent of Task
    category: 'Cardio' | 'Strength' | 'Flexibility';
}

interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    suggestions?: string[];
}

interface UserProfile {
    weightKg?: number | string;
    // other profile fields
}

// --- MOCK DATA (Replace with your API) ---
const mockExercises: Exercise[] = [
    { id: '1', name: 'Running (jogging), 5 mph', metValue: 8.0, category: 'Cardio' },
    { id: '2', name: 'Weight lifting, vigorous', metValue: 6.0, category: 'Strength' },
    { id: '3', name: 'Cycling, moderate pace', metValue: 7.5, category: 'Cardio' },
    { id: '4', name: 'Stretching, yoga', metValue: 2.5, category: 'Flexibility' },
    { id: '5', name: 'Push-ups, vigorous', metValue: 8.0, category: 'Strength' },
    { id: '6', name: 'Swimming, freestyle', metValue: 7.0, category: 'Cardio' },
];

const steps = ['Find Exercise', 'Enter Details', 'Confirm & Log'];

export default function ExerciseLogPage() {
    const { user } = useAuth();
    // --- STATE ---
    const [currentTab, setCurrentTab] = useState('log');
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    // Logging State
    const [activeStep, setActiveStep] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Exercise[]>([]);
    const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
    const [duration, setDuration] = useState('30'); // in minutes
    const [caloriesBurned, setCaloriesBurned] = useState<number | null>(null);
    const [logDate, setLogDate] = useState<string>(new Date().toISOString().split('T')[0]);
    // Chat State
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: 'init', text: "Hello! I'm your AI workout coach. Ask me for exercise suggestions, like 'What's a good 15-minute cardio workout?'", sender: 'ai' }
    ]);
    const [userInput, setUserInput] = useState('');
    // Global State
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const chatEndRef = useRef<null | HTMLDivElement>(null);

    // --- EFFECTS ---
    useEffect(() => {
        // Fetch user profile to get weight for calorie calculation
        const fetchUserProfile = async () => {
            if (user) {
                const profileDocRef = doc(firestore, 'users', user.uid);
                const docSnap = await getDoc(profileDocRef);
                if (docSnap.exists()) {
                    setUserProfile(docSnap.data() as UserProfile);
                }
            }
        };
        fetchUserProfile();
    }, [user]);

    useEffect(() => {
        // Calculate calories burned whenever duration or exercise changes
        if (selectedExercise && duration && userProfile?.weightKg) {
            const weight = parseFloat(userProfile.weightKg as string);
            const durationInHours = parseFloat(duration) / 60;
            if (weight > 0 && durationInHours > 0) {
                const calculatedCalories = selectedExercise.metValue * weight * durationInHours;
                setCaloriesBurned(calculatedCalories);
                if (activeStep === 1) setActiveStep(2); // Auto-advance
            }
        }
    }, [selectedExercise, duration, userProfile, activeStep]);

    useEffect(() => {
        // Auto-scroll chat
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // --- HANDLERS ---
    const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
        setCurrentTab(newValue);
        setError(null);
        setSuccess(null);
    };

    const handleSearch = () => {
        if (!searchQuery.trim()) {
            setSearchResults(mockExercises); // Show all if search is empty
            return;
        }
        const results = mockExercises.filter(ex =>
            ex.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(results);
    };

    const handleSelectExercise = (exercise: Exercise) => {
        setSelectedExercise(exercise);
        setActiveStep(1);
    };

    const handleLogExercise = async () => {
        if (!selectedExercise || !caloriesBurned || !user) return;
        setIsLoading(true);
        setError(null);
        try {
            await addDoc(collection(firestore, 'users', user.uid, 'exerciseEntries'), {
                userId: user.uid,
                exerciseName: selectedExercise.name,
                date: logDate,
                durationMinutes: parseFloat(duration),
                caloriesBurned: parseFloat(caloriesBurned.toFixed(1)),
                loggedAt: serverTimestamp(),
            });
            setSuccess(`"${selectedExercise.name}" logged successfully!`);
            handleReset();
        } catch (err) {
            console.error(err);
            setError("Failed to log exercise.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = () => {
        if (!userInput.trim()) return;
        const newUserMessage: ChatMessage = { id: Date.now().toString(), text: userInput, sender: 'user' };
        setMessages(prev => [...prev, newUserMessage]);
        setUserInput('');
        setIsLoading(true);

        // Simulate AI response
        setTimeout(() => {
            const aiResponse: ChatMessage = {
                id: (Date.now() + 1).toString(),
                text: "Great question! Based on that, I'd suggest 'Running (jogging), 5 mph'. It's excellent for cardio.",
                sender: 'ai',
                suggestions: ['Running (jogging), 5 mph']
            };
            setMessages(prev => [...prev, aiResponse]);
            setIsLoading(false);
        }, 1500);
    };

    const handleSuggestionSelect = (exerciseName: string) => {
        const exerciseToLog = mockExercises.find(ex => ex.name === exerciseName);
        if (exerciseToLog) {
            setSelectedExercise(exerciseToLog);
            setCurrentTab('log');
            setActiveStep(1);
        }
    };

    const handleReset = () => {
        setActiveStep(0);
        setSelectedExercise(null);
        setSearchQuery('');
        setSearchResults([]);
        setDuration('30');
        setCaloriesBurned(null);
    };

    // --- STYLES ---
    const darkPaperStyles = {
        backgroundColor: '#1A1629', color: '#E0E0E0', borderRadius: 3,
        border: '1px solid', borderColor: 'rgba(255, 255, 255, 0.12)',
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
                    Log Your Workout
                </Typography>

                <Paper elevation={8} sx={{...darkPaperStyles, p: { xs: 1, sm: 2 }}}>
                    <Tabs value={currentTab} onChange={handleTabChange} centered>
                        <Tab icon={<FitnessCenterIcon />} iconPosition="start" label="Log Workout" value="log" />
                        <Tab icon={<SmartToyIcon />} iconPosition="start" label="AI Coach" value="coach" />
                    </Tabs>

                    {/* --- LOG WORKOUT PANEL --- */}
                    <Box role="tabpanel" hidden={currentTab !== 'log'} sx={{ p: { xs: 1, sm: 3 }, mt: 2 }}>
                        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4, '& .MuiStepLabel-label': { color: 'grey.400', '&.Mui-active': { color: 'primary.main' }, '&.Mui-completed': { color: 'white' } } }}>
                            {steps.map(label => <Step key={label}><StepLabel>{label}</StepLabel></Step>)}
                        </Stepper>

                        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

                        {activeStep === 0 && (
                            <Stack spacing={2}>
                                <TextField label="Search for an exercise..." variant="outlined" value={searchQuery} onChange={(e) => {setSearchQuery(e.target.value); handleSearch()}} sx={darkInputStyles} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon sx={{color: 'grey.400'}} /></InputAdornment>)}} />
                                <Box sx={{ maxHeight: '50vh', overflowY: 'auto' }}>
                                    <List>
                                        {(searchResults.length > 0 ? searchResults : mockExercises).map((ex) => (
                                            <ListItemButton key={ex.id} onClick={() => handleSelectExercise(ex)} sx={{ mb: 1, borderRadius: 2 }}>
                                                <ListItemText primary={ex.name} secondary={ex.category} />
                                            </ListItemButton>
                                        ))}
                                    </List>
                                </Box>
                            </Stack>
                        )}

                        {activeStep > 0 && selectedExercise && (
                            <Stack spacing={4}>
                                <Box>
                                    <Typography variant="h5">{selectedExercise.name}</Typography>
                                    <Typography variant="body2" color="grey.400">{selectedExercise.category}</Typography>
                                </Box>
                                <Grid container spacing={3}>
                                    <Grid size={{xs:12, sm:6}}><TextField label="Date" type="date" value={logDate} onChange={e => setLogDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} sx={darkInputStyles}/></Grid>
                                    <Grid size={{xs:12, sm:6}}><TextField label="Duration (minutes)" type="number" value={duration} onChange={e => setDuration(e.target.value)} fullWidth InputProps={{ inputProps: { min: 1 }, startAdornment: <InputAdornment position="start"><TimerIcon sx={{color: 'grey.400'}} /></InputAdornment> }} sx={darkInputStyles}/></Grid>
                                </Grid>
                                {caloriesBurned && (
                                    <Chip icon={<LocalFireDepartmentIcon />} label={`Estimated ${caloriesBurned.toFixed(0)} Calories Burned`} color="warning" sx={{alignSelf: 'center', fontSize: '1rem', p: 2}}/>
                                )}
                                <Stack direction="row" spacing={2} sx={{pt:2}}>
                                    <Button onClick={handleReset} variant="outlined" color="secondary" fullWidth>Start Over</Button>
                                    <Button onClick={handleLogExercise} variant="contained" color="primary" fullWidth disabled={activeStep < 2 || isLoading}>
                                        {isLoading ? <CircularProgress size={24} /> : 'Log Workout'}
                                    </Button>
                                </Stack>
                            </Stack>
                        )}
                    </Box>

                    {/* --- AI COACH PANEL --- */}
                    <Box role="tabpanel" hidden={currentTab !== 'coach'} sx={{ p: { xs: 0, sm: 2 }, mt: 2 }}>
                        <Box sx={{ height: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', p: 2 }}>
                            {messages.map(msg => (
                                <Stack key={msg.id} direction="row" spacing={2} sx={{ mb: 2, alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                                    {msg.sender === 'ai' && <Avatar sx={{ bgcolor: 'primary.main' }}><SmartToyIcon /></Avatar>}
                                    <Paper sx={{ p: 2, borderRadius: msg.sender === 'user' ? '20px 20px 5px 20px' : '20px 20px 20px 5px', bgcolor: msg.sender === 'user' ? 'primary.dark' : '#333', maxWidth: '80%' }}>
                                        <Typography sx={{ color: 'white' }}>{msg.text}</Typography>
                                        {msg.suggestions && (
                                            <Stack spacing={1} sx={{ mt: 2 }}>
                                                {msg.suggestions.map(sugg => (
                                                    <Button key={sugg} variant="contained" size="small" onClick={() => handleSuggestionSelect(sugg)}>Log: {sugg}</Button>
                                                ))}
                                            </Stack>
                                        )}
                                    </Paper>
                                </Stack>
                            ))}
                            {isLoading && <CircularProgress size={24} sx={{alignSelf: 'flex-start', ml: 7}} />}
                            <div ref={chatEndRef} />
                        </Box>
                        <Stack direction="row" spacing={1} sx={{ p: 2, borderTop: '1px solid', borderColor: 'rgba(255,255,255,0.12)' }}>
                            <TextField fullWidth placeholder="Ask for a workout..." value={userInput} onChange={e => setUserInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} sx={darkInputStyles} />
                            <IconButton color="primary" onClick={handleSendMessage} disabled={!userInput.trim() || isLoading}><SendIcon /></IconButton>
                        </Stack>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}