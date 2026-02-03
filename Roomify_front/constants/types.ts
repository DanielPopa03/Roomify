export interface PropertyImage {
    id: number;
    url: string;
    orderIndex: number;
}

export interface Property {
    id: number;
    title: string;
    description: string;
    price: number;
    address: string;
    surface: number;
    numberOfRooms: number;
    images: PropertyImage[];
    ownerId: string;
    // Social Proof Fields
    activeViewersCount?: number;
    isTrending?: boolean;
}

export interface User {
    id: string;
    firstName: string;
    email: string;
    bio: string;
    phoneNumber?: string;
    picture?: string; // If Auth0 provides it
}

export interface MatchResponse {
    id: number;
    status: 'TENANT_LIKED' | 'LANDLORD_LIKED' | 'MATCHED';
}

export interface Preferences {
    id?: number;
    minPrice?: number;
    maxPrice?: number;
    minSurface?: number;
    maxSurface?: number;
    minRooms?: number;
    maxRooms?: number;
    layoutTypes?: string[];
    smokerFriendly?: boolean | null;
    petFriendly?: boolean | null;
    preferredTenants?: string[];
    searchLatitude?: number;
    searchLongitude?: number;
    searchRadiusKm?: number;
}

// ============================================
// CHAT & RENTAL WORKFLOW TYPES
// ============================================

export type MessageType = 'TEXT' | 'SYSTEM' | 'ACTION_CARD';

export type MatchStatus = 
    | 'TENANT_LIKED' 
    | 'LANDLORD_LIKED' 
    | 'MATCHED'
    | 'VIEWING_REQUESTED'
    | 'VIEWING_SCHEDULED'
    | 'OFFER_PENDING'
    | 'RENTED'
    | 'LANDLORD_DECLINED'
    | 'TENANT_DECLINED';

/**
 * Parsed metadata for ACTION_CARD messages.
 * The API layer parses the JSON string into this object.
 */
export interface ChatMessageMetadata {
    action: 'VIEWING_PROPOSAL' | 'RENT_PROPOSAL';
    // For VIEWING_PROPOSAL
    date?: string;
    formattedDate?: string;
    // For RENT_PROPOSAL
    leaseId?: number;
    price?: number;
    currency?: string;
    startDate?: string;
    leaseStatus?: 'PENDING' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
}

/**
 * Chat message with parsed metadata.
 */
export interface ChatMessage {
    id: string;
    text: string;
    type: MessageType;
    metadata?: ChatMessageMetadata | null;
    sender: 'me' | 'other' | 'system';
    isRead: boolean;
    timestamp: string;
}