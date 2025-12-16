import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from "jwt-decode";
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Auth0Provider, useAuth0 } from 'react-native-auth0';

export interface AuthUser {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  nickname?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  role: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null | undefined>;
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

  const fetchRole = async () => {
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
        const roleName = userData.role?.name?.toLowerCase() || 'user';
        
        setRole(roleName);
        await AsyncStorage.setItem("role", roleName);
      } else {
         console.error("Failed to sync role:", response.status);
         const cached = await AsyncStorage.getItem("role");
         if (cached) setRole(cached);
      }
    } catch (e) {
      console.error("Role fetch error:", e);
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
        
        await fetchRole();
        setIsFetchingRole(false);
      }
    };
    
    if (!auth0Loading) {
        syncUser();
    }
  }, [user, auth0Loading]);

  const isContextLoading = auth0Loading || (!!user && role === null);

  const contextValue: AuthContextType = {
    user: user ? { ...user } : null,
    role, 
    isLoading: isContextLoading, 
    isAuthenticated: !!user,
    error: error || null,
    login,
    logout,
    getAccessToken,
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
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'white' }}>
                <Text style={{ color: 'red', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
                    ⚠️ CONFIGURATION MISSING
                </Text>
                <Text style={{ textAlign: 'center', fontSize: 16, marginBottom: 20 }}>
                    PUNE .ENV-UL + SA AIBA:
                </Text>
                <View style={{ backgroundColor: '#f0f0f0', padding: 10, borderRadius: 5 }}>
                    <Text style={{ fontFamily: 'monospace' }}>EXPO_PUBLIC_AUTH0_DOMAIN</Text>
                    <Text style={{ fontFamily: 'monospace' }}>EXPO_PUBLIC_AUTH0_CLIENT_ID</Text>
                    <Text style={{ fontFamily: 'monospace' }}>EXPO_PUBLIC_AUTH0_AUDIENCE</Text>
                </View>
            </View>
        );
    }

    return (
        <Auth0Provider domain={_domain} clientId={_clientId} 
        // @ts-ignore: 
        audience={_audience}
        >
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