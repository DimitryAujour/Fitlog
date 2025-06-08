// src/app/(auth)/_components/LoginForm.tsx
'use client';

import React, { useState } from 'react';
import {
    Button,
    TextField,
    Box,
    Typography,
    Alert,
    Divider,
    Paper,

} from '@mui/material';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/lib/firebase/clientApp';
import { useRouter } from 'next/navigation';
import GoogleIcon from '@mui/icons-material/Google';

// It can be helpful to define a type for Firebase errors if you're checking specific codes
interface FirebaseError extends Error {
    code?: string;
}

// A new component for the animated background
const AnimatedSvgBackground = () => {
    // We can use the theme here if we want to make it even more dynamic,
    // but for simplicity, we'll use colors derived from your theme file.
    // Primary: #6A679E -> rgba(106, 103, 158, 1)
    // Secondary: #6ECDC2 -> rgba(110, 205, 194, 1)
    // A complementary info color: #29b6f6 -> rgba(41, 182, 246, 1)

    return (
        <Box
            id="bg-wrap"
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100vh',
                zIndex: -1,
                overflow: 'hidden',
                backgroundColor: '#141118' // A solid background color from your theme
            }}
        >
            <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%' }}>
                <defs>
                    <radialGradient id="Gradient1" cx="50%" cy="50%" fx="0.441602%" fy="50%" r=".5">
                        <animate attributeName="fx" dur="34s" values="0%;3%;0%" repeatCount="indefinite"></animate>
                        <stop offset="0%" stopColor="rgba(106, 103, 158, 1)"></stop>
                        <stop offset="100%" stopColor="rgba(106, 103, 158, 0)"></stop>
                    </radialGradient>
                    <radialGradient id="Gradient2" cx="50%" cy="50%" fx="2.68147%" fy="50%" r=".5">
                        <animate attributeName="fx" dur="23.5s" values="0%;3%;0%" repeatCount="indefinite"></animate>
                        <stop offset="0%" stopColor="rgba(110, 205, 194, 1)"></stop>
                        <stop offset="100%" stopColor="rgba(110, 205, 194, 0)"></stop>
                    </radialGradient>
                    <radialGradient id="Gradient3" cx="50%" cy="50%" fx="0.836536%" fy="50%" r=".5">
                        <animate attributeName="fx" dur="21.5s" values="0%;3%;0%" repeatCount="indefinite"></animate>
                        <stop offset="0%" stopColor="rgba(41, 182, 246, 1)"></stop>
                        <stop offset="100%" stopColor="rgba(41, 182, 246, 0)"></stop>
                    </radialGradient>
                </defs>
                <rect x="13.744%" y="1.18473%" width="100%" height="100%" fill="url(#Gradient1)" transform="rotate(334.41 50 50)">
                    <animate attributeName="x" dur="20s" values="25%;0%;25%" repeatCount="indefinite"></animate>
                    <animate attributeName="y" dur="21s" values="0%;25%;0%" repeatCount="indefinite"></animate>
                    <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="17s" repeatCount="indefinite"></animateTransform>
                </rect>
                <rect x="-2.17916%" y="35.4267%" width="100%" height="100%" fill="url(#Gradient2)" transform="rotate(255.072 50 50)">
                    <animate attributeName="x" dur="23s" values="-25%;0%;-25%" repeatCount="indefinite"></animate>
                    <animate attributeName="y" dur="24s" values="0%;50%;0%" repeatCount="indefinite"></animate>
                    <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="18s" repeatCount="indefinite"></animateTransform>
                </rect>
                <rect x="9.00483%" y="14.5733%" width="100%" height="100%" fill="url(#Gradient3)" transform="rotate(139.903 50 50)">
                    <animate attributeName="x" dur="25s" values="0%;25%;0%" repeatCount="indefinite"></animate>
                    <animate attributeName="y" dur="12s" values="0%;25%;0%" repeatCount="indefinite"></animate>
                    <animateTransform attributeName="transform" type="rotate" from="360 50 50" to="0 50 50" dur="19s" repeatCount="indefinite"></animateTransform>
                </rect>
            </svg>
        </Box>
    );
};


const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    // The logic handlers remain exactly the same
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
        } catch (err) {
            const firebaseError = err as FirebaseError;
            if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
                setError('Invalid email or password. Please try again.');
            } else {
                setError(firebaseError.message || 'Failed to sign in. Please try again.');
            }
        }
    };

    const handleGoogleSignIn = async () => {
        setError(null);
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            router.push('/dashboard');
        } catch (err) {
            const firebaseError = err as FirebaseError;
            setError(firebaseError.message || 'Failed to sign in with Google. Please try again.');
        }
    };

    return (
        <Box sx={{
            position: 'relative', // Relative position for z-index to work with the fixed background
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
        }}>
            <AnimatedSvgBackground />

            <Paper
                elevation={12}
                sx={{
                    p: 4,
                    width: '100%',
                    maxWidth: 400,
                    borderRadius: 3,
                    // Use a semi-transparent background to create the frosted glass effect
                    backgroundColor: 'rgba(21, 17, 34, 0.75)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                    }}
                >
                    <Typography variant="h4" component="h1" gutterBottom color="white">
                        Welcome Back
                    </Typography>
                    {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}

                    <Box component="form" onSubmit={handleEmailPasswordSubmit} sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
                        <TextField
                            label="Email Address"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            variant="filled"
                            fullWidth
                            required
                            sx={{ '& .MuiInputBase-root': { backgroundColor: 'rgba(255, 255, 255, 0.08)' }, borderRadius: 1 }}
                            InputLabelProps={{ sx: { color: 'grey.400' } }}
                            inputProps={{ sx: { color: 'white' } }}
                        />
                        <TextField
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            variant="filled"
                            fullWidth
                            required
                            sx={{ '& .MuiInputBase-root': { backgroundColor: 'rgba(255, 255, 255, 0.08)' }, borderRadius: 1 }}
                            InputLabelProps={{ sx: { color: 'grey.400' } }}
                            inputProps={{ sx: { color: 'white' } }}
                        />
                        <Button type="submit" variant="contained" color="primary" size="large" fullWidth sx={{ mt: 1, py: 1.5 }}>
                            Login
                        </Button>
                    </Box>

                    <Divider sx={{ width: '100%', my: 1, color: 'grey.500', '&::before, &::after': { borderColor: 'grey.600' } }}>
                        OR
                    </Divider>

                    <Button
                        variant="outlined"
                        fullWidth
                        onClick={handleGoogleSignIn}
                        startIcon={<GoogleIcon />}
                        size="large"
                        sx={{
                            borderColor: 'rgba(255, 255, 255, 0.4)',
                            color: 'white',
                            py: 1.5,
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                borderColor: 'white'
                            }
                        }}
                    >
                        Sign in with Google
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
};

export default LoginForm;