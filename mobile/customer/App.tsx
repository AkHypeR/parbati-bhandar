import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';

const STORE_ORIGIN = process.env.EXPO_PUBLIC_STORE_ORIGIN || 'https://parbati-bhandar.pages.dev';
const STORE_HOST = new URL(STORE_ORIGIN).host;
const START_URL = STORE_ORIGIN + '/';

export default function App() {
  const webView = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setFailed(false);
    webView.current?.reload();
  }, []);

  const openExternal = useCallback((url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Unable to open link', 'No compatible app was found for this link.');
    });
  }, []);

  const shouldStartLoad = useCallback((request: { url: string; isTopFrame?: boolean }) => {
    const url = request.url;
    if (url.startsWith('about:blank')) return true;
    try {
      const parsed = new URL(url);
      if ((parsed.protocol === 'https:' || parsed.protocol === 'http:') && parsed.host === STORE_HOST && parsed.protocol === 'https:') {
        return true;
      }
    } catch {
      // Non-web schemes are handled by the device.
    }
    if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('sms:') ||
        url.startsWith('whatsapp:') || url.startsWith('intent:') || url.startsWith('https://wa.me/') ||
        url.startsWith('https://api.whatsapp.com/')) {
      openExternal(url);
    } else if (url.startsWith('https://') || url.startsWith('http://')) {
      openExternal(url);
    }
    return false;
  }, [openExternal]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack) {
        webView.current?.goBack();
      } else {
        Alert.alert('Exit Parbati Bhandar?', 'Do you want to close the app?', [
          { text: 'Stay', style: 'cancel' },
          { text: 'Exit', style: 'destructive', onPress: () => BackHandler.exitApp() },
        ]);
      }
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  const onNavigationStateChange = (state: WebViewNavigation) => {
    setCanGoBack(state.canGoBack);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View style={styles.topBar}>
        <View style={styles.brandMark}><Text style={styles.brandMarkText}>প</Text></View>
        <View style={styles.brandText}>
          <Text style={styles.brandName}>Parbati Bhandar</Text>
          <Text style={styles.brandCaption}>ONLINE GROCERY STORE</Text>
        </View>
        <View style={styles.securePill}><View style={styles.onlineDot} /><Text style={styles.secureText}>Store</Text></View>
      </View>

      <View style={styles.webArea}>
        <WebView
          ref={webView}
          source={{ uri: START_URL }}
          style={styles.webView}
          originWhitelist={['https://*', 'http://*', 'mailto:*', 'tel:*', 'sms:*', 'whatsapp:*', 'intent:*']}
          onShouldStartLoadWithRequest={shouldStartLoad}
          onNavigationStateChange={onNavigationStateChange}
          onLoadStart={() => { setLoading(true); setFailed(false); }}
          onLoadEnd={() => { setLoading(false); setRefreshing(false); }}
          onError={() => { setLoading(false); setRefreshing(false); setFailed(true); }}
          onHttpError={(event) => {
            if (event.nativeEvent.statusCode >= 500) {
              setLoading(false);
              setRefreshing(false);
              setFailed(true);
            }
          }}
          onOpenWindow={(event) => openExternal(event.nativeEvent.targetUrl)}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          cacheEnabled
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled={Platform.OS === 'ios'}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#087f5b" colors={['#087f5b']} />}
          mixedContentMode="never"
          javaScriptCanOpenWindowsAutomatically={false}
          setBuiltInZoomControls={false}
          textZoom={100}
          accessibilityLabel="Parbati Bhandar customer store"
        />

        {(loading || refreshing) && (
          <View pointerEvents="none" style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#087f5b" />
            <Text style={styles.loadingText}>Loading your store…</Text>
          </View>
        )}

        {failed && !loading && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorTitle}>Unable to connect</Text>
            <Text style={styles.errorBody}>Check your internet connection and try again. Your account and orders remain on the store server.</Text>
            <TouchableOpacity accessibilityRole="button" style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  topBar: { height: 62, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e2e8f0', backgroundColor: '#ffffff' },
  brandMark: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#087f5b', alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  brandText: { marginLeft: 10, flex: 1 },
  brandName: { color: '#0f172a', fontSize: 15, fontWeight: '900' },
  brandCaption: { marginTop: 2, color: '#64748b', fontSize: 8, fontWeight: '800', letterSpacing: 1.2 },
  securePill: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 6 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#059669', marginRight: 6 },
  secureText: { color: '#047857', fontSize: 10, fontWeight: '800' },
  webArea: { flex: 1, backgroundColor: '#f8fafc' },
  webView: { flex: 1, backgroundColor: '#ffffff' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
  loadingText: { marginTop: 12, color: '#475569', fontSize: 13, fontWeight: '600' },
  errorOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#ffffff' },
  errorTitle: { color: '#0f172a', fontSize: 20, fontWeight: '900' },
  errorBody: { marginTop: 8, color: '#64748b', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  retryButton: { marginTop: 20, borderRadius: 12, backgroundColor: '#087f5b', paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
});
