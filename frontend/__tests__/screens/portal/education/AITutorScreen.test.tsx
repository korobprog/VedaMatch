import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { AITutorScreen } from '../../../../screens/portal/education/AITutorScreen';
import { educationService } from '../../../../services/educationService';

jest.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const dict: Record<string, string> = {
                'common.loading': 'Загрузка...',
                'common.error': 'Ошибка',
                'common.success': 'Успешно',
                'common.cancel': 'Отмена',
                'education.aiTutor.title': 'AI Tutor',
                'education.aiTutor.subtitle': 'Описание',
                'education.aiTutor.weakTopicsTitle': 'Слабые темы',
                'education.aiTutor.noWeakTopics': 'Нет слабых тем',
                'education.aiTutor.emptyTitle': 'Начните диалог',
                'education.aiTutor.emptySubtitle': 'Подсказка',
                'education.aiTutor.inputPlaceholder': 'Введите вопрос',
                'education.aiTutor.clearMemoryTitle': 'Очистить память',
                'education.aiTutor.clearMemoryDescription': 'Описание очистки',
                'education.aiTutor.clearMemoryAction': 'Очистить',
                'education.aiTutor.memoryCleared': 'Память очищена',
                'education.aiTutor.disabledTitle': 'AI Tutor временно недоступен',
                'education.aiTutor.disabledSubtitle': 'Функция выключена',
                'chat.sourcesTitle': 'Источники',
            };
            return dict[key] || key;
        },
    }),
}));

jest.mock('../../../../context/SettingsContext', () => ({
    useSettings: () => ({ isDarkMode: false }),
}));

jest.mock('../../../../context/UserContext', () => ({
    useUser: () => ({ user: { role: 'devotee' } }),
}));

jest.mock('../../../../hooks/useRoleTheme', () => ({
    useRoleTheme: () => ({
        colors: {
            background: '#fff',
            surfaceElevated: '#f5f5f5',
            border: '#ddd',
            textPrimary: '#111',
            textSecondary: '#666',
            accent: '#f97316',
            accentSoft: '#ffe8d6',
        },
    }),
}));

jest.mock('../../../../hooks/usePressFeedback', () => ({
    usePressFeedback: () => jest.fn(),
}));

jest.mock('../../../../services/educationService', () => ({
    educationService: {
        getTutorStatus: jest.fn(),
        getTutorWeakTopics: jest.fn(),
        tutorTurn: jest.fn(),
        clearTutorMemory: jest.fn(),
    },
}));

jest.mock('../../../../services/ragService', () => ({
    ragService: {
        getSourceById: jest.fn(),
    },
}));

describe('AITutorScreen', () => {
    const mockedService = educationService as jest.Mocked<typeof educationService>;

    beforeEach(() => {
        jest.clearAllMocks();
        (global as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0);
        mockedService.getTutorStatus.mockResolvedValue({ enabled: true } as any);
        mockedService.getTutorWeakTopics.mockResolvedValue({
            items: [
                {
                    topicKey: 'recursion',
                    topicLabel: 'Рекурсия',
                    mastery: 0.32,
                    lastSeenAt: '2026-02-17T10:00:00Z',
                    source: 'exam',
                },
            ],
        } as any);
    });

    it('renders tutor reply with sources and supports memory cleanup', async () => {
        mockedService.tutorTurn.mockResolvedValue({
            reply: 'Рекурсия это функция, которая вызывает саму себя.',
            assistant_context: {
                domains: ['education'],
                confidence: 0.82,
                sources: [
                    {
                        id: 'source-1',
                        domain: 'education',
                        sourceType: 'module',
                        sourceId: '12',
                        title: 'Модуль: Рекурсия',
                        snippet: 'Описание модуля',
                    },
                ],
            },
            weak_topics: [],
            model: {
                selected: 'deepseek/deepseek-chat',
                route: 'fast',
                fallbackUsed: false,
            },
        } as any);
        mockedService.clearTutorMemory.mockResolvedValue({
            deleted: { memoryDocs: 1, weakTopicDocs: 1, weakTopics: 1 },
        } as any);

        const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title: any, message: any, buttons?: any) => {
            if (title === 'Очистить память' && Array.isArray(buttons)) {
                const destructive = buttons.find((btn: any) => btn.style === 'destructive');
                destructive?.onPress?.();
            }
        });

        const { getByTestId, getByText } = render(<AITutorScreen />);

        await waitFor(() => {
            expect(getByText('Слабые темы')).toBeTruthy();
        });

        fireEvent.changeText(getByTestId('ai-tutor-input'), 'Что такое рекурсия?');
        fireEvent.press(getByTestId('ai-tutor-send'));

        await waitFor(() => {
            expect(getByText('Рекурсия это функция, которая вызывает саму себя.')).toBeTruthy();
            expect(getByText('Источники')).toBeTruthy();
        });

        fireEvent.press(getByTestId('ai-tutor-clear-memory'));

        await waitFor(() => {
            expect(mockedService.clearTutorMemory).toHaveBeenCalledWith('all');
        });

        alertSpy.mockRestore();
    });

    it('renders disabled state when tutor feature is off', async () => {
        mockedService.getTutorStatus.mockResolvedValue({ enabled: false } as any);

        const { getByText, queryByTestId } = render(<AITutorScreen />);

        await waitFor(() => {
            expect(getByText('AI Tutor временно недоступен')).toBeTruthy();
        });

        expect(queryByTestId('ai-tutor-send')).toBeNull();
    });
});
