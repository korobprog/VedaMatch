import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview/lib/WebViewTypes';
import { useTranslation } from 'react-i18next';

import { RootStackParamList } from '../../types/navigation';
import { HolyPlaceMapMarker } from '../../types/dhama';
import { dhamaService } from '../../services/dhamaService';
import { ScreenScaffold } from '../../components/theme/ScreenScaffold';
import { useSettings } from '../../context/SettingsContext';
import { DhamaSkeletonBlock } from './DhamaSkeleton';

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
      const safePost = (payload) => {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }
      };

      window.onerror = function(message, source, lineno, colno) {
        safePost({
          type: 'mapError',
          message: String(message || 'map_script_error'),
          source: String(source || ''),
          line: Number(lineno || 0),
          column: Number(colno || 0),
        });
      };

      window.onunhandledrejection = function(event) {
        safePost({
          type: 'mapError',
          message: String(event && event.reason ? event.reason : 'map_unhandled_rejection'),
        });
      };

      try {
        if (!window.L) {
          throw new Error('leaflet_not_loaded');
        }

        const markers = ${JSON.stringify(markers)};
        const center = markers.length ? [markers[0].latitude, markers[0].longitude] : [23.5937, 78.9629];
        const map = L.map('map').setView(center, markers.length ? 5 : 4);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(map);

        markers.forEach((item) => {
          const marker = L.marker([item.latitude, item.longitude]).addTo(map);
          marker.bindPopup('<div class="popup-title">' + item.title + '</div><div>' + item.city + ', ' + item.state + '</div>');
          marker.on('click', () => {
            safePost({ type: 'select', slug: item.slug });
          });
        });

        map.whenReady(() => {
          safePost({ type: 'mapReady', markersCount: markers.length });
        });
      } catch (error) {
        safePost({
          type: 'mapError',
          message: String(error && error.message ? error.message : error || 'map_init_failed'),
        });
      }
    </script>
  </body>
