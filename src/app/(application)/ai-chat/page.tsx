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
            // ... (your existing checks)
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

        let fullPrompt = currentMessageText;

        try {
            const userProfileData = await getUserProfileAndTargetsForAI(user.uid);
            const todaysLogSummary = await getDailyNutritionalSummaryForAI(user.uid);

            const contextStrings: string[] = [];
            contextStrings.push("System: You are FitLog AI..."); // Keep your system prompt

            if (userProfileData) {
                // ... (your profile context construction)
            }

            if (todaysLogSummary) {
                // ... (your log summary context construction)
            }

            contextStrings.push(`User Query: ${currentMessageText}`);
            contextStrings.push("Based on all the above information, provide a helpful response.");

            fullPrompt = contextStrings.join('\n\n');
            console.log(`[ai-chat] Sending augmented prompt to AI: \n${fullPrompt}`);

            const result = await chatSession.sendMessageStream(fullPrompt);

            let aiResponseText = '';
            const aiMessageId = `ai-${Date.now()}`;
            const aiPartialMessage: Message = {
                id: aiMessageId,
                text: '...',
                sender: 'ai',
                timestamp: new Date(),
            };
            setChatHistory(prev => [...prev, aiPartialMessage]);

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

            // **FIXED PART HERE**
            // Fallback if stream was empty but full response has content
            if (!aiResponseText) {
                const fullResponseObject: EnhancedGenerateContentResponse = await result.response; // Await the promise
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
                id: `err-${Date.now()}`,
                text: errorMessage,
                sender: 'ai',
                timestamp: new Date(),
            };
            setChatHistory(prev => {
                const existingAiMessageIndex = prev.findIndex(msg => msg.id.startsWith('ai-') && msg.text === '...');
                if (existingAiMessageIndex !== -1) {
                    const updatedHistory = [...prev];
                    updatedHistory[existingAiMessageIndex] = errorResponseMessage;
                    return updatedHistory;
                }
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