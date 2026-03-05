import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Dimensions,
} from 'react-native';
import Slider from '@react-native-community/slider';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

import { Play, Pause } from 'lucide-react-native';

interface AudioPlayerProps {
	url: string;
	duration?: number;
	isDarkMode: boolean;
	onError?: () => void;
}

type ActiveAudioController = {
	id: string;
	stop: () => Promise<void>;
};

let activeAudioController: ActiveAudioController | null = null;

const claimActiveAudioController = async (next: ActiveAudioController) => {
	if (activeAudioController && activeAudioController.id !== next.id) {
		try {
			await activeAudioController.stop();
		} catch { }
	}
	activeAudioController = next;
};

const releaseActiveAudioController = (id: string) => {
	if (activeAudioController?.id === id) {
		activeAudioController = null;
	}
};

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
	url,
	duration = 0,
	isDarkMode,
	onError,
}) => {
	const audioRecorderPlayerRef = useRef<any>(new AudioRecorderPlayer());
	const playerInstanceIdRef = useRef(`audio_player_${Math.random().toString(36).slice(2)}`);
	const isMountedRef = useRef(true);
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentPosition, setCurrentPosition] = useState(0);
	const [totalDuration, setTotalDuration] = useState(duration > 0 ? duration * 1000 : 0);
	const isLoaded = useRef(false);

	const stopPlayback = useCallback(async (resetPosition: boolean) => {
		if (!audioRecorderPlayerRef.current) return;
		try {
			await audioRecorderPlayerRef.current.stopPlayer();
		} catch { }
		try {
			audioRecorderPlayerRef.current.removePlayBackListener();
		} catch { }
		isLoaded.current = false;
		releaseActiveAudioController(playerInstanceIdRef.current);
		if (isMountedRef.current) {
			setIsPlaying(false);
			if (resetPosition) {
				setCurrentPosition(0);
			}
		}
	}, []);

	useEffect(() => {
		return () => {
			isMountedRef.current = false;
			stopPlayback(false).catch(() => undefined);
		};
	}, [stopPlayback]);

	useEffect(() => {
		if (duration > 0 && totalDuration === 0) {
			setTotalDuration(duration * 1000);
		}
	}, [duration, totalDuration]);

	const formatTime = (ms: number): string => {
		if (!ms || isNaN(ms)) return '0:00';
		const seconds = Math.floor(ms / 1000);
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	const handlePlayPause = async () => {
		try {
			if (isPlaying) {
				await audioRecorderPlayerRef.current.pausePlayer();
				setIsPlaying(false);
				releaseActiveAudioController(playerInstanceIdRef.current);
			} else {
				await claimActiveAudioController({
					id: playerInstanceIdRef.current,
					stop: async () => {
						await stopPlayback(true);
					},
				});

				audioRecorderPlayerRef.current.removePlayBackListener();
				if (!isLoaded.current || currentPosition >= totalDuration) {
					await audioRecorderPlayerRef.current.startPlayer(url);
					isLoaded.current = true;
				} else {
					await audioRecorderPlayerRef.current.resumePlayer();
				}

				audioRecorderPlayerRef.current.addPlayBackListener((e: any) => {
					if (e.currentPosition < 0) return;
					setCurrentPosition(e.currentPosition);
					if (e.duration > 0 && Math.abs(totalDuration - e.duration) > 1000) {
						setTotalDuration(e.duration);
					}
					if (e.currentPosition > 0 && e.duration > 0 && Math.abs(e.currentPosition - e.duration) < 200) {
						stopPlayback(true).catch(() => undefined);
					}
				});
				setIsPlaying(true);
			}
		} catch {
			setIsPlaying(false);
			isLoaded.current = false;
			releaseActiveAudioController(playerInstanceIdRef.current);
			if (onError) onError();
		}
	};

	const handleSliderChange = async (value: number) => {
		if (!audioRecorderPlayerRef.current || !totalDuration) return;
		try {
			const position = Math.floor(value * totalDuration);
			await audioRecorderPlayerRef.current.seekToPlayer(position);
			setCurrentPosition(position);
			if (isPlaying) await audioRecorderPlayerRef.current.resumePlayer();
		} catch { }
	};

	const progress = totalDuration > 0 ? Math.min(Math.max(currentPosition / totalDuration, 0), 1) : 0;
	const accent = isDarkMode ? '#FFB74D' : '#F59E0B';
	const textColor = isDarkMode ? 'rgba(248,250,252,0.9)' : 'rgba(15,23,42,0.9)';
	const mutedTextColor = isDarkMode ? 'rgba(248,250,252,0.6)' : 'rgba(15,23,42,0.6)';
	const maxTrackColor = isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(15, 23, 42, 0.2)';
	const playBtnBg = isDarkMode ? 'rgba(255, 183, 77, 0.18)' : 'rgba(245, 158, 11, 0.18)';

	return (
		<View style={styles.container}>
			<TouchableOpacity
				onPress={handlePlayPause}
				style={[styles.playButton, { backgroundColor: playBtnBg }]}
				activeOpacity={0.85}
			>
				{isPlaying ? (
					<Pause size={20} color={accent} fill={accent} />
				) : (
					<Play size={20} color={accent} fill={accent} style={styles.playIcon} />
				)}
			</TouchableOpacity>

			<View style={styles.content}>
				<Slider
					style={styles.slider}
					value={progress}
					onSlidingComplete={handleSliderChange}
					minimumValue={0}
					maximumValue={1}
					minimumTrackTintColor={accent}
					maximumTrackTintColor={maxTrackColor}
					thumbTintColor={accent}
					disabled={!url}
				/>
				<View style={styles.timeRow}>
					<Text style={[styles.timeText, { color: textColor }]}>{formatTime(currentPosition)}</Text>
					<Text style={[styles.timeText, { color: mutedTextColor }]}>{formatTime(totalDuration)}</Text>
				</View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 6,
		width: Math.min(SCREEN_WIDTH * 0.62, 280),
		maxWidth: '100%',
	},
	playButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	playIcon: {
		marginLeft: 2,
	},
	content: {
		flex: 1,
		justifyContent: 'center',
	},
	slider: {
		height: 24,
		marginHorizontal: -2,
	},
	timeRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 0,
	},
	timeText: {
		fontSize: 11,
		fontWeight: '600',
		fontVariant: ['tabular-nums'],
	},
});
