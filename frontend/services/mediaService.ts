import {
	Asset,
	ImagePickerResponse,
	launchImageLibrary,
	launchCamera,
} from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import AudioRecorderPlayer, {
	AudioEncoderAndroidType,
	AudioSourceAndroidType,
	AVEncoderAudioQualityIOSType,
	AVEncodingOption,
	OutputFormatAndroidType,
} from 'react-native-audio-recorder-player';
import { API_PATH } from '../config/api.config';
import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { AxiosError } from 'axios';
import apiClient from '../lib/apiClient';
import i18n from '../i18n';
import { getAccessToken, isOfflineDevAccessToken } from './authSessionService';

export interface MediaFile {
	uri: string;
	type: 'image' | 'audio' | 'document' | 'video_circle';
	name: string;
	size: number;
	mimeType?: string;
	duration?: number;
}

export interface Message {
	ID?: number;
	id?: string;
	content: string;
	senderId: number;
	recipientId?: number;
	roomId?: number;
	type: 'text' | 'image' | 'audio' | 'document' | 'video_circle' | 'contact_card';
	fileName?: string;
	fileSize?: number;
	mimeType?: string;
	duration?: number;
	thumbnail?: string;
	mapData?: Record<string, unknown> | null;
	CreatedAt?: string;
}

const audioRecorderPlayer = new AudioRecorderPlayer();
let lastDuration = 0;
const MAX_VIDEO_CIRCLE_DURATION_SEC = 60;
const MAX_VIDEO_CIRCLE_FILE_SIZE_BYTES = 64 * 1024 * 1024;

type MediaLanguage = 'ru' | 'en' | 'hi';

function getMediaLanguage(): MediaLanguage {
	const lower = String(i18n.language || '').trim().toLowerCase();
	if (lower.startsWith('ru')) return 'ru';
	if (lower.startsWith('hi')) return 'hi';
	return 'en';
}

function getMediaCopy() {
	const language = getMediaLanguage();
	if (language === 'ru') {
		return {
			videoNotFound: 'Видео не найдено',
			fileTooLarge: 'Файл слишком большой. Максимум 64 MB',
			videoCircleTooLong: 'Длительность видеокружка должна быть до 60 секунд',
			microphonePermissionTitle: 'Разрешение на микрофон',
			microphonePermissionMessage: 'Приложению нужен доступ к микрофону для записи аудиосообщений.',
			cameraPermissionTitle: 'Разрешение на камеру',
			cameraPermissionMessage: 'Приложению нужен доступ к камере, чтобы делать фото.',
			askLater: 'Позже',
			cancel: 'Отмена',
			ok: 'OK',
			uploadFailed: 'Не удалось загрузить файл',
			invalidVideoCircleMediaType: 'Неверный тип файла для видеокружка',
			videoFileMissingBeforeUpload: 'Видео-файл не найден перед отправкой',
		};
	}
	if (language === 'hi') {
		return {
			videoNotFound: 'वीडियो नहीं मिला',
			fileTooLarge: 'फ़ाइल बहुत बड़ी है। अधिकतम 64 MB',
			videoCircleTooLong: 'वीडियो सर्कल की अवधि 60 सेकंड से कम होनी चाहिए',
			microphonePermissionTitle: 'माइक्रोफ़ोन अनुमति',
			microphonePermissionMessage: 'ऑडियो संदेश रिकॉर्ड करने के लिए ऐप को माइक्रोफ़ोन की अनुमति चाहिए।',
			cameraPermissionTitle: 'कैमरा अनुमति',
			cameraPermissionMessage: 'फ़ोटो लेने के लिए ऐप को कैमरा अनुमति चाहिए।',
			askLater: 'बाद में पूछें',
			cancel: 'रद्द करें',
			ok: 'ठीक है',
			uploadFailed: 'फ़ाइल अपलोड नहीं हो सकी',
			invalidVideoCircleMediaType: 'वीडियो सर्कल के लिए अमान्य फ़ाइल प्रकार',
			videoFileMissingBeforeUpload: 'भेजने से पहले वीडियो फ़ाइल नहीं मिली',
		};
	}
	return {
		videoNotFound: 'Video not found',
		fileTooLarge: 'File is too large. Maximum 64 MB',
		videoCircleTooLong: 'Video circle must be 60 seconds or less',
		microphonePermissionTitle: 'Microphone Permission',
		microphonePermissionMessage: 'This app needs access to your microphone to record audio messages.',
		cameraPermissionTitle: 'Camera Permission',
		cameraPermissionMessage: 'This app needs camera access to take photos.',
		askLater: 'Ask Me Later',
		cancel: 'Cancel',
		ok: 'OK',
		uploadFailed: 'Failed to upload file',
		invalidVideoCircleMediaType: 'Invalid file type for video circle',
		videoFileMissingBeforeUpload: 'Video file was not found before sending',
	};
}

