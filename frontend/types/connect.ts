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
export type ConnectApplicationStatus = 'pending' | 'approved' | 'attended' | 'completed' | 'rejected';

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
    trustSummary?: ConnectTrustSummary;
    community?: ConnectCommunityCard;
    sourceLink?: ConnectSourceLink;
}

export interface ConnectTrustSummary {
    reviewsCount: number;
    averageRating: number;
    feltSafePercent: number;
    newcomerFriendlyPercent: number;
    wouldReturnPercent: number;
}

export interface ConnectFeedbackItem {
    id: number;
    createdAt: string;
    rating: number;
    comment: string;
    tags: string[];
    feltSafe: boolean;
    newcomerFriendly: boolean;
    wouldReturn: boolean;
    authorLabel: string;
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
    trustSummary?: ConnectTrustSummary | null;
    feedback?: ConnectFeedbackItem[];
    canSubmitFeedback?: boolean;
    canManageApplications?: boolean;
    viewerApplication?: ConnectViewerApplication | null;
}

export interface ConnectViewerApplication {
    id: number;
    status: ConnectApplicationStatus;
    message?: string;
    reviewNote?: string;
    updatedAt: string;
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

export interface ConnectApplication {
    id: number;
    opportunityId: number;
    userId: number;
    status: ConnectApplicationStatus;
    message?: string;
    reviewedAt?: string;
    reviewedByUserId?: number;
    reviewNote?: string;
}

export interface ConnectModerationRequest {
    reason?: string;
}

export interface ConnectModerationUser {
    ID?: number;
    karmicName?: string;
    spiritualName?: string;
    email?: string;
}

export interface ConnectModerationCommunity {
    id: number;
    name: string;
    city?: string;
}

export interface ConnectModerationOpportunity {
    id: number;
    title: string;
    description?: string;
    city?: string;
    district?: string;
    locationLabel?: string;
    category: string;
    entryLevel: ConnectEntryLevel;
    participationFormat: ConnectParticipationFormat;
    participationModes?: string[];
    newcomerFriendly: boolean;
    mentorAvailable: boolean;
    requiresApproval: boolean;
    status: ConnectOpportunityStatus;
    moderatedAt?: string;
    moderatedByUserId?: number;
    moderationNote?: string;
    createdAt?: string;
    startsAt?: string;
    createdByUser?: ConnectModerationUser;
    community?: ConnectModerationCommunity | null;
}

export interface ConnectModerationApplication {
    id: number;
    opportunityId: number;
    userId: number;
    status: ConnectApplicationStatus;
    message?: string;
    reviewedAt?: string;
    reviewedByUserId?: number;
    reviewNote?: string;
    createdAt?: string;
    updatedAt?: string;
    user?: ConnectModerationUser;
}

export interface ConnectApplicationStatusUpdateRequest {
    status: ConnectApplicationStatus;
    note?: string;
}

export interface ConnectFeedbackCreateRequest {
    rating: number;
    comment?: string;
    tags?: string[];
    feltSafe?: boolean;
    newcomerFriendly?: boolean;
    wouldReturn?: boolean;
}
