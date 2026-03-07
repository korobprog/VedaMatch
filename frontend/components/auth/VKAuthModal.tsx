import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, RotateCcw } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent, WebViewNavigation } from 'react-native-webview/lib/WebViewTypes';
import { ModernVedicTheme } from '../../theme/ModernVedicTheme';
import { isVKAuthCallbackUrl } from '../../services/socialAuthService';

type VKAuthModalProps = {
  visible: boolean;
  authorizeUrl: string;
  title: string;
  loadingLabel: string;
  closeLabel: string;
  onClose: () => void;
  onComplete: (callbackUrl: string) => void;
};

const VK_WEBVIEW_BRIDGE_SCRIPT = `
  (function () {
    function postUrl() {
      if (!window.ReactNativeWebView) return;
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'vk-auth-url',
        url: window.location.href,
      }));
    }

    postUrl();
    window.addEventListener('load', postUrl);
    window.addEventListener('hashchange', postUrl);
  })();
  true;
`;

const safeParseBridgeMessage = (raw: string): string | null => {
  try {
    const payload = JSON.parse(raw) as { type?: string; url?: string };
    if (payload.type !== 'vk-auth-url' || typeof payload.url !== 'string') {
      return null;
    }
    return payload.url;
  } catch {
    return null;
  }
};

export const VKAuthModal: React.FC<VKAuthModalProps> = ({
  visible,
  authorizeUrl,
  title,
  loadingLabel,
  closeLabel,
  onClose,
  onComplete,
}) => {
  const webViewRef = useRef<WebView>(null);
  const resolvedRef = useRef(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) {
      resolvedRef.current = false;
      setLoading(true);
    }
  }, [visible]);

  const handleUrl = (url?: string) => {
    const nextUrl = String(url || '').trim();
    if (!nextUrl || resolvedRef.current || !isVKAuthCallbackUrl(nextUrl)) {
      return;
    }
    resolvedRef.current = true;
    onComplete(nextUrl);
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    handleUrl(safeParseBridgeMessage(event.nativeEvent.data));
  };

  const handleNavigationChange = (event: WebViewNavigation) => {
    handleUrl(event.url);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={onClose} activeOpacity={0.8}>
            <ArrowLeft size={18} color={ModernVedicTheme.colors.textPrimary} />
            <Text style={styles.headerButtonText}>{closeLabel}</Text>
          </TouchableOpacity>

          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>

          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => webViewRef.current?.reload()}
            activeOpacity={0.8}
          >
            <RotateCcw size={18} color={ModernVedicTheme.colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.body}>
          <WebView
            ref={webViewRef}
            source={{ uri: authorizeUrl }}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            injectedJavaScript={VK_WEBVIEW_BRIDGE_SCRIPT}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onMessage={handleMessage}
            onNavigationStateChange={handleNavigationChange}
            startInLoadingState={false}
          />

          {loading && (
            <View style={styles.loaderOverlay}>
              <ActivityIndicator color={ModernVedicTheme.colors.primary} />
              <Text style={styles.loaderText}>{loadingLabel}</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F3EA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148, 163, 184, 0.25)',
    backgroundColor: 'rgba(255, 253, 248, 0.98)',
  },
  headerButton: {
    minWidth: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerButtonText: {
    color: ModernVedicTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 12,
    color: ModernVedicTheme.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(248, 243, 234, 0.96)',
  },
  loaderText: {
    color: ModernVedicTheme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default VKAuthModal;
