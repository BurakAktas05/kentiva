import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Canlı yenileme: CAPACITOR_DEV_SERVER_URL=http://192.168.x.x:3000
 * Üretim APK: bu değişkeni vermeyin; paketlenmiş `dist` kullanılır, cleartext kapalıdır.
 */
const devServerUrl = process.env.CAPACITOR_DEV_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: 'com.burak.belediye',
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
};

export default config;
