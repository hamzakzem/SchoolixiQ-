import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.schoolix.app',
  appName: 'Schoolix',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email"],
      clientId: "377979165565-2k1qjeet2clrjob0eahb6kb5ejcvdp99.apps.googleusercontent.com", // Default Web Client ID, can be updated in Google Console
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
