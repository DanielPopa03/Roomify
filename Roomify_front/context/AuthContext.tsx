import React, { createContext, useContext, ReactNode } from 'react';
import { Platform, View, Text } from 'react-native';
import { Auth0Provider, useAuth0 } from 'react-native-auth0';

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

// ============================================
// CONTEXT CREATION
// ============================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// INTERNAL COMPONENT (Bridge)
// ============================================

/**
 * This component sits inside Auth0Provider to access the useAuth0 hook
 * and maps it to our simplified AuthContext interface.
 */
function AuthContextContent({ children }: { children: ReactNode }) {
  const {
    user,
    isLoading,
    error,
    authorize,
    clearSession,
    getCredentials
  } = useAuth0();

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
    } catch (e) {
      console.log('Logout failed', e);
    }
  };

  const getAccessToken = async () => {
    try {
      const credentials = await getCredentials();
      return credentials?.accessToken || null;
    } catch (e) {
      console.error('Failed to get access token', e);
      return null;
    }
  };

  // Map the Auth0 user shape to our app's user shape
  const mappedUser: AuthUser | null = user ? {
    sub: user.sub,
    email: user.email,
    name: user.name,
    picture: user.picture,
    nickname: user.nickname,
  } : null;

  const contextValue: AuthContextType = {
    user: mappedUser,
    isLoading,
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

// ============================================
// MAIN PROVIDER
// ============================================

interface AuthProviderProps {
  children: ReactNode;
  domain?: string;
  clientId?: string;
}

export function AuthProvider({ children, domain, clientId }: AuthProviderProps) {
  // If running on Web, render a fallback to prevent crash

  const authDomain = domain || process.env.EXPO_PUBLIC_AUTH0_DOMAIN || '';
  const authClientId = clientId || process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID || '';

  return (
      <Auth0Provider
          domain={authDomain}
          clientId={authClientId}
          // @ts-ignore: Force this through in case the web client uses it as a default
          audience="https://roomify-api"
      >
        <AuthContextContent>{children}</AuthContextContent>
      </Auth0Provider>
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