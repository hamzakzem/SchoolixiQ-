# Android APK

Place the signed release file here as **`schoolixiq.apk`** (required for download to work).

**PowerShell — build debug APK + copy (needs Android Studio / JDK):**
```powershell
npm run prepare-apk:build
```
The script auto-uses `C:\Program Files\Android\Android Studio\jbr` if `JAVA_HOME` is unset.

If Gradle still says JAVA_HOME missing:
```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;" + $env:Path
npm run prepare-apk:build
```

**After Android Studio (Build → Build APK):**
```powershell
.\scripts\prepare-apk-release.ps1 -AutoFind
# or: npm run prepare-apk
```

**Manual path (your real file, not a placeholder):**
```powershell
.\scripts\prepare-apk-release.ps1 -ApkPath "C:\Users\hamza\Downloads\app-release.apk"
```

**Or hPanel:** File Manager → `public_html/downloads/` → upload `schoolixiq.apk`

After building the native app:

1. `npm run build:web`
2. `npx cap sync android`
3. Build signed APK in Android Studio (Build → Generate Signed Bundle / APK)
4. Copy the output `.apk` to this folder as `schoolixiq.apk`
5. Deploy the web server so `/api/download/schoolixiq.apk` serves this file

Or set `VITE_ANDROID_APK_URL` to a CDN URL in production.