function createRecorderConfig() {
	const isIOS = Platform.OS === 'ios';
	const path = isIOS
		? 'DEFAULT'
		: `${RNFS.CachesDirectoryPath}/voice_${Date.now()}.mp4`;

	const audioSet = isIOS
		? {
			AVFormatIDKeyIOS: AVEncodingOption.aac,
			AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
			AVSampleRateKeyIOS: 44100,
			AVNumberOfChannelsKeyIOS: 1,
		}
		: {
			AudioSourceAndroid: AudioSourceAndroidType.MIC,
			OutputFormatAndroid: OutputFormatAndroidType.MPEG_4,
			AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
			AudioSamplingRateAndroid: 44100,
			AudioEncodingBitRateAndroid: 128000,
			AudioChannelsAndroid: 1,
		};

	return { path, audioSet };
}

function getUploadError(error: unknown, fallback: string): string {
	const axiosError = error as AxiosError<any>;
	const payload = axiosError?.response?.data;
	if (typeof payload === 'string' && payload.trim()) {
		return payload;
	}
	if (payload && typeof payload === 'object') {
		const message = payload.error || payload.message;
		if (message && typeof message === 'string') {
			return message;
		}
	}
	return axiosError?.message || fallback;
}

async function uploadMediaWithFetch(formData: FormData): Promise<Message> {
	const token = await getAccessToken();
	const headers: Record<string, string> = {
		Accept: 'application/json',
	};

	if (token && !isOfflineDevAccessToken(token)) {
		headers.Authorization = `Bearer ${token}`;
	}

	const response = await fetch(`${API_PATH}/messages/media`, {
		method: 'POST',
		headers,
		body: formData,
	});

	const rawText = await response.text();
	let payload: any = null;
	if (rawText) {
		try {
			payload = JSON.parse(rawText);
		} catch {
			payload = rawText;
		}
	}

	if (!response.ok) {
		const message =
			(typeof payload === 'object' && (payload?.error || payload?.message)) ||
			(typeof payload === 'string' && payload.trim()) ||
			`HTTP ${response.status}`;
		throw new Error(message);
	}

	return (payload || {}) as Message;
}

function normalizeMediaMimeType(media: MediaFile): string {
	const explicitRaw = (media.mimeType || '').toLowerCase().trim();
	const explicit = explicitRaw.includes(';') ? explicitRaw.split(';')[0].trim() : explicitRaw;
	const name = (media.name || '').toLowerCase();

	if (media.type === 'audio') {
		if (explicit === 'audio/x-m4a' || explicit === 'audio/m4a') return 'audio/mp4';
		if (explicit === 'audio/x-wav') return 'audio/wav';
		if (explicit) return explicit;
		if (name.endsWith('.m4a')) return 'audio/mp4';
		if (name.endsWith('.mp3')) return 'audio/mpeg';
		if (name.endsWith('.wav')) return 'audio/wav';
		if (name.endsWith('.aac')) return 'audio/aac';
		return 'audio/mp4';
	}

	if (media.type === 'image') return explicit || 'image/jpeg';
	if (media.type === 'video_circle') {
		if (explicit) return explicit;
		if (name.endsWith('.mp4')) return 'video/mp4';
		if (name.endsWith('.mov')) return 'video/quicktime';
		if (name.endsWith('.m4v')) return 'video/x-m4v';
		return 'video/mp4';
	}
	if (media.type === 'document') return explicit || 'application/octet-stream';
	return explicit || 'application/octet-stream';
}

