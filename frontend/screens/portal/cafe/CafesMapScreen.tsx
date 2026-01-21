import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    Alert,
    Dimensions,
    Image,
    TextInput,
    Keyboard,
    FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft,
    LocateFixed,
    Coffee,
    X,
    Search,
    Navigation,
    Compass,
} from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { useSettings } from '../../../context/SettingsContext';
import { useUser } from '../../../context/UserContext';
import { mapService } from '../../../services/mapService';
import { geoLocationService } from '../../../services/geoLocationService';
import { MapMarker, MapCluster } from '../../../types/map';

const INITIAL_LAT = 55.7558;
const INITIAL_LNG = 37.6173;

interface Props {
    navigation?: any;
    route?: any;
}

export const CafesMapScreen: React.FC<Props> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { vTheme, isDarkMode } = useSettings();
    const { user } = useUser();

    const webViewRef = useRef<WebView>(null);
    const lastBoundsRef = useRef<any>(null);
    const lastZoomRef = useRef<number>(10);

    const [markers, setMarkers] = useState<MapMarker[]>([]);
    const [clusters, setClusters] = useState<MapCluster[]>([]);
    const [selectedMarker, setSelectedMarker] = useState<MapMarker | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [mapReady, setMapReady] = useState(false);
    const [tileUrl, setTileUrl] = useState<string>('');

    useEffect(() => {
        loadTileConfig();
        loadSummary();
    }, []);

    useEffect(() => {
        if (mapReady && webViewRef.current && markers) {
            webViewRef.current.injectJavaScript(`
                updateMarkers(${JSON.stringify(markers)});
                true;
            `);
        }
    }, [markers, mapReady]);

    useEffect(() => {
        if (mapReady && webViewRef.current && clusters) {
            webViewRef.current.injectJavaScript(`
                updateClusters(${JSON.stringify(clusters)});
                true;
            `);
        }
    }, [clusters, mapReady]);

    const loadTileConfig = async () => {
        try {
            const config = await mapService.getTileConfig();
            setTileUrl(config.tileUrl);
        } catch (error) {
            setTileUrl('https://tile.openstreetmap.org/{z}/{x}/{y}.png');
        }
    };

    const loadSummary = async () => {
        try {
            const summary = await mapService.getSummary();
            setClusters(summary?.clusters || []);
        } catch (error) {
            console.error('Failed to load summary:', error);
        }
    };

    const loadMarkers = async (bounds: any, zoom: number) => {
        if (zoom < 10) return;
        try {
            const result = await mapService.getMarkers({
                latMin: bounds.south,
                latMax: bounds.north,
                lngMin: bounds.west,
                lngMax: bounds.east,
                categories: ['cafe'],
                limit: 100,
                userLat: user?.latitude,
                userLng: user?.longitude,
            });
            setMarkers(result?.markers || []);
        } catch (error) {
            console.error('Failed to load markers:', error);
        }
    };

    const handleMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            switch (data.type) {
                case 'mapReady':
                    setMapReady(true);
                    setIsLoading(false);
                    break;
                case 'markerClick':
                    const marker = markers.find(m => m.id === data.id);
                    if (marker) setSelectedMarker(marker);
                    break;
                case 'clusterClick':
                    webViewRef.current?.injectJavaScript(`
                        map.setView([${data.lat}, ${data.lng}], 12);
                        true;
                    `);
                    break;
                case 'boundsChanged':
                    lastBoundsRef.current = data.bounds;
                    lastZoomRef.current = data.zoom;
                    loadMarkers(data.bounds, data.zoom);
                    break;
                case 'mapClick':
                    setSelectedMarker(null);
                    break;
            }
        } catch (error) {
            console.error('WebView message error:', error);
        }
    };

    const handleLocateMe = async () => {
        try {
            const location = await geoLocationService.detectLocation();
            if (location && webViewRef.current) {
                webViewRef.current.injectJavaScript(`
                    map.setView([${location.latitude}, ${location.longitude}], 15);
                    true;
                `);
            }
        } catch (error) {
            Alert.alert(t('common.error'), t('map.location_error'));
        }
    };

    const focusMarker = route?.params?.focusMarker;
    const initialLat = focusMarker ? focusMarker.latitude : (user?.latitude || INITIAL_LAT);
    const initialLng = focusMarker ? focusMarker.longitude : (user?.longitude || INITIAL_LNG);
    const initialZoom = focusMarker ? 15 : 4;

    const effectiveTileUrl = tileUrl || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    const mapHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        * { margin: 0; padding: 0; }
        html, body, #map { width: 100%; height: 100%; }
        .cafe-marker {
            width: 32px;
            height: 32px;
            background-color: #EA580C;
            border: 2px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .cafe-marker svg { width: 18px; height: 18px; fill: white; }
        .cluster-marker {
            background-color: #EA580C;
            border-radius: 10px;
            padding: 5px;
            color: white;
            font-weight: bold;
            text-align: center;
            border: 2px solid white;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        var map = L.map('map', { zoomControl: false }).setView([${initialLat}, ${initialLng}], ${initialZoom});
        L.tileLayer('${effectiveTileUrl}').addTo(map);
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));

        var markersLayer = L.layerGroup().addTo(map);
        var clustersLayer = L.layerGroup().addTo(map);
        var savedClusters = [];

        function updateMarkers(markers) {
            markersLayer.clearLayers();
            if (markers.length > 0) clustersLayer.clearLayers();
            markers.forEach(function(m) {
                var icon = L.divIcon({
                    className: '',
                    html: '<div class="cafe-marker"><svg viewBox="0 0 24 24"><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4v-2z"/></svg></div>',
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                });
                var marker = L.marker([m.latitude, m.longitude], { icon: icon });
                marker.on('click', function(e) {
                    L.DomEvent.stopPropagation(e);
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerClick', id: m.id }));
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
            if (map.getZoom() >= 10) return;
            savedClusters.forEach(function(c) {
                if (!c.cafeCount) return;
                var icon = L.divIcon({
                    className: '',
                    html: '<div class="cluster-marker">' + c.cafeCount + '</div>',
                    iconSize: [40, 30]
                });
                var marker = L.marker([c.latitude, c.longitude], { icon: icon });
                marker.on('click', function() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'clusterClick', lat: c.latitude, lng: c.longitude }));
                });
                clustersLayer.addLayer(marker);
            });
        }

        map.on('moveend', function() {
            var b = map.getBounds();
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'boundsChanged',
                zoom: map.getZoom(),
                bounds: { north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() }
            }));
        });

        map.on('click', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapClick' }));
        });
        map.on('zoomend', renderClusters);
    </script>
