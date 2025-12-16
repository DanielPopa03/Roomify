import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[]; // e.g. ['admin', 'landlord']
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const savedRole = await AsyncStorage.getItem('role');
        setRole(savedRole);
      } catch (e) {
        console.error("Guard error:", e);
      } finally {
        setRoleLoading(false);
      }
    };
    checkRole();
  }, []);

  if (authLoading || roleLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (!role || !allowedRoles.includes(role)) {
    console.warn(`Access Denied: User role '${role}' is not in [${allowedRoles}]`);

    if (!role) {
        logout();
        return <Redirect href="/" />;
    }

    switch (role) {
        case 'landlord':
            return <Redirect href="/(landlord)" />;
        case 'admin':
            return <Redirect href="/(admin)" />;
        case 'normal':
        case 'user':
            return <Redirect href="/(normal)" />;
        default:
            logout();
            return <Redirect href="/" />;
    }
  }

  return <>{children}</>;
}