function normalizeLocalFilePath(uri: string): string {
	let path = uri || '';
	if (path.startsWith('file://')) {
		path = path.replace('file://', '');
	}
	while (path.startsWith('//')) {
		path = path.slice(1);
	}
	if (!path.startsWith('/')) {
		path = `/${path}`;
	}
	return path;
}

function normalizeVideoDurationSeconds(value?: number | null): number {
	if (!value || Number.isNaN(value)) {
		return 0;
	}
	if (value > 1000) {
		return Math.round(value / 1000);
	}
	return Math.round(value);
}

function normalizeVideoCircleAsset(asset: Asset | undefined): MediaFile {
	const copy = getMediaCopy();
	if (!asset?.uri) {
		throw new Error(copy.videoNotFound);
	}
	const size = Number(asset.fileSize || 0);
	if (size > MAX_VIDEO_CIRCLE_FILE_SIZE_BYTES) {
		throw new Error(copy.fileTooLarge);
	}

	const duration = normalizeVideoDurationSeconds(asset.duration ?? 0);
	if (!duration || duration > MAX_VIDEO_CIRCLE_DURATION_SEC) {
		throw new Error(copy.videoCircleTooLong);
	}

	return {
		uri: asset.uri,
		type: 'video_circle',
		name: asset.fileName || `video_circle_${Date.now()}.mp4`,
		size,
		mimeType: asset.type || 'video/mp4',
		duration,
	};
}

async function requestAudioPermission(): Promise<boolean> {
	if (Platform.OS !== 'android') {
		return true;
	}

	try {
		const copy = getMediaCopy();
		const recordAudioStatus = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
		console.log('Record audio permission status:', recordAudioStatus);

		if (!recordAudioStatus) {
			const granted = await PermissionsAndroid.request(
				PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
				{
					title: copy.microphonePermissionTitle,
					message: copy.microphonePermissionMessage,
					buttonNeutral: copy.askLater,
					buttonNegative: copy.cancel,
					buttonPositive: copy.ok,
				}
			);
			console.log('Record audio permission granted:', granted === PermissionsAndroid.RESULTS.GRANTED);
			return granted === PermissionsAndroid.RESULTS.GRANTED;
		}

		return true;
	} catch (err) {
		console.error('Error requesting audio permission:', err);
		return false;
	}
}

async function requestCameraPermission(): Promise<boolean> {
	if (Platform.OS !== 'android') {
		return true;
	}

	try {
		const copy = getMediaCopy();
		const result = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
		if (result) return true;

		const granted = await PermissionsAndroid.request(
			PermissionsAndroid.PERMISSIONS.CAMERA,
			{
				title: copy.cameraPermissionTitle,
				message: copy.cameraPermissionMessage,
				buttonNeutral: copy.askLater,
				buttonNegative: copy.cancel,
				buttonPositive: copy.ok,
			}
		);
		return granted === PermissionsAndroid.RESULTS.GRANTED;
	} catch (err) {
		console.error('Failed to request camera permission:', err);
		return false;
	}
}

