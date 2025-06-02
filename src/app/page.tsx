// src/app/page.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // Your AuthContext
import { Box, CircularProgress, Container, Typography } from '@mui/material';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect until authentication status is resolved
    if (!authLoading) {
      if (user) {
        // User is logged in, redirect to dashboard
        router.replace('/dashboard');
      } else {
        // User is not logged in, redirect to login page
        router.replace('/login');
      }
    }
  }, [user, authLoading, router]);

  // Show a loading indicator while checking auth status and redirecting
  return (
      <Container
          maxWidth="xs"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh', // Full viewport height
            textAlign: 'center'
          }}
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading FitLog...
        </Typography>
      </Container>
  );
}