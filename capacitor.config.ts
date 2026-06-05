import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Live sync mode (default for Android builds):
 * The native app loads the production website in a WebView.
 * Any deploy to schoolixiq.com appears on next app open / resume — no new APK per web change.
 *
 * Local bundled dev (emulator + localhost):
 *   set CAPACITOR_USE_BUNDLE=true
 *   npm run build:web && npx cap sync android
 */
const useBundledWeb =
  process.env.CAPACITOR_USE_BUNDLE === 'true' ||
  process.env.CAPACITOR_USE_BUNDLE === '1';

const liveUrl = (
  process.env.CAPACITOR_SERVER_URL ||
  process.env.VITE_APP_URL ||
  process.env.APP_URL ||
  ''
)
  .trim()
  .replace(/\/$/, '');

const productionUrl = liveUrl || 'https://schoolixiq.com';

const serverUrl = useBundledWeb ? undefined : productionUrl;

const config: CapacitorConfig = {
  appId: 'com.schoolix.app',
  appName: 'SchoolixiQ',
  webDir: 'dist',
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith('http://'),
          androidScheme: 'https',
          iosScheme: 'https',
          allowNavigation: [
            'schoolixiq.com',
            '*.schoolixiq.com',
            'schoolixiq.iq',
            '*.schoolixiq.iq',
            'app.schoolixiq.com',
            'app.schoolixiq.iq',
            'firebaseapp.com',
            '*.firebaseapp.com',
            'google.com',
            '*.google.com',
            'googleapis.com',
            'gstatic.com',
            'googleusercontent.com',
            'accounts.google.com',
          ],
        },
      }
    : {}),
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      clientId:
        '377979165565-2k1qjeet2clrjob0eahb6kb5ejcvdp99.apps.googleusercontent.com',
      /** Web client ID — required for Firebase idToken on Android */
      serverClientId:
        '377979165565-2k1qjeet2clrjob0eahb6kb5ejcvdp99.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    /**
     * Professional branded launch screen shown while the live website loads.
     * launchAutoHide:true guarantees the splash dismisses even though the web
     * content is remote (schoolixiq.com) and may not call SplashScreen.hide().
     */
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#0B2345',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'large',
      spinnerColor: '#FFFFFF',
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

if (serverUrl) {
  console.log(`[Capacitor] Live web: ${serverUrl} (site changes apply without rebuilding APK)`);
} else {
  console.log('[Capacitor] Bundled web from dist/ (rebuild APK after web changes)');
}

export default config;
