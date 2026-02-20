import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { MediaTrack } from './multimediaService';

const OFFLINE_MEDIA_KEY = 'offline_media_tracks';
const OFFLINE_MEDIA_DIR = `${RNFS.DocumentDirectoryPath}/offline_media`;

export interface OfflineMediaTrack {
  trackId: number;
  title: string;
  artist?: string;
  mediaType: 'audio' | 'video';
  localPath: string;
  originalUrl: string;
  thumbnailUrl?: string;
  downloadedAt: string;
  size: number;
}

class MultimediaOfflineService {
  private initialized = false;

  private async ensureDir() {
    if (this.initialized) return;
    const exists = await RNFS.exists(OFFLINE_MEDIA_DIR);
    if (!exists) {
      await RNFS.mkdir(OFFLINE_MEDIA_DIR);
    }
    this.initialized = true;
  }

  async listOfflineTracks(): Promise<OfflineMediaTrack[]> {
    try {
      const raw = await AsyncStorage.getItem(OFFLINE_MEDIA_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async isTrackOffline(trackId: number): Promise<boolean> {
    const items = await this.listOfflineTracks();
    return items.some((item) => item.trackId === trackId);
  }

  async downloadTrack(track: MediaTrack, onProgress?: (progress: number) => void): Promise<OfflineMediaTrack> {
    if (!track?.url || track.url.includes('youtube.com') || track.url.includes('youtu.be')) {
      throw new Error('Offline download is available only for direct media URLs');
    }

    await this.ensureDir();
    const fileExt = track.url.split('.').pop()?.split('?')[0] || (track.mediaType === 'audio' ? 'mp3' : 'mp4');
    const targetPath = `${OFFLINE_MEDIA_DIR}/${track.ID}_${Date.now()}.${fileExt}`;

    const result = RNFS.downloadFile({
      fromUrl: track.url,
      toFile: targetPath,
      progressDivider: 5,
      progress: (res) => {
        if (!onProgress || res.contentLength <= 0) return;
        onProgress(res.bytesWritten / res.contentLength);
      },
    });
    const response = await result.promise;
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(`Failed to download media (${response.statusCode})`);
    }

    const stat = await RNFS.stat(targetPath);
    const saved: OfflineMediaTrack = {
      trackId: track.ID,
      title: track.title,
      artist: track.artist,
      mediaType: track.mediaType,
      localPath: targetPath,
      originalUrl: track.url,
      thumbnailUrl: track.thumbnailUrl,
      downloadedAt: new Date().toISOString(),
      size: Number(stat.size || 0),
    };

    const items = await this.listOfflineTracks();
    const deduped = items.filter((item) => item.trackId !== track.ID);
    deduped.push(saved);
    await AsyncStorage.setItem(OFFLINE_MEDIA_KEY, JSON.stringify(deduped));
    return saved;
  }

  async removeOfflineTrack(trackId: number): Promise<void> {
    const items = await this.listOfflineTracks();
    const target = items.find((item) => item.trackId === trackId);
    if (target && (await RNFS.exists(target.localPath))) {
      await RNFS.unlink(target.localPath);
    }
    const next = items.filter((item) => item.trackId !== trackId);
    await AsyncStorage.setItem(OFFLINE_MEDIA_KEY, JSON.stringify(next));
  }
}

export const multimediaOfflineService = new MultimediaOfflineService();

