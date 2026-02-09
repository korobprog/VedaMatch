import axios from 'axios';
import { API_PATH } from '../config/api.config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
    EducationCourse, 
    EducationModule, 
    ExamQuestion, 
    UserExamAttempt 
} from '../types/education';
import { getGodModeQueryParams } from './godModeService';

class EducationService {
    private async getHeaders() {
        let token = await AsyncStorage.getItem('token');
        if (!token || token === 'undefined' || token === 'null') {
            token = await AsyncStorage.getItem('userToken');
        }

        const authHeader = (token && token !== 'undefined' && token !== 'null')
            ? `Bearer ${token}`
            : '';

        return {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
        };
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
}

export const educationService = new EducationService();
