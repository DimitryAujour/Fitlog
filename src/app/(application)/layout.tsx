// src/app/(application)/layout.tsx
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
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu'; // Food Log
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // To potentially show user info or logout
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/clientApp';
import LogoutIcon from '@mui/icons-material/Logout';


const DRAWER_WIDTH = 240;

interface NavItem {
    text: string;
    href: string;
    icon: React.ReactElement;
}

// Define your navigation items here
const mainNavItems: NavItem[] = [
    { text: 'Dashboard', href: '/dashboard', icon: <DashboardIcon /> },
    { text: 'AI Coach', href: '/ai-chat', icon: <ChatIcon /> },
    { text: 'Log Food', href: '/log/food', icon: <RestaurantMenuIcon /> },
    { text: 'Log Exercise', href: '/log/exercise', icon: <FitnessCenterIcon /> }, // New item
];

const userNavItems: NavItem[] = [
    { text: 'Profile', href: '/profile', icon: <AccountCircleIcon /> },
];

export default function ApplicationLayout({
                                              children,
                                          }: {
    children: React.ReactNode;
}) {
    const { user } = useAuth(); // Get user for display or conditional rendering
    const router = useRouter();
    const [mobileOpen, setMobileOpen] = useState(false);
    const pathname = usePathname();

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/login'); // Redirect to login after logout
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
                            <ListItemIcon sx={{minWidth: 'auto', mr: 1.5}}>{item.icon}</ListItemIcon>
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
                            <ListItemIcon sx={{minWidth: 'auto', mr: 1.5}}>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}
                {user && (
                    <ListItem disablePadding>
                        <ListItemButton onClick={handleLogout}>
                            <ListItemIcon sx={{minWidth: 'auto', mr: 1.5}}><LogoutIcon /></ListItemIcon>
                            <ListItemText primary="Logout" />
                        </ListItemButton>
                    </ListItem>
                )}
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline /> {/* Ensures consistent baseline styling */}
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
                        sx={{ mr: 2 }} // Removed sx={{ mr: 2, display: { sm: 'none' } }} to always show
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                        Peak Zenit
                    </Typography>
                    {/* You can add other AppBar items here, like a user avatar or name */}
                </Toolbar>
            </AppBar>
            <Drawer
                variant="temporary" // "temporary" is good for a hamburger menu on all screen sizes
                // or you can make it "permanent" or "persistent" on larger screens
                // and "temporary" on smaller ones using MUI's `useMediaQuery` hook.
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{
                    keepMounted: true, // Better open performance on mobile.
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
                    marginTop: '64px', // AppBar default height on desktop
                    '@media (max-width:599.95px)': { // AppBar height on mobile xs
                        marginTop: '56px',
                    },
                    '@media (min-width:600px) and (max-height:480px) and (orientation: landscape)': { // AppBar height on mobile sm landscape
                        marginTop: '48px',
                    }
                }}
            >
                {/* The actual page content will be rendered here */}
                {children}
            </Box>
        </Box>
    );
}