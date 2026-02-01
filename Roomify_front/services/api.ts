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
export const getImageUrl = (pathFromDb: string | undefined | null): string => {
  if (!pathFromDb) return '';

  // 1. Handle local picker URIs
  if (pathFromDb.startsWith('file://') || pathFromDb.startsWith('content://')) {
    return pathFromDb;
  }

  // 2. Normalize Base URL (no trailing slash)
  const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;

  // 3. Prevent Double Pathing
  // If DB says "/api/properties/images/img.jpg", just join it to baseUrl
  if (pathFromDb.startsWith('/api')) {
    return `${baseUrl}${pathFromDb}`;
  }

  // 4. Fallback for raw filenames
  return `${baseUrl}/api/properties/images/${pathFromDb}`;
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
  participants?: User[];
  property?: Property;
  lastMessage?: Message;
  createdAt?: string;
  updatedAt?: string;

  // Chat list fields returned by /api/chats endpoints
  tenantId?: string;
  tenantName?: string;
  tenantAvatar?: string | null;
  landlordId?: string;
  landlordName?: string;
  landlordAvatar?: string | null;
  propertyTitle?: string;
  propertyImage?: string | null;
  price?: number;
  timestamp?: string;
  unreadCount?: number;

  // Match-specific
  tenantMessaged?: boolean;
  timeLeftSeconds?: number;
  expiresAt?: string | null;
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
// USERS API (Public Profile Fetching)
// ============================================

export interface PublicUserProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  bio?: string;
  jobTitle?: string;
  isSmoker?: boolean;
  hasPets?: boolean;
  videoUrl?: string;
  isVideoPublic?: boolean;
  isVerified?: boolean;
  createdAt?: string;
  seriousnessScore?: number;
}

export const UsersApi = {
  /**
   * Get a user's public profile by ID
   * Used by landlords to view tenant details
   */
  getById: (accessToken: string, userId: string) => {
    if (!userId || userId.trim() === '') {
      console.error('[UsersApi.getById] Invalid userId:', userId);
      return Promise.resolve({ error: 'Invalid user ID', status: 400 } as ApiResponse<PublicUserProfile>);
    }
    return fetchApi<PublicUserProfile>(
      `/user/${encodeURIComponent(userId)}`,
      { method: 'GET' },
      accessToken
    );
  },
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

// ============================================
// INTERVIEW API (Video Interview Feature)
// ============================================

export interface InterviewAnalysisResponse {
  bio: string;
  jobTitle: string;
  smokerFriendly: boolean;
  petFriendly: boolean;
  videoUrl: string;
  videoFilename: string;
  geminiFileUri: string;
}

export interface InterviewConfirmationData {
  bio: string;
  jobTitle: string;
  smokerFriendly: boolean;
  petFriendly: boolean;
  videoFilename: string;
  isVideoPublic: boolean;
}

/**
 * Prepares a video file for FormData upload.
 * Handles the difference between Web (Blob/File) and Mobile (URI object).
 * 
 * @param videoUri - The URI of the video (file:// on mobile, blob: on web)
 * @returns A file object suitable for FormData
 */
export const prepareVideoForUpload = async (videoUri: string): Promise<any> => {
  if (Platform.OS === 'web') {
    // Web: Fetch the blob and convert to File
    try {
      const response = await fetch(videoUri);
      const blob = await response.blob();
      return new File([blob], 'interview.mp4', { type: 'video/mp4' });
    } catch (error) {
      console.error('[prepareVideoForUpload] Web blob fetch failed:', error);
      throw error;
    }
  } else {
    // Mobile: Return URI object for React Native FormData
    return {
      uri: videoUri,
      type: 'video/mp4',
      name: 'interview.mp4',
    };
  }
};

export const InterviewApi = {
  /**
   * Upload and analyze interview video with Gemini AI.
   * Returns AI-generated profile suggestions.
   */
  analyzeVideo: async (accessToken: string, videoUri: string): Promise<ApiResponse<InterviewAnalysisResponse>> => {
    console.log('[InterviewApi.analyzeVideo] Starting upload...');
    
    try {
      const videoFile = await prepareVideoForUpload(videoUri);
      
      const formData = new FormData();
      formData.append('file', videoFile);

      const url = `${API_URL}/user/interview/analyze`;
      console.log('[InterviewApi.analyzeVideo] POSTing to:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          // Note: Don't set Content-Type for FormData, browser sets it with boundary
        },
        body: formData,
      });

      const status = response.status;
      console.log('[InterviewApi.analyzeVideo] Response status:', status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[InterviewApi.analyzeVideo] Error:', errorText);
        return { error: errorText || `Request failed with status ${status}`, status };
      }

      const data = await response.json();
      console.log('[InterviewApi.analyzeVideo] Success:', data);
      return { data, status };
    } catch (error) {
      console.error('[InterviewApi.analyzeVideo] Exception:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 0,
      };
    }
  },

  /**
   * Confirm and save the interview profile data.
   */
  confirmProfile: async (accessToken: string, data: InterviewConfirmationData): Promise<ApiResponse<User>> => {
    return fetchApi<User>(
      '/user/interview/confirm',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      accessToken
    );
  },

  /**
   * Get the full video URL for playback.
   */
  getVideoUrl: (videoPath: string): string => {
    if (!videoPath) return '';
    if (videoPath.startsWith('http') || videoPath.startsWith('blob:') || videoPath.startsWith('file:')) {
      return videoPath;
    }
    const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    if (videoPath.startsWith('/')) {
      return `${baseUrl}${videoPath}`;
    }
    return `${baseUrl}/user/interview/video/${videoPath}`;
  },
};

// Default export for convenience
export default {
  Auth: AuthApi,
  Users: UsersApi,
  Properties: PropertiesApi,
  Interactions: InteractionsApi,
  Conversations: ConversationsApi,
  Admin: AdminApi,
  Interview: InterviewApi,
};