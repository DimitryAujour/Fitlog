'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, firestore } from '@/lib/firebase/clientApp';
import { Box, CircularProgress } from '@mui/material';

// --- New: Define the shape of the user profile data ---
interface UserProfileData {
    displayName?: string;
    backgroundURL?: string;
    // Add any other fields from the user's profile you want to access globally
}

// --- Updated: Add userProfile to the context type ---
interface AuthContextType {
    user: User | null;
    userProfile: UserProfileData | null; // <-- Added
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    // --- New: State for the user's profile data from Firestore ---
    const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // This function will be called when the user's auth state changes
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            console.log('Auth state changed, current user:', currentUser?.email);

            // If a user is logged in, listen for their profile changes in real-time
            if (currentUser) {
                const profileDocRef = doc(firestore, 'users', currentUser.uid);

                // onSnapshot returns its own unsubscribe function
                const unsubscribeProfile = onSnapshot(profileDocRef, (docSnap) => {
                    if (docSnap.exists()) {
                        // If the document exists, update the userProfile state
                        setUserProfile(docSnap.data() as UserProfileData);
                    } else {
                        // Handle case where user is authenticated but has no profile document yet
                        console.log("No profile document found for user.");
                        setUserProfile(null);
                    }
                    setLoading(false); // Auth and profile check is complete
                });

                // Return the profile listener's unsubscribe function to be called on cleanup
                return () => {
                    console.log("Cleaning up profile listener.");
                    unsubscribeProfile();
                };

            } else {
                // If no user is logged in, clear the profile and stop loading
                setUserProfile(null);
                setLoading(false);
            }
        });

        // Cleanup the main auth subscription on component unmount
        return () => {
            console.log("Cleaning up auth listener.");
            unsubscribeAuth();
        };
    }, []);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        // --- Updated: Provide the new userProfile state to the rest of the app ---
        <AuthContext.Provider value={{ user, userProfile, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};