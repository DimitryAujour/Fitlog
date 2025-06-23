// src/app/(marketing)/_components/LandingPage.tsx

'use client';

import React from 'react';
import {
    Box,
    Button,
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    Icon,
    Stack,
    Paper,
    useTheme
} from '@mui/material';
import { useRouter } from 'next/navigation';

// --- Re-using the animated background from your login page ---
import AnimatedSvgBackground from './AnimatedSvgBackground';

// --- Icons for features ---
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import KitchenIcon from '@mui/icons-material/Kitchen';

const featureList = [
    {
        icon: <FitnessCenterIcon fontSize="large" color="primary" />,
        title: 'Personalized Plans, Real Results',
        description: 'Track your macros for free. Add your details, and let our system calculate calorie and macro targets tailored to your specific fitness goals.'
    },
    {
        icon: <SmartToyIcon fontSize="large" color="primary" />,
        title: 'Intelligent AI Coaching',
        description: 'Don\'t know what to do? Get advice from an AI that understands your needs. Let it know what\'s in your fridge for recipe ideas you can actually make.'
    },
    {
        icon: <KitchenIcon fontSize="large" color="primary" />,
        title: 'Effortless Logging',
        description: 'Quickly log meals, exercises, and your available ingredients. Our smart system makes tracking your fitness journey simple and fast.'
    }
];

export default function LandingPage() {
    const theme = useTheme();
    const router = useRouter();

    return (
        <Box>
            {/* Hero Section */}
            <Box
                sx={{
                    position: 'relative',
                    minHeight: '90vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    overflow: 'hidden',
                }}
            >
                {/* Re-using the animated background from the login form */}
                <AnimatedSvgBackground />

                <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography
                        variant="h2"
                        component="h1"
                        sx={{
                            fontWeight: 'bold',
                            color: 'white',
                            textShadow: '2px 2px 8px rgba(0,0,0,0.6)'
                        }}
                    >
                        Unlock Your Potential with Peak Zenit
                    </Typography>
                    <Typography
                        variant="h5"
                        component="p"
                        sx={{
                            color: 'grey.300',
                            mt: 2,
                            mb: 4,
                            maxWidth: '700px',
                            mx: 'auto',
                            textShadow: '1px 1px 4px rgba(0,0,0,0.5)'
                        }}
                    >
                        Your AI-Powered Fitness and Nutrition Partner. Tailored plans, smart coaching, and seamless tracking to help you reach your goals.
                    </Typography>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
                        <Button
                            variant="contained"
                            color="primary"
                            size="large"
                            onClick={() => router.push('/register')}
                        >
                            Create a Free Account
                        </Button>
                        <Button
                            variant="outlined"
                            color="secondary"
                            size="large"
                            onClick={() => router.push('/login')}
                        >
                            Login
                        </Button>
                    </Stack>
                </Container>
            </Box>

            {/* Features Section */}
            <Box sx={{ py: 8, backgroundColor: theme.palette.background.default }}>
                <Container maxWidth="lg">
                    <Typography variant="h4" component="h2" sx={{ textAlign: 'center', mb: 6, fontWeight: 'bold' }}>
                        Everything You Need to Succeed
                    </Typography>
                    <Grid container spacing={4} justifyContent="center">
                        {featureList.map((feature) => (
                            //  CORRECTED LINE:
                            //  - Removed the "item" prop
                            //  - Combined xs, sm, and md into the "size" prop
                            //  - Converted display="flex" to an sx prop
                            <Grid key={feature.title} size={{ xs: 12, sm: 6, md: 4 }} sx={{ display: 'flex' }}>
                                <Card sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    width: '100%',
                                    backgroundColor: 'rgba(26, 22, 41, 0.8)', // Slightly transparent paper
                                    backdropFilter: 'blur(5px)',
                                    border: '1px solid',
                                    borderColor: 'rgba(255, 255, 255, 0.12)'
                                }}>
                                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                                        <Icon sx={{ fontSize: 50, mb: 2 }}>{feature.icon}</Icon>
                                        <Typography variant="h6" component="h3" sx={{ mb: 1, fontWeight: 500 }}>
                                            {feature.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {feature.description}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            {/* Final CTA Section */}
            <Box sx={{ py: 6, backgroundColor: theme.palette.background.paper }}>
                <Container maxWidth="sm">
                    <Paper sx={{ p: 4, textAlign: 'center', backgroundColor: 'transparent' }} elevation={0}>
                        <Typography variant="h5" component="p" sx={{ mb: 3, fontWeight: 'bold' }}>
                            Ready to Start Your Journey?
                        </Typography>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={() => router.push('/register')}
                            sx={{
                                backgroundColor: 'secondary.main',
                                '&:hover': {
                                    backgroundColor: 'secondary.dark',
                                }
                            }}
                        >
                            Get Started for Free
                        </Button>
                    </Paper>
                </Container>
            </Box>
        </Box>
    );
}