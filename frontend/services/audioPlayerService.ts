import TrackPlayer, {
    Capability,
    Event,
    RepeatMode,
    State,
    usePlaybackState,
    useProgress,
    Track,
} from 'react-native-track-player';
import { MediaTrack } from './multimediaService';

class AudioPlayerService {
    private isInitialized = false;

    async setup() {
        if (this.isInitialized) return;

        try {
            await TrackPlayer.setupPlayer();
            await TrackPlayer.updateOptions({
                capabilities: [
                    Capability.Play,
                    Capability.Pause,
                    Capability.SkipToNext,
                    Capability.SkipToPrevious,
                    Capability.Stop,
                    Capability.SeekTo,
                ],
                compactCapabilities: [
                    Capability.Play,
                    Capability.Pause,
                    Capability.SkipToNext,
                ],
                notificationCapabilities: [
                    Capability.Play,
                    Capability.Pause,
                    Capability.SkipToNext,
                    Capability.SkipToPrevious,
                    Capability.Stop,
                ],
            });
            this.isInitialized = true;
        } catch (error) {
            console.error('TrackPlayer setup failed:', error);
        }
    }

    async playTrack(track: MediaTrack) {
        await this.setup();

        const formattedTrack: Track = {
            id: String(track.ID),
            url: track.url,
            title: track.title,
            artist: track.artist || 'Неизвестный исполнитель',
            artwork: track.thumbnailUrl || 'https://via.placeholder.com/150',
            duration: track.duration,
        };

        await TrackPlayer.reset();
        await TrackPlayer.add([formattedTrack]);
        await TrackPlayer.play();
    }

    async playRadio(name: string, url: string, logo?: string) {
        await this.setup();

        const radioTrack: Track = {
            id: 'radio-' + name,
            url: url,
            title: name,
            artist: 'Онлайн Радио',
            artwork: logo || 'https://via.placeholder.com/150',
            isLiveStream: true,
        };

        await TrackPlayer.reset();
        await TrackPlayer.add([radioTrack]);
        await TrackPlayer.play();
    }

    async pause() {
        await TrackPlayer.pause();
    }

    async resume() {
        await TrackPlayer.play();
    }

    async stop() {
        await TrackPlayer.stop();
    }

    async seekTo(seconds: number) {
        await TrackPlayer.seekTo(seconds);
    }
}

export const audioPlayerService = new AudioPlayerService();

// Playback Service for background tasks (must be registered in index.js)
export const PlaybackService = async function () {
    TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
    TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
    TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.destroy());
    TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
    TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
};
