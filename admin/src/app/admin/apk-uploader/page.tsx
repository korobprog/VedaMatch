'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, File, CheckCircle, XCircle, Copy, Download, Trash2, AlertCircle, Smartphone } from 'lucide-react';
import apkService, { type ApkFileInfo } from '@/lib/apkService';
import { useToast } from '@/components/ui/ToastProvider';

export default function ApkUploaderPage() {
    const { showToast } = useToast();
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [apkFiles, setApkFiles] = useState<ApkFileInfo[]>([]);
    const [loadingFiles, setLoadingFiles] = useState(true);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load APK files on mount
    useEffect(() => {
        loadApkFiles();
    }, []);

    const loadApkFiles = async () => {
        try {
            setLoadingFiles(true);
            const response = await apkService.listApk();
            setApkFiles(response.files.sort((a, b) => 
                new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
            ));
        } catch (error) {
            console.error('Failed to load APK files:', error);
            showToast('Ошибка загрузки списка файлов', 'error');
        } finally {
            setLoadingFiles(false);
        }
    };

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.name.endsWith('.apk')) {
                uploadFile(file);
            } else {
                showToast('Пожалуйста, загрузите файл .apk', 'error');
            }
        }
    }, []);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            uploadFile(e.target.files[0]);
        }
    };

    const uploadFile = async (file: File) => {
        // Validate file size (max 200MB)
        if (file.size > 200 * 1024 * 1024) {
            showToast('Размер файла не должен превышать 200MB', 'error');
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            const response = await apkService.uploadApk(file, setUploadProgress);
            
            showToast(`APK успешно загружен: ${response.filename}`, 'success');
            
            // Reload file list
            await loadApkFiles();
            
            // Reset form
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error: any) {
            console.error('Upload failed:', error);
            const message = error?.response?.data?.error || 'Ошибка загрузки файла';
            showToast(message, 'error');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleCopyLink = async (url: string, filename: string) => {
        const success = await apkService.copyToClipboard(url);
        if (success) {
            showToast('Ссылка скопирована в буфер', 'success');
        } else {
            showToast('Не удалось скопировать ссылку', 'error');
        }
    };

    const handleDownload = (url: string, filename: string) => {
        apkService.downloadApk(url, filename);
        showToast('Загрузка началась...', 'success');
    };

    const handleDelete = async (filename: string) => {
        if (!confirm(`Вы уверены, что хотите удалить ${filename}?`)) {
            return;
        }

        try {
            await apkService.deleteApk(filename);
            showToast('Файл успешно удален', 'success');
            await loadApkFiles();
        } catch (error: any) {
            console.error('Delete failed:', error);
            const message = error?.response?.data?.error || 'Ошибка удаления файла';
            showToast(message, 'error');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <Smartphone className="w-8 h-8 text-blue-600" />
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            APK Uploader
                        </h1>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                        Загрузка и управление APK файлами для тестировщиков
                    </p>
                </div>

                {/* Upload Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                        Загрузить новый APK
                    </h2>

                    {/* Drag & Drop Zone */}
                    <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                            dragActive
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-gray-300 dark:border-gray-600 hover:border-blue-400'
                        }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-lg mb-2 text-gray-700 dark:text-gray-300">
                            Перетащите APK файл сюда или нажмите для выбора
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            Максимальный размер: 200MB
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".apk"
                            onChange={handleFileInput}
                            className="hidden"
                            id="apk-upload"
                        />
                        <label
                            htmlFor="apk-upload"
                            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors"
                        >
                            Выбрать файл
                        </label>
                    </div>

                    {/* Upload Progress */}
                    {uploading && (
                        <div className="mt-4">
                            <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Загрузка...
                                </span>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {uploadProgress}%
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                <div
                                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* APK Files List */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                        Загруженные APK файлы
                    </h2>

                    {loadingFiles ? (
                        <div className="text-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="mt-2 text-gray-600 dark:text-gray-400">Загрузка...</p>
                        </div>
                    ) : apkFiles.length === 0 ? (
                        <div className="text-center py-8">
                            <File className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                            <p className="text-gray-600 dark:text-gray-400">
                                Нет загруженных APK файлов
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {apkFiles.map((file) => (
                                <div
                                    key={file.filename}
                                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-400 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3 flex-1">
                                            <File className="w-6 h-6 text-blue-600 mt-1" />
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-900 dark:text-white">
                                                    {file.filename}
                                                </h3>
                                                <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-600 dark:text-gray-400">
                                                    <span>Версия: {file.version || 'N/A'}</span>
                                                    <span>•</span>
                                                    <span>Размер: {apkService.formatFileSize(file.size)}</span>
                                                    <span>•</span>
                                                    <span>Загружен: {apkService.formatDate(file.uploadedAt)}</span>
                                                </div>
                                                <div className="mt-2 text-xs text-gray-500 dark:text-gray-500 break-all">
                                                    {file.url}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 ml-4">
                                            <button
                                                onClick={() => handleCopyLink(file.url, file.filename)}
                                                className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="Копировать ссылку"
                                            >
                                                <Copy className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDownload(file.url, file.filename)}
                                                className="p-2 text-gray-600 dark:text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                                title="Скачать"
                                            >
                                                <Download className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(file.filename)}
                                                className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Удалить"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Instructions */}
                <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        Инструкция для тестировщиков:
                    </h3>
                    <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800 dark:text-blue-200">
                        <li>Скачайте APK файл по ссылке выше</li>
                        <li>Разрешите установку из неизвестных источников в настройках Android</li>
                        <li>Откройте скачанный файл и подтвердите установку</li>
                        <li>Запустите приложение и протестируйте функциональность</li>
                        <li>Отправьте отзыв через форму обратной связи в приложении</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}
