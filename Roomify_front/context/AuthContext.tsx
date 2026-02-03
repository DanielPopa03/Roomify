import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Auth0Provider, useAuth0 } from 'react-native-auth0';

// 1. Define the Backend User Shape
export interface BackendUser {
    id: string;
    firstName: string;
    email: string;
    phoneNumber?: string;
    bio?: string;
    role: { name: string };
    profileComplete: boolean;
    // Video Interview / Express Profile fields
    isVerified?: boolean;
    isVideoPublic?: boolean;
    videoUrl?: string;
    videoTranscript?: string;
    jobTitle?: string;
    smokerFriendly?: boolean;
    petFriendly?: boolean;
    // Reporting & Moderation
    isBanned?: boolean; // <--- ADDED
    seriousnessScore?: number;
}

export interface AuthUser {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
    nickname?: string;
}

export interface AuthContextType {
    user: AuthUser | null;
    dbUser: BackendUser | null;
    role: string | null;
    isProfileComplete: boolean;
    isBanned: boolean; // <--- ADDED
    isLoading: boolean;
    isAuthenticated: boolean;
    error: Error | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    getAccessToken: () => Promise<string | null | undefined>;
    setIsProfileComplete: (complete: boolean) => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthContextContent({ children }: { children: ReactNode }) {
    const {
        user,
        isLoading: auth0Loading,
        error,
        authorize,
        clearSession,
        getCredentials
    } = useAuth0();

    const [role, setRole] = useState<string | null>(null);
    const [dbUser, setDbUser] = useState<BackendUser | null>(null);
    const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);

    const [isFetchingRole, setIsFetchingRole] = useState(false);

    const getAccessToken = async () => {
        try {
            const credentials = await getCredentials();
            return credentials?.accessToken || null;
        } catch (e) {
            console.error("Token retrieval failed:", e);
            return null;
        }
    };

    const refreshUser = async () => {
        try {
            const accessToken = await getAccessToken();
            if (!accessToken) return;

            const apiUrl = ('http://' + process.env.EXPO_PUBLIC_BACKEND_IP + ':8080') || 'http://localhost:8080';
            const response = await fetch(`${apiUrl}/user/authorize`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const userData = await response.json();

                // 1. Save full user data (including isBanned)
                setDbUser(userData);

                // 2. Update derived state
                const roleName = userData.role?.name?.toLowerCase() || 'user';
                setRole(roleName);

                const isComplete = userData.profileComplete === true;
                setIsProfileComplete(isComplete);

                await AsyncStorage.setItem("role", roleName);
            } else {
                console.error("Failed to sync role:", response.status);
                const cached = await AsyncStorage.getItem("role");
                if (cached) setRole(cached);
                // If backend fails, force a re-check next time (leave/set as incomplete)
                setIsProfileComplete(false);
            }
        } catch (e) {
            console.error("User sync error:", e);
            setIsProfileComplete(false);
        }
    };

    const login = async () => {
        try {
            await authorize({
                scope: 'openid profile email offline_access',
                audience: process.env.EXPO_PUBLIC_AUTH0_AUDIENCE
            });
        } catch (e) {
            console.log('Login cancelled or failed', e);
        }
    };

    const logout = async () => {
        try {
            await clearSession();
            await AsyncStorage.clear();
            setRole(null);
            setDbUser(null);
            setIsProfileComplete(null);
        } catch (e) {
            console.log('Logout failed', e);
        }
    };

    useEffect(() => {
        const syncUser = async () => {
            if (user) {
                setIsFetchingRole(true);
                const cachedRole = await AsyncStorage.getItem("role");
                if (cachedRole) setRole(cachedRole);

                await refreshUser();
                setIsFetchingRole(false);
            }
        };

        if (!auth0Loading) {
            syncUser();
        }
    }, [user, auth0Loading]);

    const isContextLoading = auth0Loading || isFetchingRole || (!!user && isProfileComplete === null);

    const contextValue: AuthContextType = {
        user: user ? { ...user } : null,
        dbUser,
        role,
        isProfileComplete: isProfileComplete === true,
        isBanned: dbUser?.isBanned === true, // <--- EXPOSED
        setIsProfileComplete: (val) => setIsProfileComplete(val),
        isLoading: isContextLoading,
        isAuthenticated: !!user,
        error: error || null,
        login,
        logout,
        getAccessToken,
        refreshUser,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const _domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN || '';
    const _clientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID || '';
    const _audience = process.env.EXPO_PUBLIC_AUTH0_AUDIENCE || '';

    if (_domain === '' || _clientId === '' || _audience === '') {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>⚠️ CONFIGURATION MISSING</Text>
            </View>
        );
    }

    return (
        <Auth0Provider domain={_domain} clientId={_clientId} audience={_audience}>
            <AuthContextContent>{children}</AuthContextContent>
        </Auth0Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
export default AuthContext;