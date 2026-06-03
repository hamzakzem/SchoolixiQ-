# نشر الواجهة على Hostinger

الـ backend على Cloud Run. الواجهة تُرفع بـ **SFTP** (منفذ 22) — FTP من GitHub Actions غالباً يعطي `Timeout (control socket)`.

## أسرار GitHub (إلزامية)

| Secret | مثال | ملاحظة |
|--------|------|--------|
| `HOSTINGER_FTP_SERVER` | `ftp.hostinger.com` أو IP من hPanel | نفس Host في FTP/SFTP |
| `HOSTINGER_FTP_USERNAME` | `u758392104` | من FTP Accounts — ليس كلمة `FTP` |
| `HOSTINGER_FTP_PASSWORD` | كلمة FTP | |
| `HOSTINGER_FTP_REMOTE_DIR` | `/home/u758392104/domains/schoolixiq.com/public_html` | **مسار مطلق كامل** — لا تستخدم `./public_html/` |

### كيف تجد `HOSTINGER_FTP_REMOTE_DIR`

1. hPanel → **File Manager**
2. افتح مجلد **`public_html`**
3. انظر المسار في الأعلى أو Properties — انسخه كاملاً  
   غالباً: `/home/USERNAME/domains/DOMAIN/public_html`

اختياري: `HOSTINGER_SFTP_PORT` = `22`

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
