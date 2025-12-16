/**
 * API Service
 * Centralized API calls for Roomify
 */

import { Platform } from 'react-native';

// Web uses localhost, mobile uses host IP from env
const getApiUrl = () => {
  const envUrl = ('http://' + process.env.EXPO_PUBLIC_BACKEND_IP + ':8080') || 'http://localhost:8080';

  // On web, always use localhost
  if (Platform.OS === 'web') {
    return 'http://localhost:8080';
  }

  // On mobile (iOS/Android), use the env variable (should be host machine IP)
  return envUrl;
};

const API_URL = getApiUrl();

// Helper to get full image URL
export const getImageUrl = (filename: string | undefined | null): string => {
  if (!filename) return '';
  // If it's already a full URL, return as is
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }
  // Otherwise, construct the full URL
  return `${API_URL}/api/properties/images/${filename}`;
};

// ============================================
// TYPES
// ============================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  bio?: string;
  birthDate?: string;
  gender?: string;
  latitude?: number;
  longitude?: number;
  createdAt?: string;
  updatedAt?: string;
  role: Role;
}

export interface Role {
  id: string;
  name: string;
}

export interface PropertyImage {
  id: number;
  url: string;
  orderIndex: number;
}

export interface Property {
  id: number;
  ownerId: string;
  title: string;
  description?: string;
  price: number;
  surface: number;
  address: string;
  numberOfRooms: number;
  hasExtraBathroom: boolean;
  layoutType?: 'DECOMANDAT' | 'SEMIDECOMANDAT' | 'NEDECOMANDAT';
  smokerFriendly?: boolean;
  petFriendly?: boolean;
  preferredTenants?: string[];
  images: PropertyImage[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Conversation {
  id: string;
  participants: User[];
  property?: Property;
  lastMessage?: Message;
  createdAt?: string;
  updatedAt?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
}

// ============================================
// BASE FETCH WRAPPER
// ============================================

async function fetchApi<T>(
    endpoint: string,
    options: RequestInit = {},
    accessToken?: string
): Promise<ApiResponse<T>> {
  const url = `${API_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const status = response.status;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        error: errorText || `Request failed with status ${status}`,
        status,
      };
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return { status };
    }

    const data = JSON.parse(text) as T;
    return { data, status };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      status: 0,
    };
  }
}

// ============================================
// AUTH / USER API
// ============================================

export const AuthApi = {
  /**
   * Authorize user and sync with backend
   */
  authorize: (accessToken: string) =>
      fetchApi<User>('/user/authorize', { method: 'POST' }, accessToken),

  /**
   * Get current user profile
   */
  getProfile: (accessToken: string) =>
      fetchApi<User>('/user/profile', { method: 'GET' }, accessToken),

  /**
   * Update user profile
   */
  updateProfile: (accessToken: string, data: Partial<User>) =>
      fetchApi<User>(
          '/user/profile',
          {
            method: 'PUT',
            body: JSON.stringify(data),
          },
          accessToken
      ),
};

// ============================================
// PROPERTIES API
// ============================================

export const PropertiesApi = {
  /**
   * Get all properties (for swiping/browsing)
   */
  getAll: (accessToken: string, page: number = 0, size: number = 10) => {
    return fetchApi<{content: Property[], totalPages: number, totalElements: number}>(
        `/api/properties?page=${page}&size=${size}`,
        { method: 'GET' },
        accessToken
    );
  },

  /**
   * Get property by ID
   */
  getById: (accessToken: string, id: number) => {
    // Guard against NaN or invalid IDs
    if (!id || Number.isNaN(id)) {
      console.error('[PropertiesApi.getById] Invalid ID:', id);
      return Promise.resolve({ error: 'Invalid property ID', status: 400 } as ApiResponse<Property>);
    }
    return fetchApi<Property>(`/api/properties/${id}`, { method: 'GET' }, accessToken);
  },

  /**
   * Create a new property with images
   * @param images - Array of File objects (web) or React Native image objects with { uri, type, name }
   */
  create: async (accessToken: string, propertyData: any, images: Array<File | { uri: string; type: string; name: string }>) => {
    console.log('[PropertiesApi.create] Starting...');
    console.log('[PropertiesApi.create] Property data:', propertyData);
    console.log('[PropertiesApi.create] Images:', images.length);
    console.log('[PropertiesApi.create] Token present:', !!accessToken);

    const formData = new FormData();
    formData.append('data', JSON.stringify(propertyData));

    // Append images - works for both File objects (web) and {uri, type, name} (native)
    images.forEach((image, index) => {
      console.log(`[PropertiesApi.create] Appending image ${index}:`, JSON.stringify(image));
      formData.append('images', image as any);
    });

    const url = `${API_URL}/api/properties`;
    console.log('[PropertiesApi.create] Request URL:', url);

    try {
      console.log('[PropertiesApi.create] Sending POST request...');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      });

      console.log('[PropertiesApi.create] Response status:', response.status);
      const status = response.status;

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PropertiesApi.create] Error response:', errorText);
        return { error: errorText || `Request failed with status ${status}`, status };
      }

      const text = await response.text();
      console.log('[PropertiesApi.create] Response text:', text);
      const data = text ? JSON.parse(text) : null;
      console.log('[PropertiesApi.create] Parsed data:', data);
      return { data, status } as ApiResponse<Property>;
    } catch (error) {
      console.error('[PropertiesApi.create] Exception:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 0,
      } as ApiResponse<Property>;
    }
  },

  /**
   * Update property (landlord only)
   * FIXED: Now correctly handles image arrays for React Native
   */
  update: async (accessToken: string, id: number, propertyData: any, images?: Array<File | { uri: string; type: string; name: string }>) => {
    const formData = new FormData();
    formData.append('data', JSON.stringify(propertyData));

    // FIX APPLIED HERE:
    // We now use the same logic as 'create' to ensure React Native
    // serializes the image object correctly in the multipart request.
    if (images && images.length > 0) {
      images.forEach((image) => {
        // Casting to 'any' is necessary because FormData types in RN are loose
        // but TypeScript expects standard Web 'Blob' types.
        formData.append('images', image as any);
      });
    }

    const url = `${API_URL}/api/properties/${id}`;
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          // Note: Content-Type header is purposefully omitted so fetch
          // can set the correct multipart boundary automatically.
        },
        body: formData,
      });

      const status = response.status;
      if (!response.ok) {
        const errorText = await response.text();
        return { error: errorText || `Request failed with status ${status}`, status };
      }

      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      return { data, status } as ApiResponse<Property>;
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 0,
      } as ApiResponse<Property>;
    }
  },

  /**
   * Delete property (landlord only)
   */
  delete: (accessToken: string, id: number) =>
      fetchApi<void>(`/api/properties/${id}`, { method: 'DELETE' }, accessToken),

  /**
   * Get landlord's own properties
   */
  getMyListings: (accessToken: string, page: number = 0, size: number = 10) =>
      fetchApi<{content: Property[], totalPages: number, totalElements: number}>(
          `/api/properties/my?page=${page}&size=${size}`,
          { method: 'GET' },
          accessToken
      ),
};

// ============================================
// INTERACTIONS API (Swipe/Match)
// ============================================

export const InteractionsApi = {
  /**
   * Express interest in a property (normal user)
   */
  expressInterest: (accessToken: string, propertyId: string) =>
      fetchApi<void>(
          '/interactions/interest',
          {
            method: 'POST',
            body: JSON.stringify({ propertyId }),
          },
          accessToken
      ),

  /**
   * Pass on a property (not interested)
   */
  pass: (accessToken: string, propertyId: string) =>
      fetchApi<void>(
          '/interactions/pass',
          {
            method: 'POST',
            body: JSON.stringify({ propertyId }),
          },
          accessToken
      ),

  /**
   * Get interested users for landlord's property
   */
  getInterestedUsers: (accessToken: string, propertyId?: string) => {
    const params = propertyId ? `?propertyId=${propertyId}` : '';
    return fetchApi<User[]>(`/interactions/interested${params}`, { method: 'GET' }, accessToken);
  },

  /**
   * Accept a user (landlord) - creates a match
   */
  acceptUser: (accessToken: string, userId: string, propertyId: string) =>
      fetchApi<Conversation>(
          '/interactions/accept',
          {
            method: 'POST',
            body: JSON.stringify({ userId, propertyId }),
          },
          accessToken
      ),

  /**
   * Decline a user (landlord)
   */
  declineUser: (accessToken: string, userId: string, propertyId: string) =>
      fetchApi<void>(
          '/interactions/decline',
          {
            method: 'POST',
            body: JSON.stringify({ userId, propertyId }),
          },
          accessToken
      ),
};

// ============================================
// CONVERSATIONS API
// ============================================

export const ConversationsApi = {
  /**
   * Get all conversations for current user
   */
  getAll: (accessToken: string, propertyId?: string) => {
    const params = propertyId ? `?propertyId=${propertyId}` : '';
    return fetchApi<Conversation[]>(`/conversations${params}`, { method: 'GET' }, accessToken);
  },

  /**
   * Get conversation by ID
   */
  getById: (accessToken: string, id: string) =>
      fetchApi<Conversation>(`/conversations/${id}`, { method: 'GET' }, accessToken),

  /**
   * Get messages for a conversation
   */
  getMessages: (accessToken: string, conversationId: string) =>
      fetchApi<Message[]>(`/conversations/${conversationId}/messages`, { method: 'GET' }, accessToken),

  /**
   * Send a message
   */
  sendMessage: (accessToken: string, conversationId: string, content: string) =>
      fetchApi<Message>(
          `/conversations/${conversationId}/messages`,
          {
            method: 'POST',
            body: JSON.stringify({ content }),
          },
          accessToken
      ),
};

// ============================================
// ADMIN API
// ============================================

export const AdminApi = {
  /**
   * Get all reports
   */
  getReports: (accessToken: string) =>
      fetchApi<unknown[]>('/admin/reports', { method: 'GET' }, accessToken),

  /**
   * Get all users (for role management)
   */
  getUsers: (accessToken: string) =>
      fetchApi<User[]>('/admin/users', { method: 'GET' }, accessToken),

  /**
   * Update user role
   */
  updateUserRole: (accessToken: string, userId: string, roleName: string) =>
      fetchApi<User>(
          `/admin/users/${userId}/role`,
          {
            method: 'PUT',
            body: JSON.stringify({ roleName }),
          },
          accessToken
      ),
};

// Default export for convenience
export default {
  Auth: AuthApi,
  Properties: PropertiesApi,
  Interactions: InteractionsApi,
  Conversations: ConversationsApi,
  Admin: AdminApi,
};