</html>`;

export const DhamaMapScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { vTheme } = useSettings();
  const [markers, setMarkers] = useState<HolyPlaceMapMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [webViewReloadKey, setWebViewReloadKey] = useState(0);
  const [webViewError, setWebViewError] = useState<string | null>(null);
  const [webViewStarted, setWebViewStarted] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setLoadError(false);
    setMapReady(false);
    setWebViewError(null);
    setWebViewStarted(false);
    dhamaService.getMapMarkers({ collection: route.params?.collectionSlug, limit: 200 })
      .then((payload) => {
        if (mounted) {
          setMarkers(payload.markers || []);
        }
      })
      .catch((error) => {
        console.warn('[DhamaMap] failed to load markers', error);
        if (mounted) {
          setMarkers([]);
          setLoadError(true);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [refreshKey, route.params?.collectionSlug]);

  useEffect(() => {
    if (loading || loadError || webViewError || mapReady || !webViewStarted) {
      return;
    }

    const timeout = setTimeout(() => {
      setWebViewError('map_init_timeout');
    }, 9000);

    return () => clearTimeout(timeout);
  }, [loadError, loading, mapReady, webViewError, webViewReloadKey, webViewStarted]);

  const html = useMemo(() => buildHtml(markers), [markers]);
  const skeletonColor = vTheme.colors.divider;
  const mapFailure = loadError || Boolean(webViewError);
  const retryMap = () => {
    setMapReady(false);
    setWebViewError(null);
    setWebViewStarted(false);
    setLoadError(false);
    setRefreshKey((current) => current + 1);
    setWebViewReloadKey((current) => current + 1);
  };

  const mapErrorBody = loadError
    ? t('dhama.mapErrorBody')
    : t('dhama.mapWebViewErrorBody');

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data);
      if (payload?.type === 'select' && payload?.slug) {
        navigation.navigate('HolyPlaceDetail', { slug: payload.slug });
        return;
      }

      if (payload?.type === 'mapReady') {
        setMapReady(true);
        setWebViewError(null);
        return;
      }

      if (payload?.type === 'mapError') {
        setWebViewError(String(payload?.message || 'map_runtime_error'));
      }
    } catch (error) {
      console.warn('[DhamaMap] invalid postMessage payload', error);
    }
  };

  return (
    <ScreenScaffold contentStyle={styles.container}>
      <Text style={[styles.title, { color: vTheme.colors.text }]}>{t('dhama.mapTitle')}</Text>
      <Text style={[styles.subtitle, { color: vTheme.colors.textSecondary }]}>{t('dhama.mapSubtitle')}</Text>
      {mapFailure ? (
        <View style={[styles.feedbackCard, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}>
          <Text style={[styles.feedbackTitle, { color: vTheme.colors.text }]}>{t('dhama.mapErrorTitle')}</Text>
          <Text style={[styles.feedbackBody, { color: vTheme.colors.textSecondary }]}>{mapErrorBody}</Text>
          <TouchableOpacity onPress={retryMap} style={[styles.feedbackButton, { borderColor: vTheme.colors.primary }]}>
            <Text style={[styles.feedbackButtonText, { color: vTheme.colors.primary }]}>{t('common.retry', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.mapFrame, { borderColor: vTheme.colors.divider }]}>
          {loading || !mapReady ? (
            <View style={styles.mapLoadingSurface}>
              <DhamaSkeletonBlock color={skeletonColor} style={styles.mapLoadingBlock} />
              <View style={styles.mapLegendRow}>
                <DhamaSkeletonBlock color={skeletonColor} style={styles.mapLegendChipWide} />
                <DhamaSkeletonBlock color={skeletonColor} style={styles.mapLegendChip} />
                <DhamaSkeletonBlock color={skeletonColor} style={styles.mapLegendChip} />
              </View>
            </View>
          ) : null}
          <WebView
            key={`dhama-map-${webViewReloadKey}`}
            source={{ html }}
            style={[styles.webview, loading || !mapReady ? styles.hiddenWebview : null]}
            onMessage={handleMessage}
            onLoadStart={() => {
              setWebViewStarted(true);
              setMapReady(false);
              setWebViewError(null);
            }}
            onLoadEnd={() => {
              setWebViewStarted(true);
            }}
            onError={(event) => {
              const description = event?.nativeEvent?.description || event?.nativeEvent?.title || 'webview_load_error';
              console.warn('[DhamaMap] webview load error', description);
              setWebViewError(String(description));
            }}
            onHttpError={(event) => {
              const statusCode = event?.nativeEvent?.statusCode;
              console.warn('[DhamaMap] webview http error', statusCode);
              setWebViewError(`http_${statusCode ?? 'error'}`);
            }}
            onRenderProcessGone={() => {
              console.warn('[DhamaMap] webview render process gone');
              setWebViewError('render_process_gone');
              return true;
            }}
            onContentProcessDidTerminate={() => {
              console.warn('[DhamaMap] webview content process terminated');
              setWebViewError('content_process_terminated');
              return true;
            }}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState={false}
            originWhitelist={['*']}
            mixedContentMode="always"
            allowFileAccess
            allowUniversalAccessFromFileURLs
            cacheEnabled
          />
          <Pressable onPress={() => {}} style={[styles.logoOverlay, styles.logoOverlaySurface, { borderColor: vTheme.colors.divider }]}>
            <Image source={require('../../assets/logo_veda_match.png')} style={styles.logoImage} resizeMode="contain" />
          </Pressable>
        </View>
      )}

      {!loading && !mapFailure && markers.length === 0 ? (
        <View style={[styles.feedbackCard, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}>
          <Text style={[styles.feedbackTitle, { color: vTheme.colors.text }]}>{t('dhama.mapEmptyTitle')}</Text>
          <Text style={[styles.feedbackBody, { color: vTheme.colors.textSecondary }]}>{t('dhama.mapEmptyBody')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('DhamaHome')} style={[styles.feedbackButton, { borderColor: vTheme.colors.primary }]}>
            <Text style={[styles.feedbackButtonText, { color: vTheme.colors.primary }]}>{t('dhama.showCollectionPlaces')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.markerList}>
          {loading
            ? Array.from({ length: 4 }).map((_, index) => (
              <View
                key={`marker-skeleton-${index}`}
                style={[styles.markerCard, { backgroundColor: vTheme.colors.surfaceElevated, borderColor: vTheme.colors.divider }]}
              >
                <DhamaSkeletonBlock color={skeletonColor} style={styles.markerTitleSkeleton} />
                <DhamaSkeletonBlock color={skeletonColor} style={styles.markerMetaSkeleton} />
              </View>
            ))
            : markers.slice(0, 8).map((marker) => (
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
      )}
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', lineHeight: 32 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: 2, marginBottom: 4 },
  mapFrame: { borderWidth: 1, borderRadius: 20, overflow: 'hidden', height: 360, position: 'relative' },
  mapLoadingSurface: { flex: 1, padding: 18, justifyContent: 'space-between' },
  mapLoadingBlock: { flex: 1, borderRadius: 18 },
  mapLegendRow: { flexDirection: 'row', gap: 10, paddingTop: 14 },
  mapLegendChipWide: { width: 118, height: 34, borderRadius: 999 },
  mapLegendChip: { width: 72, height: 34, borderRadius: 999 },
  webview: { flex: 1, backgroundColor: 'transparent' },
  hiddenWebview: { opacity: 0 },
  logoOverlay: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    zIndex: 4,
    width: 60,
    height: 40,
    borderTopLeftRadius: 5,
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: 6,
    paddingRight: 5,
  },
  logoOverlaySurface: { backgroundColor: 'rgba(255, 248, 235, 0.96)' },
  logoImage: { width: 55, height: 55, bottom: 5 },
  feedbackCard: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 10 },
  feedbackTitle: { fontSize: 17, fontWeight: '700' },
  feedbackBody: { fontSize: 14, lineHeight: 21 },
  feedbackButton: { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  feedbackButtonText: { fontSize: 13, fontWeight: '700' },
  markerList: { gap: 10 },
  markerCard: { borderWidth: 1, borderRadius: 14, padding: 12 },
  markerTitleSkeleton: { width: '62%', height: 18, borderRadius: 999 },
  markerMetaSkeleton: { width: '44%', height: 12, borderRadius: 999, marginTop: 8 },
  markerTitle: { fontSize: 16, fontWeight: '700' },
});
