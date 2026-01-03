import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { geoLocationService } from '../../services/geoLocationService';
import { COLORS } from '../chat/ChatConstants';

interface AutoLocationButtonProps {
	onLocationDetected: (country: string, city: string, latitude?: number, longitude?: number) => void;
	theme: typeof COLORS.light | typeof COLORS.dark;
}

export const AutoLocationButton: React.FC<AutoLocationButtonProps> = ({
	onLocationDetected,
	theme
}) => {
	const [loading, setLoading] = useState(false);

	const handleDetectLocation = async () => {
		setLoading(true);

		try {
			const location = await geoLocationService.detectLocation();

			if (location && location.country && location.city) {
				onLocationDetected(
					location.country,
					location.city,
					location.latitude,
					location.longitude
				);

				Alert.alert(
					'Location Found!',
					`${location.city}, ${location.country}`,
					[{ text: 'OK' }]
				);
			} else {
				Alert.alert(
					'Location Not Found',
					'Could not determine your location automatically. Please select it manually.',
					[
						{ text: 'OK' },
					]
				);
			}
		} catch (error: any) {
			console.error('Error detecting location:', error);

			Alert.alert(
				'Error',
				error.message || 'Failed to detect location. Please check your permissions.',
				[
					{ text: 'Try Manual Entry' },
				]
			);
		} finally {
			setLoading(false);
		}
	};

	return (
		<TouchableOpacity
			style={[styles.button, { backgroundColor: theme.accent, opacity: loading ? 0.7 : 1 }]}
			onPress={handleDetectLocation}
			disabled={loading}
		>
			{loading ? (
				<ActivityIndicator color="#fff" />
			) : (
				<>
					<Text style={styles.icon}>📍</Text>
					<View style={styles.textContainer}>
						<Text style={[styles.mainText, { color: '#fff' }]}>
							{loading ? 'Detecting...' : 'Auto-detect my location'}
						</Text>
						<Text style={[styles.subText, { color: '#fff' }]}>
							Uses GPS for accuracy
						</Text>
					</View>
				</>
			)}
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	button: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 16,
		borderRadius: 12,
		marginBottom: 20,
	},
	icon: {
		fontSize: 24,
		marginRight: 12,
	},
	textContainer: {
		flex: 1,
	},
	mainText: {
		fontSize: 16,
		fontWeight: 'bold',
	},
	subText: {
		fontSize: 12,
		marginTop: 2,
		opacity: 0.9,
	},
});
