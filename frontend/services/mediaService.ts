import ImagePicker, {
	Asset,
	ImagePickerResponse,
	launchImageLibrary,
	launchCamera,
} from 'react-native-image-picker';
import DocumentPicker, {
	DocumentPickerResponse,
	types,
} from 'react-native-document-picker';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { API_PATH } from '../config/api.config';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import RNFS from 'react-native-fs';

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

async function requestAudioPermission(): Promise<boolean> {
	if (Platform.OS !== 'android') {
		return true;
	}

	try {
		const granted = await PermissionsAndroid.request(
			PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
			{
				title: 'Microphone Permission',
				message: 'This app needs access to your microphone to record audio.',
				buttonNeutral: 'Ask Me Later',
				buttonNegative: 'Cancel',
				buttonPositive: 'OK',
			}
		);
		return granted === PermissionsAndroid.RESULTS.GRANTED;
	} catch (err) {
		console.error(err);
		return false;
	}
}

export const mediaService = {
	async takePhoto(): Promise<MediaFile> {
		try {
			const result: ImagePickerResponse = await launchCamera({
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
			throw new Error('Failed to take photo');
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
				throw new Error('Microphone permission denied');
			}
			await audioRecorderPlayer.startRecorder();
			audioRecorderPlayer.addRecordBackListener((e) => {
				lastDuration = e.currentPosition;
			});
		} catch (error) {
			console.error('Failed to start recording:', error);
			throw new Error('Failed to start recording');
		}
	},

	async stopRecording(): Promise<MediaFile> {
		try {
			const uri = await audioRecorderPlayer.stopRecorder();
			audioRecorderPlayer.removeRecordBackListener();

			const fileStats = await RNFS.stat(uri.replace('file://', ''));
			const durationSeconds = Math.floor(lastDuration / 1000);

			return {
				uri: uri,
				type: 'audio',
				name: `voice_${Date.now()}.m4a`,
				size: Number(fileStats.size) || 0,
				mimeType: 'audio/mp4',
				duration: durationSeconds,
			};
		} catch (error) {
			console.error('Failed to stop recording:', error);
			throw new Error('Failed to stop recording');
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

			formData.append('file', {
				uri: media.uri,
				type: media.mimeType || 'application/octet-stream',
				name: media.name,
			} as any);

			formData.append('type', media.type);
			formData.append('senderId', senderId.toString());

			if (recipientId) {
				formData.append('recipientId', recipientId.toString());
			}

			if (roomId) {
				formData.append('roomId', roomId);
			}

			const response = await fetch(`${API_PATH}/messages/media`, {
				method: 'POST',
				headers: {
					'Content-Type': 'multipart/form-data',
				},
				body: formData,
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(
					errorData.error || `Upload failed: ${response.statusText}`
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
