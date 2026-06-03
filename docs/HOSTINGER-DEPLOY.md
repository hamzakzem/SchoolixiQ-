# نشر الواجهة على Hostinger

الـ backend على Cloud Run. الواجهة تُرفع بـ **SFTP** (منفذ 22) — FTP من GitHub Actions غالباً يعطي `Timeout (control socket)`.

## أسرار GitHub (إلزامية)

| Secret | مثال | ملاحظة |
|--------|------|--------|
| `HOSTINGER_FTP_SERVER` | `ftp.hostinger.com` أو IP من hPanel | Host من FTP Accounts |
| `HOSTINGER_SFTP_HOST` | `srv2063.hstgr.io` (اختياري) | إن فشل `ftp.hostinger.com` — من رابط File Manager (`srvXXXX.hstgr.io`) |
| `HOSTINGER_FTP_USERNAME` | `u758392104` | من FTP Accounts — ليس كلمة `FTP` |
| `HOSTINGER_FTP_PASSWORD` | كلمة FTP | |
| `HOSTINGER_FTP_REMOTE_DIR` | `/home/u758392104/domains/schoolixiq.com/public_html` | **مسار SFTP على السيرفر** — ليس رابط المتصفح |
| `HOSTINGER_SFTP_PORT` | `65002` | **إلزامي منطقياً** — لا تضع `21` أو `22` (ستفشل بـ Operation timed out) |

### رابط File Manager ≠ مسار الرفع

رابط مثل:

`https://srv2063-files.hstgr.io/ba479487c9581762/files/public_html/`

هذا **واجهة ويب فقط**. لا تضعه في GitHub.

### كيف تجد `HOSTINGER_FTP_REMOTE_DIR`

1. hPanel → **Websites** → **schoolixiq.com** → **FTP Accounts**
2. انسخ **FTP Username** (مثل `u758392104`)
3. المسار للنشر غالباً:

```text
/home/USERNAME/domains/schoolixiq.com/public_html
```

استبدل `USERNAME` باسم FTP الحقيقي.

**إذا** في FTP Accounts يظهر **Directory: `public_html`** فقط (حساب مربوط بالموقع)، جرّب:

```text
/
```

(جذر حساب FTP = نفس `public_html`)

## لماذا لا يظهر التعديل على الموقع؟

1. **النشر التلقائي فشل** — راجع [Actions → Deploy Frontend to Hostinger](https://github.com/hamzakzem/SchoolixiQ-/actions/workflows/deploy-hostinger.yml). يجب أن تكون الخطوة الأخيرة **خضراء**.
2. **مسار خاطئ** — إذا كان `HOSTINGER_FTP_REMOTE_DIR` = `./public_html/` فالملفات لا تصل لموقع `schoolixiq.com`.
3. **كاش** — من hPanel: **Cache Manager → Purge**، ثم في المتصفح: Ctrl+Shift+R.
4. **تعديلات Firestore فقط** (بيانات مدرسة محفوظة) تظهر بدون رفع واجهة؛ **تعديلات شاشة Login** تحتاج نشر `dist/`.

## تشغيل النشر

**Actions** → **Deploy Frontend to Hostinger** → **Run workflow**

بعد كل تشغيل ناجح يمكنك تحميل **`schoolixiq-dist`** من تبويب **Artifacts** ورفعه يدوياً إن لزم.

## يدوي (ZIP)

```powershell
.\scripts\package-dist-zip.ps1
```

ارفع `schoolixiq-dist.zip` إلى `public_html` من File Manager.
