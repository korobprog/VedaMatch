import React, { useState, useEffect, useRef } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	useColorScheme,
	ActivityIndicator,
	Animated,
} from 'react-native';
import { useChat } from '../../context/ChatContext';
import { COLORS } from './ChatConstants';
import { ChevronUp, Lock, Trash2, Send } from 'lucide-react-native';

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
		recordingDuration: duration,
		cancelRecording,
		stopRecording, // Default context fallback
		isUploading: isSending,
	} = useChat();

	const slideAnim = useRef(new Animated.Value(0)).current;

	useEffect(() => {
		let animation: Animated.CompositeAnimation | null = null;
		if (isRecording && !isLocked) {
			animation = Animated.loop(
				Animated.sequence([
					Animated.timing(slideAnim, {
						toValue: -10,
						duration: 600,
						useNativeDriver: true,
					}),
					Animated.timing(slideAnim, {
						toValue: 0,
						duration: 600,
						useNativeDriver: true,
					}),
				])
			);
			animation.start();
		} else {
			slideAnim.setValue(0);
		}
		return () => {
			if (animation) animation.stop();
		};
	}, [isRecording, isLocked]);

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

	if (!isRecording) return null;

	return (
		<View style={styles.container}>
			{isLocked ? (
				<View style={[styles.lockedContainer, { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' }]}>
					<TouchableOpacity onPress={handleCancel} style={styles.actionButton}>
						<Trash2 size={24} color="#FF3B30" />
					</TouchableOpacity>

					<View style={styles.timerContainer}>
						<Animated.View style={[styles.recordingDot, {
							opacity: slideAnim.interpolate({
								inputRange: [-10, 0],
								outputRange: [0.5, 1]
							})
						}]} />
						<Text style={[styles.timerText, { color: theme.text }]}>
							{formatTime(duration)}
						</Text>
					</View>

					<TouchableOpacity onPress={handleSend} style={styles.actionButton}>
						<Send size={24} color={theme.primary} style={{ marginLeft: 2 }} />
					</TouchableOpacity>
				</View>
			) : (
				<View style={styles.holdingContainer}>
					<View style={styles.lockHintWrapper}>
						<Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
							<ChevronUp size={20} color="#FFFFFF" />
						</Animated.View>
						<Lock size={14} color="#FFFFFF" style={{ marginTop: 2, opacity: 0.8 }} />
					</View>

					<View style={[styles.holdingIndicator, { backgroundColor: theme.botBubble }]}>
						<View style={styles.recordingDot} />
						<Text style={[styles.timerText, { color: theme.text }]}>
							{formatTime(duration)}
						</Text>
					</View>
				</View>
			)}
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
	holdingContainer: {
		alignItems: 'center',
		gap: 16,
	},
	lockHintWrapper: {
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(0,0,0,0.6)',
		paddingVertical: 8,
		paddingHorizontal: 12,
		borderRadius: 20,
		marginBottom: 4,
	},
	holdingIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 20,
		gap: 8,
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
	lockHint: {
		alignItems: 'center',
		marginBottom: 10,
	},
});
