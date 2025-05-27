// src/app/(auth)/_components/LoginForm.tsx
'use client';

import React, { useState } from 'react';
import { Button, TextField, Box, Typography, Alert, Divider } from '@mui/material';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase/clientApp';
import { useRouter } from 'next/navigation';

// MUI Icon for Google, ensure you have @mui/icons-material installed
// npm install @mui/icons-material
import GoogleIcon from '@mui/icons-material/Google';

const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleEmailPasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);

        if (!email || !password) {
            setError("Please enter both email and password.");
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push('/dashboard');
        } catch (err: any) {
            console.error('Firebase email/password login error:', err);
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError('Invalid email or password. Please try again.');
            } else {
                setError(err.message || 'Failed to sign in. Please try again.');
            }
        }
    };

    const handleGoogleSignIn = async () => {
        setError(null);
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            // User signed in successfully with Google
            // Firebase automatically handles linking if the email exists
            // or creates a new user.
            router.push('/dashboard');
        } catch (err: any) {
            console.error('Firebase Google sign-in error:', err);
            // Handle specific Google Sign-In errors if needed
            // e.g., err.code === 'auth/popup-closed-by-user'
            setError(err.message || 'Failed to sign in with Google. Please try again.');
        }
    };

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                mt: 4,
                p: 3,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                maxWidth: 400,
                mx: 'auto',
            }}
        >
            <Typography variant="h5" component="h1" gutterBottom>
                Login
            </Typography>
            {error && <Alert severity="error" sx={{ width: '100%', mb: 2 }}>{error}</Alert>}

            <Box component="form" onSubmit={handleEmailPasswordSubmit} sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    variant="outlined"
                    fullWidth
                    required
                />
                <TextField
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    variant="outlined"
                    fullWidth
                    required
                />
                <Button type="submit" variant="contained" color="primary" fullWidth>
                    Login with Email
                </Button>
            </Box>

            <Divider sx={{ width: '100%', my: 2 }}>OR</Divider>

            <Button
                variant="outlined"
                color="primary"
                fullWidth
                onClick={handleGoogleSignIn}
                startIcon={<GoogleIcon />} // Add Google icon
            >
                Sign in with Google
            </Button>
        </Box>
    );
};

export default LoginForm;