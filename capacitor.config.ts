import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.collectorsvault.archivist',
  appName: "Collector's Vault",
  webDir: 'www',
  server: {
    // Load bundled assets offline; API calls use VITE_API_BASE_URL
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
