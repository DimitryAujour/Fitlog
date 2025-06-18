// src/app/(application)/ai-chat/page.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box, Container, Paper, TextField, Typography, CircularProgress,
    IconButton, Stack, Avatar, Accordion, AccordionSummary,
    AccordionDetails, Chip
} from '@mui/material';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { getInitializedGenerativeModel } from '@/lib/firebase/clientApp';
import type { GenerativeModel, ChatSession } from 'firebase/ai';

// UPDATE THIS IMPORT
import { getUserProfileAndTargetsForAI, getDailyNutritionalSummaryForAI, getFridgeItemsForAI } from '@/lib/aiContextHelper';
import type { AiContextUserProfile, AiContextDailySummary } from '@/lib/aiContextHelper';

// --- ICONS ---
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonIcon from '@mui/icons-material/Person';


// --- INTERFACES & CONSTANTS ---
interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
}
// Add a new interface for the full context state
interface FullAiContext {
    profile: AiContextUserProfile | null;
    summary: AiContextDailySummary | null;
    fridge: string[] | null; // <-- Add fridge
}

const promptStarters = [
    "What can I make for dinner with what I have?",
    "Suggest a high-protein snack.",
    "How am I doing on my calorie goal today?",
    "What's a good 30-minute workout I can do?",
];

