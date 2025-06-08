// src/theme/theme.ts
'use client';

import { createTheme } from '@mui/material/styles';
import { Roboto } from 'next/font/google';

const roboto = Roboto({
    weight: ['300', '400', '500', '700'],
    subsets: ['latin'],
    display: 'swap',
});

// This theme now exclusively defines a dark mode palette.
const theme = createTheme({
    palette: {
        mode: 'dark', // This enforces dark mode for all MUI components
        primary: {
            main: '#7F7CBB', // A slightly lighter purple for good contrast on dark backgrounds
        },
        secondary: {
            main: '#6ECDC2',
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
            default: '#0D0B14', // The main dark background for pages
            paper: '#1A1629',   // The slightly lighter color for cards and paper elements
        },
        text: {
            primary: '#EAEAEA',
            secondary: '#BDBDBD',
        },
        divider: 'rgba(255, 255, 255, 0.12)', // A divider color that works on a dark background
    },
    typography: {
        fontFamily: roboto.style.fontFamily,
        // You can adjust typography colors here if needed, but they will inherit from the palette by default
        h1: { fontSize: '2.5rem', fontWeight: 500, color: '#ffffff' },
        h2: { fontSize: '2rem', fontWeight: 500, color: '#f5f5f5' },
        h3: { fontSize: '1.75rem', fontWeight: 500, color: '#f5f5f5' },
        body1: { color: '#EAEAEA' },
        body2: { color: '#BDBDBD' }
    },
    components: {
        MuiPaper: {
            defaultProps: {
                elevation: 3,
            },
        },
        MuiAppBar: {
            styleOverrides: {
                // Example of setting a specific color for the AppBar if needed
                // By default, it will use palette.background.paper
                root: {
                    backgroundColor: '#1A1629',
                }
            }
        }
    }
});

export default theme;