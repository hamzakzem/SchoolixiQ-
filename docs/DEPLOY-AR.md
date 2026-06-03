# نشر التحديثات على schoolixiq.com

`npm run build:web` **محلياً فقط** — لا يحدّث الموقع حتى ترفع إلى GitHub.

## 1. رفع الكود (إلزامي)

```powershell
cd C:\Users\hamza\schoolixiQ-
npm run deploy
```

أو يدوياً:

```powershell
git add -A
git commit -m "deploy: تحديث واجهة وإشعارات وتطبيق Android"
git push origin main
```

انتظر 2–4 دقائق: https://github.com/hamzakzem/SchoolixiQ-/actions  
يجب أن ينجح **Deploy Frontend to Hostinger**.

## 2. أسرار GitHub (مرة واحدة)

في GitHub → Settings → Secrets → Actions أضف:

| Secret | الغرض |
|--------|--------|
| `VITE_FIREBASE_VAPID_KEY` | إشعارات المتصفح والموقع المغلق |
| `VITE_ANDROID_APK_URL` | (اختياري) رابط APK خارجي |
| Hostinger FTP secrets | موجودة مسبقاً |

بدون `VITE_FIREBASE_VAPID_KEY` **لن تعمل الإشعارات على الويب** بعد البناء.

## 3. ملف APK

ضع `schoolixiq.apk` في `public/downloads/schoolixiq.apk` ثم أعد النشر.  
الرابط على الموقع: `https://schoolixiq.com/downloads/schoolixiq.apk`

## 4. بعد النشر على الهاتف

1. hPanel → **Cache Manager** → **Purge All**
2. Chrome → إعدادات الموقع → **مسح البيانات**
3. افتح الموقع — يجب أن يظهر أسفل صفحة الدخول `v:xxxx` (رقم البناء)
4. على Android: مربع **تطبيق Android الرسمي**

## 5. تطبيق Android

```powershell
npm run build:web
npm run sync:brand
npx cap sync android
```

ابنِ APK من Android Studio + `google-services.json` في `android/app/`.
