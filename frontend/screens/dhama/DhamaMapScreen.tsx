import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';

import { RootStackParamList } from '../../types/navigation';
import { HolyPlaceMapMarker } from '../../types/dhama';
import { dhamaService } from '../../services/dhamaService';
import { ScreenScaffold } from '../../components/theme/ScreenScaffold';
import { useSettings } from '../../context/SettingsContext';

type Props = NativeStackScreenProps<RootStackParamList, 'DhamaMap'>;

const buildHtml = (markers: HolyPlaceMapMarker[]) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
      body { background: #f3efe6; }
      .popup-title { font-weight: 700; margin-bottom: 4px; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const markers = ${JSON.stringify(markers)};
      const center = markers.length ? [markers[0].latitude, markers[0].longitude] : [23.5937, 78.9629];
      const map = L.map('map').setView(center, markers.length ? 5 : 4);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);
      markers.forEach((item) => {
        const marker = L.marker([item.latitude, item.longitude]).addTo(map);
        marker.bindPopup('<div class="popup-title">' + item.title + '</div><div>' + item.city + ', ' + item.state + '</div>');
        marker.on('click', () => {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'select', slug: item.slug }));
        });
      });
    </script>
  </body>
</html>`;

export const DhamaMapScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const { vTheme } = useSettings();
  const [markers, setMarkers] = useState<HolyPlaceMapMarker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    dhamaService.getMapMarkers({ limit: 200 })
      .then((payload) => {
        if (mounted) {
          setMarkers(payload.markers || []);
        }
      })
      .catch((error) => {
        console.warn('[DhamaMap] failed to load markers', error);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const html = useMemo(() => buildHtml(markers), [markers]);

  return (
    <ScreenScaffold contentStyle={styles.container}>
      <Text style={[styles.title, { color: vTheme.colors.text }]}>{t('dhama.mapTitle')}</Text>
      <Text style={[styles.subtitle, { color: vTheme.colors.textSecondary }]}>{t('dhama.mapSubtitle')}</Text>
      <View style={[styles.mapFrame, { borderColor: vTheme.colors.divider }]}>
        {loading ? <ActivityIndicator color={vTheme.colors.primary} style={styles.loader} /> : null}
        <WebView
          source={{ html }}
          style={styles.webview}
          onMessage={(event) => {
            try {
              const payload = JSON.parse(event.nativeEvent.data);
              if (payload?.type === 'select' && payload?.slug) {
                navigation.navigate('HolyPlaceDetail', { slug: payload.slug });
              }
            } catch (error) {
              console.warn('[DhamaMap] invalid postMessage payload', error);
            }
          }}
        />
      </View>

      <View style={styles.markerList}>
        {markers.slice(0, 8).map((marker) => (
          <TouchableOpacity
            key={marker.id}
            onPress={() => navigation.navigate('HolyPlaceDetail', { slug: marker.slug })}
            style={[styles.markerCard, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}
          >
            <Text style={[styles.markerTitle, { color: vTheme.colors.text }]}>{marker.title}</Text>
            <Text style={{ color: vTheme.colors.textSecondary }}>{marker.city}, {marker.state}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 14 },
  mapFrame: { borderWidth: 1, borderRadius: 20, overflow: 'hidden', height: 360, position: 'relative' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  loader: { position: 'absolute', zIndex: 3, top: 16, right: 16 },
  markerList: { gap: 10 },
  markerCard: { borderWidth: 1, borderRadius: 14, padding: 12 },
  markerTitle: { fontSize: 16, fontWeight: '700' },
});
