import React, { useState, useRef, useEffect } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	Dimensions,
} from 'react-native';
import { COLORS } from './ChatConstants';
import Slider from '@react-native-community/slider';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AudioPlayerProps {
	url: string;
	duration?: number;
	isDarkMode: boolean;
	onError?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
	url,
	duration = 0,
	isDarkMode,
	onError,
}) => {
	const theme = isDarkMode ? COLORS.dark : COLORS.light;
	// Initialize the player directly to avoid it being null
	const audioRecorderPlayerRef = useRef<any>(new AudioRecorderPlayer());
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentPosition, setCurrentPosition] = useState(0);
	const [totalDuration, setTotalDuration] = useState(duration > 0 ? duration * 1000 : 0);

	// Track if we have already loaded the file to avoid reloading on every play
	const isLoaded = useRef(false);

	useEffect(() => {
		// Cleanup function
		return () => {
			if (audioRecorderPlayerRef.current) {
				try {
					audioRecorderPlayerRef.current.stopPlayer();
					audioRecorderPlayerRef.current.removePlayBackListener();
				} catch (e) {
					console.log('Error stopping player on unmount', e);
				}
			}
		};
	}, []);

	// Update duration if prop changes
	useEffect(() => {
		if (duration > 0 && totalDuration === 0) {
			setTotalDuration(duration * 1000);
		}
	}, [duration]);

	const formatTime = (ms: number): string => {
		if (!ms || isNaN(ms)) return '0:00';
		const seconds = Math.floor(ms / 1000);
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	const handlePlayPause = async () => {
		if (!audioRecorderPlayerRef.current) {
			audioRecorderPlayerRef.current = new AudioRecorderPlayer();
		}

		try {
			if (isPlaying) {
				try {
					await audioRecorderPlayerRef.current.pausePlayer();
				} catch (err: any) {
					console.log('Pause error (ignoring):', err.message);
				}
				setIsPlaying(false);
			} else {
				// Prevent duplicate listeners
				audioRecorderPlayerRef.current.removePlayBackListener();

				// If not loaded or finished, start again
				if (!isLoaded.current || currentPosition >= totalDuration) {
					console.log('Starting playback:', url);
					await audioRecorderPlayerRef.current.startPlayer(url);
					isLoaded.current = true;
				} else {
					console.log('Resuming playback');
					await audioRecorderPlayerRef.current.resumePlayer();
				}

				audioRecorderPlayerRef.current.addPlayBackListener((e: any) => {
					// Safe update (prevent memory leaks if unmounted)
					if (e.currentPosition < 0) return;

					setCurrentPosition(e.currentPosition);

					// Update duration if we didn't have it or it changed (and is valid)
					if (e.duration > 0 && Math.abs(totalDuration - e.duration) > 1000) {
						setTotalDuration(e.duration);
					}

					// Approximate finish check (within 100ms or if position exceeds duration)
					if (e.currentPosition > 0 && e.duration > 0 && Math.abs(e.currentPosition - e.duration) < 200) {
						console.log('Playback finished');
						audioRecorderPlayerRef.current.stopPlayer();
						audioRecorderPlayerRef.current.removePlayBackListener();
						setIsPlaying(false);
						setCurrentPosition(0);
						isLoaded.current = false;
					}
				});

				setIsPlaying(true);
			}
		} catch (error) {
			console.error('Error playing/pausing audio:', error);
			// Reset state on critical error
			setIsPlaying(false);
			isLoaded.current = false;
			if (onError) {
				onError();
			}
		}
	};

	const handleSliderChange = async (value: number) => {
		if (!audioRecorderPlayerRef.current || !totalDuration) return;

		try {
			const position = Math.floor(value * totalDuration);
			await audioRecorderPlayerRef.current.seekToPlayer(position);
			setCurrentPosition(position);
			// Resume if it was playing to keep UI consistent
			if (isPlaying) {
				await audioRecorderPlayerRef.current.resumePlayer();
			}
		} catch (error) {
			console.error('Error seeking audio:', error);
		}
	};

	const progress = totalDuration > 0 ? Math.min(Math.max(currentPosition / totalDuration, 0), 1) : 0;

	return (
		<View style={styles.container}>
			<TouchableOpacity
				onPress={handlePlayPause}
				style={[styles.playButton, { backgroundColor: theme.button }]}
			>
				<Text style={[styles.playButtonText, { color: theme.buttonText }]}>
					{isPlaying ? '⏸' : '▶'}
				</Text>
			</TouchableOpacity>

			<View style={styles.timeContainer}>
				<Text style={[styles.timeText, { color: theme.subText }]}>
					{formatTime(currentPosition)}
				</Text>
			</View>

			<Slider
				style={styles.slider}
				value={progress}
				onValueChange={handleSliderChange}
				minimumValue={0}
				maximumValue={1}
				minimumTrackTintColor={theme.primary}
				maximumTrackTintColor={theme.borderColor}
				thumbTintColor={theme.primary}
				disabled={!url}
			/>

			<View style={styles.timeContainer}>
				<Text style={[styles.timeText, { color: theme.subText }]}>
					{formatTime(totalDuration)}
				</Text>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 8,
		gap: 12,
	},
	playButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		justifyContent: 'center',
		alignItems: 'center',
	},
	playButtonText: {
		fontSize: 16,
		fontWeight: 'bold',
	},
	timeContainer: {
		minWidth: 40,
		alignItems: 'center',
	},
	timeText: {
		fontSize: 12,
	},
	slider: {
		flex: 1,
		height: 40,
	},
});
