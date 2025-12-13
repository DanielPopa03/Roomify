/**
 * API Hooks
 * Custom hooks for data fetching with authentication
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Api, { 
  User, 
  Property, 
  Conversation, 
  Message,
  ApiResponse 
} from '../services/api';

// ============================================
// GENERIC HOOK
// ============================================

interface UseApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function useApiCall<T>(
  apiCall: (token: string) => Promise<ApiResponse<T>>,
  immediate = true
): UseApiState<T> {
  const { getAccessToken, isAuthenticated } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setError('Not authenticated');
        setIsLoading(false);
        return;
      }

      const response = await apiCall(token);
      
      if (response.error) {
        setError(response.error);
      } else {
        setData(response.data || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, getAccessToken, isAuthenticated]);

  useEffect(() => {
    if (immediate && isAuthenticated) {
      fetchData();
    }
  }, [immediate, isAuthenticated]);

  return { data, isLoading, error, refetch: fetchData };
}

// ============================================
// USER HOOKS
// ============================================

export function useCurrentUser() {
  const { user: authUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const [backendUser, setBackendUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getAccessToken } = useAuth();

  const syncUser = useCallback(async () => {
    if (!isAuthenticated || !authUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        // Use auth user info when no backend token
        setBackendUser({
          id: authUser.sub || '',
          email: authUser.email || '',
          firstName: authUser.name || authUser.nickname,
          role: { id: '1', name: 'USER' },
        });
        setIsLoading(false);
        return;
      }

      const response = await Api.Auth.authorize(token);
      if (response.data) {
        setBackendUser(response.data);
      } else if (response.error) {
        // Fallback to auth user
        setBackendUser({
          id: authUser.sub || '',
          email: authUser.email || '',
          firstName: authUser.name || authUser.nickname,
          role: { id: '1', name: 'USER' },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync user');
      // Fallback to auth user
      if (authUser) {
        setBackendUser({
          id: authUser.sub || '',
          email: authUser.email || '',
          firstName: authUser.name || authUser.nickname,
          role: { id: '1', name: 'USER' },
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, authUser, getAccessToken]);

  useEffect(() => {
    if (!authLoading) {
      syncUser();
    }
  }, [authLoading, isAuthenticated]);

  return {
    user: backendUser,
    authUser,
    isLoading: authLoading || isLoading,
    error,
    refetch: syncUser,
  };
}

export function useUpdateProfile() {
  const { getAccessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = useCallback(async (data: Partial<User>) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setError('Not authenticated');
        return null;
      }

      const response = await Api.Auth.updateProfile(token, data);
      if (response.error) {
        setError(response.error);
        return null;
      }
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken]);

  return { updateProfile, isLoading, error };
}

// ============================================
// PROPERTIES HOOKS
// ============================================

export function useProperties(page: number = 0, size: number = 10) {
  const { getAccessToken, isAuthenticated } = useAuth();
  const [data, setData] = useState<Property[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setError('Not authenticated');
        setIsLoading(false);
        return;
      }

      const response = await Api.Properties.getAll(token, page, size);
      
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setData(response.data.content || []);
        setTotalPages(response.data.totalPages || 0);
        setTotalElements(response.data.totalElements || 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken, isAuthenticated, page, size]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, page, size]);

  return { data, isLoading, error, refetch: fetchData, totalPages, totalElements };
}

export function useProperty(id: number) {
  return useApiCall<Property>(
    (token) => Api.Properties.getById(token, id)
  );
}

export function useMyListings(page: number = 0, size: number = 10) {
  const { getAccessToken, isAuthenticated } = useAuth();
  const [data, setData] = useState<Property[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const fetchingRef = useRef(false); // Prevent duplicate concurrent fetches

  const fetchData = useCallback(async () => {
    // Prevent duplicate concurrent fetches
    if (fetchingRef.current) {
      console.log('[useMyListings] Already fetching, skipping...');
      return;
    }

    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    fetchingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setError('Not authenticated');
        setIsLoading(false);
        fetchingRef.current = false;
        return;
      }

      console.log('[useMyListings] Fetching properties...');
      const response = await Api.Properties.getMyListings(token, page, size);
      
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        // Replace state entirely (not append)
        const newData = response.data.content || [];
        console.log('[useMyListings] Received', newData.length, 'properties');
        setData(newData);
        setTotalPages(response.data.totalPages || 0);
        setTotalElements(response.data.totalElements || 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }, [getAccessToken, isAuthenticated, page, size]);

  // Only fetch once on mount and when page/size changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated, page, size]); // Don't include fetchData to avoid loops

  return { data, isLoading, error, refetch: fetchData, totalPages, totalElements };
}

export function usePropertyMutations() {
  const { getAccessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProperty = useCallback(async (
    propertyData: any,
    images: Array<File | { uri: string; type: string; name: string }>
  ) => {
    console.log('[usePropertyMutations] createProperty called');
    console.log('[usePropertyMutations] propertyData:', propertyData);
    console.log('[usePropertyMutations] images count:', images.length);
    
    setIsLoading(true);
    setError(null);

    try {
      console.log('[usePropertyMutations] Getting access token...');
      const token = await getAccessToken();
      
      if (!token) {
        console.error('[usePropertyMutations] No access token available');
        setError('Not authenticated');
        return null;
      }

      console.log('[usePropertyMutations] Token obtained, calling API...');
      const response = await Api.Properties.create(token, propertyData, images);
      
      console.log('[usePropertyMutations] API response:', response);
      
      if (response.error) {
        console.error('[usePropertyMutations] API returned error:', response.error);
        setError(response.error);
        return null;
      }
      
      console.log('[usePropertyMutations] Property created successfully:', response.data);
      return response.data;
    } catch (err) {
      console.error('[usePropertyMutations] Exception:', err);
      setError(err instanceof Error ? err.message : 'Failed to create property');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken]);

  const updateProperty = useCallback(async (
    id: number,
    propertyData: any,
    images?: File[]
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setError('Not authenticated');
        return null;
      }

      const response = await Api.Properties.update(token, id, propertyData, images);
      if (response.error) {
        setError(response.error);
        return null;
      }
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update property');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken]);

  const deleteProperty = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setError('Not authenticated');
        return false;
      }

      const response = await Api.Properties.delete(token, id);
      if (response.error) {
        setError(response.error);
        return false;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete property');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken]);

  return { createProperty, updateProperty, deleteProperty, isLoading, error };
}

// ============================================
// INTERACTIONS HOOKS
// ============================================

export function useInteractions() {
  const { getAccessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expressInterest = useCallback(async (propertyId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setError('Not authenticated');
        return false;
      }

      const response = await Api.Interactions.expressInterest(token, propertyId);
      if (response.error) {
        setError(response.error);
        return false;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to express interest');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken]);

  const pass = useCallback(async (propertyId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setError('Not authenticated');
        return false;
      }

      const response = await Api.Interactions.pass(token, propertyId);
      if (response.error) {
        setError(response.error);
        return false;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pass');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken]);

  return { expressInterest, pass, isLoading, error };
}

export function useInterestedUsers(propertyId?: string) {
  return useApiCall<User[]>(
    (token) => Api.Interactions.getInterestedUsers(token, propertyId)
  );
}

export function useLandlordInteractions() {
  const { getAccessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const acceptUser = useCallback(async (userId: string, propertyId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setError('Not authenticated');
        return null;
      }

      const response = await Api.Interactions.acceptUser(token, userId, propertyId);
      if (response.error) {
        setError(response.error);
        return null;
      }
      return response.data; // Returns the created conversation
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept user');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken]);

  const declineUser = useCallback(async (userId: string, propertyId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setError('Not authenticated');
        return false;
      }

      const response = await Api.Interactions.declineUser(token, userId, propertyId);
      if (response.error) {
        setError(response.error);
        return false;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline user');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken]);

  return { acceptUser, declineUser, isLoading, error };
}

// ============================================
// CONVERSATIONS HOOKS
// ============================================

export function useConversations() {
  return useApiCall<Conversation[]>(
    (token) => Api.Conversations.getAll(token)
  );
}

export function useConversation(id: string) {
  return useApiCall<Conversation>(
    (token) => Api.Conversations.getById(token, id)
  );
}

export function useMessages(conversationId: string) {
  const result = useApiCall<Message[]>(
    (token) => Api.Conversations.getMessages(token, conversationId)
  );

  const { getAccessToken } = useAuth();
  const [sendingMessage, setSendingMessage] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    setSendingMessage(true);

    try {
      const token = await getAccessToken();
      if (!token) return null;

      const response = await Api.Conversations.sendMessage(token, conversationId, content);
      if (response.data) {
        // Refetch messages after sending
        result.refetch();
        return response.data;
      }
      return null;
    } catch {
      return null;
    } finally {
      setSendingMessage(false);
    }
  }, [conversationId, getAccessToken, result.refetch]);

  return {
    ...result,
    sendMessage,
    sendingMessage,
  };
}

// ============================================
// ADMIN HOOKS
// ============================================

export function useAdminUsers() {
  return useApiCall<User[]>(
    (token) => Api.Admin.getUsers(token)
  );
}

export function useAdminReports() {
  return useApiCall<unknown[]>(
    (token) => Api.Admin.getReports(token)
  );
}

export function useAdminMutations() {
  const { getAccessToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateUserRole = useCallback(async (userId: string, roleName: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setError('Not authenticated');
        return null;
      }

      const response = await Api.Admin.updateUserRole(token, userId, roleName);
      if (response.error) {
        setError(response.error);
        return null;
      }
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken]);

  return { updateUserRole, isLoading, error };
}

// Export all hooks
export default {
  useCurrentUser,
  useUpdateProfile,
  useProperties,
  useProperty,
  useMyListings,
  usePropertyMutations,
  useInteractions,
  useInterestedUsers,
  useLandlordInteractions,
  useConversations,
  useConversation,
  useMessages,
  useAdminUsers,
  useAdminReports,
  useAdminMutations,
};
