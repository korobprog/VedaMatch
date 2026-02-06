import TrackPlayer, {
    Capability,
    Event,
    RepeatMode,
    State,
    usePlaybackState,
    useProgress,
    Track,
    AppKilledPlaybackBehavior,
    TrackType,
} from 'react-native-track-player';
import { MediaTrack } from './multimediaService';

class AudioPlayerService {
    private isInitialized = false;

    async setup() {
        if (this.isInitialized) return;

        try {
            await TrackPlayer.setupPlayer({
                autoHandleDeviceAppearance: true,
            });

            await TrackPlayer.updateOptions({
                android: {
                    appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
                    alwaysPauseOnInterruption: true,
                },
                capabilities: [
                    Capability.Play,
                    Capability.Pause,
                    Capability.SkipToNext,
                    Capability.SkipToPrevious,
                    Capability.Stop,
                ],
                compactCapabilities: [
                    Capability.Play,
                    Capability.Pause,
                    Capability.Stop,
                ],
                notificationCapabilities: [
                    Capability.Play,
                    Capability.Pause,
                    Capability.Stop,
                ],
            });

            // Set global listeners once
            TrackPlayer.addEventListener(Event.PlaybackError, (error) => {
                console.error('TrackPlayer Native Error:', error.message, 'Code:', error.code);
            });

            TrackPlayer.addEventListener(Event.PlaybackState, (state) => {
                console.log('TrackPlayer State:', state.state);
            });

            this.isInitialized = true;
            console.log('TrackPlayer setup successful');
        } catch (error: any) {
            if (error?.message?.includes('already initialized') || error?.message?.includes('Player has already been setup') || error?.message?.includes('The player has already been initialized via setupPlayer')) {
                this.isInitialized = true;
            } else {
                console.error('TrackPlayer setup failed:', error);
            }
        }
    }

    async playTrack(track: MediaTrack) {
        try {
            await this.setup();
            await TrackPlayer.reset();

            const formattedTrack: Track = {
                id: 'track-' + track.ID,
                url: track.url,
                title: track.title,
                artist: track.artist || 'Неизвестный исполнитель',
                artwork: track.thumbnailUrl || 'https://via.placeholder.com/150',
                duration: track.duration,
                type: TrackType.Default,
                userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
            };

            await TrackPlayer.add([formattedTrack]);
            await TrackPlayer.play();
        } catch (error) {
            console.error('Failed to play track:', error);
        }
    }

    async playRadio(name: string, url: string, logo?: string) {
        try {
            console.log('--- Radio Connection Attempt ---');
            console.log('Name:', name);
            console.log('URL:', url);

            await this.setup();
            await TrackPlayer.reset();

            // Artificial delay to ensure reset is processed by the native side
            await new Promise(resolve => setTimeout(resolve, 300));

            const radioTrack: Track = {
                id: 'radio-' + Date.now(), // Force unique ID to avoid caching issues
                url: url,
                title: name,
                artist: 'Online Radio',
                artwork: logo || 'https://via.placeholder.com/150',
                isLiveStream: true,
                type: TrackType.Default,
                userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
                headers: {
                    'Icy-MetaData': '1',
                    'Connection': 'keep-alive'
                }
            };

            await TrackPlayer.add([radioTrack]);
            await TrackPlayer.play();
        } catch (error) {
            console.error('Radio play initiated error:', error);
        }
    }

    async pause() {
        try { await TrackPlayer.pause(); } catch (e) { }
    }

    async resume() {
        try { await TrackPlayer.play(); } catch (e) { }
    }

    async stop() {
        try { await TrackPlayer.stop(); } catch (e) { }
    }

    async seekTo(seconds: number) {
        try { await TrackPlayer.seekTo(seconds); } catch (e) { }
    }
}

export const audioPlayerService = new AudioPlayerService();

export const PlaybackService = async function () {
    TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
    TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
    TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
};
