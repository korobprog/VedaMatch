import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
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
	const { i18n } = useTranslation();
	const copy = i18n.language?.startsWith('ru')
		? {
			locationFound: 'Местоположение найдено',
			locationNotFound: 'Местоположение не найдено',
			locationNotFoundMessage: 'Не удалось автоматически определить ваше местоположение. Выберите его вручную.',
			error: 'Ошибка',
			detectFailed: 'Не удалось определить местоположение. Проверьте разрешения.',
			tryManualEntry: 'Ввести вручную',
			ok: 'OK',
			detecting: 'Определяем...',
			autoDetect: 'Определить моё местоположение',
			usesGps: 'Использует GPS для точности',
		}
		: i18n.language?.startsWith('hi')
			? {
				locationFound: 'स्थान मिल गया',
				locationNotFound: 'स्थान नहीं मिला',
				locationNotFoundMessage: 'आपका स्थान अपने आप निर्धारित नहीं हो सका। कृपया इसे मैन्युअली चुनें।',
				error: 'त्रुटि',
				detectFailed: 'स्थान पता नहीं चल सका। कृपया अनुमतियाँ जाँचें।',
				tryManualEntry: 'मैन्युअल रूप से दर्ज करें',
				ok: 'ठीक है',
				detecting: 'पता लगाया जा रहा है...',
				autoDetect: 'मेरा स्थान स्वतः पहचानें',
				usesGps: 'सटीकता के लिए GPS का उपयोग करता है',
			}
			: {
				locationFound: 'Location Found!',
				locationNotFound: 'Location Not Found',
				locationNotFoundMessage: 'Could not determine your location automatically. Please select it manually.',
				error: 'Error',
				detectFailed: 'Failed to detect location. Please check your permissions.',
				tryManualEntry: 'Try Manual Entry',
				ok: 'OK',
				detecting: 'Detecting...',
				autoDetect: 'Auto-detect my location',
				usesGps: 'Uses GPS for accuracy',
			};
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
					copy.locationFound,
					`${location.city}, ${location.country}`,
					[{ text: copy.ok }]
				);
			} else {
				Alert.alert(
					copy.locationNotFound,
					copy.locationNotFoundMessage,
					[
						{ text: copy.ok },
					]
				);
			}
		} catch (error: any) {
			console.error('Error detecting location:', error);

			Alert.alert(
				copy.error,
				error.message || copy.detectFailed,
				[
					{ text: copy.tryManualEntry },
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
							{loading ? copy.detecting : copy.autoDetect}
						</Text>
						<Text style={[styles.subText, { color: '#fff' }]}>
							{copy.usesGps}
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
