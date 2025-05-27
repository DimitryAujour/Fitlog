'use client'; // This component will use client-side hooks (useState, etc.) and interact with Firebase

import React, { useState } from 'react';
import { Button, TextField, Box, Typography, Alert } from '@mui/material';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/clientApp'; // Import your Firebase auth instance

const RegistrationForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null); // Clear previous errors
        setSuccess(null); // Clear previous success messages

        if (!email || !password) {
            setError("Please enter both email and password.");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // User created successfully
            console.log('User created:', userCredential.user);
            setSuccess(`User account created successfully for ${userCredential.user.email}! You can now login.`);
            // Optionally, you can redirect the user to the login page or dashboard
            // For example, using Next.js router:
            // import { useRouter } from 'next/navigation';
            // const router = useRouter();
            // router.push('/login');
            setEmail(''); // Clear form

            setPassword('');
        } catch (err: any) {
            // Handle Firebase errors
            console.error('Firebase registration error:', err);
            // More specific error handling based on err.code can be added here
            if (err.code === 'auth/email-already-in-use') {
                setError('This email address is already in use.');
            } else if (err.code === 'auth/weak-password') {
                setError('The password is too weak. It should be at least 6 characters.');
            } else {
                setError(err.message || 'Failed to create account. Please try again.');
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
                gap: 2, // Spacing between elements
                mt: 4, // Margin top
                p: 3, // Padding
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                maxWidth: 400,
                mx: 'auto', // Center the form
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