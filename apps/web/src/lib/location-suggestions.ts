import { normalizeHostname, resolveApiBaseUrlForHostname } from "@vedamatch/api-client";

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;
const CITY_CACHE_TTL_MS = 5 * 60 * 1000;
const COUNTRY_FALLBACKS = [
  "Afghanistan",
  "Albania",
  "Algeria",
  "Argentina",
  "Australia",
  "Austria",
  "Belgium",
  "Brazil",
  "Canada",
  "China",
  "Colombia",
  "Czech Republic",
  "Denmark",
  "Egypt",
  "Finland",
  "France",
  "Germany",
  "Greece",
  "Hungary",
  "India",
  "Indonesia",
  "Ireland",
  "Israel",
  "Italy",
  "Japan",
  "Malaysia",
  "Mexico",
  "Netherlands",
  "New Zealand",
  "Norway",
  "Philippines",
  "Poland",
  "Portugal",
  "Romania",
  "Russia",
  "Saudi Arabia",
  "South Africa",
  "South Korea",
  "Spain",
  "Sweden",
  "Switzerland",
  "Thailand",
  "Turkey",
  "Ukraine",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Vietnam",
];
const COUNTRY_ALIASES: Record<string, string[]> = {
  Belarus: ["Беларусь", "Белоруссия"],
  Georgia: ["Грузия"],
  India: ["Индия", "Бхарат", "Bharat"],
  Kazakhstan: ["Казахстан"],
  Russia: ["Россия", "РФ", "Российская Федерация"],
  Ukraine: ["Украина"],
  "United Arab Emirates": ["ОАЭ", "Эмираты"],
  "United Kingdom": ["Великобритания", "Англия", "UK"],
  "United States": ["США", "Америка", "USA", "US"],
};
const CITY_ALIASES: Record<string, string[]> = {
  Amsterdam: ["Амстердам", "एम्स्टर्डम"],
  Bangalore: ["Bengaluru", "Бангалор", "Бенгалуру", "बेंगलुरु"],
  Bangkok: ["Бангкок", "बैंकॉक"],
  Beijing: ["Пекин", "बीजिंग"],
  Berlin: ["Берлин", "बर्लिन"],
  Chennai: ["Ченнаи", "चेन्नई"],
  Delhi: ["Дели", "दिल्ली"],
  Dubai: ["Дубай", "दुबई"],
  Hyderabad: ["Хайдарабад", "हैदराबाद"],
  Istanbul: ["Стамбул", "इस्तांबुल"],
  Kazan: ["Казань", "कज़ान"],
  Kolkata: ["Калькутта", "Колката", "कोलकाता"],
  London: ["Лондон", "लंदन"],
  Mayapur: ["Маяпур", "मायापुर"],
  Moscow: ["Москва", "Мск", "मॉस्को"],
  Mumbai: ["Мумбаи", "मुंबई"],
  "New York": ["Нью-Йорк", "Нью Йорк", "न्यूयॉर्क"],
  "Nizhny Novgorod": ["Нижний Новгород", "НН", "निझनी नोवगोरोद"],
  Novosibirsk: ["Новосибирск", "नोवोसिबिर्स्क"],
  Paris: ["Париж", "पेरिस"],
  Rome: ["Рим", "रोम"],
  "Saint Petersburg": ["Санкт-Петербург", "Санкт Петербург", "СПб", "Питер", "सेंट पीटर्सबर्ग"],
  Seoul: ["Сеул", "सियोल"],
  Singapore: ["Сингапур", "सिंगापुर"],
  Tokyo: ["Токио", "टोक्यो"],
  Vrindavan: ["Вриндаван", "वृंदावन"],
  Warsaw: ["Варшава", "वारसॉ"],
  Yekaterinburg: ["Екатеринбург", "येकातेरिनबर्ग"],
};
const CITY_FALLBACKS_BY_COUNTRY: Record<string, string[]> = {
  Afghanistan: ["Kabul", "Kandahar", "Herat", "Mazar-i-Sharif"],
  Albania: ["Tirana", "Durres", "Vlore", "Shkoder"],
  Algeria: ["Algiers", "Oran", "Constantine", "Annaba"],
  Argentina: ["Buenos Aires", "Cordoba", "Rosario", "Mendoza"],
  Australia: ["Sydney", "Melbourne", "Brisbane", "Perth"],
  Austria: ["Vienna", "Graz", "Linz", "Salzburg"],
  Belgium: ["Brussels", "Antwerp", "Ghent", "Liege"],
  Brazil: ["Sao Paulo", "Rio de Janeiro", "Brasilia", "Salvador"],
  Canada: ["Toronto", "Vancouver", "Montreal", "Calgary"],
  China: ["Beijing", "Shanghai", "Guangzhou", "Shenzhen"],
  Colombia: ["Bogota", "Medellin", "Cali", "Barranquilla"],
  "Czech Republic": ["Prague", "Brno", "Ostrava", "Plzen"],
  Denmark: ["Copenhagen", "Aarhus", "Odense", "Aalborg"],
  Egypt: ["Cairo", "Alexandria", "Giza", "Shubra El-Kheima"],
  Finland: ["Helsinki", "Espoo", "Tampere", "Vantaa"],
  France: ["Paris", "Lyon", "Marseille", "Toulouse"],
  Germany: ["Berlin", "Munich", "Hamburg", "Cologne"],
  Greece: ["Athens", "Thessaloniki", "Patras", "Heraklion"],
  Hungary: ["Budapest", "Debrecen", "Szeged", "Miskolc"],
  India: ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Vrindavan", "Mayapur"],
  Indonesia: ["Jakarta", "Surabaya", "Bandung", "Medan"],
  Ireland: ["Dublin", "Cork", "Limerick", "Galway"],
  Israel: ["Jerusalem", "Tel Aviv", "Haifa", "Beersheba"],
  Italy: ["Rome", "Milan", "Naples", "Turin"],
  Japan: ["Tokyo", "Osaka", "Kyoto", "Yokohama"],
  Malaysia: ["Kuala Lumpur", "Penang", "Johor Bahru", "Kota Kinabalu"],
  Mexico: ["Mexico City", "Guadalajara", "Monterrey", "Puebla"],
  Netherlands: ["Amsterdam", "Rotterdam", "The Hague", "Utrecht"],
  "New Zealand": ["Auckland", "Wellington", "Christchurch", "Hamilton"],
  Norway: ["Oslo", "Bergen", "Trondheim", "Stavanger"],
  Philippines: ["Manila", "Quezon City", "Davao", "Cebu"],
  Poland: ["Warsaw", "Krakow", "Lodz", "Wroclaw"],
  Portugal: ["Lisbon", "Porto", "Amadora", "Braga"],
  Romania: ["Bucharest", "Cluj-Napoca", "Timisoara", "Iasi"],
  Russia: ["Moscow", "Saint Petersburg", "Novosibirsk", "Yekaterinburg", "Kazan", "Nizhny Novgorod"],
  "Saudi Arabia": ["Riyadh", "Jeddah", "Mecca", "Medina"],
  "South Africa": ["Johannesburg", "Cape Town", "Durban", "Pretoria"],
  "South Korea": ["Seoul", "Busan", "Incheon", "Daegu"],
  Spain: ["Madrid", "Barcelona", "Valencia", "Seville"],
  Sweden: ["Stockholm", "Gothenburg", "Malmo", "Uppsala"],
  Switzerland: ["Zurich", "Geneva", "Basel", "Lausanne"],
  Thailand: ["Bangkok", "Chiang Mai", "Pattaya", "Phuket"],
  Turkey: ["Ankara", "Istanbul", "Izmir", "Bursa"],
  Ukraine: ["Kyiv", "Kharkiv", "Odessa", "Dnipro"],
  "United Arab Emirates": ["Dubai", "Abu Dhabi", "Sharjah", "Ajman"],
  "United Kingdom": ["London", "Manchester", "Birmingham", "Liverpool"],
  "United States": ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia"],
  Vietnam: ["Hanoi", "Ho Chi Minh City", "Da Nang", "Hai Phong"],
};

