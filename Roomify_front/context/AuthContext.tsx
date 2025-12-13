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
        audience: 'https://roomify-api',
        scope: 'openid profile email',
      }}
      useRefreshTokens={true}
      cacheLocation="localstorage"
    >
      <WebAuthContextBridge useAuth0Hook={useAuth0Hook} domain={domain}>
        {children}
      </WebAuthContextBridge>
    </Auth0Provider>
  );
}

function WebAuthContextBridge({ 
  children, 
  useAuth0Hook,
  domain
}: { 
  children: ReactNode; 
  useAuth0Hook: (() => any) | null;
  domain: string;
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
          console.log('[WebAuthProvider] getAccessToken called');
          console.log('[WebAuthProvider] isAuthenticated:', auth0?.isAuthenticated);
          
          if (!auth0?.isAuthenticated) {
            console.warn('[WebAuthProvider] User not authenticated');
            return null;
          }
          
          try {
            // Try to get access token silently with correct audience
            console.log('[WebAuthProvider] Calling getAccessTokenSilently...');
            const token = await auth0.getAccessTokenSilently({
              authorizationParams: {
                audience: 'https://roomify-api',
                scope: 'openid profile email',
              },
            });
            console.log('[WebAuthProvider] Access token obtained:', token ? 'YES (length: ' + token.length + ')' : 'NO');
            if (token) {
              console.log('[WebAuthProvider] Token starts with:', token.substring(0, 50) + '...');
            }
            return token;
          } catch (error) {
            console.error('[WebAuthProvider] Error getting access token:', error);
            
            // Fallback: try to get ID token
            try {
              console.log('[WebAuthProvider] Trying getIdTokenClaims as fallback...');
              const claims = await auth0.getIdTokenClaims();
              const idToken = claims?.__raw;
              console.log('[WebAuthProvider] ID token obtained:', idToken ? 'YES (length: ' + idToken.length + ')' : 'NO');
              
              if (idToken) {
                console.log('[WebAuthProvider] Using ID token as access token');
                console.log('[WebAuthProvider] ID token starts with:', idToken.substring(0, 50) + '...');
                return idToken;
              }
            } catch (idError) {
              console.error('[WebAuthProvider] Error getting ID token:', idError);
            }
            
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
// NATIVE AUTH PROVIDER (Using Web Browser for Auth0)
// ============================================

function NativeAuthProvider({ children, domain, clientId }: { 
  children: ReactNode; 
  domain: string; 
  clientId: string;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Load token from AsyncStorage on mount
  useEffect(() => {
    const loadToken = async () => {
      try {
        // HARDCODED TOKEN FOR TESTING - Remove in production!
        const HARDCODED_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IkJvaE43NTlaaDBfdmktODVzclRHOCJ9.eyJpc3MiOiJodHRwczovL2Rldi1oeGpuamVlbjh0c3NmZ252LnVzLmF1dGgwLmNvbS8iLCJzdWIiOiJnb29nbGUtb2F1dGgyfDExMzc0NzM3MjMyMjQ4Mjc1MTM3OSIsImF1ZCI6WyJodHRwczovL3Jvb21pZnktYXBpIiwiaHR0cHM6Ly9kZXYtaHhqbmplZW44dHNzZmdudi51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzY1NTc4OTQxLCJleHAiOjE3NjU2NjUzNDEsInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwiLCJhenAiOiJQUWx5S0U3ZHNDa3pBVGRyZmRDb3FOaHZxc2V5dW9VMyJ9.A2kyBBU4p_s1jljlDs7Vx_b2uO7JuwPf8zuXsR5V7cYSSyax9m3SKN7RKwTmZ9Ri5bahnJtGNKlaTU2qfal7QT7v1d_p3gNPGJZSRX4b0jaqaeqo7nv81hewRnv38K39Q2OB5TqVU6enQ5k5XAZ_RKnf2tuDGGPZ82em6vw8R18iLfiTn7DbQItw9u1eBU8Grofe24tEtO-oeLWzTgJk28a4eEpFLpkFAVPviX9ukERxIvRNdD_joHPvNZMrQKVajHGNTAAFpHfob5q6YWILLnh9EsbHrGxoiMWyHr50lt9Z_vtFE0763eSbeFCimL2tipNeoHcDK-SrqvG-cmi0uA';
        
        const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
        const savedToken = await AsyncStorage.getItem('mobile_auth_token');
        
        const tokenToUse = savedToken || HARDCODED_TOKEN;
        
        if (tokenToUse) {
          console.log('[NativeAuthProvider] Using token for auth');
          setAccessToken(tokenToUse);
          setUser({
            sub: 'google-oauth2|113747372322482751379',
            email: 'miticadenis@gmail.com',
            name: 'Denis Mitica',
            picture: 'https://lh3.googleusercontent.com/a/ACg8ocKLCl4nWe4JKJwCEDu0UWD-7DQ_c5cVqrh8I1wz5L9wLYw8PA=s96-c',
          });
        } else {
          console.log('[NativeAuthProvider] No token found - need setup');
        }
      } catch (err) {
        console.error('[NativeAuthProvider] Error loading token:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  // Check if we have a saved session
  useEffect(() => {
    const checkSession = async () => {
      try {
        // In a real app, you'd check AsyncStorage for saved tokens
        // For now, we'll auto-login with mock data
        // TODO: Implement proper Auth0 authentication with react-native-auth0 in a development build
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to check session'));
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  // Real login using expo-web-browser (works in Expo Go)
  const login = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // HARDCODED TOKEN FOR TESTING - Remove in production!
      const HARDCODED_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IkJvaE43NTlaaDBfdmktODVzclRHOCJ9.eyJpc3MiOiJodHRwczovL2Rldi1oeGpuamVlbjh0c3NmZ252LnVzLmF1dGgwLmNvbS8iLCJzdWIiOiJnb29nbGUtb2F1dGgyfDExMzc0NzM3MjMyMjQ4Mjc1MTM3OSIsImF1ZCI6WyJodHRwczovL3Jvb21pZnktYXBpIiwiaHR0cHM6Ly9kZXYtaHhqbmplZW44dHNzZmdudi51cy5hdXRoMC5jb20vdXNlcmluZm8iXSwiaWF0IjoxNzY1NTc4OTQxLCJleHAiOjE3NjU2NjUzNDEsInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwiLCJhenAiOiJQUWx5S0U3ZHNDa3pBVGRyZmRDb3FOaHZxc2V5dW9VMyJ9.A2kyBBU4p_s1jljlDs7Vx_b2uO7JuwPf8zuXsR5V7cYSSyax9m3SKN7RKwTmZ9Ri5bahnJtGNKlaTU2qfal7QT7v1d_p3gNPGJZSRX4b0jaqaeqo7nv81hewRnv38K39Q2OB5TqVU6enQ5k5XAZ_RKnf2tuDGGPZ82em6vw8R18iLfiTn7DbQItw9u1eBU8Grofe24tEtO-oeLWzTgJk28a4eEpFLpkFAVPviX9ukERxIvRNdD_joHPvNZMrQKVajHGNTAAFpHfob5q6YWILLnh9EsbHrGxoiMWyHr50lt9Z_vtFE0763eSbeFCimL2tipNeoHcDK-SrqvG-cmi0uA';
      
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const savedToken = await AsyncStorage.getItem('mobile_auth_token');
      
      const tokenToUse = savedToken || HARDCODED_TOKEN;
      
      if (tokenToUse) {
        console.log('[NativeAuthProvider] Login successful with token');
        setAccessToken(tokenToUse);
        setUser({
          sub: 'google-oauth2|113747372322482751379',
          email: 'miticadenis@gmail.com',
          name: 'Denis Mitica',
          picture: 'https://lh3.googleusercontent.com/a/ACg8ocKLCl4nWe4JKJwCEDu0UWD-7DQ_c5cVqrh8I1wz5L9wLYw8PA=s96-c',
        });
      } else {
        setError(new Error('No auth token configured. Please set up mobile auth.'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Login failed'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setUser(null);
    setAccessToken(null);
  }, []);

  const getAccessToken = useCallback(async () => {
    console.log('[NativeAuthProvider] getAccessToken called');
    if (!accessToken) {
      console.warn('[NativeAuthProvider] No access token available');
      return null;
    }
    console.log('[NativeAuthProvider] Returning token (length:', accessToken.length, ')');
    return accessToken;
  }, [accessToken]);

  const contextValue: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user && !!accessToken,
    error,
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

  console.log('[AuthProvider] Platform:', Platform.OS);
  console.log('[AuthProvider] Auth Domain:', authDomain);
  console.log('[AuthProvider] Client ID:', authClientId ? 'Present' : 'Missing');

  if (Platform.OS === 'web') {
    console.log('[AuthProvider] Using WebAuthProvider');
    return (
      <WebAuthProvider domain={authDomain} clientId={authClientId}>
        {children}
      </WebAuthProvider>
    );
  }

  console.log('[AuthProvider] Using NativeAuthProvider (mock)');
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
  
  // Log auth state for debugging
  console.log('[useAuth] isAuthenticated:', context.isAuthenticated);
  console.log('[useAuth] user:', context.user ? 'Present' : 'None');
  console.log('[useAuth] isLoading:', context.isLoading);
  
  return context;
}

export default AuthContext;
