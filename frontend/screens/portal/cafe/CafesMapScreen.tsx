import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
    Alert,
    Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
    ArrowLeft,
    LocateFixed,
    ChevronRight,
    MapPin,
    Navigation,
} from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '../../../context/SettingsContext';
import { useUser } from '../../../context/UserContext';
import { mapService } from '../../../services/mapService';
import { geoLocationService } from '../../../services/geoLocationService';
import { MapMarker, MapCluster } from '../../../types/map';

const { width, height } = Dimensions.get('window');
const INITIAL_LAT = 55.7558;
const INITIAL_LNG = 37.6173;

interface Props {
    navigation?: any;
    route?: any;
}

export const CafesMapScreen: React.FC<Props> = ({ navigation, route }) => {
    const { t } = useTranslation();
    const { isDarkMode } = useSettings();
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

    const effectiveTileUrl = tileUrl || 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

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
        html, body, #map { width: 100%; height: 100%; background: #0a0a14; }
        .leaflet-container { background: #0a0a14 !important; }
        .cafe-marker {
            width: 36px;
            height: 36px;
            background: linear-gradient(135deg, #F59E0B, #D97706);
            border: 2px solid rgba(255,255,255,0.8);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
            transform: rotate(45deg);
        }
        .cafe-marker svg { 
            width: 20px; 
            height: 20px; 
            fill: #1a1a2e;
            transform: rotate(-45deg);
        }
        .cluster-marker {
            background: rgba(245, 158, 11, 0.9);
            border-radius: 50%;
            width: 40px !important;
            height: 40px !important;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #1a1a2e;
            font-weight: 900;
            font-family: sans-serif;
            border: 2px solid rgba(255,255,255,0.5);
            box-shadow: 0 0 20px rgba(245, 158, 11, 0.3);
        }
        .leaflet-tile-pane { filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.3) brightness(0.7); }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        var map = L.map('map', { zoomControl: false }).setView([${initialLat}, ${initialLng}], ${initialZoom});
        L.tileLayer('${effectiveTileUrl}', {
            attribution: '&copy; CartoDB'
        }).addTo(map);
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
                    html: '<div class="cafe-marker"><svg viewBox="0 0 24 24"><path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg></div>',
                    iconSize: [36, 36],
                    iconAnchor: [18, 18]
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
                    iconSize: [40, 40],
                    iconAnchor: [20, 20]
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
        <View style={styles.container}>
            <LinearGradient colors={['#0a0a14', '#12122b']} style={StyleSheet.absoluteFill} />

            <WebView
                ref={webViewRef}
                source={{ html: mapHtml }}
                style={styles.map}
                onMessage={handleMessage}
                containerStyle={{ backgroundColor: 'transparent' }}
            />

            <SafeAreaView style={styles.header} edges={['top']}>
                <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={22} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('cafe.map.title', 'Карта кафе')}</Text>
            </SafeAreaView>

            <TouchableOpacity style={styles.locateBtn} onPress={handleLocateMe}>
                <LinearGradient
                    colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                    style={styles.locateGradient}
                >
                    <LocateFixed size={24} color="#F59E0B" />
                </LinearGradient>
            </TouchableOpacity>

            {selectedMarker && (
                <View style={styles.cardContainer}>
                    <TouchableOpacity
                        style={styles.markerCard}
                        onPress={() => navigation.navigate('CafeDetail', { cafeId: selectedMarker.id })}
                        activeOpacity={0.9}
                    >
                        <View style={styles.cardContent}>
                            <View style={styles.cardIcon}>
                                <MapPin size={22} color="#F59E0B" />
                            </View>
                            <View style={styles.cardText}>
                                <Text style={styles.cardTitle}>{selectedMarker.title}</Text>
                                <Text style={styles.cardSubtitle} numberOfLines={1}>{selectedMarker.subtitle}</Text>
                            </View>
                            <View style={styles.goBtn}>
                                <ChevronRight size={20} color="#1a1a2e" />
                            </View>
                        </View>

                        <View style={styles.cardFooter}>
                            <TouchableOpacity style={styles.navBtn}>
                                <Navigation size={14} color="#F59E0B" />
                                <Text style={styles.navBtnText}>{t('map.navigate', 'Маршрут')}</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </View>
            )}

            {isLoading && (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#F59E0B" />
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
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 10,
        zIndex: 10,
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(10, 10, 20, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Cinzel-Bold',
        marginLeft: 16,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    locateBtn: {
        position: 'absolute',
        bottom: 140,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    locateGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContainer: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
        zIndex: 20,
    },
    markerCard: {
        backgroundColor: 'rgba(25, 25, 45, 0.85)',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 15,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardText: {
        flex: 1,
    },
    cardTitle: {
        color: '#fff',
        fontSize: 18,
        fontFamily: 'Cinzel-Bold',
        marginBottom: 4,
    },
    cardSubtitle: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
        fontWeight: '600',
    },
    goBtn: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: '#F59E0B',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardFooter: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingTop: 16,
    },
    navBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    navBtnText: {
        color: '#F59E0B',
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    loader: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0a0a14',
        justifyContent: 'center',
        alignItems: 'center',
    }
});

export default CafesMapScreen;
