// src/app/(application)/ai-chat/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Container,
    Paper,
    TextField,
    Button,
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
// Import the new function to get the initialized model and its type
import { getInitializedGenerativeModel } from '@/lib/firebase/clientApp'; // Adjusted path if needed

import type { GenerativeModel, ChatSession } from 'firebase/ai'; // Import types

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

    // State for the actual GenerativeModel instance
    const [model, setModel] = useState<GenerativeModel | null>(null);
    const [isModelInitializing, setIsModelInitializing] = useState(true); // Loading state for the model

    // State for the chat session
    const [chatSession, setChatSession] = useState<ChatSession | null>(null);

    // Effect to initialize the Generative Model
    // In your ai-chat/page.tsx
    useEffect(() => {
        if (user) {
            setIsModelInitializing(true);
            console.log("User authenticated, attempting to initialize AI model...");
            getInitializedGenerativeModel() // Call remains the same
                .then(initializedModel => {
                    setModel(initializedModel);
                    console.log("AI Model initialized successfully for chat page.");
                })
                .catch(error => {
                    console.error("Failed to initialize AI Model for chat page:", error);
                    // Hopefully, the error message will be different now if this works, or gone!
                })
                .finally(() => {
                    setIsModelInitializing(false);
                });
        } else {
            // ...
        }
    }, [user]);

    // Effect to initialize the chat session once the user and model are available
    useEffect(() => {
        if (user && model) {
            console.log("User and AI Model are available, starting new chat session.");
            // Initialize the chat session
            const newChatSession = model.startChat({
                history: [], // You can load past history here if needed
                // safetySettings: Adjust safety settings if necessary
                // generationConfig: Adjust generation config if necessary
            });
            setChatSession(newChatSession);
        } else {
            // If user or model is not available, clear the chat session
            setChatSession(null);
            if (user && !model && !isModelInitializing) {
                console.warn("Chat session not started: Model is not available, but model initialization is complete.");
            }
        }
    }, [user, model, isModelInitializing]); // Depend on user and the initialized model

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [chatHistory]);

    const handleSendMessage = async (event?: React.FormEvent<HTMLFormElement>) => {
        if (event) event.preventDefault();
        const currentMessageText = inputMessage.trim();
        // Ensure chatSession is active before sending a message
        if (!currentMessageText || !chatSession) {
            if (!chatSession) console.warn("Attempted to send message, but chat session is not active.");
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

        try {
            console.log(`Sending message to AI: "${currentMessageText}"`);
            const result = await chatSession.sendMessageStream(currentMessageText);

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

            // Fallback if stream was empty but full response has content (less common for streaming)
            if (!aiResponseText && result.response.candidates && result.response.candidates.length > 0) {
                const fullResponseText = result.response.candidates[0]?.content?.parts?.[0]?.text;
                if (fullResponseText) {
                    aiResponseText = fullResponseText;
                    setChatHistory(prev =>
                        prev.map(msg =>
                            msg.id === aiMessageId ? { ...msg, text: aiResponseText } : msg
                        )
                    );
                }
            }

            if (!aiResponseText) {
                // This handles cases where the AI genuinely might not have a text response
                // or if there was an issue not caught as an error by sendMessageStream
                console.warn("AI response text was empty after streaming.");
                setChatHistory(prev =>
                    prev.map(msg =>
                        msg.id === aiMessageId ? { ...msg, text: "[No text response from AI]" } : msg
                    )
                );
            }

        } catch (error: any) {
            console.error('Error sending message to AI:', error);
            let errorMessage = 'Sorry, I encountered an error. Please try again.';
            if (error.message) {
                errorMessage += ` Details: ${error.message}`;
            }
            const errorResponseMessage: Message = {
                id: `err-${Date.now()}`,
                text: errorMessage,
                sender: 'ai',
                timestamp: new Date(),
            };
            // Replace the partial AI message with the error message, or add new
            setChatHistory(prev => {
                const existingAiMessageIndex = prev.findIndex(msg => msg.id.startsWith('ai-') && msg.text === '...');
                if (existingAiMessageIndex !== -1) {
                    const updatedHistory = [...prev];
                    updatedHistory[existingAiMessageIndex] = errorResponseMessage; // Replace placeholder
                    return updatedHistory;
                }
                return [...prev, errorResponseMessage]; // Add as new if no placeholder
            });
        } finally {
            setIsLoadingAiResponse(false);
        }
    };

    if (authLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
    }
    if (!user) {
        if (typeof window !== 'undefined') router.push('/login');
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
    }

    // UI for when the model itself is initializing
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

    // UI when model failed to initialize (and no chat session can be formed)
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
        <Container maxWidth="md" sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px - 32px)',
            maxHeight: '800px', // Example max height
            mt: 2, mb:2
        }}>
            <Typography variant="h4" component="h1" gutterBottom textAlign="center">
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
                                    secondaryTypographyProps={{color: msg.sender === 'user' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'}}
                                />
                            </Paper>
                        </ListItem>
                    ))}
                    <div ref={messagesEndRef} />
                </List>

                {isLoadingAiResponse && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 1 }}>
                        <CircularProgress size={24} />
                        <Typography variant="caption" sx={{ml:1}}>AI is thinking...</Typography>
                    </Box>
                )}
                {!chatSession && !isModelInitializing && user && model && ( // Show if chat session couldn't be made for some reason but model is there
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
                        disabled={isLoadingAiResponse || !chatSession} // Disable if AI is responding or chat session isn't ready
                    />
                    <IconButton type="submit" color="primary" disabled={isLoadingAiResponse || !inputMessage.trim() || !chatSession}>
                        <SendIcon />
                    </IconButton>
                </Box>
            </Paper>
        </Container>
    );
}