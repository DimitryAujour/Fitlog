'use client';

import { createTheme } from '@mui/material/styles';
import { Roboto } from 'next/font/google';

const roboto = Roboto({
    weight: ['300', '400', '500', '700'],
    subsets: ['latin'],
    display: 'swap',
});

const theme = createTheme({
    breakpoints: undefined,
    colorSchemes: undefined,
    cssVariables: undefined,
    defaultColorScheme: undefined,
    direction: undefined,
    mixins: undefined,
    shadows: ["none", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
    shape: undefined,
    spacing: undefined,
    transitions: undefined,
    unstable_strictMode: false,
    unstable_sxConfig: undefined,
    zIndex: undefined,
    palette: {
        mode: 'light', // Stays light mode
        primary: {
            // main: '#413D65', // Original Muted Purple/Indigo
            main: '#6A679E', // A slightly lighter shade of your Muted Purple/Indigo
            // Alternatively, for a more noticeable change:
            // main: '#788DFF', // A lighter, softer blue/purple
        },
        secondary: {
            // main: '#5FB9B0', // Original Teal/Turquoise
            main: '#6ECDC2', // A slightly lighter shade of your Teal/Turquoise
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
            // You could also use your accent green here if you prefer:
            // main: '#BEF992',
            // contrastText: '#2B1F31', // Ensure good contrast if using a very light success color
        },
        background: {
            default: '#f4f6f8', // This is already very light
            paper: '#ffffff',   // This is pure white
        },
        text: {
            // primary: '#2B1F31', // Original Dark Purple/Charcoal
            primary: '#3A3B3C',   // A softer, standard dark grey for better perceived lightness
            secondary: '#6c757d', // Existing muted grey, still good
        },
        // Example of using your accentGreen if you want a bright, light accent color
        // It's often good for specific highlights rather than a primary/secondary.
        accentGreen: {
            main: '#BEF992',
            contrastText: '#2B1F31', // Text color that would go on top of this green
        },
    },
    typography: {
        fontFamily: roboto.style.fontFamily, // Using the direct style from Next/Font
        h1: {
            fontSize: '2.5rem',
            fontWeight: 500,
            // color: '#2B1F31', // Original
            color: '#3A3B3C', // Aligning with the new lighter primary text color
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
        // You can continue to customize other typography variants
    },
    components: {
        MuiAppBar: {
            styleOverrides: {
                // Example: If your AppBar uses primary color and feels too dark
                // colorPrimary: {
                //   backgroundColor: '#7F7CBB', // A lighter version of your primary for AppBars
                // },
            },
        },
        MuiPaper: {
            elevation: 1, // Softer default elevation for paper components
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