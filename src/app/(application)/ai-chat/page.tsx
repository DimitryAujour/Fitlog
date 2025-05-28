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
import SendIcon from '@mui/icons-material/Send'; // For the send button
import { useAuth } from '@/context/AuthContext';
import {router} from "next/client";
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app as firebaseApp } from '@/lib/firebase/clientApp';
interface Message {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: Date;
}

export default function AiChatPage() {
    const { user, loading: authLoading } = useAuth();
    const [inputMessage, setInputMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<Message[]>([]);
    const [isLoadingAiResponse, setIsLoadingAiResponse] = useState(false);
    const messagesEndRef = useRef<null | HTMLDivElement>(null); // To scroll to bottom

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [chatHistory]); // Scroll to bottom when chat history changes
// Replace the existing handleSendMessage in src/app/(application)/ai-chat/page.tsx
    const handleSendMessage = async (event?: React.FormEvent<HTMLFormElement>) => {
        if (event) event.preventDefault();
        const currentMessageText = inputMessage.trim(); // Capture message before clearing
        if (!currentMessageText) return;

        const userMessage: Message = {
            id: `user-${Date.now()}`,
            text: currentMessageText,
            sender: 'user',
            timestamp: new Date(),
        };
        setChatHistory(prev => [...prev, userMessage]);
        setInputMessage(''); // Clear input field
        setIsLoadingAiResponse(true);

        try {
            // Call your deployed Cloud Function
            console.log(`Calling fitlogAiChat with prompt: "${currentMessageText}"`);
            const result = await callFitlogAiChat({ prompt: currentMessageText });

            // The actual response from your Genkit flow is in result.data
            const aiTextResponse = result.data as string;
            console.log('Received AI response:', aiTextResponse);

            if (typeof aiTextResponse !== 'string') {
                console.error("Unexpected AI response format:", aiTextResponse);
                throw new Error("AI response was not in the expected format.");
            }

            const aiResponseMessage: Message = {
                id: `ai-${Date.now()}`,
                text: aiTextResponse,
                sender: 'ai',
                timestamp: new Date(),
            };
            setChatHistory(prev => [...prev, aiResponseMessage]);
        } catch (error: any) {
            console.error('Error calling AI chat function:', error);
            let errorMessage = 'Sorry, I encountered an error. Please try again.';
            if (error.message) {
                errorMessage += ` Details: ${error.message}`;
            }
            const errorResponseMessage: Message = {
                id: `err-${Date.now()}`,
                text: errorMessage,
                sender: 'ai', // Display error as an AI message
                timestamp: new Date(),
            };
            setChatHistory(prev => [...prev, errorResponseMessage]);
        } finally {
            setIsLoadingAiResponse(false);
        }
    };

    if (authLoading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
    }
    if (!user) {
        // Redirect or show login prompt - protected route HOC/middleware would be better
        if (typeof window !== 'undefined') router.push('/login');
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
    }
    const functions = getFunctions(firebaseApp);
    const callFitlogAiChat = httpsCallable(functions, 'fitlogAiChat');

    return (
        <Container maxWidth="md" sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px - 32px)', // Adjust based on your header/footer
            maxHeight: '800px', // Max height for the chat container
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
                    overflow: 'hidden', // To contain the scrolling list
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
                                }}
                            >
                                <ListItemText
                                    primary={msg.text}
                                    secondary={msg.timestamp.toLocaleTimeString()}
                                    secondaryTypographyProps={{color: msg.sender === 'user' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)'}}
                                />
                            </Paper>
                        </ListItem>
                    ))}
                    <div ref={messagesEndRef} /> {/* Anchor for scrolling */}
                </List>

                {isLoadingAiResponse && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
                        <CircularProgress size={24} />
                        <Typography variant="caption" sx={{ml:1}}>AI is thinking...</Typography>
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
                        placeholder="Ask your FitLog AI Coach..."
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        size="small"
                        disabled={isLoadingAiResponse}
                    />
                    <IconButton type="submit" color="primary" disabled={isLoadingAiResponse || !inputMessage.trim()}>
                        <SendIcon />
                    </IconButton>
                </Box>
            </Paper>
        </Container>
    );
}