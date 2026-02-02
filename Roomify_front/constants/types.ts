export interface PropertyImage {
    id: number;
    url: string;
    orderIndex: number;
}

export interface Property {
    id: number;
    title: string;
    price: number;
    surface: number;
    address: string;
    description: string;
    numberOfRooms: number;
    hasExtraBathroom: boolean;
    layoutType: string;
    preferredTenants: string[];
    smokerFriendly: boolean;
    petFriendly: boolean;
    latitude: number;
    longitude: number;
    images: string[];

    // --- UPDATED FIELDS ---
    // Remove: owner: User;
    // Add these instead to match PropertyFeedResponse.java:
    ownerId: string;
    ownerFirstName?: string;
    ownerPicture?: string;
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