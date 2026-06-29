import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Canlı yenileme: CAPACITOR_DEV_SERVER_URL=http://192.168.x.x:3000
 * Üretim APK/IPA: bu değişkeni vermeyin; paketlenmiş `dist` kullanılır.
 */
const devServerUrl = process.env.CAPACITOR_DEV_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: 'com.kentiva.citizen',
  appName: 'Kentiva',
  webDir: 'dist',
  ...(devServerUrl
    ? {
        server: {
          url: devServerUrl,
          androidScheme: 'http',
          cleartext: true,
        },
      }
    : {}),
  android: {
    allowMixedContent: Boolean(devServerUrl),
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 0,
      backgroundColor: '#0b4f9c',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#0b4f9c',
    },
    Keyboard: {
      resizeOnFullScreen: true,
    },
  },
};

export default config;
