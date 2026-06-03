# Android APK

Place the signed release file here as **`schoolixiq.apk`**.

After building the native app:

1. `npm run build:web`
2. `npx cap sync android`
3. Build signed APK in Android Studio (Build → Generate Signed Bundle / APK)
4. Copy the output `.apk` to this folder as `schoolixiq.apk`
5. Deploy the web server so `/api/download/schoolixiq.apk` serves this file

Or set `VITE_ANDROID_APK_URL` to a CDN URL in production.
