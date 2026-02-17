import axios from 'axios';
import { API_PATH } from '../../config/api.config';
import { educationService } from '../../services/educationService';
import { getAccessToken } from '../../services/authSessionService';

jest.mock('axios');
jest.mock('../../services/authSessionService', () => ({
    getAccessToken: jest.fn(),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedGetAccessToken = getAccessToken as jest.MockedFunction<typeof getAccessToken>;

describe('educationService tutor API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockedGetAccessToken.mockResolvedValue('test-token');
    });

    it('calls getTutorStatus endpoint with auth headers', async () => {
        const payload = { enabled: true };
        mockedAxios.get.mockResolvedValue({ data: payload } as any);

        const result = await educationService.getTutorStatus();

        expect(mockedAxios.get).toHaveBeenCalledWith(
            `${API_PATH}/education/tutor/status`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer test-token',
                },
            },
        );
        expect(result).toEqual(payload);
    });

    it('calls tutorTurn endpoint with auth headers', async () => {
        const payload = {
            reply: 'test reply',
            assistant_context: { domains: ['education'], sources: [], confidence: 0.7 },
            weak_topics: [],
            model: { selected: 'deepseek/deepseek-chat', route: 'fast', fallbackUsed: false },
        };
        mockedAxios.post.mockResolvedValue({ data: payload } as any);

        const request = { message: 'Explain recursion' };
        const result = await educationService.tutorTurn(request);

        expect(mockedAxios.post).toHaveBeenCalledWith(
            `${API_PATH}/education/tutor/turn`,
            request,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer test-token',
                },
            },
        );
        expect(result).toEqual(payload);
    });

    it('calls getTutorWeakTopics endpoint with auth headers', async () => {
        const payload = {
            items: [{ topicKey: 'recursion', topicLabel: 'Recursion', mastery: 0.3, lastSeenAt: '2026-02-17T10:00:00Z', source: 'exam' }],
        };
        mockedAxios.get.mockResolvedValue({ data: payload } as any);

        const result = await educationService.getTutorWeakTopics();

        expect(mockedAxios.get).toHaveBeenCalledWith(
            `${API_PATH}/education/tutor/weak-topics`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer test-token',
                },
            },
        );
        expect(result).toEqual(payload);
    });

    it('calls clearTutorMemory endpoint with scope', async () => {
        const payload = { deleted: { memoryDocs: 2, weakTopicDocs: 1, weakTopics: 1 } };
        mockedAxios.delete.mockResolvedValue({ data: payload } as any);

        const result = await educationService.clearTutorMemory('all');

        expect(mockedAxios.delete).toHaveBeenCalledWith(
            `${API_PATH}/education/tutor/memory`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer test-token',
                },
                params: { scope: 'all' },
            },
        );
        expect(result).toEqual(payload);
    });
});
