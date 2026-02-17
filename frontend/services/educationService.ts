import axios from 'axios';
import { API_PATH } from '../config/api.config';
import { 
    EducationCourse, 
    EducationModule, 
    ExamQuestion, 
    UserExamAttempt,
    TutorTurnRequest,
    TutorTurnResponse,
    TutorWeakTopicsResponse,
    TutorMemoryScope,
    TutorMemoryClearResponse,
    TutorStatusResponse,
} from '../types/education';
import { getGodModeQueryParams } from './godModeService';
import { getAccessToken } from './authSessionService';

class EducationService {
    private async getHeaders() {
        const token = await getAccessToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        return headers;
    }

    // Public Course List
    async getCourses(organization?: string): Promise<EducationCourse[]> {
        try {
            const godModeParams = await getGodModeQueryParams();
            const params = { ...(organization ? { organization } : {}), ...godModeParams };
            const response = await axios.get(`${API_PATH}/education/courses`, { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching courses:', error);
            throw error;
        }
    }

    // Public Course Details
    async getCourseDetails(id: number): Promise<EducationCourse> {
        try {
            const response = await axios.get(`${API_PATH}/education/courses/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching course ${id}:`, error);
            throw error;
        }
    }

    // Protected: Get Module Exams
    async getModuleExams(moduleId: number): Promise<ExamQuestion[]> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_PATH}/education/modules/${moduleId}/exams`, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error fetching exams for module ${moduleId}:`, error);
            throw error;
        }
    }

    // Protected: Submit Exam
    async submitExam(moduleId: number, answers: Record<number, number>): Promise<UserExamAttempt> {
        try {
            const headers = await this.getHeaders();
            // Convert Record<number, number> to Record<string, number> for JSON compatibility if needed, 
            // but JS objects work with numeric keys too.
            const response = await axios.post(`${API_PATH}/education/modules/${moduleId}/submit`, { answers }, { headers });
            return response.data;
        } catch (error) {
            console.error(`Error submitting exam for module ${moduleId}:`, error);
            throw error;
        }
    }

    // Protected: AI Tutor Turn
    async tutorTurn(payload: TutorTurnRequest): Promise<TutorTurnResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.post(`${API_PATH}/education/tutor/turn`, payload, { headers });
            return response.data;
        } catch (error) {
            console.error('Error executing AI tutor turn:', error);
            throw error;
        }
    }

    // Protected: AI Tutor feature status
    async getTutorStatus(): Promise<TutorStatusResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_PATH}/education/tutor/status`, { headers });
            return response.data;
        } catch (error) {
            console.error('Error fetching AI tutor status:', error);
            throw error;
        }
    }

    // Protected: AI Tutor weak topics snapshot
    async getTutorWeakTopics(): Promise<TutorWeakTopicsResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.get(`${API_PATH}/education/tutor/weak-topics`, { headers });
            return response.data;
        } catch (error) {
            console.error('Error fetching AI tutor weak topics:', error);
            throw error;
        }
    }

    // Protected: AI Tutor memory cleanup
    async clearTutorMemory(scope: TutorMemoryScope = 'all'): Promise<TutorMemoryClearResponse> {
        try {
            const headers = await this.getHeaders();
            const response = await axios.delete(`${API_PATH}/education/tutor/memory`, {
                headers,
                params: { scope },
            });
            return response.data;
        } catch (error) {
            console.error('Error clearing AI tutor memory:', error);
            throw error;
        }
    }
}

export const educationService = new EducationService();
