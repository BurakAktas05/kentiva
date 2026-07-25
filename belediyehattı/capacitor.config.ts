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
      // Match the bright React launch screen to avoid a color flash during hand-off.
      launchAutoHide: false,
      launchShowDuration: 0,
      backgroundColor: '#f8fafc',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#f8fafc',
    },
    Keyboard: {
      resizeOnFullScreen: true,
    },
  },
};

export default config;
