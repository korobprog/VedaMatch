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

import { Play, Pause } from 'lucide-react-native';

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
	const audioRecorderPlayerRef = useRef<any>(new AudioRecorderPlayer());
	const [isPlaying, setIsPlaying] = useState(false);
	const [currentPosition, setCurrentPosition] = useState(0);
	const [totalDuration, setTotalDuration] = useState(duration > 0 ? duration * 1000 : 0);
	const isLoaded = useRef(false);

	useEffect(() => {
		return () => {
			if (audioRecorderPlayerRef.current) {
				try {
					audioRecorderPlayerRef.current.stopPlayer();
					audioRecorderPlayerRef.current.removePlayBackListener();
				} catch (e) { }
			}
		};
	}, []);

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
		try {
			if (isPlaying) {
				await audioRecorderPlayerRef.current.pausePlayer();
				setIsPlaying(false);
			} else {
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
			setIsPlaying(false);
			isLoaded.current = false;
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
		} catch (error) { }
	};

	const progress = totalDuration > 0 ? Math.min(Math.max(currentPosition / totalDuration, 0), 1) : 0;

	return (
		<View style={styles.container}>
			<TouchableOpacity
				onPress={handlePlayPause}
				style={[styles.playButton, { backgroundColor: 'rgba(255, 183, 77, 0.15)' }]}
			>
				{isPlaying ? (
					<Pause size={18} color="#FFB74D" fill="#FFB74D" />
				) : (
					<Play size={18} color="#FFB74D" fill="#FFB74D" style={{ marginLeft: 3 }} />
				)}
			</TouchableOpacity>

			<View style={styles.content}>
				<Slider
					style={styles.slider}
					value={progress}
					onValueChange={handleSliderChange}
					minimumValue={0}
					maximumValue={1}
					minimumTrackTintColor="#FFB74D"
					maximumTrackTintColor="rgba(255, 255, 255, 0.15)"
					thumbTintColor="#FFB74D"
					disabled={!url}
				/>
				<View style={styles.timeRow}>
					<Text style={[styles.timeText, { color: 'rgba(248, 250, 252, 0.6)' }]}>{formatTime(currentPosition)}</Text>
					<Text style={[styles.timeText, { color: 'rgba(248, 250, 252, 0.6)' }]}>{formatTime(totalDuration)}</Text>
				</View>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 4,
		width: 240, // Fixed width for chat bubble
	},
	playButton: {
		width: 38,
		height: 38,
		borderRadius: 19,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 10,
	},
	content: {
		flex: 1,
		justifyContent: 'center',
	},
	slider: {
		height: 20,
		marginHorizontal: -8, // Reduce internal horizontal padding of slider
	},
	timeRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: -2,
	},
	timeText: {
		fontSize: 10,
		fontWeight: '500',
	},
});
