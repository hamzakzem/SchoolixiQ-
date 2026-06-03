# نشر الواجهة على Hostinger

الـ backend على Cloud Run. الواجهة تُرفع بـ **SFTP** (منفذ 22) — FTP من GitHub Actions غالباً يعطي `Timeout (control socket)`.

## أسرار GitHub (إلزامية)

| Secret | مثال | ملاحظة |
|--------|------|--------|
| `HOSTINGER_FTP_SERVER` | `ftp.hostinger.com` أو IP من hPanel | نفس Host في FTP/SFTP |
| `HOSTINGER_FTP_USERNAME` | `u758392104` | من FTP Accounts — ليس كلمة `FTP` |
| `HOSTINGER_FTP_PASSWORD` | كلمة FTP | |
| `HOSTINGER_FTP_REMOTE_DIR` | `/home/u758392104/domains/schoolixiq.com/public_html` | **مسار كامل** لمجلد الموقع |

### كيف تجد `HOSTINGER_FTP_REMOTE_DIR`

1. hPanel → **File Manager**
2. افتح مجلد **`public_html`**
3. انظر المسار في الأعلى أو Properties — انسخه كاملاً  
   غالباً: `/home/USERNAME/domains/DOMAIN/public_html`

اختياري: `HOSTINGER_SFTP_PORT` = `22`

## تشغيل النشر

**Actions** → **Deploy Frontend to Hostinger** → **Run workflow**

## يدوي (ZIP)

```powershell
.\scripts\package-dist-zip.ps1
```

ارفع `schoolixiq-dist.zip` إلى `public_html` من File Manager.
