import { useState, useEffect, useCallback } from 'react';
import { locationService } from '../services/locationService';
import { geoLocationService } from '../services/geoLocationService';

export const useLocation = () => {
    const [countriesData, setCountriesData] = useState<any[]>([]);
    const [citiesData, setCitiesData] = useState<string[]>([]);
    const [loadingCountries, setLoadingCountries] = useState(true);
    const [loadingCities, setLoadingCities] = useState(false);

    const fetchCountries = useCallback(async () => {
        setLoadingCountries(true);
        try {
            const countries = await locationService.getCountries();
            setCountriesData(countries);
        } catch (error) {
            console.warn('[useLocation] Failed to fetch countries:', error);
        } finally {
            setLoadingCountries(false);
        }
    }, []);

    const fetchCities = useCallback(async (countryName: string) => {
        setLoadingCities(true);
        try {
            const cities = await locationService.getCities(countryName);
            setCitiesData(cities);
        } catch (error) {
            console.warn('[useLocation] Failed to fetch cities:', error);
        } finally {
            setLoadingCities(false);
        }
    }, []);

    const refreshLocationData = useCallback(async () => {
        await locationService.clearCache();
        await fetchCountries();
        if (citiesData.length > 0) {
            const lastCountry = countriesData.find((c: any) => 
                citiesData.length > 0
            );
            if (lastCountry) {
                await fetchCities(lastCountry.name?.common);
            }
        }
    }, [fetchCountries, citiesData, countriesData]);

    const setCitiesDataDirect = useCallback((cities: string[]) => {
        setCitiesData(cities);
    }, []);

    const autoDetectLocation = useCallback(async () => {
        try {
            const location = await geoLocationService.detectLocation();
            if (location && location.country) {
                // Find matching country in countriesData
                const matchingCountry = countriesData.find((c: any) =>
                    c.name?.common.toLowerCase() === location.country.toLowerCase()
                );

                if (matchingCountry) {
                    return {
                        country: matchingCountry.name.common,
                        countryData: matchingCountry,
                        city: location.city || ''
                    };
                }

                // Return detected country even if not found in list
                return {
                    country: location.country,
                    countryData: null,
                    city: location.city || ''
                };
            }
            return null;
        } catch (error) {
            console.warn('[useLocation] Auto-detect failed:', error);
            return null;
        }
    }, [countriesData]);

    useEffect(() => {
        fetchCountries();
    }, [fetchCountries]);

    return {
        countriesData,
        citiesData,
        loadingCountries,
        loadingCities,
        fetchCountries,
        fetchCities,
        setCitiesData: setCitiesDataDirect,
        refreshLocationData,
        autoDetectLocation
    };
};
