import apiClient from '../lib/apiClient';

export interface DomainDescriptor {
    name: string;
    wave: string;
    visibilityScope: string;
    enabled: boolean;
    status: string;
}

export interface AssistantSourceDTO {
    id: string;
    domain: string;
    sourceType: string;
    sourceId: string;
    title: string;
    snippet: string;
    sourceUrl?: string;
    score?: number;
    metadata?: Record<string, unknown>;
}

export interface AssistantContextDTO {
    domains: string[];
    sources: AssistantSourceDTO[];
    confidence: number;
    language?: string;
    visibility_scope?: string;
}

export interface HybridQueryResponse {
    query: string;
    results: AssistantSourceDTO[];
    assistant_context: AssistantContextDTO;
    retriever_path: string;
}

export interface HybridQueryRequest {
    query: string;
    domains?: string[];
    topK?: number;
    includePrivate?: boolean;
    filters?: Record<string, string>;
}

export interface SourceDetailsResponse {
    id: string;
    domain: string;
    sourceType: string;
    sourceId: string;
    title: string;
    content: string;
    sourceUrl?: string;
    language?: string;
    visibilityScope?: string;
    userId?: number;
    metadata?: Record<string, unknown>;
    createdAt?: string;
    updatedAt?: string;
}

const parseAxiosError = (error: any, fallbackMessage: string): Error => {
    const message = error?.response?.data?.error || fallbackMessage;
    return new Error(message);
};

export const ragService = {
    async getDomains(): Promise<DomainDescriptor[]> {
        try {
            const response = await apiClient.get('/rag/domains');
            const payload = response.data as { domains?: DomainDescriptor[] };
            return payload.domains || [];
        } catch (error) {
            throw parseAxiosError(error, 'Failed to fetch RAG domains');
        }
    },

    async queryHybrid(request: HybridQueryRequest): Promise<HybridQueryResponse> {
        try {
            const response = await apiClient.post('/rag/query-hybrid', request);
            return response.data as HybridQueryResponse;
        } catch (error) {
            throw parseAxiosError(error, 'Failed to query hybrid RAG');
        }
    },

    async getSourceById(sourceId: string, includePrivate = false): Promise<SourceDetailsResponse> {
        try {
            const response = await apiClient.get(`/rag/sources/${sourceId}`, {
                params: includePrivate ? { includePrivate: true } : undefined,
            });
            return response.data as SourceDetailsResponse;
        } catch (error) {
            throw parseAxiosError(error, 'Failed to fetch source details');
        }
    },
};
