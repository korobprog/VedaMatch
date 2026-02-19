import {
	Asset,
	ImagePickerResponse,
	launchImageLibrary,
	launchCamera,
} from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { API_PATH } from '../config/api.config';
import { PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { getAuthHeaders } from './contactService';
import { authorizedFetch } from './authSessionService';

export interface MediaFile {
	uri: string;
	type: 'image' | 'audio' | 'document';
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
	type: 'text' | 'image' | 'audio' | 'document';
	fileName?: string;
	fileSize?: number;
	mimeType?: string;
	duration?: number;
	thumbnail?: string;
	CreatedAt?: string;
}

const audioRecorderPlayer = new AudioRecorderPlayer();
let lastDuration = 0;

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
	if (media.type === 'document') return explicit || 'application/octet-stream';
	return explicit || 'application/octet-stream';
}

async function requestAudioPermission(): Promise<boolean> {
	if (Platform.OS !== 'android') {
		return true;
	}

	try {
		const recordAudioStatus = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
		console.log('Record audio permission status:', recordAudioStatus);

		if (!recordAudioStatus) {
			const granted = await PermissionsAndroid.request(
				PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
				{
					title: 'Microphone Permission',
					message: 'This app needs access to your microphone to record audio messages.',
					buttonNeutral: 'Ask Me Later',
					buttonNegative: 'Cancel',
					buttonPositive: 'OK',
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
		const result = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
		if (result) return true;

		const granted = await PermissionsAndroid.request(
			PermissionsAndroid.PERMISSIONS.CAMERA,
			{
				title: 'Camera Permission',
				message: 'App needs access to your camera to take photos.',
				buttonNeutral: 'Ask Me Later',
				buttonNegative: 'Cancel',
				buttonPositive: 'OK',
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

			const result = await audioRecorderPlayer.startRecorder();
			console.log('✅ Recording started, result:', result);

			audioRecorderPlayer.addRecordBackListener((e) => {
				lastDuration = e.currentPosition;
				console.log('⏱️ Recording duration:', e.currentPosition);
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

			const authHeaders = await getAuthHeaders(false);
			const response = await authorizedFetch(`${API_PATH}/messages/media`, {
				method: 'POST',
				body: formData,
				headers: {
					...authHeaders,
					'Accept': 'application/json',
				},
			});

			if (!response.ok) {
				const errorTxt = await response.text();
				let errorData;
				try {
					errorData = JSON.parse(errorTxt);
				} catch {
					errorData = { error: errorTxt };
				}

				throw new Error(
					errorData.error || `Upload failed: ${response.status} ${response.statusText}`
				);
			}

			return await response.json();
		} catch (error) {
			console.error('Failed to upload media:', error);
			throw error;
		}
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
