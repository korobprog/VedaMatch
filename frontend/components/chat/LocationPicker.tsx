import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { locationService } from '../../services/locationService';
import { AutoLocationButton } from './AutoLocationButton';
import { COLORS } from '../chat/ChatConstants';

interface LocationPickerProps {
	country: string;
	city: string;
	onCountryChange: (country: string) => void;
	onCityChange: (city: string) => void;
	onCoordinatesChange?: (latitude?: number, longitude?: number) => void;
	theme: typeof COLORS.light | typeof COLORS.dark;
	showAutoDetect?: boolean;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
	country,
	city,
	onCountryChange,
	onCityChange,
	onCoordinatesChange,
	theme,
	showAutoDetect = true
}) => {
	const [latitude, setLatitude] = useState<number | undefined>();
	const [longitude, setLongitude] = useState<number | undefined>();
	const [countriesData, setCountriesData] = useState<any[]>([]);
	const [citiesData, setCitiesData] = useState<string[]>([]);
	const [loadingCountries, setLoadingCountries] = useState(true);
	const [loadingCities, setLoadingCities] = useState(false);
	const [showCountryPicker, setShowCountryPicker] = useState(false);
	const [showCityPicker, setShowCityPicker] = useState(false);
	const [cityInputMode, setCityInputMode] = useState(false);
	const [cityInput, setCityInput] = useState('');
	const [countrySearchQuery, setCountrySearchQuery] = useState('');
	const [citySearchQuery, setCitySearchQuery] = useState('');

	useEffect(() => {
		locationService.getCountries().then(data => {
			setCountriesData(data);
			setLoadingCountries(false);
		});
	}, []);

	const handleLocationDetected = (detectedCountry: string, detectedCity: string, lat?: number, lon?: number) => {
		onCountryChange(detectedCountry);
		onCityChange(detectedCity);
		if (lat !== undefined && lon !== undefined) {
			setLatitude(lat);
			setLongitude(lon);
			onCoordinatesChange?.(lat, lon);
		}
	};

	useEffect(() => {
		if (country) {
			fetchCities(country);
		}
	}, [country]);

	const fetchCities = async (countryName: string) => {
		setLoadingCities(true);
		try {
			const cities = await locationService.getCities(countryName);
			setCitiesData(cities);
		} catch (error) {
			console.error('Error fetching cities:', error);
		} finally {
			setLoadingCities(false);
		}
	};

	const handleCountrySelect = async (cData: any) => {
		onCountryChange(cData.name.common);
		if (cData.capital && cData.capital.length > 0) {
			onCityChange(cData.capital[0]);
			setCityInput(cData.capital[0]);
		}
		setShowCountryPicker(false);
	};

	const handleCitySelect = (cityName: string) => {
		onCityChange(cityName);
		setCityInput(cityName);
		setShowCityPicker(false);
	};

	const filteredCountries = countriesData.filter(c =>
		c.name?.common?.toLowerCase().includes(countrySearchQuery.toLowerCase())
	);

	const filteredCities = citiesData.filter(city =>
		city.toLowerCase().includes(citySearchQuery.toLowerCase())
	);

	return (
		<>
			{showAutoDetect && !country && (
				<AutoLocationButton
					onLocationDetected={handleLocationDetected}
					theme={theme}
				/>
			)}

			<View style={styles.section}>
				<Text style={[styles.label, { color: theme.text }]}>Country</Text>
				<TouchableOpacity
					style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}
					onPress={() => setShowCountryPicker(true)}
				>
					<Text style={[styles.inputText, { color: country ? theme.inputText : theme.subText }]}>
						{country || 'Select Country'}
					</Text>
					<Text style={{ color: theme.subText }}>▼</Text>
				</TouchableOpacity>

				<Text style={[styles.label, { color: theme.text, marginTop: 16 }]}>City</Text>
				{!cityInputMode ? (
					<TouchableOpacity
						style={[styles.input, { backgroundColor: theme.inputBackground, borderColor: theme.borderColor }]}
						onPress={() => setShowCityPicker(true)}
					>
						<Text style={[styles.inputText, { color: city ? theme.inputText : theme.subText }]}>
							{city || 'Select City'}
						</Text>
						<Text style={{ color: theme.subText }}>▼</Text>
					</TouchableOpacity>
				) : (
					<TextInput
						style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.inputText, borderColor: theme.borderColor }]}
						value={cityInput}
						onChangeText={(text) => {
							setCityInput(text);
							onCityChange(text);
						}}
						placeholder="Enter city name"
						placeholderTextColor={theme.subText}
					/>
				)}

				{citiesData.length > 0 && !cityInputMode && (
					<TouchableOpacity
						onPress={() => {
							setCityInputMode(true);
							setShowCityPicker(false);
						}}
					>
						<Text style={[styles.linkText, { color: theme.accent }]}>
							Or enter city manually
						</Text>
					</TouchableOpacity>
				)}
			</View>

			<Modal
				visible={showCountryPicker}
				transparent
				animationType="fade"
			>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, { backgroundColor: theme.header }]}>
						<Text style={[styles.modalTitle, { color: theme.text }]}>Select Country</Text>

						<TextInput
							style={[styles.searchInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor }]}
							value={countrySearchQuery}
							onChangeText={setCountrySearchQuery}
							placeholder="Search country..."
							placeholderTextColor={theme.subText}
						/>

						<ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
							{loadingCountries ? (
								<ActivityIndicator size="large" color={theme.accent} />
							) : (
								filteredCountries.map((cData, index) => (
									<TouchableOpacity
										key={index}
										style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: theme.borderColor }}
										onPress={() => handleCountrySelect(cData)}
									>
										<Text style={{ color: theme.text }}>{cData.name?.common}</Text>
										{cData.capital && (
											<Text style={{ color: theme.subText, fontSize: 12 }}>Capital: {cData.capital[0]}</Text>
										)}
									</TouchableOpacity>
								))
							)}
						</ScrollView>

						<TouchableOpacity
							style={{ padding: 15, alignItems: 'center' }}
							onPress={() => setShowCountryPicker(false)}
						>
							<Text style={{ color: theme.subText }}>Close</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			<Modal
				visible={showCityPicker}
				transparent
				animationType="fade"
			>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, { backgroundColor: theme.header }]}>
						<Text style={[styles.modalTitle, { color: theme.text }]}>Select City</Text>

						<TextInput
							style={[styles.searchInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.borderColor }]}
							value={citySearchQuery}
							onChangeText={setCitySearchQuery}
							placeholder="Search city..."
							placeholderTextColor={theme.subText}
						/>

						<ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
							{loadingCities ? (
								<ActivityIndicator size="large" color={theme.accent} />
							) : (
								filteredCities.map((cityName, index) => (
									<TouchableOpacity
										key={index}
										style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: theme.borderColor }}
										onPress={() => handleCitySelect(cityName)}
									>
										<Text style={{ color: theme.text }}>{cityName}</Text>
									</TouchableOpacity>
								))
							)}
						</ScrollView>

						<TouchableOpacity
							style={{ padding: 15, alignItems: 'center' }}
							onPress={() => setShowCityPicker(false)}
						>
							<Text style={{ color: theme.subText }}>Close</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</>
	);
};

const styles = StyleSheet.create({
	section: {
		marginTop: 20,
	},
	label: {
		fontSize: 14,
		fontWeight: '600',
		marginBottom: 8,
	},
	input: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		height: 50,
		borderRadius: 12,
		borderWidth: 1,
		paddingHorizontal: 16,
	},
	inputText: {
		fontSize: 16,
		flex: 1,
	},
	linkText: {
		fontSize: 14,
		marginTop: 8,
		textAlign: 'right',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	modalContent: {
		width: '90%',
		maxHeight: '70%',
		borderRadius: 16,
		padding: 20,
		elevation: 5,
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 15,
		textAlign: 'center',
	},
	searchInput: {
		width: '100%',
		height: 50,
		borderWidth: 1,
		borderRadius: 12,
		paddingHorizontal: 15,
		fontSize: 16,
		marginBottom: 15,
	},
});
