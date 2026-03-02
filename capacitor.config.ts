import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.gmast.app',
  appName: 'GMAST',
  webDir: 'dist',
  cordova: {
    preferences: {
      KeepRunning: 'true'
    }
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false
    }
  }
};

export default config;