export default function AiChatPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    // --- STATE ---
    const [inputMessage, setInputMessage] = useState('');
    const welcomeMessage = "Hello! I'm your AI Coach. I have your profile, daily logs, and fridge items ready. How can I help you?";
    const [chatHistory, setChatHistory] = useState<Message[]>([
        { id: 'init', text: welcomeMessage, sender: 'ai' }
    ]);

    const [isLoadingAiResponse, setIsLoadingAiResponse] = useState(false);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const [model, setModel] = useState<GenerativeModel | null>(null);
    const [chatSession, setChatSession] = useState<ChatSession | null>(null);
    const [isModelInitializing, setIsModelInitializing] = useState(true);
    // UPDATE aicontext state to use the new interface
    const [aiContext, setAiContext] = useState<FullAiContext>({ profile: null, summary: null, fridge: null });


    // --- LOGIC HOOKS ---
    const fetchAllContext = useCallback(async () => {
        if (!user) return;
        const profile = await getUserProfileAndTargetsForAI(user.uid);
        const summary = await getDailyNutritionalSummaryForAI(user.uid) || null;
        const fridge = await getFridgeItemsForAI(user.uid) || []; // <-- Fetch fridge items
        setAiContext({ profile, summary, fridge });
    }, [user]);

    useEffect(() => {
        if (user) {
            setIsModelInitializing(true);
            getInitializedGenerativeModel()
                .then(initializedModel => {
                    setModel(initializedModel);
                    const newChatSession = initializedModel.startChat();
                    setChatSession(newChatSession);
                })
                .catch(error => console.error("Failed to initialize AI Model:", error))
                .finally(() => setIsModelInitializing(false));

            fetchAllContext();
        } else if (!authLoading) {
            router.push('/login');
        }
    }, [user, authLoading, router, fetchAllContext]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [chatHistory, isLoadingAiResponse]);

    const handleSendMessage = async (messageText?: string) => {
        const currentMessageText = (messageText || inputMessage).trim();
        if (!currentMessageText || !chatSession || !user) return;

        const userMessage: Message = { id: `user-${Date.now()}`, text: currentMessageText, sender: 'user' };
        setChatHistory(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoadingAiResponse(true);

        try {
            // Re-fetch context to ensure it's fresh for the prompt
            await fetchAllContext();
            // We use the state `aiContext` which is now fresh
            const { profile, summary, fridge } = aiContext;

            const contextStrings: string[] = [];
            contextStrings.push("System: You are FitLog AI..."); // Keep your system prompt

            if (profile) {
                // ... (your existing profile context construction)
                let profileContext = "User Profile & Targets Context:";
                if (profile.fitnessGoal) profileContext += `\n- Goal: ${profile.fitnessGoal}`;
                if (profile.activityLevel) profileContext += `\n- Activity Level: ${profile.activityLevel}`;
                if (profile.weightKg) profileContext += `\n- Weight: ${profile.weightKg} kg`;
                if (profile.targetCalories) profileContext += `\n- Daily Calorie Target: ${profile.targetCalories.toFixed(0)} kcal`;
                if (profile.targetProteinGrams) profileContext += `\n- Daily Protein Target: ${profile.targetProteinGrams.toFixed(1)}g`;
                if (profile.targetCarbGrams) profileContext += `\n- Daily Carb Target: ${profile.targetCarbGrams.toFixed(1)}g`;
                if (profile.targetFatGrams) profileContext += `\n- Daily Fat Target: ${profile.targetFatGrams.toFixed(1)}g`;
                contextStrings.push(profileContext);
            }

            if (summary) {
                // ... (your existing summary context construction)
                let summaryContext = "Today's Nutritional Summary:";
                summaryContext += `\n- Calories from Food: ${summary.consumedCalories.toFixed(0)} kcal`;
                summaryContext += `\n- Calories Burned (Exercise): ${summary.exerciseCaloriesBurned.toFixed(0)} kcal`;
                summaryContext += `\n- Net Calories Consumed Today: ${summary.netCaloriesConsumed.toFixed(0)} kcal`;
                if (profile?.targetCalories) {
                    const remainingCalories = profile.targetCalories - summary.netCaloriesConsumed;
                    summaryContext += `\n- Calories Remaining for Target: ${remainingCalories.toFixed(0)} kcal`;
                }
                summaryContext += `\n- Protein Consumed: ${summary.consumedProtein.toFixed(1)}g`;
                summaryContext += `\n- Carbs Consumed: ${summary.consumedCarbs.toFixed(1)}g`;
                summaryContext += `\n- Fat Consumed: ${summary.consumedFat.toFixed(1)}g`;
                contextStrings.push(summaryContext);
            }

            // <-- ADD THE NEW FRIDGE CONTEXT -->
            if (fridge && fridge.length > 0) {
                const fridgeContext = `The user has these items in their fridge: ${fridge.join(', ')}. When making meal or recipe suggestions, please prioritize using these ingredients if possible.`;
                contextStrings.push(fridgeContext);
            }

            contextStrings.push(`\nUser Query: ${currentMessageText}`);
            contextStrings.push("\nBased on all the above information, provide a helpful and relevant response.");

            const fullPrompt = contextStrings.join('\n\n');
            const result = await chatSession.sendMessageStream(fullPrompt);
            let aiResponseText = '';
            const aiMessageId = `ai-${Date.now()}`;

            for await (const item of result.stream) {
                const chunk = item.text();
                aiResponseText += chunk;
                setChatHistory(prev => {
                    const lastMessage = prev.find(msg => msg.id === aiMessageId);
                    if (lastMessage) {
                        return prev.map(msg => msg.id === aiMessageId ? { ...msg, text: aiResponseText } : msg);
                    } else {
                        return [...prev, { id: aiMessageId, text: aiResponseText, sender: 'ai' }];
                    }
                });
            }
        } catch (error) {
            console.error('Error sending message to AI:', error);
            setChatHistory(prev => [...prev, { id: `err-${Date.now()}`, text: "Sorry, I encountered an error. Please try again.", sender: 'ai' }]);
        } finally {
            setIsLoadingAiResponse(false);
        }
    };

    const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        handleSendMessage();
    };

    // --- STYLES (remain the same) ---
    const darkPaperStyles = { /* ... */ };
    const darkInputStyles = { /* ... */ };

    // --- RENDER LOGIC ---
    if (authLoading || isModelInitializing) {
        return <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0D0B14' }}><CircularProgress /><Typography color="grey.400">Initializing AI Coach...</Typography></Box>;
    }
    if (!user || (!model && !isModelInitializing)) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0D0B14' }}><Typography color="error">Could not initialize AI. Please refresh.</Typography></Box>;
    }

    return (
        <Box sx={{ minHeight: 'calc(100vh - 64px)', p: { xs: 1, md: 3 } }}>
            <Container maxWidth="lg" sx={{ height: 'calc(100vh - 64px - 48px)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="h4" component="h1" sx={{ color: '#fff', textAlign: 'center' }}>
                    AI Fitness & Nutrition Coach
                </Typography>
                <Accordion sx={{ ...darkPaperStyles, flexShrink: 0 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{color: 'white'}}/>} >
                        <Typography>AI Context Snapshot</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="subtitle2" color="grey.400" gutterBottom>User Profile & Targets</Typography>
                                <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1}>
                                    {aiContext.profile ? Object.entries(aiContext.profile).map(([key, value]) => value && <Chip key={key} label={`${key}: ${value}`} size="small" />) : <Chip label="No profile data" size="small" variant="outlined"/>}
                                </Stack>
                            </Box>
                            <Box>
                                <Typography variant="subtitle2" color="grey.400" gutterBottom>Summary of the day</Typography>
                                <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1}>
                                    {aiContext.summary ? Object.entries(aiContext.summary).map(([key, value]) => <Chip key={key} label={`${key}: ${Number(value).toFixed(0)}`} size="small" />) : <Chip label="No activity today" size="small" variant="outlined" />}
                                </Stack>
                            </Box>
                            {/* NEW SECTION FOR FRIDGE ITEMS */}
                            <Box>
                                <Typography variant="subtitle2" color="grey.400" gutterBottom>Items in Fridge</Typography>
                                <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1}>
                                    {aiContext.fridge && aiContext.fridge.length > 0 ? aiContext.fridge.map((item) => <Chip key={item} label={item} size="small" />) : <Chip label="No items in fridge" size="small" variant="outlined" />}
                                </Stack>
                            </Box>
                        </Stack>
                    </AccordionDetails>
                </Accordion>
                {/* ... (rest of your chat UI remains the same) ... */}
                <Paper sx={{ ...darkPaperStyles, flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
                        {chatHistory.map(msg => (
                            <Stack key={msg.id} direction="row" spacing={2} sx={{ mb: 2, maxWidth: '85%', alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', ml: msg.sender === 'user' ? 'auto' : 0, mr: msg.sender === 'ai' ? 'auto' : 0 }}>
                                {msg.sender === 'ai' && <Avatar sx={{ bgcolor: 'primary.main' }}><SmartToyIcon /></Avatar>}
                                <Paper sx={{ p: 1.5, borderRadius: msg.sender === 'user' ? '20px 20px 5px 20px' : '20px 20px 20px 5px', bgcolor: msg.sender === 'user' ? 'primary.dark' : '#333' }}>
                                    <Typography sx={{ color: 'white', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</Typography>
                                </Paper>
                                {msg.sender === 'user' && <Avatar sx={{ bgcolor: '#333' }}><PersonIcon /></Avatar>}
                            </Stack>
                        ))}
                        {chatHistory.length === 1 && !isLoadingAiResponse && (
                            <Stack direction="row" flexWrap="wrap" useFlexGap justifyContent="center" spacing={1} sx={{ maxWidth: '80%', mx: 'auto', my: 2 }}>
                                {promptStarters.map(prompt => (
                                    <Chip
                                        key={prompt}
                                        label={prompt}
                                        variant="outlined"
                                        onClick={() => handleSendMessage(prompt)}
                                        sx={{color: 'grey.300', borderColor: 'grey.600', '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }}}
                                    />
                                ))}
                            </Stack>
                        )}
                        {isLoadingAiResponse && (
                            <Stack direction="row" spacing={2} sx={{ mt: 2, alignSelf: 'flex-start' }}>
                                <Avatar sx={{ bgcolor: 'primary.main' }}><SmartToyIcon /></Avatar>
                                <Paper sx={{ p: 1.5, borderRadius: '20px 20px 20px 5px', bgcolor: '#333', display:'flex', alignItems:'center' }}>
                                    <CircularProgress size={20} color="inherit" />
                                </Paper>
                            </Stack>
                        )}
                        <div ref={messagesEndRef} />
                    </Box>
                    <Box component="form" onSubmit={handleFormSubmit} sx={{ p: 2, borderTop: '1px solid', borderColor: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TextField fullWidth placeholder="Ask your AI Coach..." value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}} size="small" disabled={isLoadingAiResponse || !chatSession} sx={darkInputStyles} />
                        <IconButton type="submit" color="primary" disabled={isLoadingAiResponse || !inputMessage.trim() || !chatSession} sx={{ flexShrink: 0, bgcolor: 'primary.main', color: 'white', '&:hover': {bgcolor: 'primary.dark'} }}><SendIcon /></IconButton>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
}