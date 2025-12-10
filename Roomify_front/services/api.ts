/**
 * API Service
 * Centralized API calls for Roomify
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

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

export interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  images: string[];
  location: string;
  latitude?: number;
  longitude?: number;
  landlordId: string;
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
   * Get all properties (for swiping)
   */
  getAll: (accessToken: string, filters?: Record<string, string>) => {
    const params = filters ? `?${new URLSearchParams(filters)}` : '';
    return fetchApi<Property[]>(`/properties${params}`, { method: 'GET' }, accessToken);
  },

  /**
   * Get property by ID
   */
  getById: (accessToken: string, id: string) =>
    fetchApi<Property>(`/properties/${id}`, { method: 'GET' }, accessToken),

  /**
   * Create new property (landlord only)
   */
  create: (accessToken: string, data: Omit<Property, 'id' | 'landlordId' | 'createdAt' | 'updatedAt'>) =>
    fetchApi<Property>(
      '/properties',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      accessToken
    ),

  /**
   * Update property (landlord only)
   */
  update: (accessToken: string, id: string, data: Partial<Property>) =>
    fetchApi<Property>(
      `/properties/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      accessToken
    ),

  /**
   * Delete property (landlord only)
   */
  delete: (accessToken: string, id: string) =>
    fetchApi<void>(`/properties/${id}`, { method: 'DELETE' }, accessToken),

  /**
   * Get landlord's own properties
   */
  getMyListings: (accessToken: string) =>
    fetchApi<Property[]>('/properties/my-listings', { method: 'GET' }, accessToken),
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
