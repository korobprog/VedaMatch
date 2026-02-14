import { API_PATH } from '../config/api.config';
import { getAuthHeaders } from './contactService';

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

const parseJsonResponse = async <T>(response: Response, fallbackMessage: string): Promise<T> => {
    const text = await response.text();
    let payload: any = {};

    if (text) {
        try {
            payload = JSON.parse(text);
        } catch {
            if (!response.ok) {
                throw new Error(fallbackMessage);
            }
            throw new Error('Invalid JSON response');
        }
    }

    if (!response.ok) {
        const message = payload?.error || fallbackMessage;
        throw new Error(message);
    }

    return payload as T;
};

export const ragService = {
    async getDomains(): Promise<DomainDescriptor[]> {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_PATH}/rag/domains`, {
            method: 'GET',
            headers,
        });
        const payload = await parseJsonResponse<{ domains?: DomainDescriptor[] }>(response, 'Failed to fetch RAG domains');
        return payload.domains || [];
    },

    async queryHybrid(request: HybridQueryRequest): Promise<HybridQueryResponse> {
        const headers = await getAuthHeaders();
        const response = await fetch(`${API_PATH}/rag/query-hybrid`, {
            method: 'POST',
            headers,
            body: JSON.stringify(request),
        });
        return parseJsonResponse<HybridQueryResponse>(response, 'Failed to query hybrid RAG');
    },

    async getSourceById(sourceId: string, includePrivate = false): Promise<SourceDetailsResponse> {
        const headers = await getAuthHeaders();
        const query = includePrivate ? '?includePrivate=true' : '';
        const response = await fetch(`${API_PATH}/rag/sources/${sourceId}${query}`, {
            method: 'GET',
            headers,
        });
        return parseJsonResponse<SourceDetailsResponse>(response, 'Failed to fetch source details');
    },
};
