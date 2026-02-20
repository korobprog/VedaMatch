
export type OrgStatus = 'draft' | 'pending' | 'verified' | 'blocked';
export type ProjectStatus = 'draft' | 'moderation' | 'active' | 'paused' | 'completed' | 'blocked';

export interface ImpactMetricConfig {
    metric: string;
    labelRu: string;
    labelEn: string;
    unitCost: number;
    icon?: string;
}

export interface ImpactValue {
    metric: string;
    value: number;
    labelRu: string;
    labelEn: string;
}

export interface CharityOrganization {
    id: number;
    name: string;
    slug: string;
    description: string;
    logoUrl?: string;
    coverUrl?: string;
    website?: string;
    email?: string;
    phone?: string;
    country?: string;
    city?: string;
    status: OrgStatus;
    isPremium: boolean;
    totalRaised: number;
    totalProjects: number;
    trustScore: number;
}

export interface CharityProject {
    id: number;
    organizationId: number;
    organization?: CharityOrganization;
    title: string;
    slug: string;
    description?: string;
    shortDesc?: string;
    coverUrl?: string;
    videoUrl?: string;
    category?: string;
    goalAmount: number;
    raisedAmount: number;
    donationsCount: number;
    uniqueDonors: number;
    minDonation: number;
    suggestedAmounts?: number[];
    impactMetrics?: ImpactMetricConfig[];
    status: ProjectStatus;
    startDate?: string;
    endDate?: string;
    isFeatured: boolean;
    isUrgent: boolean;
    nextReportDue?: string;
}

export type DonationStatus = 'pending' | 'confirmed' | 'refunded';

export interface CharityDonation {
    id: number;
    donorUserId: number;
    projectId: number;
    project?: CharityProject;
    amount: number;
    tipsAmount: number;
    totalPaid: number;
    isAnonymous: boolean;
    karmaMessage?: string;
    impactSnapshot?: ImpactValue[];
    status: DonationStatus;
    canRefundUntil?: string;
    refundedAt?: string;
    confirmedAt?: string;
    createdAt: string;
}

export interface DonateRequest {
    projectId: number;
    amount: number;
    includeTips: boolean;
    tipsPercent?: number;
    karmaMessage?: string;
    isAnonymous: boolean;
    wantsCertificate: boolean;
    sourceService?: 'rooms' | 'seva' | 'travel' | 'multimedia' | 'other' | 'unknown';
    sourceTrigger?: 'support_prompt' | 'donate_modal' | 'campaign_banner' | 'manual' | 'unknown';
    sourceRoomId?: number;
    sourceContext?: string;
    platformContributionEnabled?: boolean;
    platformContributionPercent?: number;
}

export interface DonateResponse {
    donationId: number;
    transactionId: number;
    amountDonated: number;
    tipsAmount: number;
    totalPaid: number;
    newBalance: number;
    impactAchieved: ImpactValue[];
    certificateUrl?: string;
}

export type EvidenceType = 'photo' | 'video' | 'receipt' | 'report';

export interface CharityEvidence {
    id: number;
    projectId: number;
    createdByUserId: number;
    type: EvidenceType;
    title?: string;
    description?: string;
    mediaUrl: string;
    thumbnailUrl?: string;
    isApproved: boolean;
    viewsCount: number;
    likesCount: number;
    createdAt: string;
}
