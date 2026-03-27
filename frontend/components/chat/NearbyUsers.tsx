import React, { useState, useEffect, useCallback } from 'react';
import {
	View,
	Text,
	StyleSheet,
	FlatList,
	TouchableOpacity,
	Image,
	ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useTranslation } from 'react-i18next';
import { COLORS } from './ChatConstants';
import { getMediaUrl } from '../../utils/url';
import { nearbyService, UserWithDistance } from '../../services/nearbyService';
import { useChat } from '../../context/ChatContext';
import { useNavigation } from '@react-navigation/native';
import { navigateToDirectChat } from '../../utils/directChatNavigation';

interface NearbyUsersProps {
	latitude: number;
	longitude: number;
	theme: typeof COLORS.light | typeof COLORS.dark;
}

export const NearbyUsers: React.FC<NearbyUsersProps> = ({ latitude, longitude, theme }) => {
	const { i18n } = useTranslation();
	const copy = i18n.language?.startsWith('ru')
		? {
			nearbyDevotees: 'Преданные рядом',
			found: 'найдено',
			searchRadius: 'Радиус поиска',
			findingDevotees: 'Ищем преданных...',
			noDevotees: 'Рядом никого не найдено. Попробуйте увеличить радиус поиска.',
		}
		: i18n.language?.startsWith('hi')
			? {
				nearbyDevotees: 'निकटवर्ती भक्त',
				found: 'मिले',
				searchRadius: 'खोज का दायरा',
				findingDevotees: 'भक्तों को खोजा जा रहा है...',
				noDevotees: 'आसपास कोई भक्त नहीं मिला। खोज का दायरा बढ़ाकर देखें।',
			}
			: {
				nearbyDevotees: 'Nearby Devotees',
				found: 'found',
				searchRadius: 'Search Radius',
				findingDevotees: 'Finding devotees...',
				noDevotees: 'No devotees found nearby. Try increasing the search radius.',
			};
	const [users, setUsers] = useState<UserWithDistance[]>([]);
	const [loading, setLoading] = useState(false);
	const [radiusKm, setRadiusKm] = useState(50);
	const { setChatRecipient } = useChat();
	const navigation = useNavigation<any>();

	const fetchNearbyUsers = useCallback(async () => {
		setLoading(true);
		try {
			const result = await nearbyService.getNearbyUsers(latitude, longitude, radiusKm);
			setUsers(result.users);
		} catch (error) {
			console.error('Error fetching nearby users:', error);
		} finally {
			setLoading(false);
		}
	}, [latitude, longitude, radiusKm]);

	useEffect(() => {
		if (latitude && longitude) {
			fetchNearbyUsers();
		}
	}, [latitude, longitude, radiusKm, fetchNearbyUsers]);

	const handleUserPress = (user: UserWithDistance) => {
		setChatRecipient(user as any);
		navigateToDirectChat(navigation, user as any);
	};

	const renderItem = ({ item }: { item: UserWithDistance }) => {
		const avatarUrl = getMediaUrl(item.avatarUrl);

		return (
			<TouchableOpacity
				style={[styles.userCard, { backgroundColor: theme.card || theme.header }]}
				onPress={() => handleUserPress(item)}
			>
				<View style={styles.avatarContainer}>
					{avatarUrl ? (
						<Image source={{ uri: avatarUrl }} style={styles.avatar} />
					) : (
						<View style={[styles.avatarPlaceholder, { backgroundColor: theme.accent }]}>
							<Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 20 }}>
								{(item.spiritualName || item.karmicName)[0]}
							</Text>
						</View>
					)}
				</View>

				<View style={styles.userInfo}>
					<Text style={[styles.userName, { color: theme.text }]}>
						{item.spiritualName || item.karmicName}
					</Text>
					<Text style={[styles.userLocation, { color: theme.subText }]}>
						{item.city}, {item.country}
					</Text>
				</View>

				<View style={[styles.distanceContainer, { backgroundColor: theme.accent + '20' }]}>
					<Text style={[styles.distance, { color: theme.accent }]}>
						{nearbyService.formatDistance(item.distance)}
					</Text>
				</View>
			</TouchableOpacity>
		);
	};

	return (
		<View style={styles.container}>
			<View style={[styles.header, { borderBottomColor: theme.borderColor }]}>
				<Text style={[styles.headerTitle, { color: theme.text }]}>{copy.nearbyDevotees}</Text>
				<Text style={[styles.headerSubtitle, { color: theme.subText }]}>
					{users.length} {copy.found}
				</Text>
			</View>

			<View style={styles.controls}>
				<Text style={[styles.label, { color: theme.text }]}>
					{copy.searchRadius}: {radiusKm} km
				</Text>
				<Slider
					style={styles.slider}
					minimumValue={5}
					maximumValue={500}
					step={5}
					value={radiusKm}
					onValueChange={setRadiusKm}
					minimumTrackTintColor={theme.accent}
					maximumTrackTintColor={theme.borderColor}
				/>
			</View>

			{loading ? (
				<View style={styles.center}>
					<ActivityIndicator size="large" color={theme.accent} />
					<Text style={[styles.loadingText, { color: theme.subText }]}>{copy.findingDevotees}</Text>
				</View>
			) : users.length === 0 ? (
				<View style={styles.center}>
					<Text style={[styles.emptyText, { color: theme.subText }]}>
						{copy.noDevotees}
					</Text>
				</View>
			) : (
				<FlatList
					data={users}
					keyExtractor={(item) => item.ID.toString()}
					renderItem={renderItem}
					contentContainerStyle={styles.list}
				/>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		padding: 16,
		borderBottomWidth: 0.5,
	},
	headerTitle: {
		fontSize: 20,
		fontWeight: 'bold',
	},
	headerSubtitle: {
		fontSize: 14,
		marginTop: 2,
	},
	controls: {
		padding: 16,
	},
	label: {
		fontSize: 14,
		marginBottom: 8,
	},
	slider: {
		width: '100%',
		height: 40,
	},
	list: {
		paddingBottom: 20,
	},
	center: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	loadingText: {
		marginTop: 12,
		fontSize: 14,
	},
	emptyText: {
		textAlign: 'center',
		fontSize: 14,
		lineHeight: 20,
	},
	userCard: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		marginHorizontal: 16,
		marginVertical: 6,
		borderRadius: 12,
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.22,
		shadowRadius: 2.22,
	},
	avatarContainer: {
		marginRight: 12,
	},
	avatar: {
		width: 50,
		height: 50,
		borderRadius: 25,
	},
	avatarPlaceholder: {
		width: 50,
		height: 50,
		borderRadius: 25,
		justifyContent: 'center',
		alignItems: 'center',
	},
	userInfo: {
		flex: 1,
	},
	userName: {
		fontSize: 16,
		fontWeight: 'bold',
	},
	userLocation: {
		fontSize: 13,
		marginTop: 2,
	},
	distanceContainer: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 12,
	},
	distance: {
		fontSize: 14,
		fontWeight: '600',
	},
});
