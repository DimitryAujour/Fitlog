'use client';

import React, { useState } from 'react';

import {
    Box,
    AppBar,
    Toolbar,
    IconButton,
    Typography,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    CssBaseline,
    Divider
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ChatIcon from '@mui/icons-material/Chat';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import KitchenIcon from '@mui/icons-material/Kitchen';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // Updated context hook
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/clientApp';
import LogoutIcon from '@mui/icons-material/Logout';
import Script from "next/script";

const DRAWER_WIDTH = 240;

interface NavItem {
    text: string;
    href: string;
    icon: React.ReactElement;
}

const mainNavItems: NavItem[] = [
    { text: 'Dashboard', href: '/dashboard', icon: <DashboardIcon /> },
    { text: 'AI Coach', href: '/ai-chat', icon: <ChatIcon /> },
    { text: 'Fridge', href: '/fridge', icon: <KitchenIcon /> },
    { text: 'Log Food', href: '/log/food', icon: <RestaurantMenuIcon /> },
    { text: 'Log Exercise', href: '/log/exercise', icon: <FitnessCenterIcon /> },
];
const userNavItems: NavItem[] = [
    { text: 'Profile', href: '/profile', icon: <AccountCircleIcon /> },
];

export default function ApplicationLayout({
                                              children,
                                          }: {
    children: React.ReactNode;
}) {
    // --- Updated: Destructure userProfile from useAuth ---
    const { user, userProfile } = useAuth();
    const router = useRouter();
    const [mobileOpen, setMobileOpen] = useState(false);
    const pathname = usePathname();

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const drawerContent = (
        <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ my: 2 }}>
                Peak Zenit
            </Typography>
            <Divider />
            <List>
                {mainNavItems.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            component={NextLink}
                            href={item.href}
                            selected={pathname === item.href}
                        >
                            <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5 }}>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
            <Divider />
            <List>
                {userNavItems.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            component={NextLink}
                            href={item.href}
                            selected={pathname === item.href}
                        >
                            <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5 }}>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}
                {user && (
                    <ListItem disablePadding>
                        <ListItemButton onClick={handleLogout}>
                            <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5 }}><LogoutIcon /></ListItemIcon>
                            <ListItemText primary="Logout" />
                        </ListItemButton>
                    </ListItem>
                )}
            </List>
        </Box>
    );

    const ADSENSE_PUBLISHER_ID = "ca-pub-3400469453529039";

    return (
        <>
            <Script
                async
                src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`}
                crossOrigin="anonymous"
                strategy="lazyOnload"
            />

            <Box sx={{ display: 'flex' }}>
                <CssBaseline />

                {/* --- New: Dynamic Background Box --- */}
                <Box
                    sx={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        zIndex: -1,
                        backgroundImage: `url(${userProfile?.backgroundURL || ''})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        transition: 'background-image 0.5s ease-in-out',
                        '&::after': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(13, 11, 20, 0.15)', // Your theme's dark color with opacity
                            backdropFilter: 'blur(3px)',
                        },
                    }}
                />

                <AppBar
                    position="fixed"
                    sx={{
                        zIndex: (theme) => theme.zIndex.drawer + 1,
                    }}
                >
                    <Toolbar>
                        <IconButton
                            color="inherit"
                            aria-label="open drawer"
                            edge="start"
                            onClick={handleDrawerToggle}
                            sx={{ mr: 2 }}
                        >
                            <MenuIcon />
                        </IconButton>
                        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                            Peak Zenit
                        </Typography>
                    </Toolbar>
                </AppBar>

                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true,
                    }}
                    sx={{
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH },
                    }}
                >
                    {drawerContent}
                </Drawer>

                <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        p: 3,
                        marginTop: '64px',
                        '@media (max-width:599.95px)': {
                            marginTop: '56px',
                        },
                        '@media (min-width:600px) and (max-height:480px) and (orientation: landscape)': {
                            marginTop: '48px',
                        }
                    }}
                >
                    {children}
                </Box>
            </Box>
        </>
    );
}