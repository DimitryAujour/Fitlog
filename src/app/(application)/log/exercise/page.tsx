// src/app/(application)/log/exercise/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Button,
    Container,
    TextField,
    Typography,
    CircularProgress,
    Alert,
    Paper,
    List,        // Added for chat
    ListItem,    // Added for chat
    ListItemText,// Added for chat
    IconButton, Grid   // Added for chat
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send'; // Added for chat
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/lib/firebase/clientApp';

// AI Imports - similar to your ai-chat page
import { getInitializedGenerativeModel } from '@/lib/firebase/clientApp';
import type { GenerativeModel as FirebaseGenerativeModel, ChatSession as FirebaseChatSession } from 'firebase/ai'; // Aliasing to avoid naming conflict if any
import { getUserProfileAndTargetsForAI } from '@/lib/aiContextHelper'; // For user weight

// ExerciseEntryData interface (as defined before)
interface ExerciseEntryData {
    userId: string;
    exerciseName: string;
    caloriesBurned: number;
    date: string;
    durationMinutes?: number;
}

// Message interface for AI Chat
interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

export default function LogExercisePage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    // State for exercise logging form
    const [exerciseName, setExerciseName] = useState('');
    const [caloriesBurned, setCaloriesBurned] = useState<string>('');
    const [durationMinutes, setDurationMinutes] = useState<string>('');
    const [exerciseDate, setExerciseDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isLoggingExercise, setIsLoggingExercise] = useState(false);
    const [logError, setLogError] = useState<string | null>(null);
    const [logSuccess, setLogSuccess] = useState<string | null>(null);

    // State for AI Chat
    const [aiInputMessage, setAiInputMessage] = useState('');
    const [aiChatHistory, setAiChatHistory] = useState<ChatMessage[]>([]);
    const [isLoadingAiResponse, setIsLoadingAiResponse] = useState(false);
    const [aiModel, setAiModel] = useState<FirebaseGenerativeModel | null>(null);
    const [aiChatSession, setAiChatSession] = useState<FirebaseChatSession | null>(null);
    const [isAiModelInitializing, setIsAiModelInitializing] = useState(true);
    const aiMessagesEndRef = useRef<null | HTMLDivElement>(null);

    // Initialize AI Model
    useEffect(() => {
        if (user) {
            setIsAiModelInitializing(true);
            getInitializedGenerativeModel("gemini-2.0-flash-001") // Or your preferred model
                .then(initializedModel => {
                    setAiModel(initializedModel);
                    console.log("AI Model initialized for exercise page.");
                })
                .catch(error => console.error("Failed to initialize AI Model for exercise page:", error))
                .finally(() => setIsAiModelInitializing(false));
        } else {
            setIsAiModelInitializing(false);
            setAiModel(null);
        }
    }, [user]);

    // Initialize AI Chat Session
    useEffect(() => {
        if (user && aiModel) {
            const systemInstruction = { // Using system instruction for better context setting
                role: "system", // Though 'system' role is more common in some APIs, for Gemini via Firebase it's often part of the initial user/model history or prepended.
                                // Let's prepend to the first user message or set as initial model message for now.
                                // Or, structure `startChat` history to include a guiding prompt.
                parts: [{ text: "You are FitLog AI Coach, specialized in helping users estimate calories burned during exercises. To provide a good estimate, you might need information like the type of exercise, duration, intensity, and the user's weight (if available). Ask clarifying questions if needed. Respond concisely."}]
            };
            console.log(systemInstruction);

            const newChatSession = aiModel.startChat({
                // history: [systemInstruction] // Note: check Firebase AI SDK docs for exact `system` role usage.
                // Often, system instructions are implicitly handled or set differently.
                // For now, we can prepend context to user messages.
                history: [] // Start with empty history, context will be added to messages
            });
            setAiChatSession(newChatSession);
        } else {
            setAiChatSession(null);
        }
    }, [user, aiModel]);


    const handleLogExercise = async (event: React.FormEvent<HTMLFormElement>) => {
        // ... (your existing handleLogExercise logic remains the same)
        event.preventDefault();
        if (!user) {
            setLogError("You must be logged in to log an exercise.");
            return;
        }
        if (!exerciseName.trim() || !caloriesBurned.trim()) {
            setLogError("Please enter an exercise name and calories burned.");
            return;
        }
        const numCaloriesBurned = parseFloat(caloriesBurned);
        if (isNaN(numCaloriesBurned) || numCaloriesBurned <= 0) {
            setLogError("Please enter a valid number for calories burned.");
            return;
        }
        let numDurationMinutes: number | undefined = undefined;
        if (durationMinutes.trim()) {
            numDurationMinutes = parseFloat(durationMinutes);
            if (isNaN(numDurationMinutes) || numDurationMinutes < 0) {
                setLogError("Please enter a valid number for duration or leave it empty.");
                return;
            }
        }
        setIsLoggingExercise(true);
        setLogError(null);
        setLogSuccess(null);
        const exerciseEntryData: ExerciseEntryData = {
            userId: user.uid,
            exerciseName: exerciseName.trim(),
            caloriesBurned: numCaloriesBurned,
            date: exerciseDate,
            ...(numDurationMinutes !== undefined && { durationMinutes: numDurationMinutes }),
        };
        try {
            const exerciseEntriesCollectionRef = collection(firestore, 'users', user.uid, 'exerciseEntries');
            await addDoc(exerciseEntriesCollectionRef, {
                ...exerciseEntryData,
                loggedAt: serverTimestamp()
            });
            setLogSuccess(`Exercise "${exerciseName}" logged successfully!`);
            setExerciseName('');
            setCaloriesBurned('');
            setDurationMinutes('');
        } catch (err: any) {
            console.error("Error logging exercise to Firestore:", err);
            setLogError(err.message || "Failed to log exercise. Please try again.");
        } finally {
            setIsLoggingExercise(false);
        }
    };

    const handleAiSendMessage = async (event?: React.FormEvent<HTMLFormElement>) => {
        if (event) event.preventDefault();
        const currentAiMessageText = aiInputMessage.trim();
        if (!currentAiMessageText || !aiChatSession || !user) return;

        const userChatMessage: ChatMessage = {
            id: `user-ai-${Date.now()}`,
            text: currentAiMessageText,
            sender: 'user',
            timestamp: new Date(),
        };
        setAiChatHistory(prev => [...prev, userChatMessage]);
        setAiInputMessage('');
        setIsLoadingAiResponse(true);

        let fullPrompt = "";
        const systemPrompt = "You are FitLog AI Coach, specialized in helping users estimate calories burned during exercises. If the user provides their weight, use it for more accurate estimation. Ask for exercise type, duration, and intensity if needed to provide a helpful estimate. Respond concisely.";

        try {
            const userProfileData = await getUserProfileAndTargetsForAI(user.uid);
            let contextForAI = systemPrompt;
            if (userProfileData?.weightKg) {
                contextForAI += `\nThe user's current weight is ${userProfileData.weightKg} kg.`;
            }
            fullPrompt = `${contextForAI}\n\nUser's question: ${currentAiMessageText}`;

            console.log(`[log-exercise-ai] Sending prompt: ${fullPrompt}`);
            const result = await aiChatSession.sendMessageStream(fullPrompt);

            let aiResponseText = '';
            const aiMessageId = `ai-resp-${Date.now()}`;
            const aiPartialMessage: ChatMessage = { id: aiMessageId, text: '...', sender: 'ai', timestamp: new Date() };
            setAiChatHistory(prev => [...prev, aiPartialMessage]);

            for await (const item of result.stream) {
                if (item.candidates && item.candidates.length > 0)
                {
                    const chunk = item.candidates[0]?.content?.parts?.[0]?.text;
                    if (chunk) {
                        aiResponseText += chunk;
                        setAiChatHistory(prev =>
                            prev.map(msg =>
                                msg.id === aiMessageId ? { ...msg, text: aiResponseText } : msg
                            )
                        );
                    }
                }
            }
            // Fallback and error handling like in your main chat page
            if (!aiResponseText && result.response.candidates && result.response.candidates.length > 0) {
                const fullText = result.response.candidates[0]?.content?.parts?.[0]?.text;
                if (fullText) {
                    aiResponseText = fullText;
                    setAiChatHistory(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, text: aiResponseText } : msg ));
                }
            }
            if (!aiResponseText) {
                setAiChatHistory(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, text: "[AI had no text response]" } : msg ));
            }


        } catch (error: any) {
            console.error('Error sending AI message on exercise page:', error);
            const errorMsg: ChatMessage = {
                id: `err-ai-${Date.now()}`,
                text: `Error: ${error.message || 'Could not get AI response.'}`,
                sender: 'ai',
                timestamp: new Date(),
            };
            setAiChatHistory(prev => [...prev, errorMsg]);
        } finally {
            setIsLoadingAiResponse(false);
        }
    };

    useEffect(() => {
        aiMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [aiChatHistory]);


    if (authLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
    }
    if (!user) {
        if (typeof window !== 'undefined') router.push('/login');
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
    }

    return (
        <Container maxWidth="md"> {/* Changed to md to give more space for two sections */}
            <Grid container spacing={4} sx={{ my: 4 }}>
                {/* Exercise Logging Form Section */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, height: '100%' }}>
                        <Typography variant="h5" component="h1" gutterBottom>
                            Log Your Exercise
                        </Typography>
                        {logError && <Alert severity="error" sx={{ mb: 2 }}>{logError}</Alert>}
                        {logSuccess && <Alert severity="success" sx={{ mb: 2 }}>{logSuccess}</Alert>}
                        <Box component="form" onSubmit={handleLogExercise} noValidate sx={{ mt: 1 }}>
                            <TextField margin="normal" required fullWidth id="exerciseName" label="Exercise Name" name="exerciseName" value={exerciseName} onChange={(e) => setExerciseName(e.target.value)} autoFocus />
                            <TextField margin="normal" required fullWidth name="caloriesBurned" label="Calories Burned" type="number" id="caloriesBurned" value={caloriesBurned} onChange={(e) => setCaloriesBurned(e.target.value)} InputProps={{ inputProps: { min: 0, step: "any" } }} />
                            <TextField margin="normal" fullWidth name="durationMinutes" label="Duration (minutes, optional)" type="number" id="durationMinutes" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} InputProps={{ inputProps: { min: 0, step: "any" } }} />
                            <TextField margin="normal" required fullWidth name="exerciseDate" label="Date of Exercise" type="date" id="exerciseDate" value={exerciseDate} onChange={(e) => setExerciseDate(e.target.value)} InputLabelProps={{ shrink: true }} />
                            <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }} disabled={isLoggingExercise}>
                                {isLoggingExercise ? <CircularProgress size={24} /> : 'Log Exercise'}
                            </Button>
                        </Box>
                    </Paper>
                </Grid>

                {/* AI Chat for Calorie Estimation Section */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 400 /* Ensure a minimum height */ }}>
                        <Typography variant="h6" gutterBottom textAlign="center">
                            Not sure how much you burned?
                        </Typography>
                        <Typography variant="subtitle1" gutterBottom textAlign="center" sx={{mb:1}}>
                            Ask the coach!
                        </Typography>

                        {isAiModelInitializing && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
                                <CircularProgress />
                                <Typography sx={{mt:1}}>Initializing AI Coach...</Typography>
                            </Box>
                        )}
                        {!isAiModelInitializing && !aiChatSession && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
                                <Alert severity="warning">AI Coach could not be initialized. Please try again later.</Alert>
                            </Box>
                        )}

                        {aiChatSession && !isAiModelInitializing && (
                            <>
                                <List sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 300 /* Adjust as needed */, border: '1px solid', borderColor: 'divider', borderRadius: 1, p:1, mb:1 }}>
                                    {aiChatHistory.map((msg) => (
                                        <ListItem key={msg.id} sx={{ justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start', px:0.5, py: 0.25 }}>
                                            <Paper
                                                elevation={1}
                                                sx={{
                                                    p: 1,
                                                    borderRadius: msg.sender === 'user' ? '15px 15px 5px 15px' : '5px 15px 15px 15px',
                                                    backgroundColor: msg.sender === 'user' ? 'primary.light' : 'grey.200',
                                                    color: msg.sender === 'user' ? 'primary.contrastText' : 'text.primary',
                                                    maxWidth: '80%',
                                                    wordBreak: 'break-word',
                                                }}
                                            >
                                                <ListItemText
                                                    primary={<Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</Typography>}
                                                    secondary={<Typography variant="caption" sx={{fontSize: '0.6rem'}}>{msg.timestamp.toLocaleTimeString()}</Typography>}
                                                    secondaryTypographyProps={{textAlign: msg.sender === 'user' ? 'right' : 'left'}}
                                                />
                                            </Paper>
                                        </ListItem>
                                    ))}
                                    <div ref={aiMessagesEndRef} />
                                </List>
                                {isLoadingAiResponse && (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 0.5 }}>
                                        <CircularProgress size={20} />
                                        <Typography variant="caption" sx={{ml:1}}>AI is thinking...</Typography>
                                    </Box>
                                )}
                                <Box component="form" onSubmit={handleAiSendMessage} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 'auto' /* Pushes to bottom */ }}>
                                    <TextField fullWidth variant="outlined" placeholder="e.g., 30 min jogging" value={aiInputMessage} onChange={(e) => setAiInputMessage(e.target.value)} size="small" disabled={isLoadingAiResponse || !aiChatSession} />
                                    <IconButton type="submit" color="primary" disabled={isLoadingAiResponse || !aiInputMessage.trim() || !aiChatSession}>
                                        <SendIcon />
                                    </IconButton>
                                </Box>
                            </>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
}