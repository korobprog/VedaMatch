import apiClient from '../lib/apiClient';
import {
    EducationCourse,
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

class EducationService {
    // Public Course List
    async getCourses(organization?: string): Promise<EducationCourse[]> {
        try {
            const godModeParams = await getGodModeQueryParams();
            const params = { ...(organization ? { organization } : {}), ...godModeParams };
            const response = await apiClient.get('/education/courses', { params });
            return response.data;
        } catch (error) {
            console.error('Error fetching courses:', error);
            throw error;
        }
    }

    // Public Course Details
    async getCourseDetails(id: number): Promise<EducationCourse> {
        try {
            const response = await apiClient.get(`/education/courses/${id}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching course ${id}:`, error);
            throw error;
        }
    }

    // Protected: Get Module Exams
    async getModuleExams(moduleId: number): Promise<ExamQuestion[]> {
        try {
            const response = await apiClient.get(`/education/modules/${moduleId}/exams`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching exams for module ${moduleId}:`, error);
            throw error;
        }
    }

    // Protected: Submit Exam
    async submitExam(moduleId: number, answers: Record<number, number>): Promise<UserExamAttempt> {
        try {
            const response = await apiClient.post(`/education/modules/${moduleId}/submit`, { answers });
            return response.data;
        } catch (error) {
            console.error(`Error submitting exam for module ${moduleId}:`, error);
            throw error;
        }
    }

    // Protected: AI Tutor Turn
    async tutorTurn(payload: TutorTurnRequest): Promise<TutorTurnResponse> {
        try {
            const response = await apiClient.post('/education/tutor/turn', payload);
            return response.data;
        } catch (error) {
            console.error('Error executing AI tutor turn:', error);
            throw error;
        }
    }

    // Protected: AI Tutor feature status
    async getTutorStatus(): Promise<TutorStatusResponse> {
        try {
            const response = await apiClient.get('/education/tutor/status');
            return response.data;
        } catch (error) {
            console.error('Error fetching AI tutor status:', error);
            throw error;
        }
    }

    // Protected: AI Tutor weak topics snapshot
    async getTutorWeakTopics(): Promise<TutorWeakTopicsResponse> {
        try {
            const response = await apiClient.get('/education/tutor/weak-topics');
            return response.data;
        } catch (error) {
            console.error('Error fetching AI tutor weak topics:', error);
            throw error;
        }
    }

    // Protected: AI Tutor memory cleanup
    async clearTutorMemory(scope: TutorMemoryScope = 'all'): Promise<TutorMemoryClearResponse> {
        try {
            const response = await apiClient.delete('/education/tutor/memory', {
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
