'use client';

import { createTheme } from '@mui/material/styles';
import { Roboto } from 'next/font/google';

const roboto = Roboto({
    weight: ['300', '400', '500', '700'],
    subsets: ['latin'],
    display: 'swap',
});

const theme = createTheme({
    palette: {
        mode: 'light', // Keeping light mode for now
        primary: {
            main: '#413D65', // Your Muted Purple/Indigo
        },
        secondary: {
            main: '#5FB9B0', // Your Teal/Turquoise
        },
        error: {
            main: '#f44336', // Standard MUI red for errors, you can customize
        },
        warning: {
            main: '#ffa726', // Standard MUI orange for warnings
        },
        info: {
            main: '#29b6f6', // Standard MUI light blue for info
        },
        success: {
            main: '#66bb6a', // Standard MUI green for success (could also use your #BEF992 here or a shade of it)
        },
        background: {
            default: '#f4f6f8', // A slightly off-white for the main background
            paper: '#ffffff',   // Background for elements like Cards, Paper
        },
        text: {
            primary: '#2B1F31', // Your Dark Purple/Charcoal for primary text
            secondary: '#6c757d', // A muted grey for secondary text
        },
        // We can use your #BEF992 for a specific accent if you like.
        // For example, you could create a custom palette color:
        // accentGreen: {
        //   main: '#BEF992',
        // },
    },
    typography: {
        fontFamily: 'var(--font-roboto), Arial, sans-serif', // Use the CSS variable
        h1: {
            fontSize: '2.5rem',
            fontWeight: 500,
            color: '#2B1F31', // Using your dark purple for headings
        },
        // You can continue to customize h2, body1, etc.
        // and assign text colors from your palette
    },
    // components: {
    //   MuiButton: {
    //     styleOverrides: {
    //       root: {
    //         borderRadius: 8,
    //       },
    //     },
    //   },
    // },
});

export default theme;