</body>
</html>
    `;

    return (
        <View style={[styles.container, { backgroundColor: vTheme.colors.background }]}>
            <WebView
                ref={webViewRef}
                source={{ html: mapHtml }}
                style={styles.map}
                onMessage={handleMessage}
            />

            <View style={styles.header}>
                <TouchableOpacity style={[styles.roundBtn, { backgroundColor: vTheme.colors.backgroundSecondary }]} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={24} color={vTheme.colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: vTheme.colors.text }]}>{t('cafe.map.title', 'Карта кафе')}</Text>
            </View>

            <TouchableOpacity style={[styles.locateBtn, { backgroundColor: vTheme.colors.primary }]} onPress={handleLocateMe}>
                <LocateFixed size={24} color="#fff" />
            </TouchableOpacity>

            {selectedMarker && (
                <View style={[styles.markerCard, { backgroundColor: vTheme.colors.backgroundSecondary }]}>
                    <View style={styles.cardHeader}>
                        <View style={styles.cardInfo}>
                            <Text style={[styles.cardTitle, { color: vTheme.colors.text }]}>{selectedMarker.title}</Text>
                            <Text style={[styles.cardSubtitle, { color: vTheme.colors.textSecondary }]}>{selectedMarker.subtitle}</Text>
                        </View>
                        <TouchableOpacity style={[styles.detailsBtn, { backgroundColor: vTheme.colors.primary }]} onPress={() => navigation.navigate('CafeDetail', { cafeId: selectedMarker.id })}>
                            <Text style={styles.detailsBtnText}>{t('common.details', 'Подробнее')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    header: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 20,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    roundBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    headerTitle: {
        marginLeft: 15,
        fontSize: 20,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    locateBtn: {
        position: 'absolute',
        bottom: 120,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
    },
    markerCard: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        borderRadius: 16,
        padding: 15,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.34,
        shadowRadius: 6.27,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardInfo: { flex: 1, marginRight: 10 },
    cardTitle: { fontSize: 18, fontWeight: 'bold' },
    cardSubtitle: { fontSize: 13, marginTop: 2 },
    detailsBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
    detailsBtnText: { color: '#fff', fontWeight: 'bold' },
});
