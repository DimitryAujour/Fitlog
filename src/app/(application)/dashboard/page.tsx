// src/app/(application)/dashboard/page.tsx
'use client';

import React from 'react';
import { Button, Typography, Container, Box, CircularProgress } from '@mui/material';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/clientApp';
import { useAuth } from '@/context/AuthContext'; // Import useAuth

export default function DashboardPage() {
    const { user, loading } = useAuth(); // Use the hook to get user and loading state
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/login');
        } catch (error){      console.error('Logout error:', error);
    }
};

// If loading, show a spinner (though AuthProvider already does this globally,
// you might want component-level loading states for other async operations later)
if (loading) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            <CircularProgress />
        </Box>
    );
}

// If not loading and no user, prompt to login
// (This is a basic check; proper route protection will be more robust)
if (!user) {
    return (
        <Container maxWidth="sm">
            <Box sx={{ my: 4, textAlign: 'center' }}>
                <Typography variant="h5" gutterBottom>
                    Please login to access the dashboard.
                </Typography>
                <Button variant="contained" onClick={() => router.push('/login')}>
                    Go to Login
                </Button>
            </Box>
        </Container>
    );
}

// If user is logged in, show dashboard content
return (
    <Container maxWidth="md">
        <Box sx={{ my: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Welcome to FitLog Dashboard!
            </Typography>
            {user.email && (
                <Typography variant="h6" gutterBottom>
                    Logged in as: {user.email}
                </Typography>
            )}
            <Typography variant="body1" gutterBottom>
                (This is a placeholder page for authenticated users)
            </Typography>
            <Button
                variant="contained"
                color="secondary"
                onClick={handleLogout}
                sx={{ mt: 3 }}
            >
                Logout
            </Button>
        </Box>
    </Container>
);
}