export const mediaService = {
	async takePhoto(): Promise<MediaFile> {
		try {
			const hasPermission = await requestCameraPermission();
			if (!hasPermission) {
				throw new Error('Camera permission denied');
			}

			console.log('📸 Launching camera...');
			const result: ImagePickerResponse = await launchCamera({
				mediaType: 'photo',
				quality: 0.8,
				maxWidth: 1024,
				maxHeight: 1024,
				includeBase64: false,
			});

			if (result.didCancel) {
				console.log('📸 Camera cancelled');
				throw new Error('Cancelled');
			}

			if (result.errorCode) {
				console.error('📸 Camera error:', result.errorMessage);
				throw new Error(result.errorMessage || 'Camera error');
			}

			if (!result.assets || result.assets.length === 0) {
				console.error('📸 No assets returned');
				throw new Error('No image captured');
			}

			const asset: Asset = result.assets[0];
			console.log('📸 Photo captured:', asset.uri);

			return {
				uri: asset.uri || '',
				type: 'image',
				name: asset.fileName || `photo_${Date.now()}.jpg`,
				size: asset.fileSize || 0,
				mimeType: asset.type || 'image/jpeg',
			};
		} catch (error) {
			console.error('📸 takePhoto error:', error);
			if (error instanceof Error && error.message === 'Cancelled') {
				throw error;
			}
			throw error;
		}
	},

	async pickImage(): Promise<MediaFile> {
		try {
			const result: ImagePickerResponse = await launchImageLibrary({
				mediaType: 'photo',
				quality: 0.8,
				maxWidth: 1024,
				maxHeight: 1024,
				includeBase64: false,
			});

			if (result.didCancel || !result.assets || result.assets.length === 0) {
				throw new Error('Cancelled');
			}

			const asset: Asset = result.assets[0];
			return {
				uri: asset.uri || '',
				type: 'image',
				name: asset.fileName || `photo_${Date.now()}.jpg`,
				size: asset.fileSize || 0,
				mimeType: asset.type || 'image/jpeg',
			};
		} catch (error) {
			if (error instanceof Error && error.message === 'Cancelled') {
				throw error;
			}
			throw new Error('Failed to pick image');
		}
	},

	async pickVideoCircle(): Promise<MediaFile> {
		try {
			const result: ImagePickerResponse = await launchImageLibrary({
				mediaType: 'video',
				videoQuality: 'medium',
				selectionLimit: 1,
			});

			if (result.didCancel || !result.assets || result.assets.length === 0) {
				throw new Error('Cancelled');
			}

			return normalizeVideoCircleAsset(result.assets[0]);
		} catch (error) {
			if (error instanceof Error && error.message === 'Cancelled') {
				throw error;
			}
			throw error instanceof Error ? error : new Error('Failed to pick video circle');
		}
	},

	async recordVideoCircle(): Promise<MediaFile> {
		try {
			const hasPermission = await requestCameraPermission();
			if (!hasPermission) {
				throw new Error('Camera permission denied');
			}

			const result: ImagePickerResponse = await launchCamera({
				mediaType: 'video',
				videoQuality: 'medium',
				durationLimit: MAX_VIDEO_CIRCLE_DURATION_SEC,
			});

			if (result.didCancel || !result.assets || result.assets.length === 0) {
				throw new Error('Cancelled');
			}

			return normalizeVideoCircleAsset(result.assets[0]);
		} catch (error) {
			if (error instanceof Error && error.message === 'Cancelled') {
				throw error;
			}
			throw error instanceof Error ? error : new Error('Failed to record video circle');
		}
	},

	async pickDocument(): Promise<MediaFile> {
		try {
			const result: any = await DocumentPicker.pick({
				type: [
					DocumentPicker.types.pdf,
					DocumentPicker.types.doc,
					DocumentPicker.types.docx,
					DocumentPicker.types.xls,
					DocumentPicker.types.xlsx,
				],
			});

			if (!result || (Array.isArray(result) && result.length === 0)) {
				throw new Error('No file selected');
			}

			const doc = Array.isArray(result) ? result[0] : result;
			return {
				uri: doc.uri,
				type: 'document',
				name: doc.name || `document_${Date.now()}`,
				size: doc.size || 0,
				mimeType: doc.type || 'application/octet-stream',
			};
		} catch (error: any) {
			if (DocumentPicker.isCancel(error)) {
				throw new Error('Cancelled');
			}
			throw new Error('Failed to pick document');
		}
	},

	async startRecording(): Promise<void> {
		try {
			const hasPermission = await requestAudioPermission();
			if (!hasPermission) {
				console.error('❌ Microphone permission denied');
				throw new Error('Microphone permission denied');
			}

			console.log('✅ Starting audio recording...');
			lastDuration = 0;
			const { path, audioSet } = createRecorderConfig();
			const result = await audioRecorderPlayer.startRecorder(path, audioSet as any, true);
			console.log('✅ Recording started, result:', result);

			audioRecorderPlayer.addRecordBackListener((e) => {
				lastDuration = e.currentPosition;
			});
		} catch (error) {
			console.error('❌ Failed to start recording:', error);
			throw new Error('Failed to start recording: ' + (error as Error).message);
		}
	},

	async stopRecording(): Promise<MediaFile> {
		try {
			console.log('🛑 Stopping audio recording...');

			const rawUri = await audioRecorderPlayer.stopRecorder();
			if (!rawUri || rawUri === 'Already stopped') {
				throw new Error('Recording session is not active');
			}
			console.log('✅ Recording stopped, URI:', rawUri);

			audioRecorderPlayer.removeRecordBackListener();

			// Clean up URI for file system operations
			// Remove file:// prefix if present
			let path = rawUri;
			if (path.startsWith('file://')) {
				path = path.replace('file://', '');
			}

			// Remove extra leading slashes to ensure we have exactly one leading slash for absolute path
			// e.g. //data/... -> /data/...
			while (path.startsWith('//')) {
				path = path.substring(1);
			}

			// If it doesn't start with /, add it (shouldn't happen on Android usually if it was absolute)
			if (!path.startsWith('/')) {
				path = '/' + path;
			}

			// Check if file exists
			console.log('📁 Checking if file exists:', path);
			const fileExists = await RNFS.exists(path);
			console.log('📁 File exists:', fileExists);

			if (!fileExists) {
				console.error('❌ Audio file not found:', path);
				throw new Error('Audio file not found');
			}

			const fileStats = await RNFS.stat(path);
			const durationSeconds = Math.floor(lastDuration / 1000);

			console.log('📊 Audio file stats:', {
				path: path,
				size: fileStats.size,
				duration: durationSeconds,
			});

			// Verify file is not empty
			if (fileStats.size === 0) {
				console.error('❌ Audio file is empty!');
				throw new Error('Audio file is empty');
			}

			return {
				// Ensure we return a valid file URI for components/upload
				uri: `file://${path}`,
				type: 'audio',
				name: `voice_${Date.now()}.m4a`,
				size: Number(fileStats.size) || 0,
				mimeType: 'audio/mp4',
				duration: durationSeconds,
			};
		} catch (error) {
			console.error('❌ Failed to stop recording:', error);
			throw new Error('Failed to stop recording: ' + (error as Error).message);
		}
	},

	async uploadMedia(
		media: MediaFile,
		senderId: number,
		recipientId?: number,
		roomId?: string
	): Promise<Message> {
		try {
			const formData = new FormData();

			// Ensure URI has file:// prefix for Android if it's a local file path
			let fileUri = media.uri;
			if (Platform.OS === 'android' && !fileUri.startsWith('file://') && !fileUri.startsWith('content://') && !fileUri.startsWith('http')) {
				fileUri = `file://${fileUri}`;
			}

			console.log('📤 Preparing upload for URI:', fileUri);
			const normalizedMimeType = normalizeMediaMimeType(media);
			console.log('📤 Upload mime type:', normalizedMimeType, 'original:', media.mimeType);

			formData.append('file', {
				uri: fileUri,
				type: normalizedMimeType,
				name: media.name,
			} as any);

			formData.append('type', media.type);
			formData.append('senderId', senderId.toString());

			if (media.duration) {
				formData.append('duration', media.duration.toString());
			}

			if (recipientId) {
				formData.append('recipientId', recipientId.toString());
			}

			if (roomId) {
				formData.append('roomId', roomId);
			}

				if (Platform.OS === 'android' && media.type === 'audio') {
					console.log('📤 Using fetch-based audio upload on Android to avoid axios multipart Network Error');
					return await uploadMediaWithFetch(formData);
				}

				const response = await apiClient.post<Message>('/messages/media', formData, {
					headers: {
						Accept: 'application/json',
					},
				});

				return response.data;
			} catch (error) {
				if (Platform.OS === 'android' && media.type === 'audio') {
					const errorMessage = getUploadError(error, '');
					if (/network error/i.test(errorMessage)) {
						console.warn('⚠️ Axios audio upload failed on Android, retrying with fetch fallback');
						try {
							return await uploadMediaWithFetch(formData);
						} catch (fetchError) {
							console.error('❌ Android fetch audio upload fallback failed:', fetchError);
							throw new Error(getUploadError(fetchError, getMediaCopy().uploadFailed));
						}
					}
				}
				console.error('Failed to upload media:', error);
				throw new Error(getUploadError(error, getMediaCopy().uploadFailed));
			}
		},

	async uploadVideoCircle(
		media: MediaFile,
		recipientId?: number,
		roomId?: string
	): Promise<Message> {
		const copy = getMediaCopy();
		if (media.type !== 'video_circle') {
			throw new Error(copy.invalidVideoCircleMediaType);
		}

		const duration = Number(media.duration || 0);
		if (!duration || duration > MAX_VIDEO_CIRCLE_DURATION_SEC) {
			throw new Error(copy.videoCircleTooLong);
		}
		if (media.size > MAX_VIDEO_CIRCLE_FILE_SIZE_BYTES) {
			throw new Error(copy.fileTooLarge);
		}

		const mimeType = normalizeMediaMimeType(media);
		const presignResponse = await apiClient.post<{
			uploadUrl: string;
			finalUrl: string;
			objectKey: string;
			expiresInSec: number;
			requiredHeaders?: Record<string, string>;
		}>('/messages/media/presign', {
			recipientId,
			roomId: roomId ? Number(roomId) : undefined,
			type: 'video_circle',
			fileName: media.name,
			mimeType,
			fileSize: media.size,
			durationSec: duration,
		});

		const { uploadUrl, finalUrl, requiredHeaders } = presignResponse.data;
		const filePath = normalizeLocalFilePath(media.uri);
		const fileExists = await RNFS.exists(filePath);
		if (!fileExists) {
			throw new Error(copy.videoFileMissingBeforeUpload);
		}

		const uploadResult = await RNFS.uploadFiles({
			toUrl: uploadUrl,
			files: [
				{
					name: 'file',
					filename: media.name,
					filepath: filePath,
					filetype: mimeType,
				},
			],
			method: 'PUT',
			headers: {
				'Content-Type': mimeType,
				...(requiredHeaders || {}),
			},
			binaryStreamOnly: true,
		}).promise;

		if (uploadResult.statusCode < 200 || uploadResult.statusCode >= 300) {
			throw new Error(`CDN upload failed with status ${uploadResult.statusCode}`);
		}

		const finalizeResponse = await apiClient.post<Message>('/messages/media/finalize', {
			recipientId,
			roomId: roomId ? Number(roomId) : undefined,
			type: 'video_circle',
			content: finalUrl,
			fileName: media.name,
			fileSize: media.size,
			mimeType,
			duration,
		});

		return finalizeResponse.data;
	},

	getDownloadUrl(url: string): string {
		if (url.startsWith('http')) {
			return url;
		}
		const baseUrl = API_PATH.replace('/api', '');
		return `${baseUrl}${url}`;
	},

	formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
	},

	formatDuration(seconds: number): string {
		if (seconds < 60) {
			return `${seconds}s`;
		}
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	},
};
