// src/app/(application)/ai-chat/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Container,
    Paper,
    TextField,
    Typography,
    List,
    ListItem,
    ListItemText,
    CircularProgress,
    IconButton,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { getInitializedGenerativeModel } from '@/lib/firebase/clientApp';
// Ensure you import all necessary types from firebase/ai
import type {
    GenerativeModel,
    ChatSession,
    EnhancedGenerateContentResponse // Assuming this type is available from firebase/ai
} from 'firebase/ai';


import {
    getUserProfileAndTargetsForAI,
    getDailyNutritionalSummaryForAI, // <-- Correct function name
    // Ensure you also import the type if you use it for the variable
    // AiContextDailySummary
} from '@/lib/aiContextHelper';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

export default function AiChatPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [inputMessage, setInputMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<Message[]>([]);
    const [isLoadingAiResponse, setIsLoadingAiResponse] = useState(false);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const [model, setModel] = useState<GenerativeModel | null>(null);
    const [isModelInitializing, setIsModelInitializing] = useState(true);

    const [chatSession, setChatSession] = useState<ChatSession | null>(null);

    useEffect(() => {
        if (user) {
            setIsModelInitializing(true);
            console.log("User authenticated, attempting to initialize AI model...");
            getInitializedGenerativeModel()
                .then(initializedModel => {
                    setModel(initializedModel);
                    console.log("AI Model initialized successfully for chat page.");
                })
                .catch(error => {
                    console.error("Failed to initialize AI Model for chat page:", error);
                })
                .finally(() => {
                    setIsModelInitializing(false);
                });
        } else {
            setIsModelInitializing(false);
            setModel(null);
        }
    }, [user]);

    useEffect(() => {
        if (user && model) {
            console.log("User and AI Model are available, starting new chat session.");
            const newChatSession = model.startChat({
                history: chatHistory.filter(msg => msg.sender === 'user' || msg.sender === 'ai').map(msg => ({
                    role: msg.sender === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.text }]
                })),
            });
            setChatSession(newChatSession);
        } else {
            setChatSession(null);
            if (user && !model && !isModelInitializing) {
                console.warn("Chat session not started: Model is not available, but model initialization is complete.");
            }
        }
    }, [user, model, isModelInitializing, chatHistory]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [chatHistory]);

    const handleSendMessage = async (event?: React.FormEvent<HTMLFormElement>) => {
        if (event) event.preventDefault();
        const currentMessageText = inputMessage.trim();

        if (!currentMessageText || !chatSession || !user) {
            console.warn("Cannot send message: Missing text, chat session, or user.");
            return;
        }

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            text: currentMessageText,
            sender: 'user',
            timestamp: new Date(),
        };
        setChatHistory(prev => [...prev, userMessage]);
        setInputMessage('');
        setIsLoadingAiResponse(true);

        // Placeholder for the AI's response while it's being generated
        const aiMessageId = `ai-${Date.now()}`; // Define it here to use in catch block if needed for placeholder
        const aiPartialMessage: Message = {
            id: aiMessageId,
            text: '...',
            sender: 'ai',
            timestamp: new Date(),
        };
        setChatHistory(prev => [...prev, aiPartialMessage]);

        try {
            // Fetch context data
            const userProfileData = await getUserProfileAndTargetsForAI(user.uid);
            const todaysLogSummary = await getDailyNutritionalSummaryForAI(user.uid);

            const contextStrings: string[] = [];
            // System Prompt (Customize as needed for the general chat page)
            contextStrings.push("System: You are FitLog AI, a friendly and knowledgeable nutrition and fitness coach. Your goal is to provide supportive, evidence-based advice based on the user's profile, targets, and current day's intake. Avoid overly technical jargon unless necessary, and always prioritize safety and general wellness. Do not provide medical advice; suggest consulting a healthcare professional for medical concerns.");

            // Add User Profile Context
            if (userProfileData) {
                let profileContext = "User Profile & Targets Context:";
                if (userProfileData.fitnessGoal) profileContext += `\n- Goal: ${userProfileData.fitnessGoal}`;
                if (userProfileData.activityLevel) profileContext += `\n- Activity Level: ${userProfileData.activityLevel}`;
                if (userProfileData.weightKg) profileContext += `\n- Weight: ${userProfileData.weightKg} kg`;
                if (userProfileData.targetCalories) profileContext += `\n- Daily Calorie Target: ${userProfileData.targetCalories.toFixed(0)} kcal`;
                if (userProfileData.targetProteinGrams) profileContext += `\n- Daily Protein Target: ${userProfileData.targetProteinGrams.toFixed(1)}g`;
                if (userProfileData.targetCarbGrams) profileContext += `\n- Daily Carb Target: ${userProfileData.targetCarbGrams.toFixed(1)}g`;
                if (userProfileData.targetFatGrams) profileContext += `\n- Daily Fat Target: ${userProfileData.targetFatGrams.toFixed(1)}g`;
                contextStrings.push(profileContext);
            } else {
                contextStrings.push("User Profile Context: Not available.");
            }

            // Add Today's Log Summary Context
            if (todaysLogSummary) {
                let summaryContext = "Today's Nutritional Summary:";
                summaryContext += `\n- Calories from Food: ${todaysLogSummary.consumedCalories.toFixed(0)} kcal`;
                summaryContext += `\n- Calories Burned (Exercise): ${todaysLogSummary.exerciseCaloriesBurned.toFixed(0)} kcal`;
                summaryContext += `\n- Net Calories Consumed Today: ${todaysLogSummary.netCaloriesConsumed.toFixed(0)} kcal`;
                if (userProfileData?.targetCalories) {
                    const remainingCalories = userProfileData.targetCalories - todaysLogSummary.netCaloriesConsumed;
                    summaryContext += `\n- Calories Remaining for Target: ${remainingCalories.toFixed(0)} kcal`;
                }
                summaryContext += `\n- Protein Consumed: ${todaysLogSummary.consumedProtein.toFixed(1)}g`;
                summaryContext += `\n- Carbs Consumed: ${todaysLogSummary.consumedCarbs.toFixed(1)}g`;
                summaryContext += `\n- Fat Consumed: ${todaysLogSummary.consumedFat.toFixed(1)}g`;
                contextStrings.push(summaryContext);
            } else {
                contextStrings.push("Today's Nutritional Summary: Not available or no intake/exercise logged yet.");
            }

            contextStrings.push(`\nUser Query: ${currentMessageText}`);
            contextStrings.push("\nBased on all the above information, provide a helpful and relevant response.");

            const fullPrompt = contextStrings.join('\n\n');
            console.log(`[ai-chat] Sending augmented prompt to AI: \n${fullPrompt}`);

            const result = await chatSession.sendMessageStream(fullPrompt);

            let aiResponseText = '';
            for await (const item of result.stream) {
                if (item.candidates && item.candidates.length > 0) {
                    const chunk = item.candidates[0]?.content?.parts?.[0]?.text;
                    if (chunk) {
                        aiResponseText += chunk;
                        setChatHistory(prev =>
                            prev.map(msg =>
                                msg.id === aiMessageId ? { ...msg, text: aiResponseText } : msg
                            )
                        );
                    }
                }
            }
            console.log('Received streamed AI response:', aiResponseText);

            if (!aiResponseText) {
                // Type casting here if you are sure of the type, or handle potential undefined
                const fullResponseObject = await result.response as EnhancedGenerateContentResponse;
                if (fullResponseObject.candidates && fullResponseObject.candidates.length > 0) {
                    const fullResponseTextFromPromise = fullResponseObject.candidates[0]?.content?.parts?.[0]?.text;
                    if (fullResponseTextFromPromise) {
                        aiResponseText = fullResponseTextFromPromise;
                        setChatHistory(prev =>
                            prev.map(msg =>
                                msg.id === aiMessageId ? { ...msg, text: aiResponseText } : msg
                            )
                        );
                    }
                }
            }

            if (!aiResponseText) {
                console.warn("AI response text was empty after streaming and fallback.");
                setChatHistory(prev =>
                    prev.map(msg =>
                        msg.id === aiMessageId ? { ...msg, text: "[No text response from AI]" } : msg
                    )
                );
            }

        } catch (error) {
            console.error('Error sending message to AI:', error);
            let errorMessage = 'Sorry, I encountered an error. Please try again.';
            if (error instanceof Error) {
                errorMessage += ` Details: ${error.message}`;
            } else if (typeof error === 'string') {
                errorMessage += ` Details: ${error}`;
            }
            const errorResponseMessage: Message = {
                id: `err-${Date.now()}`, // Use a new ID for the error message itself
                text: errorMessage,
                sender: 'ai',
                timestamp: new Date(),
            };
            setChatHistory(prev => {
                // Try to replace the placeholder if it exists for this attempt
                const placeholderIndex = prev.findIndex(m => m.id === aiMessageId && m.text === '...');
                if (placeholderIndex !== -1) {
                    const updatedHistory = [...prev];
                    updatedHistory[placeholderIndex] = errorResponseMessage;
                    return updatedHistory;
                }
                // Otherwise, just add the error message
                return [...prev, errorResponseMessage];
            });
        } finally {
            setIsLoadingAiResponse(false);
        }
    };

    // ... (rest of your component remains the same)

    if (authLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
    }
    if (!user) {
        if (typeof window !== 'undefined') router.push('/login');
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
    }

    if (isModelInitializing) {
        return (
            <Container maxWidth="md" sx={{ textAlign: 'center', mt: 4 }}>
                <CircularProgress />
                <Typography variant="h6" sx={{ mt: 2 }}>
                    Initializing AI Coach...
                </Typography>
            </Container>
        );
    }

    if (!model && !isModelInitializing) {
        return (
            <Container maxWidth="md" sx={{ textAlign: 'center', mt: 4 }}>
                <Typography variant="h6" color="error" sx={{ mt: 2 }}>
                    Failed to initialize AI Coach. Please try refreshing the page or contact support if the issue persists.
                </Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="md" sx={{
            display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px - 32px)',
            maxHeight: '800px',
            mt: 2, mb: 2
        }}>
            <Typography variant="h4" component="h1" gutterBottom textAlign="center" color={"primary"}>
                FitLog AI Coach
            </Typography>
            <Paper
                elevation={3}
                sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                }}
            >
                <List sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
                    {chatHistory.map((msg) => (
                        <ListItem key={msg.id} sx={{ justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                            <Paper
                                elevation={1}
                                sx={{
                                    p: 1.5,
                                    borderRadius: msg.sender === 'user' ? '20px 20px 5px 20px' : '5px 20px 20px 20px',
                                    backgroundColor: msg.sender === 'user' ? 'primary.main' : 'secondary.main',
                                    color: msg.sender === 'user' ? 'primary.contrastText' : 'secondary.contrastText',
                                    maxWidth: '70%',
                                    wordBreak: 'break-word',
                                }}
                            >
                                <ListItemText
                                    primary={<Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</Typography>}
                                    secondary={msg.timestamp.toLocaleTimeString()}
                                    secondaryTypographyProps={{ color: msg.sender === 'user' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}
                                />
                            </Paper>
                        </ListItem>
                    ))}
                    <div ref={messagesEndRef} />
                </List>

                {isLoadingAiResponse && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 1 }}>
                        <CircularProgress size={24} />
                        <Typography variant="caption" sx={{ ml: 1 }}>AI is thinking...</Typography>
                    </Box>
                )}
                {!chatSession && !isModelInitializing && user && model && (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="caption" color="error">Could not start chat session. Please try refreshing.</Typography>
                    </Box>
                )}

                <Box
                    component="form"
                    onSubmit={handleSendMessage}
                    sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}
                >
                    <TextField
                        fullWidth
                        variant="outlined"
                        placeholder={!chatSession ? "Initializing chat..." : "Ask your FitLog AI Coach..."}
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        size="small"
                        disabled={isLoadingAiResponse || !chatSession}
                    />
                    <IconButton type="submit" color="primary" disabled={isLoadingAiResponse || !inputMessage.trim() || !chatSession}>
                        <SendIcon />
                    </IconButton>
                </Box>
            </Paper>
        </Container>
    );
}