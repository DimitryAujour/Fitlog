// src/theme/theme.ts
'use client';

import { createTheme } from '@mui/material/styles';
import { Roboto } from 'next/font/google';

const roboto = Roboto({
    weight: ['300', '400', '500', '700'],
    subsets: ['latin'],
    display: 'swap',
});

const theme = createTheme({
    // REMOVED: Properties like breakpoints, direction, mixins, shape, spacing,
    // transitions, zIndex, etc., that were previously set to undefined.
    // Let MUI handle their defaults.

    // REMOVED or COMMENTED OUT: shadows array. Let MUI use default shadows for now.
    // shadows: ["none", "", "", ...], // This was problematic

    // This is a valid option if you need it
    unstable_strictMode: false,

    palette: {
        mode: 'light',
        primary: {
            main: '#6A679E', // Your chosen primary color
        },
        secondary: {
            main: '#6ECDC2', // Your chosen secondary color
        },
        error: {
            main: '#f44336',
        },
        warning: {
            main: '#ffa726',
        },
        info: {
            main: '#29b6f6',
        },
        success: {
            main: '#66bb6a',
        },
        background: {
            default: '#f4f6f8',
            paper: '#ffffff',
        },
        text: {
            primary: '#3A3B3C',
            secondary: '#6c757d',
        },
        accentGreen: { // Your custom color
            main: '#BEF992',
            contrastText: '#2B1F31',
        },
    },
    typography: {
        fontFamily: roboto.style.fontFamily, // Correctly using Next/Font
        h1: {
            fontSize: '2.5rem',
            fontWeight: 500,
            color: '#3A3B3C',
        },
        h2: {
            fontSize: '2rem',
            fontWeight: 500,
            color: '#3A3B3C',
        },
        h3: {
            fontSize: '1.75rem',
            fontWeight: 500,
            color: '#3A3B3C',
        },
        body1: {
            color: '#3A3B3C',
        },
        body2: {
            color: '#6c757d',
        }
    },
    components: {
        MuiAppBar: {
            // Example: If your AppBar uses primary color and feels too dark
            // styleOverrides: {
            //   colorPrimary: {
            //     backgroundColor: '#7F7CBB',
            //   },
            // },
        },
        MuiPaper: {
            defaultProps: { // Corrected structure for defaultProps
                elevation: 1,
            },
        },
        // MuiButton: {
        //   styleOverrides: {
        //     root: {
        //       borderRadius: 8,
        //     },
        //   },
        // },
    }
});

export default theme;