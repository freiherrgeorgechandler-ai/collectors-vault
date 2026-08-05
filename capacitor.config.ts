import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.collectorsvault.archivist',
  appName: "Collector's Vault",
  webDir: 'www',
  server: {
    // Use http so the WebView can call the HTTP Express API without mixed-content blocks.
    // Bundled assets still load offline from the APK.
    androidScheme: 'http',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
