'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { CircularProgress, Box, Typography } from '@mui/material';
import LandingPage from './(marketing)/_components/LandingPage';

export default function HomePage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // If auth is not loading and the user is logged in, redirect them.
        if (!authLoading && user) {
            router.replace('/dashboard');
        }
    }, [user, authLoading, router]);

    // While checking for authentication, show a full-screen loader.
    if (authLoading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '100vh',
                    textAlign: 'center',
                }}
            >
                <CircularProgress />
                <Typography variant="h6" sx={{ mt: 2 }}>
                    Loading Peak ...
                </Typography>
            </Box>
        );
    }

    // If the user is not logged in (and auth is done loading), show the landing page.
    // The useEffect hook handles the redirect for logged-in users.
    if (!user) {
        return <LandingPage />;
    }

    // This part will briefly be rendered for logged-in users before the redirect happens.
    // It can be the same loader or null. A loader is better for UX.
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                textAlign: 'center',
            }}
        >
            <CircularProgress />
            <Typography variant="h6" sx={{ mt: 2 }}>
                Redirecting to your dashboard...
            </Typography>
        </Box>
    );
}