let countryCache: string[] | null = null;
let cityCache: { baseUrl: string; expiresAt: number; options: string[] } | null = null;

export type LocationSuggestionRequest = {
  query?: string | null;
  limit?: string | number | null;
};

export type CitySuggestionRequest = LocationSuggestionRequest & {
  authorization?: string | null;
  country?: string | null;
  host?: string | null;
};

export function getCountrySuggestions({ query, limit }: LocationSuggestionRequest): string[] {
  return filterOptions(getCountryOptions(), query, readLimit(limit), (country) => [
    country,
    ...(COUNTRY_ALIASES[country] || []),
  ]);
}

export async function getCitySuggestions({
  authorization,
  country,
  host,
  limit,
  query,
}: CitySuggestionRequest): Promise<string[]> {
  const baseUrl = resolveApiBaseUrlForHostname(normalizeHostname(host || "localhost"));
  if (!baseUrl) {
    return [];
  }

  const cities = uniqueOptions([
    ...getFallbackCities(country),
    ...await readDatingCities(baseUrl, authorization),
  ]);
  return filterOptions(cities, query, readLimit(limit), (city) => [city, ...(CITY_ALIASES[city] || [])]);
}

function getFallbackCities(country?: string | null): string[] {
  const normalizedCountry = country?.trim();
  if (normalizedCountry && CITY_FALLBACKS_BY_COUNTRY[normalizedCountry]) {
    return CITY_FALLBACKS_BY_COUNTRY[normalizedCountry];
  }
  return Object.values(CITY_FALLBACKS_BY_COUNTRY).flat();
}

