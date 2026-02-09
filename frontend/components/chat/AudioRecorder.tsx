import React, { useState, useEffect, useRef } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	useColorScheme,
} from 'react-native';
import { useChat } from '../../context/ChatContext';
import { COLORS } from './ChatConstants';
import { Trash2, Send } from 'lucide-react-native';

interface AudioRecorderProps {
	isLocked?: boolean;
	onSend?: () => void;
	onCancel?: () => void;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
	isLocked = false,
	onSend,
	onCancel,
}) => {
	const isDarkMode = useColorScheme() === 'dark';
	const theme = isDarkMode ? COLORS.dark : COLORS.light;
	const {
		isRecording,
		cancelRecording,
		stopRecording, // Default context fallback
	} = useChat();

	const [duration, setDuration] = useState(0);
	const startedAtRef = useRef<number | null>(null);

	useEffect(() => {
		if (!isRecording) {
			setDuration(0);
			startedAtRef.current = null;
			return;
		}

		startedAtRef.current = Date.now();
		setDuration(0);

		const timer = setInterval(() => {
			if (!startedAtRef.current) return;
			const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000));
			setDuration(elapsedSeconds);
		}, 1000);

		return () => {
			clearInterval(timer);
		};
	}, [isRecording]);

	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	// Determine handlers based on lock state
	// If locked, we rely on the passed props (which handle styling/state in parent) or context defaults
	const handleSend = onSend || stopRecording;
	const handleCancel = onCancel || cancelRecording;

	if (!isRecording) return null;

	return (
		<View style={styles.container}>
			<View style={[styles.lockedContainer, { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' }]}>
				<TouchableOpacity onPress={handleCancel} style={styles.actionButton}>
					<Trash2 size={24} color="#FF3B30" />
				</TouchableOpacity>

				<View style={styles.timerContainer}>
					<View style={styles.recordingDot} />
					<Text style={[styles.timerText, { color: theme.text }]}>
						{formatTime(duration)}
					</Text>
				</View>

				<TouchableOpacity onPress={handleSend} style={styles.actionButton}>
					<Send size={24} color={theme.primary} style={{ marginLeft: 2 }} />
				</TouchableOpacity>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		bottom: 120,
		left: 0,
		right: 0,
		alignItems: 'center',
		zIndex: 1000,
	},
	lockedContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingVertical: 12,
		borderRadius: 30,
		width: 280,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 12,
		elevation: 8,
	},
	timerContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	recordingDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: '#FF3B30',
	},
	timerText: {
		fontSize: 16,
		fontWeight: '600',
		fontVariant: ['tabular-nums'],
		minWidth: 45,
	},
	actionButton: {
		padding: 8,
	},
});
