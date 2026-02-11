import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    Alert,
    Image,
    TextInput,
    Keyboard,
    FlatList,
    ScrollView,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft,
    LocateFixed,
    Route,
    Store,
    Tag,
    Users,
    X,
    ExternalLink,
    Search,
    Coffee,
} from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview/lib/WebViewTypes';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';

import { useSettings } from '../../../context/SettingsContext';
import { useUser } from '../../../context/UserContext';
import { mapService } from '../../../services/mapService';
import type { MarkerConfig, TileConfig } from '../../../services/mapService';
import { geoLocationService } from '../../../services/geoLocationService';
import { MapMarker, MapCluster, MapFilters, MarkerType } from '../../../types/map';
import { useRoleTheme } from '../../../hooks/useRoleTheme';
import { RootStackParamList } from '../../../types/navigation';

// Initial coordinates - Moscow
const INITIAL_LAT = 55.7558;
const INITIAL_LNG = 37.6173;

type MapGeoapifyNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type MapGeoapifyRouteProp = RouteProp<RootStackParamList, 'MapGeoapify'>;
type MapGeoapifyRouteParams = NonNullable<RootStackParamList['MapGeoapify']> & {
    filters?: Partial<MapFilters>;
};

interface MapBounds {
    north: number;
    south: number;
    east: number;
    west: number;
}

interface SearchResultItem {
    properties: {
        lat: number;
        lon: number;
        formatted: string;
    };
}

