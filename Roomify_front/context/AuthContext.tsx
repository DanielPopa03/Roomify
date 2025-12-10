/**
 * Unified Auth Context
 * Works on both Web (auth0-react) and Native (react-native-auth0)
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Platform } from 'react-native';

// ============================================
// TYPES
// ============================================

export interface AuthUser {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  nickname?: string;
}

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: Error | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default loading state
const defaultLoadingState: AuthContextType = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  login: async () => {},
  logout: async () => {},
  getAccessToken: async () => null,
};

// ============================================
// WEB AUTH PROVIDER (using @auth0/auth0-react)
// ============================================

function WebAuthProvider({ children, domain, clientId }: { 
  children: ReactNode; 
  domain: string; 
  clientId: string;
}) {
  // Dynamic import for web only
  const [Auth0Provider, setAuth0Provider] = useState<React.ComponentType<any> | null>(null);
  const [useAuth0Hook, setUseAuth0Hook] = useState<(() => any) | null>(null);

  useEffect(() => {
    // Only import on web
    import('@auth0/auth0-react').then((module) => {
      setAuth0Provider(() => module.Auth0Provider);
      setUseAuth0Hook(() => module.useAuth0);
    });
  }, []);

  // Always wrap children in AuthContext.Provider, even while loading
  if (!Auth0Provider) {
    return (
      <AuthContext.Provider value={defaultLoadingState}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: typeof window !== 'undefined' ? window.location.origin : '',
        scope: 'openid profile email',
      }}
    >
      <WebAuthContextBridge useAuth0Hook={useAuth0Hook}>
        {children}
      </WebAuthContextBridge>
    </Auth0Provider>
  );
}

function WebAuthContextBridge({ 
  children, 
  useAuth0Hook 
}: { 
  children: ReactNode; 
  useAuth0Hook: (() => any) | null;
}) {
  const [contextValue, setContextValue] = useState<AuthContextType>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
    login: async () => {},
    logout: async () => {},
    getAccessToken: async () => null,
  });

  // Use the hook if available
  const auth0 = useAuth0Hook ? useAuth0Hook() : null;

  useEffect(() => {
    if (auth0) {
      setContextValue({
        user: auth0.user ? {
          sub: auth0.user.sub,
          email: auth0.user.email,
          name: auth0.user.name,
          picture: auth0.user.picture,
          nickname: auth0.user.nickname,
        } : null,
        isLoading: auth0.isLoading,
        isAuthenticated: auth0.isAuthenticated,
        error: auth0.error || null,
        login: async () => {
          await auth0.loginWithRedirect();
        },
        logout: async () => {
          await auth0.logout({ 
            logoutParams: { returnTo: window.location.origin } 
          });
        },
        getAccessToken: async () => {
          try {
            return await auth0.getAccessTokenSilently();
          } catch {
            return null;
          }
        },
      });
    }
  }, [auth0?.user, auth0?.isLoading, auth0?.isAuthenticated, auth0?.error]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// NATIVE AUTH PROVIDER (Expo Go compatible mock)
// ============================================

// For Expo Go: react-native-auth0 requires a development build
// This mock allows testing the UI in Expo Go
function NativeAuthProvider({ children, domain, clientId }: { 
  children: ReactNode; 
  domain: string; 
  clientId: string;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // For Expo Go, always use mock auth since native modules aren't available
  // The native Auth0 module check happens at import time and crashes,
  // so we just use mock mode for all native platforms in Expo Go
  const isExpoGo = !globalThis.hasNativeModule?.('A0Auth0');

  // Mock login for Expo Go testing
  const mockLogin = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    // Simulate auth delay
    await new Promise(resolve => setTimeout(resolve, 500));
    setUser({
      sub: 'mock-user-123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://i.pravatar.cc/150?u=test@example.com',
    });
    setIsLoading(false);
  }, []);

  const mockLogout = useCallback(async () => {
    setUser(null);
  }, []);

  const mockGetAccessToken = useCallback(async () => {
    // Return a mock token for testing
    return 'mock-access-token-for-testing';
  }, []);

  // Always use mock auth in native (Expo Go doesn't have native modules)
  const contextValue: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login: mockLogin,
    logout: mockLogout,
    getAccessToken: mockGetAccessToken,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// MAIN AUTH PROVIDER
// ============================================

interface AuthProviderProps {
  children: ReactNode;
  domain?: string;
  clientId?: string;
}

export function AuthProvider({ children, domain, clientId }: AuthProviderProps) {
  const authDomain = domain || process.env.EXPO_PUBLIC_AUTH0_DOMAIN || '';
  const authClientId = clientId || process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID || '';

  if (Platform.OS === 'web') {
    return (
      <WebAuthProvider domain={authDomain} clientId={authClientId}>
        {children}
      </WebAuthProvider>
    );
  }

  return (
    <NativeAuthProvider domain={authDomain} clientId={authClientId}>
      {children}
    </NativeAuthProvider>
  );
}

// ============================================
// HOOK
// ============================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
