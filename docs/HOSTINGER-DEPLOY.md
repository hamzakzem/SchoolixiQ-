# نشر الواجهة على Hostinger

الـ backend على Cloud Run (`deploy.yml`). هذا الدليل للواجهة (`dist/`).

## نشر تلقائي

### بيانات FTP (hPanel)

| Secret في GitHub | مثال |
|------------------|------|
| `HOSTINGER_FTP_SERVER` | `ftp.hostinger.com` |
| `HOSTINGER_FTP_USERNAME` | من FTP Accounts |
| `HOSTINGER_FTP_PASSWORD` | كلمة FTP |
| `HOSTINGER_FTP_REMOTE_DIR` | `./public_html/` (اختياري) |
| `HOSTINGER_FTP_PORT` | `21` (اختياري) |

### تشغيل

**Actions** → **Deploy Frontend to Hostinger** → **Run workflow**

## يدوي

```powershell
npm run build
```

ارفع محتويات `dist/` إلى `public_html` (مع `.htaccess`).
