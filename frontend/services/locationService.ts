import AsyncStorage from '@react-native-async-storage/async-storage';

interface Country {
	name: { common: string };
	capital: string[];
}

interface CityData {
	[country: string]: string[];
}

const COUNTRIES_CACHE_KEY = '@vedic_countries_cache';
const CITIES_CACHE_KEY = '@vedic_cities_cache';

export const locationService = {
	async getCountries(): Promise<Country[]> {
		try {
			const cached = await AsyncStorage.getItem(COUNTRIES_CACHE_KEY);
			if (cached) {
				const countries = JSON.parse(cached);
				if (countries && countries.length > 0) {
					console.log('[Location] Using cached countries:', countries.length);
					return countries;
				}
			}
		} catch (e) {
			console.warn('[Location] Failed to read countries cache:', e);
		}

		try {
			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000);

			const response = await fetch('https://restcountries.com/v3.1/all?fields=name,capital', {
				signal: controller.signal
			});
			clearTimeout(timeoutId);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			if (Array.isArray(data)) {
				const sortedData = data.sort((a: any, b: any) =>
					(a.name?.common || '').localeCompare(b.name?.common || '')
				);

				await AsyncStorage.setItem(COUNTRIES_CACHE_KEY, JSON.stringify(sortedData));
				console.log('[Location] Countries loaded and cached:', sortedData.length);
				return sortedData;
			} else {
				throw new Error('Invalid data format from countries API');
			}
		} catch (error: any) {
			console.warn('[Location] Error fetching countries (using fallback):', error?.message || 'Unknown error');
			return this.getFallbackCountries();
		}
	},

	async getCities(countryName: string): Promise<string[]> {
		try {
			const cached = await AsyncStorage.getItem(CITIES_CACHE_KEY);
			if (cached) {
				const citiesData: CityData = JSON.parse(cached);
				if (citiesData[countryName]) {
					console.log('[Location] Using cached cities for:', countryName);
					return citiesData[countryName];
				}
			}
		} catch (e) {
			console.warn('[Location] Failed to read cities cache:', e);
		}

		try {
			const countryUrl = `https://restcountries.com/v3.1/name/${encodeURIComponent(countryName)}?fields=cca2`;
			const countryResponse = await fetch(countryUrl);

			if (countryResponse.ok) {
				const countryData = await countryResponse.json();
				if (countryData && countryData.length > 0) {
					const countryCode = countryData[0].cca2;
					const citiesUrl = `https://secure.geonames.org/searchJSON?country=${countryCode}&featureClass=P&maxRows=100&username=demo`;
					const citiesResponse = await fetch(citiesUrl);

					if (citiesResponse.ok) {
						const citiesData = await citiesResponse.json();
						if (citiesData && citiesData.geonames) {
							const cities = citiesData.geonames
								.map((city: any) => city.name)
								.filter((name: string, index: number, self: string[]) => self.indexOf(name) === index)
								.sort();

							const cached = await AsyncStorage.getItem(CITIES_CACHE_KEY);
							const citiesDataCache: CityData = cached ? JSON.parse(cached) : {};
							citiesDataCache[countryName] = cities;

							await AsyncStorage.setItem(CITIES_CACHE_KEY, JSON.stringify(citiesDataCache));
							console.log('[Location] Cities loaded and cached for:', countryName);
							return cities;
						}
					}
				}
			}

			const fallbackCities = this.getFallbackCities(countryName);
			this.cacheCities(countryName, fallbackCities);
			return fallbackCities;
		} catch (error: any) {
			console.warn('[Location] Error fetching cities (using fallback):', error?.message || 'Unknown error');
			const fallbackCities = this.getFallbackCities(countryName);
			this.cacheCities(countryName, fallbackCities);
			return fallbackCities;
		}
	},

	async cacheCities(countryName: string, cities: string[]) {
		try {
			const cached = await AsyncStorage.getItem(CITIES_CACHE_KEY);
			const citiesData: CityData = cached ? JSON.parse(cached) : {};
			citiesData[countryName] = cities;
			await AsyncStorage.setItem(CITIES_CACHE_KEY, JSON.stringify(citiesData));
		} catch (e) {
			console.warn('[Location] Failed to cache cities:', e);
		}
	},

	getFallbackCountries(): Country[] {
		return [
			{ name: { common: 'Afghanistan' }, capital: ['Kabul'] },
			{ name: { common: 'Albania' }, capital: ['Tirana'] },
			{ name: { common: 'Algeria' }, capital: ['Algiers'] },
			{ name: { common: 'Argentina' }, capital: ['Buenos Aires'] },
			{ name: { common: 'Australia' }, capital: ['Canberra'] },
			{ name: { common: 'Austria' }, capital: ['Vienna'] },
			{ name: { common: 'Belgium' }, capital: ['Brussels'] },
			{ name: { common: 'Brazil' }, capital: ['Brasília'] },
			{ name: { common: 'Canada' }, capital: ['Ottawa'] },
			{ name: { common: 'China' }, capital: ['Beijing'] },
			{ name: { common: 'Colombia' }, capital: ['Bogotá'] },
			{ name: { common: 'Czech Republic' }, capital: ['Prague'] },
			{ name: { common: 'Denmark' }, capital: ['Copenhagen'] },
			{ name: { common: 'Egypt' }, capital: ['Cairo'] },
			{ name: { common: 'Finland' }, capital: ['Helsinki'] },
			{ name: { common: 'France' }, capital: ['Paris'] },
			{ name: { common: 'Germany' }, capital: ['Berlin'] },
			{ name: { common: 'Greece' }, capital: ['Athens'] },
			{ name: { common: 'Hungary' }, capital: ['Budapest'] },
			{ name: { common: 'India' }, capital: ['New Delhi'] },
			{ name: { common: 'Indonesia' }, capital: ['Jakarta'] },
			{ name: { common: 'Ireland' }, capital: ['Dublin'] },
			{ name: { common: 'Israel' }, capital: ['Jerusalem'] },
			{ name: { common: 'Italy' }, capital: ['Rome'] },
			{ name: { common: 'Japan' }, capital: ['Tokyo'] },
			{ name: { common: 'Malaysia' }, capital: ['Kuala Lumpur'] },
			{ name: { common: 'Mexico' }, capital: ['Mexico City'] },
			{ name: { common: 'Netherlands' }, capital: ['Amsterdam'] },
			{ name: { common: 'New Zealand' }, capital: ['Wellington'] },
			{ name: { common: 'Norway' }, capital: ['Oslo'] },
			{ name: { common: 'Philippines' }, capital: ['Manila'] },
			{ name: { common: 'Poland' }, capital: ['Warsaw'] },
			{ name: { common: 'Portugal' }, capital: ['Lisbon'] },
			{ name: { common: 'Romania' }, capital: ['Bucharest'] },
			{ name: { common: 'Russia' }, capital: ['Moscow'] },
			{ name: { common: 'Saudi Arabia' }, capital: ['Riyadh'] },
			{ name: { common: 'South Africa' }, capital: ['Pretoria'] },
			{ name: { common: 'South Korea' }, capital: ['Seoul'] },
			{ name: { common: 'Spain' }, capital: ['Madrid'] },
			{ name: { common: 'Sweden' }, capital: ['Stockholm'] },
			{ name: { common: 'Switzerland' }, capital: ['Bern'] },
			{ name: { common: 'Thailand' }, capital: ['Bangkok'] },
			{ name: { common: 'Turkey' }, capital: ['Ankara'] },
			{ name: { common: 'Ukraine' }, capital: ['Kyiv'] },
			{ name: { common: 'United Arab Emirates' }, capital: ['Abu Dhabi'] },
			{ name: { common: 'United Kingdom' }, capital: ['London'] },
			{ name: { common: 'United States' }, capital: ['Washington, D.C.'] },
			{ name: { common: 'Vietnam' }, capital: ['Hanoi'] },
		];
	},

	getFallbackCities(countryName: string): string[] {
		const majorCities: { [key: string]: string[] } = {
			'Afghanistan': ['Kabul', 'Kandahar', 'Herat', 'Mazar-i-Sharif'],
			'Albania': ['Tirana', 'Durrës', 'Vlorë', 'Shkodër'],
			'Algeria': ['Algiers', 'Oran', 'Constantine', 'Annaba'],
			'Argentina': ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza'],
			'Australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth'],
			'Austria': ['Vienna', 'Graz', 'Linz', 'Salzburg'],
			'Belgium': ['Brussels', 'Antwerp', 'Ghent', 'Liège'],
			'Brazil': ['São Paulo', 'Rio de Janeiro', 'Brasília', 'Salvador'],
			'Canada': ['Toronto', 'Vancouver', 'Montreal', 'Calgary'],
			'China': ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen'],
			'Colombia': ['Bogotá', 'Medellín', 'Cali', 'Barranquilla'],
			'Czech Republic': ['Prague', 'Brno', 'Ostrava', 'Plzeň'],
			'Denmark': ['Copenhagen', 'Aarhus', 'Odense', 'Aalborg'],
			'Egypt': ['Cairo', 'Alexandria', 'Giza', 'Shubra El-Kheima'],
			'Finland': ['Helsinki', 'Espoo', 'Tampere', 'Vantaa'],
			'France': ['Paris', 'Lyon', 'Marseille', 'Toulouse'],
			'Germany': ['Berlin', 'Munich', 'Hamburg', 'Cologne'],
			'Greece': ['Athens', 'Thessaloniki', 'Patras', 'Heraklion'],
			'Hungary': ['Budapest', 'Debrecen', 'Szeged', 'Miskolc'],
			'India': ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Vrindavan', 'Mayapur'],
			'Indonesia': ['Jakarta', 'Surabaya', 'Bandung', 'Medan'],
			'Ireland': ['Dublin', 'Cork', 'Limerick', 'Galway'],
			'Israel': ['Jerusalem', 'Tel Aviv', 'Haifa', 'Beersheba'],
			'Italy': ['Rome', 'Milan', 'Naples', 'Turin'],
			'Japan': ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama'],
			'Malaysia': ['Kuala Lumpur', 'Penang', 'Johor Bahru', 'Kota Kinabalu'],
			'Mexico': ['Mexico City', 'Guadalajara', 'Monterrey', 'Puebla'],
			'Netherlands': ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht'],
			'New Zealand': ['Auckland', 'Wellington', 'Christchurch', 'Hamilton'],
			'Norway': ['Oslo', 'Bergen', 'Trondheim', 'Stavanger'],
			'Philippines': ['Manila', 'Quezon City', 'Davao', 'Cebu'],
			'Poland': ['Warsaw', 'Krakow', 'Łódź', 'Wrocław'],
			'Portugal': ['Lisbon', 'Porto', 'Amadora', 'Braga'],
			'Romania': ['Bucharest', 'Cluj-Napoca', 'Timișoara', 'Iași'],
			'Russia': ['Moscow', 'Saint Petersburg', 'Novosibirsk', 'Yekaterinburg', 'Kazan', 'Nizhny Novgorod'],
			'Saudi Arabia': ['Riyadh', 'Jeddah', 'Mecca', 'Medina'],
			'South Africa': ['Johannesburg', 'Cape Town', 'Durban', 'Pretoria'],
			'South Korea': ['Seoul', 'Busan', 'Incheon', 'Daegu'],
			'Spain': ['Madrid', 'Barcelona', 'Valencia', 'Seville'],
			'Sweden': ['Stockholm', 'Gothenburg', 'Malmö', 'Uppsala'],
			'Switzerland': ['Zurich', 'Geneva', 'Basel', 'Lausanne'],
			'Thailand': ['Bangkok', 'Chiang Mai', 'Pattaya', 'Phuket'],
			'Turkey': ['Ankara', 'Istanbul', 'Izmir', 'Bursa'],
			'Ukraine': ['Kyiv', 'Kharkiv', 'Odessa', 'Dnipro'],
			'United Arab Emirates': ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman'],
			'United Kingdom': ['London', 'Manchester', 'Birmingham', 'Liverpool'],
			'United States': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia'],
			'Vietnam': ['Hanoi', 'Ho Chi Minh City', 'Da Nang', 'Hai Phong'],
		};
		return majorCities[countryName] || [];
	},

	async clearCache() {
		try {
			await AsyncStorage.multiRemove([COUNTRIES_CACHE_KEY, CITIES_CACHE_KEY]);
			console.log('[Location] Cache cleared');
		} catch (e) {
			console.warn('[Location] Failed to clear cache:', e);
		}
	},
};
