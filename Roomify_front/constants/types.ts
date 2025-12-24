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