export const MapGeoapifyScreen: React.FC = () => {
    const { t } = useTranslation();
    const { isDarkMode } = useSettings();
    const { user } = useUser();
    const { colors } = useRoleTheme(user?.role, isDarkMode);
    const navigation = useNavigation<MapGeoapifyNavigationProp>();
    const route = useRoute<MapGeoapifyRouteProp>();
    const routeParams = route.params as MapGeoapifyRouteParams | undefined;

    const webViewRef = useRef<WebView>(null);
    const bottomSheetRef = useRef<BottomSheet>(null);
    const lastBoundsRef = useRef<MapBounds | null>(null);
    const lastZoomRef = useRef<number>(10);

    const snapPoints = useMemo(() => ['10%', '50%', '90%'], []);
    const markerColors = useMemo(() => ({
        user: colors.accent,
        shop: colors.success,
        ad: colors.danger,
        cafe: colors.warning,
        default: colors.textSecondary,
    }), [colors.accent, colors.danger, colors.success, colors.textSecondary, colors.warning]);

    // State
    const [markers, setMarkers] = useState<MapMarker[]>([]);
    const [clusters, setClusters] = useState<MapCluster[]>([]);
    const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [mapReady, setMapReady] = useState(false);
    const [tileUrl, setTileUrl] = useState<string>('');
    const [mapConfig, setMapConfig] = useState<(TileConfig & Partial<MarkerConfig>) | null>(null);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latestSearchRequestRef = useRef(0);
    const latestMarkersRequestRef = useRef(0);
    const latestTileConfigRequestRef = useRef(0);
    const latestSummaryRequestRef = useRef(0);
    const latestLocateRequestRef = useRef(0);
    const isMountedRef = useRef(true);

    const [filters, setFilters] = useState<MapFilters>({
        showUsers: routeParams?.filters?.showUsers ?? true,
        showShops: routeParams?.filters?.showShops ?? true,
        showAds: routeParams?.filters?.showAds ?? true,
        showCafes: routeParams?.filters?.showCafes ?? true,
    });

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            latestSearchRequestRef.current += 1;
            latestMarkersRequestRef.current += 1;
            latestTileConfigRequestRef.current += 1;
            latestSummaryRequestRef.current += 1;
            latestLocateRequestRef.current += 1;
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    // Handle incoming filter updates from params if screen is already mounted
    useEffect(() => {
        if (routeParams?.filters) {
            setFilters(prev => ({
                ...prev,
                ...routeParams.filters
            }));
        }
    }, [routeParams?.filters]);

    // Load tile config on mount
    useEffect(() => {
        loadTileConfig();
        loadInitialData();
    }, []);

    // Update markers on map when data changes
    useEffect(() => {
        if (mapReady && webViewRef.current && markers) {
            const allMarkers = Array.isArray(markers) ? markers : [];
            webViewRef.current.injectJavaScript(`
                updateMarkers(${JSON.stringify(allMarkers)});
                true;
            `);
        }
    }, [markers, mapReady]);

    // Update clusters on map when data changes
    useEffect(() => {
        if (mapReady && webViewRef.current && clusters) {
            const clusterData = Array.isArray(clusters) ? clusters : [];
            webViewRef.current.injectJavaScript(`
                updateClusters(${JSON.stringify(clusterData)});
                true;
            `);
        }
    }, [clusters, mapReady]);

    const loadTileConfig = async () => {
        const requestId = ++latestTileConfigRequestRef.current;
        try {
            const config = await mapService.getTileConfig();
            if (requestId === latestTileConfigRequestRef.current && isMountedRef.current) {
                setTileUrl(config.tileUrl);
                setMapConfig(config);
            }
        } catch (error) {
            console.error('Failed to load tile config:', error);
            // Fallback to OpenStreetMap tiles
            if (requestId === latestTileConfigRequestRef.current && isMountedRef.current) {
                setTileUrl('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
            }
        }
    };

    const loadInitialData = async () => {
        const requestId = ++latestSummaryRequestRef.current;
        if (isMountedRef.current) {
            setIsLoading(true);
        }
        try {
            const summary = await mapService.getSummary();
            const nextClusters = Array.isArray(summary?.clusters) ? summary.clusters : [];
            if (requestId === latestSummaryRequestRef.current && isMountedRef.current) {
                setClusters(nextClusters);
            }
        } catch (error) {
            console.error('Failed to load initial data:', error);
            if (requestId === latestSummaryRequestRef.current && isMountedRef.current) {
                setClusters([]);
            }
        } finally {
            if (requestId === latestSummaryRequestRef.current && isMountedRef.current) {
                setIsLoading(false);
            }
        }
    };

    const loadMarkers = useCallback(async (bounds: { north: number; south: number; east: number; west: number }, zoom: number) => {
        const requestId = ++latestMarkersRequestRef.current;
        if (zoom < 10) {
            // Zoomed out - show clusters only
            if (requestId === latestMarkersRequestRef.current && isMountedRef.current) {
                setMarkers([]);
            }
            return;
        }

        try {
            const categories: MarkerType[] = [];
            if (filters.showUsers) categories.push('user');
            if (filters.showShops) categories.push('shop');
            if (filters.showAds) categories.push('ad');
            if (filters.showCafes) categories.push('cafe');

            if (categories.length === 0) {
                if (requestId === latestMarkersRequestRef.current && isMountedRef.current) {
                    setMarkers([]);
                }
                return;
            }

            const result = await mapService.getMarkers({
                latMin: bounds.south,
                latMax: bounds.north,
                lngMin: bounds.west,
                lngMax: bounds.east,
                categories,
                limit: 200,
                userLat: user?.latitude,
                userLng: user?.longitude,
            });

            if (requestId === latestMarkersRequestRef.current && isMountedRef.current) {
                setMarkers(Array.isArray(result?.markers) ? result.markers : []);
            }
        } catch (error) {
            console.error('Failed to load markers:', error);
            if (requestId === latestMarkersRequestRef.current && isMountedRef.current) {
                setMarkers([]);
            }
        }
    }, [filters.showAds, filters.showCafes, filters.showShops, filters.showUsers, user?.latitude, user?.longitude]);

    // Reload markers when filters change
    useEffect(() => {
        if (lastBoundsRef.current && lastZoomRef.current >= 10) {
            loadMarkers(lastBoundsRef.current, lastZoomRef.current);
        } else if (lastBoundsRef.current && lastZoomRef.current < 10) {
            // clear markers if any to be safe
            setMarkers([]);
        }

        // Update filters in WebView for local cluster filtering
        if (mapReady && webViewRef.current) {
            webViewRef.current.injectJavaScript(`
                if (window.setFilters) {
                    window.setFilters({
                        user: ${filters.showUsers},
                        shop: ${filters.showShops},
                        ad: ${filters.showAds},
                        cafe: ${filters.showCafes}
                    });
                }
                true;
            `);
        }
    }, [filters, mapReady, loadMarkers]);

    const handleMessage = (event: WebViewMessageEvent) => {
        if (!isMountedRef.current) {
            return;
        }
        try {
            const data = JSON.parse(event.nativeEvent.data);

            switch (data.type) {
                case 'mapReady':
                    setMapReady(true);
                    setIsLoading(false);
                    // Inject current state into the new map instance
                    if (webViewRef.current) {
                        const allMarkers = Array.isArray(markers) ? markers : [];
                        const clusterData = Array.isArray(clusters) ? clusters : [];
                        webViewRef.current.injectJavaScript(`
                            updateMarkers(${JSON.stringify(allMarkers)});
                            updateClusters(${JSON.stringify(clusterData)});
                            if (window.setFilters) {
                                window.setFilters({
                                    user: ${filters.showUsers},
                                    shop: ${filters.showShops},
                                    ad: ${filters.showAds},
                                    cafe: ${filters.showCafes}
                                });
                            }
                            true;
                        `);
                    }
                    break;
                case 'markerClick':
                    if (markers && Array.isArray(markers)) {
                        const marker = markers.find(m => m.id === data.id && m.type === data.markerType);
                        if (marker) {
                            setSelectedMarker(marker);
                        }
                    }
                    break;
                case 'clusterClick':
                    // Zoom to cluster location
                    if (webViewRef.current) {
                        webViewRef.current.injectJavaScript(`
                            map.setView([${data.lat}, ${data.lng}], 12);
                            true;
                        `);
                    }
                    break;
                case 'boundsChanged':
                    if (data?.bounds && typeof data?.zoom === 'number') {
                        lastBoundsRef.current = data.bounds;
                        lastZoomRef.current = data.zoom;
                        loadMarkers(data.bounds, data.zoom);
                    }
                    break;
                case 'mapClick':
                    setSelectedMarker(null);
                    break;
            }
        } catch (error) {
            console.error('Failed to parse WebView message:', error);
        }
    };

    const handleLocateMe = async () => {
        const requestId = ++latestLocateRequestRef.current;
        if (isMountedRef.current) {
            setIsLoading(true);
        }
        try {
            const location = await geoLocationService.detectLocation();
            const hasCoords =
                typeof location?.latitude === 'number' &&
                typeof location?.longitude === 'number';
            if (
                hasCoords &&
                webViewRef.current &&
                requestId === latestLocateRequestRef.current &&
                isMountedRef.current
            ) {
                // Update map view
                webViewRef.current.injectJavaScript(`
                    map.setView([${location.latitude}, ${location.longitude}], 15);
                    if (userMarker) {
                        userMarker.setLatLng([${location.latitude}, ${location.longitude}]);
                    } else {
                        userMarker = L.circleMarker([${location.latitude}, ${location.longitude}], {
                            radius: 8,
                            fillColor: '${colors.accent}',
                            color: '${colors.textPrimary}',
                            weight: 2,
                            opacity: 1,
                            fillOpacity: 1
                        }).addTo(map);
                    }
                    true;
                `);
            } else if (requestId === latestLocateRequestRef.current && isMountedRef.current) {
                Alert.alert('Location Error', 'Could not detect your current location.');
            }
        } catch {
            if (requestId === latestLocateRequestRef.current && isMountedRef.current) {
                Alert.alert('Permission Denied', 'Please enable location permissions in settings.');
            }
        } finally {
            if (requestId === latestLocateRequestRef.current && isMountedRef.current) {
                setIsLoading(false);
            }
        }
    };

    const handleFocusMarker = (marker: MapMarker) => {
        if (webViewRef.current) {
            webViewRef.current.injectJavaScript(`
                map.setView([${marker.latitude}, ${marker.longitude}], 17);
                true;
            `);
            setSelectedMarker(marker);
            bottomSheetRef.current?.snapToIndex(0);
        }
    };

    const handleDetails = (marker: MapMarker) => {
        if (marker.type === 'user') {
            navigation?.navigate('ContactProfile', { userId: marker.id });
        } else if (marker.type === 'shop') {
            navigation?.navigate('ShopDetails', { shopId: marker.id });
        } else if (marker.type === 'ad') {
            navigation?.navigate('AdDetail', { adId: marker.id });
        } else if (marker.type === 'cafe') {
            navigation?.navigate('CafeDetail', { cafeId: marker.id });
        }
    };

    const handleBuildRoute = async (targetMarker?: MapMarker) => {
        const marker = targetMarker || selectedMarker;
        const hasUserCoords =
            typeof user?.latitude === 'number' &&
            typeof user?.longitude === 'number';
        if (!marker || !hasUserCoords) {
            Alert.alert('Ошибка', 'Не удалось определить маршрут');
            return;
        }

        try {
            const startLat = user?.latitude;
            const startLng = user?.longitude;
            if (typeof startLat !== 'number' || typeof startLng !== 'number') {
                Alert.alert('Ошибка', 'Не удалось определить маршрут');
                return;
            }
            const result = await mapService.getRoute({
                startLat,
                startLng,
                endLat: marker.latitude,
                endLng: marker.longitude,
                mode: 'walk',
            });

            if (result.features && result.features[0]?.geometry?.coordinates && webViewRef.current) {
                const coords = result.features[0].geometry.coordinates;
                webViewRef.current.injectJavaScript(`
                    drawRoute(${JSON.stringify(coords)});
                    true;
                `);
            }
        } catch (error) {
            console.error('Failed to build route:', error);
            Alert.alert('Ошибка', 'Не удалось построить маршрут');
        }
    };

    const getMarkerColor = (type: string): string => {
        const markerKey = type as keyof MarkerConfig['markers'];
        if (mapConfig?.markers?.[markerKey]?.color) {
            return mapConfig.markers[markerKey].color;
        }
        switch (type) {
            case 'user': return markerColors.user;
            case 'shop': return markerColors.shop;
            case 'ad': return markerColors.ad;
            case 'cafe': return markerColors.cafe;
            default: return markerColors.default;
        }
    };

    const toggleFilter = (key: keyof MapFilters) => {
        setFilters(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        const normalizedText = text.trim();
        latestSearchRequestRef.current += 1;

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (normalizedText.length < 3) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            const requestId = ++latestSearchRequestRef.current;
            try {
                // Use map center as bias if available
                let lat, lng;
                if (lastBoundsRef.current) {
                    lat = (lastBoundsRef.current.north + lastBoundsRef.current.south) / 2;
                    lng = (lastBoundsRef.current.east + lastBoundsRef.current.west) / 2;
                }

                const result = await mapService.autocomplete(normalizedText, lat, lng);
                if (requestId !== latestSearchRequestRef.current || !isMountedRef.current) {
                    return;
                }
                if (result && Array.isArray(result.features)) {
                    setSearchResults(result.features);
                } else {
                    setSearchResults([]);
                }
            } catch (error) {
                console.error('Search error:', error);
                if (requestId === latestSearchRequestRef.current && isMountedRef.current) {
                    setSearchResults([]);
                }
            } finally {
                if (requestId === latestSearchRequestRef.current && isMountedRef.current) {
                    setIsSearching(false);
                }
            }
        }, 500);
    };

    const handleSelectResult = (item: SearchResultItem) => {
        if (!item?.properties) {
            return;
        }
        const { lat, lon, formatted } = item.properties;
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            return;
        }
        const safeFormatted = JSON.stringify(String(formatted ?? ''));
        if (webViewRef.current) {
            // First move view
            webViewRef.current.injectJavaScript(`
                map.setView([${lat}, ${lon}], 16);
                showSearchMarker(${lat}, ${lon}, ${safeFormatted});
                true;
            `);
        }
        setSearchQuery('');
        setSearchResults([]);
        setIsSearching(false);
        Keyboard.dismiss();
    };

    const hasUserCoords =
        typeof user?.latitude === 'number' &&
        typeof user?.longitude === 'number';
    const userLat = hasUserCoords ? user.latitude : INITIAL_LAT;
    const userLng = hasUserCoords ? user.longitude : INITIAL_LNG;
    const userLatForScript = typeof user?.latitude === 'number' ? user.latitude : 0;
    const userLngForScript = typeof user?.longitude === 'number' ? user.longitude : 0;
    const effectiveTileUrl = tileUrl || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    // Leaflet HTML content
    const mapHtml = useMemo(() => `
<!DOCTYPE html>
<html>
<!-- v2.3 Update -->
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css" />
    <script src="https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body, #map { width: 100%; height: 100%; }
        .custom-marker {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 2px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .custom-marker svg {
            width: 16px;
            height: 16px;
            fill: white;
        }
        .cluster-marker {
            min-width: 50px;
            padding: 6px 10px;
            border-radius: 10px;
            text-align: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .cluster-city {
            font-size: 10px;
            opacity: 0.9;
            max-width: 100px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            display: block;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        // Initialize map
        var map = L.map('map', {
            zoomControl: false
        }).setView([${userLat}, ${userLng}], 4);

        // Notify React Native that map is ready
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady', info: 'Map initialized at zoom 4' }));

        // Send initial bounds immediately so filters work right away
        var bounds = map.getBounds();
        window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'boundsChanged',
            bounds: {
                north: bounds.getNorth(),
                south: bounds.getSouth(),
                east: bounds.getEast(),
                west: bounds.getWest()
            },
            zoom: map.getZoom()
        }));

        // Add tile layer
        L.tileLayer('${effectiveTileUrl}', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Marker layers
        // Use MarkerClusterGroup to handle overlap (Spiderfy)
        var markersLayer = L.markerClusterGroup({
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            spiderfyOnMaxZoom: true,
            maxClusterRadius: 40,
            disableClusteringAtZoom: 18
        }).addTo(map);
        var clustersLayer = L.layerGroup().addTo(map);
        var routeLayer = L.layerGroup().addTo(map);
        var searchLayer = L.layerGroup().addTo(map);
        var userMarker = null;

        // Add user location marker
        if (${hasUserCoords}) {
            userMarker = L.circleMarker([${userLatForScript}, ${userLngForScript}], {
                radius: 8,
                fillColor: '${colors.accent}',
                color: '${colors.textPrimary}',
                weight: 2,
                opacity: 1,
                fillOpacity: 1
            }).addTo(map);
        }


        var savedClusters = [];
        var activeFilters = { user: true, shop: true, ad: true, cafe: true };

        window.setFilters = function(filters) {
            activeFilters = filters;
            renderClusters();
        };

        map.on('zoomend', function() {
            renderClusters();
        });

        // Map events
        map.on('moveend', function() {
            var bounds = map.getBounds();
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'boundsChanged',
                bounds: {
                    north: bounds.getNorth(),
                    south: bounds.getSouth(),
                    east: bounds.getEast(),
                    west: bounds.getWest()
                },
                zoom: map.getZoom()
            }));
        });

        map.on('click', function() {
            searchLayer.clearLayers();
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapClick' }));
        });

        // Icon SVGs
        var icons = {
            user: '<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>',
            shop: '<svg viewBox="0 0 24 24"><path d="M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z"/></svg>',
            ad: '<svg viewBox="0 0 24 24"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg>',
            cafe: '<svg viewBox="0 0 24 24"><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4v-2z"/></svg>'
        };

        var colors = {
            user: '${markerColors.user}',
            shop: '${markerColors.shop}',
            ad: '${markerColors.ad}',
            cafe: '${markerColors.cafe}'
        };

        function updateMarkers(markers) {
            markersLayer.clearLayers();
            
            // If we have markers, hide clusters.
            // If no markers (e.g. filtered out), try to render clusters (which handles its own zoom/filter logic)
            if (markers.length > 0) {
                clustersLayer.clearLayers();
            } else {
                renderClusters();
            }
            
            markers.forEach(function(m) {
                var color = colors[m.type] || '${markerColors.default}';
                var icon = L.divIcon({
                    className: '',
                    html: '<div class="custom-marker" style="background-color:' + color + '">' + (icons[m.type] || '') + '</div>',
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                });

                var marker = L.marker([m.latitude, m.longitude], { icon: icon });
                marker.on('click', function(e) {
                    L.DomEvent.stopPropagation(e);
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'markerClick',
                        id: m.id,
                        markerType: m.type
                    }));
                });
                markersLayer.addLayer(marker);
            });
        }

        function updateClusters(clusters) {
            savedClusters = clusters || [];
            renderClusters();
        }

        function renderClusters() {
            clustersLayer.clearLayers();

            // Aggressively hide clusters if zoomed in
            if (map.getZoom() >= 10) {
                return;
            }
            
            if (!map.hasLayer(clustersLayer)) {
                map.addLayer(clustersLayer);
            }
            
            savedClusters.forEach(function(c) {
                // Calculate visible count based on active filters
                var visibleCount = 0;
                if (activeFilters.user) visibleCount += (c.userCount || 0);
                if (activeFilters.shop) visibleCount += (c.shopCount || 0);
                if (activeFilters.ad) visibleCount += (c.adCount || 0);
                if (activeFilters.cafe) visibleCount += (c.cafeCount || 0);

                if (visibleCount === 0) return;

                // Determine color based on content type (considering only visible)
                var color = '${markerColors.user}';
                var u = activeFilters.user ? (c.userCount || 0) : 0;
                var s = activeFilters.shop ? (c.shopCount || 0) : 0;
                var a = activeFilters.ad ? (c.adCount || 0) : 0;
                var cf = activeFilters.cafe ? (c.cafeCount || 0) : 0;

                // Simple logic: pick dominant color of visible items
                if (cf > 0 && cf >= u && cf >= s && cf >= a) {
                    color = '${markerColors.cafe}';
                } else if (s > 0 && s >= u && s >= a && s >= cf) {
                    color = '${markerColors.shop}';
                } else if (a > 0 && a >= u && a >= s && a >= cf) {
                    color = '${markerColors.ad}';
                } else if (u > 0) {
                    color = '${markerColors.user}';
                }
                
                // If cluster is very large, use black/dark
                if (visibleCount > 50) color = '${colors.textPrimary}';

                var icon = L.divIcon({
                    className: '',
                    html: '<div class="cluster-marker" style="background-color:' + color + '"><div>' + visibleCount + '</div><div class="cluster-city">' + c.city + '</div></div>',
                    iconSize: [60, 40],
                    iconAnchor: [30, 20]
                });

                var marker = L.marker([c.latitude, c.longitude], { icon: icon });
                marker.on('click', function() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'clusterClick',
                        lat: c.latitude,
                        lng: c.longitude,
                        city: c.city
                    }));
                });
                clustersLayer.addLayer(marker);
            });
        }

        function drawRoute(coordinates) {
            routeLayer.clearLayers();
            
            // Convert from [lng, lat] to [lat, lng]
            var latlngs = coordinates.map(function(c) {
                return [c[1], c[0]];
            });
            
            var polyline = L.polyline(latlngs, {
                color: '${colors.accent}',
                weight: 4,
                opacity: 0.8
            });
            
            routeLayer.addLayer(polyline);
            map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
        }

        function clearRoute() {
            routeLayer.clearLayers();
        }

        function showSearchMarker(lat, lng, title) {
            searchLayer.clearLayers();
            
            var icon = L.divIcon({
                className: '',
                html: '<div class="custom-marker" style="background-color:${colors.warning}"><svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>',
                iconSize: [32, 32],
                iconAnchor: [16, 32],
                popupAnchor: [0, -32]
            });

            L.marker([lat, lng], { icon: icon })
                .bindPopup(title)
                .addTo(searchLayer)
                .openPopup();
        }
    </script>
</body>
</html>
    `, [colors.accent, colors.textPrimary, colors.warning, effectiveTileUrl, hasUserCoords, markerColors.ad, markerColors.cafe, markerColors.default, markerColors.shop, markerColors.user, userLat, userLatForScript, userLng, userLngForScript]);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* WebView Map */}
            <WebView
                ref={webViewRef}
                source={{ html: mapHtml }}
                style={styles.map}
                onMessage={handleMessage}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                originWhitelist={['*']}
                mixedContentMode="always"
                allowFileAccess={true}
                allowUniversalAccessFromFileURLs={true}
            />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.surfaceElevated }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation?.goBack()}
                >
                    <ArrowLeft size={24} color={colors.textPrimary} />
                </TouchableOpacity>

                <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Search size={18} color={colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.textPrimary }]}
                        placeholder={t('map.search_placeholder', 'Поиск по адресу...')}
                        placeholderTextColor={colors.textSecondary}
                        value={searchQuery}
                        onChangeText={handleSearch}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => {
                            setSearchQuery('');
                            setSearchResults([]);
                            Keyboard.dismiss();
                        }} style={styles.clearButton}>
                            <X size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                    {isSearching && (
                        <ActivityIndicator size="small" color={colors.textSecondary} style={styles.searchingIndicator} />
                    )}
                </View>
            </View>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
                <View style={[styles.searchResultsContainer, { backgroundColor: colors.surfaceElevated }]}>
                    <FlatList
                        data={searchResults}
                        keyExtractor={(item) => {
                            const lat = item?.properties?.lat ?? 0;
                            const lon = item?.properties?.lon ?? 0;
                            const formatted = item?.properties?.formatted ?? '';
                            return `${formatted}-${lat}-${lon}`;
                        }}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.searchItem, { borderBottomColor: colors.border }]}
                                onPress={() => handleSelectResult(item)}
                            >
                                <View style={styles.searchItemIcon}>
                                    <Search size={16} color={colors.textSecondary} />
                                </View>
                                <View style={styles.flexOne}>
                                    <Text style={[styles.searchItemText, { color: colors.textPrimary }]}>
                                        {item.properties.formatted}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        keyboardShouldPersistTaps="handled"
                    />
                </View>
            )}

            {/* Filter buttons */}
            <View style={[styles.filterBar, { backgroundColor: colors.surfaceElevated }]}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterBarContent}
                >
                    <TouchableOpacity
                        style={[
                            styles.filterChip,
                            { borderColor: colors.border },
                            filters.showUsers && { ...styles.filterChipActive, backgroundColor: markerColors.user, borderColor: markerColors.user },
                        ]}
                        onPress={() => toggleFilter('showUsers')}
                    >
                        <Users size={14} color={colors.textPrimary} />
                        <Text style={[styles.filterChipText, { color: colors.textPrimary }]}>
                            Люди
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.filterChip,
                            { borderColor: colors.border },
                            filters.showShops && { ...styles.filterChipActive, backgroundColor: markerColors.shop, borderColor: markerColors.shop },
                        ]}
                        onPress={() => toggleFilter('showShops')}
                    >
                        <Store size={14} color={colors.textPrimary} />
                        <Text style={[styles.filterChipText, { color: colors.textPrimary }]}>
                            Магазины
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.filterChip,
                            { borderColor: colors.border },
                            filters.showAds && { ...styles.filterChipActive, backgroundColor: markerColors.ad, borderColor: markerColors.ad },
                        ]}
                        onPress={() => toggleFilter('showAds')}
                    >
                        <Tag size={14} color={colors.textPrimary} />
                        <Text style={[styles.filterChipText, { color: colors.textPrimary }]}>
                            Объявления
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.filterChip,
                            { borderColor: colors.border },
                            filters.showCafes && { ...styles.filterChipActive, backgroundColor: markerColors.cafe, borderColor: markerColors.cafe },
                        ]}
                        onPress={() => toggleFilter('showCafes')}
                    >
                        <Coffee size={14} color={colors.textPrimary} />
                        <Text style={[styles.filterChipText, { color: colors.textPrimary }]}>
                            Кафе
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* Floating action buttons */}
            <View style={styles.fabContainer}>
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: colors.surfaceElevated }]}
                    onPress={handleLocateMe}
                >
                    <LocateFixed size={22} color={colors.accent} />
                </TouchableOpacity>
            </View>

            {/* Selected marker info */}
            {selectedMarker && (
                <View style={[styles.infoCard, { backgroundColor: colors.surfaceElevated }]}>
                    <View style={styles.infoHeader}>
                        <View style={[styles.infoIcon, { backgroundColor: getMarkerColor(selectedMarker.type) }]}>
                            {selectedMarker.type === 'user' && <Users size={20} color={colors.textPrimary} />}
                            {selectedMarker.type === 'shop' && <Store size={20} color={colors.textPrimary} />}
                            {selectedMarker.type === 'ad' && <Tag size={20} color={colors.textPrimary} />}
                            {selectedMarker.type === 'cafe' && <Coffee size={20} color={colors.textPrimary} />}
                        </View>
                        <View style={styles.infoContent}>
                            <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>
                                {selectedMarker.title}
                            </Text>
                            {selectedMarker.subtitle && (
                                <Text style={[styles.infoSubtitle, { color: colors.textSecondary }]}>
                                    {selectedMarker.subtitle}
                                </Text>
                            )}
                            {selectedMarker.distance !== undefined && (
                                <Text style={[styles.infoDistance, { color: colors.accent }]}>
                                    {mapService.formatDistance(selectedMarker.distance)}
                                </Text>
                            )}
                        </View>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setSelectedMarker(null)}
                        >
                            <X size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.infoActions}>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: colors.accent }]}
                            onPress={() => handleBuildRoute()}
                        >
                            <Route size={16} color={colors.textPrimary} />
                            <Text style={styles.actionButtonText}>Маршрут</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, styles.borderedButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                            onPress={() => {
                                if (selectedMarker.type === 'user') {
                                    navigation?.navigate('ContactProfile', { userId: selectedMarker.id });
                                } else if (selectedMarker.type === 'shop') {
                                    navigation?.navigate('ShopDetails', { shopId: selectedMarker.id });
                                } else if (selectedMarker.type === 'ad') {
                                    navigation?.navigate('AdDetail', { adId: selectedMarker.id });
                                } else if (selectedMarker.type === 'cafe') {
                                    navigation?.navigate('CafeDetail', { cafeId: selectedMarker.id });
                                }
                            }}
                        >
                            <Text style={[styles.actionButtonText, { color: colors.textPrimary }]}>Подробнее</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Bottom Sheet */}
            <BottomSheet
                ref={bottomSheetRef}
                index={0}
                snapPoints={snapPoints}
                backgroundStyle={{ backgroundColor: colors.surfaceElevated }}
                handleIndicatorStyle={{ backgroundColor: colors.border }}
            >
                <View style={styles.sheetContainer}>
                    <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                        {t('map.near_objects', 'Объекты поблизости')} ({markers.length})
                    </Text>
                    <BottomSheetFlatList
                        data={markers}
                        keyExtractor={(item) => `${item.type}-${item.id}`}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[styles.card, { backgroundColor: colors.surface }]}
                                onPress={() => handleFocusMarker(item)}
                            >
                                <View style={styles.cardMain}>
                                    <View style={styles.imageContainer}>
                                        {item.avatarUrl ? (
                                            <Image
                                                source={{ uri: item.avatarUrl }}
                                                style={styles.cardImage}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <View style={[styles.cardImagePlaceholder, { backgroundColor: getMarkerColor(item.type) }]}>
                                                {item.type === 'user' && <Users size={24} color={colors.textPrimary} />}
                                                {item.type === 'shop' && <Store size={24} color={colors.textPrimary} />}
                                                {item.type === 'ad' && <Tag size={24} color={colors.textPrimary} />}
                                                {item.type === 'cafe' && <Coffee size={24} color={colors.textPrimary} />}
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.cardContent}>
                                        <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                                            {item.title}
                                        </Text>
                                        {item.subtitle && (
                                            <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                                                {item.subtitle}
                                            </Text>
                                        )}
                                        {item.distance !== undefined && (
                                            <Text style={[styles.cardDistance, { color: colors.accent }]}>
                                                {mapService.formatDistance(item.distance)}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                                <View style={styles.cardActions}>
                                    <TouchableOpacity
                                        style={[styles.smallActionButton, { backgroundColor: colors.accent }]}
                                        onPress={() => {
                                            setSelectedMarker(item);
                                            handleBuildRoute(item);
                                        }}
                                    >
                                        <Route size={16} color={colors.textPrimary} />
                                        <Text style={styles.smallActionButtonText}>Маршрут</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.smallActionButton, styles.borderedButton, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                                        onPress={() => handleDetails(item)}
                                    >
                                        <ExternalLink size={16} color={colors.textPrimary} />
                                        <Text style={[styles.smallActionButtonText, { color: colors.textPrimary }]}>Инфо</Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        )}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={{ color: colors.textSecondary }}>
                                    {t('map.no_markers_visible', 'В этой области нет объектов')}
                                </Text>
                            </View>
                        }
                    />
                </View>
            </BottomSheet>

            {/* Loading overlay */}
            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={colors.accent} />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    header: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 20,
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        shadowColor: 'rgba(0,0,0,1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    filterBar: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 120 : 90,
        left: 16,
        right: 16,
        borderRadius: 12,
        shadowColor: 'rgba(0,0,0,1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        overflow: 'hidden',
    },
    filterBarContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'transparent',
        gap: 4,
    },
    filterChipActive: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '500',
    },
    fabContainer: {
        position: 'absolute',
        bottom: 180,
        right: 16,
        gap: 12,
    },
    fab: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: 'rgba(0,0,0,1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
    },
    infoCard: {
        position: 'absolute',
        bottom: 24,
        left: 16,
        right: 16,
        borderRadius: 16,
        padding: 16,
        shadowColor: 'rgba(0,0,0,1)',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    infoIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    infoContent: {
        flex: 1,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    infoSubtitle: {
        fontSize: 13,
        marginBottom: 2,
    },
    infoDistance: {
        fontSize: 12,
        fontWeight: '500',
    },
    closeButton: {
        padding: 4,
    },
    infoActions: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 10,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    borderedButton: {
        borderWidth: 1,
    },
    actionButtonText: {
        color: 'rgba(255,255,255,1)',
        fontSize: 14,
        fontWeight: '500',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(2,6,23,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    sheetContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    sheetTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 16,
        marginTop: 8,
    },
    listContent: {
        paddingBottom: 24,
    },
    card: {
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        shadowColor: 'rgba(0,0,0,1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardMain: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    imageContainer: {
        width: 60,
        height: 60,
        borderRadius: 12,
        overflow: 'hidden',
        marginRight: 12,
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    cardImagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    cardSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    cardDistance: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
    },
    cardActions: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 8,
    },
    smallActionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        gap: 4,
    },
    smallActionButtonText: {
        color: 'rgba(255,255,255,1)',
        fontSize: 12,
        fontWeight: '600',
    },
    emptyContainer: {
        padding: 32,
        alignItems: 'center',
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
        borderRadius: 12,
        paddingHorizontal: 0,
        borderWidth: 1,
        borderColor: 'transparent',
        marginLeft: 8,
    },
    searchIcon: {
        marginLeft: 10,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        height: '100%',
        paddingVertical: 0,
    },
    clearButton: {
        padding: 8,
    },
    searchingIndicator: {
        marginRight: 10,
    },
    searchResultsContainer: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 120 : 90,
        left: 16,
        right: 16,
        maxHeight: 250,
        borderRadius: 12,
        shadowColor: 'rgba(0,0,0,1)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
        zIndex: 1000,
        overflow: 'hidden',
    },
    searchItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    searchItemIcon: {
        marginRight: 12,
    },
    flexOne: {
        flex: 1,
    },
    searchItemText: {
        fontSize: 14,
    },
});

export default MapGeoapifyScreen;
