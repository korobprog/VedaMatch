import React, { useState, useEffect, useRef } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	StyleSheet,
	useColorScheme,
	ActivityIndicator,
} from 'react-native';
import { useChat } from '../../context/ChatContext';
import { COLORS } from './ChatConstants';

export const AudioRecorder: React.FC = () => {
	const isDarkMode = useColorScheme() === 'dark';
	const theme = isDarkMode ? COLORS.dark : COLORS.light;
	const {
		isRecording,
		recordingDuration: duration,
		cancelRecording,
		stopRecording,
		isUploading: isSending,
	} = useChat();

	const formatTime = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	};

	return (
		<View style={styles.container}>
			{isRecording ? (
				<View style={[styles.recordingIndicator, { backgroundColor: theme.botBubble }]}>
					<TouchableOpacity onPress={cancelRecording} style={styles.cancelButton}>
						<Text style={[styles.cancelText, { color: theme.error }]}>✕</Text>
					</TouchableOpacity>

					<View style={styles.recordingInfo}>
						<View style={styles.recordingDot} />
						<Text style={[styles.recordingText, { color: theme.text }]}>
							{formatTime(duration)}
						</Text>
					</View>

					{isSending ? (
						<ActivityIndicator size="small" color={theme.primary} />
					) : (
						<TouchableOpacity onPress={stopRecording} style={styles.sendButton}>
							<Text style={[styles.sendButtonText, { color: theme.primary }]}>✓</Text>
						</TouchableOpacity>
					)}
				</View>
			) : null}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		bottom: 100,
		left: 0,
		right: 0,
		alignItems: 'center',
		zIndex: 1000,
	},
	recordingIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 12,
		borderRadius: 24,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
		elevation: 5,
		gap: 16,
	},
	recordingInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	recordingDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#FF5252',
	},
	recordingText: {
		fontSize: 16,
		fontWeight: '600',
		minWidth: 40,
		textAlign: 'center',
	},
	cancelButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#FFEBEE',
		justifyContent: 'center',
		alignItems: 'center',
	},
	cancelText: {
		fontSize: 18,
		fontWeight: 'bold',
	},
	sendButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#E8F5E9',
		justifyContent: 'center',
		alignItems: 'center',
	},
	sendButtonText: {
		fontSize: 18,
		fontWeight: 'bold',
	},
});
