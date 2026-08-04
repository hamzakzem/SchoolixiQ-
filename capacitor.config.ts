import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.schoolix.app',
  appName: 'Schoolix',
  webDir: 'dist',
  server: {
    url: 'https://schoolixiq.com',
    cleartext: false,
  },
};

export default config;
