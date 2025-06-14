// src/app/layout.tsx
import type { Metadata } from "next";
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from '../theme/theme';
import { Roboto } from 'next/font/google';
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import Script from 'next/script';

const roboto = Roboto({
    weight: ['300', '400', '500', '700'],
    subsets: ['latin'],
    display: 'swap',
    variable: '--font-roboto',
});

export const metadata: Metadata = {
    title: "Peak Zenit App",
    description: "Your AI-Powered Fitness Application",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={roboto.variable}>
        <head>
            {/* --- MOVE THE SCRIPT HERE --- */}
            <Script
                async
                src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3400469453529039"
                crossOrigin="anonymous"
                strategy="afterInteractive"
            />
            <meta name="google-adsense-account" content="ca-pub-3400469453529039"/>

        </head>
        <body>
        <AppRouterCacheProvider options={{enableCssLayer: true }}>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <AuthProvider>
                    {children}
                </AuthProvider>
            </ThemeProvider>
        </AppRouterCacheProvider>
        </body>
        </html>
    );
}