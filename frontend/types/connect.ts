export type ConnectCommunityType = 'organization' | 'yatra' | 'team' | 'circle';
export type ConnectVerificationStatus = 'pending' | 'verified' | 'unverified';
export type ConnectOpportunityStatus = 'moderation' | 'active' | 'filled' | 'completed' | 'paused';
export type ConnectEntryLevel = 'intro' | 'one_time' | 'regular' | 'team_based';
export type ConnectParticipationFormat = 'offline' | 'online' | 'hybrid';
export type ConnectSourceType = 'native' | 'yatra' | 'seva' | 'service';
export type ConnectOnboardingMode =
    | 'meet_people'
    | 'try_simple_service'
    | 'friendly_group'
    | 'need_simple_explanation';

export interface ConnectSourceLink {
    type: ConnectSourceType;
    id: number;
    screen: string;
    label: string;
}

export interface ConnectCommunityCard {
    id: number;
    name: string;
    description: string;
    city: string;
    district?: string;
    communityType: ConnectCommunityType;
    verificationStatus: ConnectVerificationStatus;
    newcomerFriendly: boolean;
    mentorAvailable: boolean;
    coverImageUrl?: string;
    tags?: string[];
    sourceLink?: ConnectSourceLink;
}

export interface ConnectOpportunityCard {
    id: number;
    title: string;
    description: string;
    city: string;
    district?: string;
    locationLabel?: string;
    category: string;
    entryLevel: ConnectEntryLevel;
    participationFormat: ConnectParticipationFormat;
    participationModes: string[];
    newcomerFriendly: boolean;
    mentorAvailable: boolean;
    requiresApproval: boolean;
    needsTransport?: boolean;
    isRecurring?: boolean;
    status: ConnectOpportunityStatus;
    startsAt?: string;
    endsAt?: string;
    score: number;
    why: string[];
    community?: ConnectCommunityCard;
    sourceLink?: ConnectSourceLink;
}

export interface ConnectFeedFilters {
    city?: string;
    district?: string;
    category?: string;
    entryLevel?: ConnectEntryLevel;
    participationFormat?: ConnectParticipationFormat;
    mode?: string;
    newcomerOnly?: boolean;
    nearbyOnly?: boolean;
    limit?: number;
}

export interface ConnectMatchProfile {
    id?: number;
    userId?: number;
    city: string;
    district?: string;
    radiusKm?: number;
    interests: string[];
    preferredEntryLevels: string[];
    participationFormats: string[];
    participationModes: string[];
    availableTimeLabels: string[];
    hasTransport: boolean;
    quietServicePreferred: boolean;
    needsMentor: boolean;
    wantsCompany: boolean;
    onboardingMode: ConnectOnboardingMode;
}

export interface ConnectFeedResponse {
    opportunities: ConnectOpportunityCard[];
    communities: ConnectCommunityCard[];
    profile?: ConnectMatchProfile | null;
}

export interface ConnectOpportunityDetailResponse {
    opportunity: ConnectOpportunityCard;
}

export interface ConnectCommunityDetailResponse {
    community: ConnectCommunityCard;
    opportunities: ConnectOpportunityCard[];
}

export interface ConnectOpportunityCreateRequest {
    communityId?: number;
    title: string;
    description?: string;
    city?: string;
    district?: string;
    locationLabel?: string;
    category: string;
    interests?: string[];
    entryLevel: ConnectEntryLevel;
    participationFormat: ConnectParticipationFormat;
    participationModes?: string[];
    requiresApproval?: boolean;
    newcomerFriendly?: boolean;
    mentorAvailable?: boolean;
    needsTransport?: boolean;
    isRecurring?: boolean;
    startsAt?: string;
    endsAt?: string;
}

export interface ConnectApplyRequest {
    message?: string;
}
