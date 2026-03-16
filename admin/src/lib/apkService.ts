import api from './api';

export interface ApkFileInfo {
    filename: string;
    url: string;
    size: number;
    uploadedAt: string;
    version: string;
}

export interface UploadApkResponse {
    success: boolean;
    url: string;
    filename: string;
    size: number;
    version: string;
}

export interface ListApkResponse {
    success: boolean;
    files: ApkFileInfo[];
}

export interface DeleteApkResponse {
    success: boolean;
    message: string;
}

class ApkService {
    /**
     * Upload APK file to S3
     */
    async uploadApk(file: File, onProgress?: (progress: number) => void): Promise<UploadApkResponse> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post('/admin/apk/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percentCompleted);
                }
            },
        });

        return response.data;
    }

    /**
     * List all APK files
     */
    async listApk(): Promise<ListApkResponse> {
        const response = await api.get('/admin/apk/list');
        return response.data;
    }

    /**
     * Delete APK file
     */
    async deleteApk(filename: string): Promise<DeleteApkResponse> {
        const response = await api.delete(`/admin/apk/${filename}`);
        return response.data;
    }

    /**
     * Download APK file
     */
    downloadApk(url: string, filename: string) {
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    /**
     * Copy URL to clipboard
     */
    async copyToClipboard(url: string): Promise<boolean> {
        try {
            await navigator.clipboard.writeText(url);
            return true;
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            return false;
        }
    }

    /**
     * Format file size
     */
    formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Format date
     */
    formatDate(dateString: string): string {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }
}

export default new ApkService();
