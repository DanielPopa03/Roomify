import { useCallback, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Preferences } from '@/constants/types';

const MY_IP = process.env.EXPO_PUBLIC_BACKEND_IP || "localhost";

export const usePreferences = () => {
    const { getAccessToken } = useAuth();
    const [preferences, setPreferences] = useState<Preferences | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getPreferences = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = await getAccessToken();
            const response = await fetch(`http://${MY_IP}:8080/user/preferences`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                setPreferences(data);
                return data;
            } else if (response.status === 404) {
                // No preferences set yet
                setPreferences(null);
                return null;
            } else {
                throw new Error('Failed to fetch preferences');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch preferences';
            setError(message);
            console.error(message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [getAccessToken]);

    const savePreferences = useCallback(async (prefs: Preferences) => {
        setIsLoading(true);
        setError(null);
        try {
            const token = await getAccessToken();
            const response = await fetch(`http://${MY_IP}:8080/user/preferences`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(prefs)
            });

            if (response.ok) {
                const data = await response.json();
                setPreferences(data);
                return data;
            } else {
                throw new Error('Failed to save preferences');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to save preferences';
            setError(message);
            console.error(message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [getAccessToken]);

    const deletePreferences = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const token = await getAccessToken();
            const response = await fetch(`http://${MY_IP}:8080/user/preferences`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                setPreferences(null);
                return true;
            } else {
                throw new Error('Failed to delete preferences');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to delete preferences';
            setError(message);
            console.error(message);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [getAccessToken]);

    return {
        preferences,
        isLoading,
        error,
        getPreferences,
        savePreferences,
        deletePreferences
    };
};
