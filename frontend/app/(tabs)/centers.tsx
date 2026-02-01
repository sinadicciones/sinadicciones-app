import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

// Conditional import for WebView (only for native)
let WebView: any = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').WebView;
}

const SINADICCIONES_URL = 'https://sinadicciones.cl/explore-no-map/?type=place&sort=latest';

export default function CentersScreen() {
  const webViewRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(SINADICCIONES_URL);

  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
    setCurrentUrl(navState.url);
  };

  const handleGoBack = () => {
    if (Platform.OS === 'web') {
      // For web iframe
      window.history.back();
    } else if (webViewRef.current && canGoBack) {
      webViewRef.current.goBack();
    }
  };

  const handleRefresh = () => {
    if (Platform.OS === 'web') {
      const iframe = document.getElementById('centers-iframe') as HTMLIFrameElement;
      if (iframe) {
        iframe.src = iframe.src;
      }
    } else if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const handleOpenInBrowser = () => {
    Linking.openURL(currentUrl);
  };

  const handleGoHome = () => {
    if (Platform.OS === 'web') {
      const iframe = document.getElementById('centers-iframe') as HTMLIFrameElement;
      if (iframe) {
        iframe.src = SINADICCIONES_URL;
      }
    } else if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        window.location.href = '${SINADICCIONES_URL}';
        true;
      `);
    }
  };

  // For web platform, render an iframe
  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <LinearGradient
          colors={['#10B981', '#059669']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View style={styles.headerTitleContainer}>
              <Ionicons name="medical" size={24} color="#FFFFFF" />
              <Text style={styles.headerTitle}>Centros de Rehabilitación</Text>
            </View>
            <TouchableOpacity style={styles.headerButton} onPress={handleOpenInBrowser}>
              <Ionicons name="open-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSubtitle}>
            Directorio de sinadicciones.cl
          </Text>
        </LinearGradient>

        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.navButton} onPress={handleGoHome}>
            <Ionicons name="home" size={22} color="#374151" />
          </TouchableOpacity>
          
          <View style={styles.urlContainer}>
            <Ionicons name="lock-closed" size={12} color="#10B981" />
            <Text style={styles.urlText} numberOfLines={1}>sinadicciones.cl</Text>
          </View>
          
          <TouchableOpacity style={styles.navButton} onPress={handleRefresh}>
            <Ionicons name="refresh" size={22} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Web iframe container */}
        <View style={styles.webViewContainer}>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.loadingText}>Cargando centros...</Text>
            </View>
          )}
          <iframe
            id="centers-iframe"
            src={SINADICCIONES_URL}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            onLoad={() => setLoading(false)}
          />
        </View>

        {/* Info Footer */}
        <View style={styles.footer}>
          <Ionicons name="information-circle" size={16} color="#6B7280" />
          <Text style={styles.footerText}>
            Al tocar un centro, verás sus detalles completos
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // For native platforms (iOS/Android), use WebView
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#10B981', '#059669']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerTitleContainer}>
            <Ionicons name="medical" size={24} color="#FFFFFF" />
            <Text style={styles.headerTitle}>Centros de Rehabilitación</Text>
          </View>
          <TouchableOpacity style={styles.headerButton} onPress={handleOpenInBrowser}>
            <Ionicons name="open-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSubtitle}>
          Directorio de sinadicciones.cl
        </Text>
      </LinearGradient>

      {/* Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity 
          style={[styles.navButton, !canGoBack && styles.navButtonDisabled]} 
          onPress={handleGoBack}
          disabled={!canGoBack}
        >
          <Ionicons name="arrow-back" size={22} color={canGoBack ? '#374151' : '#D1D5DB'} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navButton} onPress={handleGoHome}>
          <Ionicons name="home" size={22} color="#374151" />
        </TouchableOpacity>
        
        <View style={styles.urlContainer}>
          <Ionicons name="lock-closed" size={12} color="#10B981" />
          <Text style={styles.urlText} numberOfLines={1}>sinadicciones.cl</Text>
        </View>
        
        <TouchableOpacity style={styles.navButton} onPress={handleRefresh}>
          <Ionicons name="refresh" size={22} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* WebView */}
      <View style={styles.webViewContainer}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Cargando centros...</Text>
          </View>
        )}
        
        {WebView && (
          <WebView
            ref={webViewRef}
            source={{ uri: SINADICCIONES_URL }}
            style={styles.webView}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onNavigationStateChange={handleNavigationStateChange}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={false}
            scalesPageToFit={true}
            allowsBackForwardNavigationGestures={true}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            mixedContentMode="compatibility"
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              console.warn('WebView error: ', nativeEvent);
            }}
            renderError={(errorName) => (
              <View style={styles.errorContainer}>
                <Ionicons name="cloud-offline" size={64} color="#D1D5DB" />
                <Text style={styles.errorTitle}>Error de conexión</Text>
                <Text style={styles.errorText}>
                  No se pudo cargar el directorio. Verifica tu conexión a internet.
                </Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                  <Text style={styles.retryButtonText}>Reintentar</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>

      {/* Info Footer */}
      <View style={styles.footer}>
        <Ionicons name="information-circle" size={16} color="#6B7280" />
        <Text style={styles.footerText}>
          Al tocar un centro, verás sus detalles completos
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#D1FAE5',
    marginTop: 4,
    marginLeft: 34,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  urlContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  urlText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 6,
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
  },
});