function getCountryOptions(): string[] {
  if (countryCache) {
    return countryCache;
  }

  try {
    const supportedValues = (Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
    const regionCodes = supportedValues?.("region") || [];
    const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
    countryCache = uniqueOptions([
      ...regionCodes.map((code) => displayNames.of(code) || ""),
      ...COUNTRY_FALLBACKS,
    ]).sort((left, right) => left.localeCompare(right));
  } catch {
    countryCache = uniqueOptions(COUNTRY_FALLBACKS).sort((left, right) => left.localeCompare(right));
  }

  return countryCache;
}

async function readDatingCities(baseUrl: string, authorization?: string | null): Promise<string[]> {
  const now = Date.now();
  if (cityCache?.baseUrl === baseUrl && cityCache.expiresAt > now) {
    return cityCache.options;
  }
  if (!authorization) {
    return cityCache?.baseUrl === baseUrl ? cityCache.options : [];
  }

  try {
    const response = await fetch(`${baseUrl}/dating/cities`, {
      cache: "no-store",
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(1800),
    });
    if (!response.ok) {
      return cityCache?.baseUrl === baseUrl ? cityCache.options : [];
    }

    const payload = await response.json();
    const options = uniqueOptions(Array.isArray(payload) ? payload.map(String) : []);
    cityCache = { baseUrl, expiresAt: now + CITY_CACHE_TTL_MS, options };
    return options;
  } catch {
    return cityCache?.baseUrl === baseUrl ? cityCache.options : [];
  }
}

function readLimit(value: string | number | null | undefined): number {
  const parsed = Number(value || DEFAULT_LIMIT);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.max(Math.trunc(parsed), 1), MAX_LIMIT);
}

function filterOptions(
  options: string[],
  query: string | null | undefined,
  limit: number,
  getSearchValues: (option: string) => string[],
): string[] {
  const normalizedQuery = normalizeSearch(query || "");
  const ranked = options
    .map((option) => ({ option, rank: rankOption(getSearchValues(option), normalizedQuery) }))
    .filter(({ rank }) => rank < 3)
    .sort((left, right) => left.rank - right.rank || left.option.localeCompare(right.option));

  return ranked.slice(0, limit).map(({ option }) => option);
}

function rankOption(values: string[], normalizedQuery: string): number {
  if (!normalizedQuery) {
    return 0;
  }
  const normalizedValues = values.map(normalizeSearch).filter(Boolean);
  if (normalizedValues.some((value) => value === normalizedQuery)) {
    return 0;
  }
  if (normalizedValues.some((value) => value.startsWith(normalizedQuery))) {
    return 1;
  }
  if (normalizedValues.some((value) => value.includes(normalizedQuery))) {
    return 2;
  }
  return 3;
}

function normalizeSearch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function uniqueOptions(options: string[]): string[] {
  return Array.from(new Set(options.map((option) => option.trim()).filter(Boolean)));
}
