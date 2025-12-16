import axios from 'axios';

const N8N_WEBHOOK_URL = 'https://n8n.vedamatch.com/webhook/register';

export interface ProfileData {
  email?: string;
  country: string;
  city: string;
  karmicName: string;
  spiritualName?: string;
  dob: string;
  madh?: string;
  mentor?: string;
  gender: string;
  identity: string;
  diet: string;
}

/**
 * Отправляет данные профиля в n8n webhook для сохранения в БД и обработки в RAG системе
 * @param profileData Данные профиля пользователя
 * @returns Результат выполнения запроса
 */
export const submitProfileToN8n = async (profileData: ProfileData): Promise<any> => {
  try {
    const response = await axios.post(N8N_WEBHOOK_URL, profileData, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 секунд таймаут
    });
    return response.data;
  } catch (error: any) {
    console.error('Error submitting profile to n8n:', error);
    
    if (error.response) {
      // Сервер ответил с кодом ошибки
      const status = error.response.status;
      const message = error.response.data?.message || error.response.data?.error || 'Unknown error';
      throw new Error(`Ошибка сервера (${status}): ${message}`);
    } else if (error.request) {
      // Запрос был отправлен, но ответа не получено
      throw new Error('Нет соединения с сервером n8n. Проверьте подключение к интернету.');
    } else {
      // Ошибка при настройке запроса
      throw new Error(`Ошибка запроса: ${error.message}`);
    }
  }
};

