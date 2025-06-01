// src/app/(auth)/_components/RegistrationForm.tsx
'use client';

import React, { useState } from 'react';
import { Button, TextField, Box, Typography, Alert } from '@mui/material';
import { createUserWithEmailAndPassword } from 'firebase/auth'; // Import AuthError
import { auth } from '@/lib/firebase/clientApp';

// Define a type for Firebase errors if you're checking specific codes
interface FirebaseError extends Error {
    code?: string;
}

const RegistrationForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null);
        setSuccess(null);

        if (!email || !password) {
            setError("Please enter both email and password.");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log('User created:', userCredential.user);
            setSuccess(`User account created successfully for ${userCredential.user.email}! You can now login.`);
            setEmail('');
            setPassword('');
        } catch (err) { // Changed from catch (err: any)
            console.error('Firebase registration error:', err);
            const firebaseError = err as FirebaseError; // Type assertion

            if (firebaseError.code === 'auth/email-already-in-use') {
                setError('This email address is already in use.');
            } else if (firebaseError.code === 'auth/weak-password') {
                setError('The password is too weak. It should be at least 6 characters.');
            } else {
                setError(firebaseError.message || 'Failed to create account. Please try again.');
            }
        }
    };

    return (
        <Box
            component="form"
            onSubmit={handleSubmit}
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
                Create Account
            </Typography>
            {error && <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ width: '100%' }}>{success}</Alert>}
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
                helperText="Password should be at least 6 characters."
            />
            <Button type="submit" variant="contained" color="primary" fullWidth>
                Register
            </Button>
        </Box>
    );
};

export default RegistrationForm;