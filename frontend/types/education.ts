export interface EducationCourse {
    ID: number;
    title: string;
    description: string;
    organization: string;
    image_url?: string;
    is_published: boolean;
    scripture_book_id?: number;
    modules?: EducationModule[];
}

export interface EducationModule {
    ID: number;
    course_id: number;
    title: string;
    description: string;
    order: number;
    questions?: ExamQuestion[];
}

export interface ExamQuestion {
    ID: number;
    module_id: number;
    text: string;
    type: 'multiple_choice' | 'boolean';
    organization?: string;
    verse_reference?: string;
    points: number;
    options: AnswerOption[];
}

export interface AnswerOption {
    ID: number;
    question_id: number;
    text: string;
    is_correct?: boolean; // Usually hidden from client, but returned in submit result
    explanation?: string;
}

export interface UserExamAttempt {
    ID: number;
    user_id: number;
    module_id: number;
    score: number;
    total_points: number;
    passed: boolean;
    completed_at: string;
}

export interface UserModuleProgress {
    user_id: number;
    module_id: number;
    status: 'not_started' | 'in_progress' | 'completed';
    progress_percent: number;
    last_accessed_at: string;
}
