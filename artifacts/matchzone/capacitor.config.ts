import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.matchzone.app',
  appName: 'MatchZone',
  webDir: 'dist/public',
  server: {
    url: 'https://matchzone-production.up.railway.app',
    cleartext: true
  }
};

export default config;
