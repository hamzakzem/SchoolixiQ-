# نشر الواجهة على Hostinger

الـ backend على Cloud Run (`deploy.yml`). هذا الدليل للواجهة (`dist/`).

## نشر تلقائي

### بيانات FTP (hPanel)

**hPanel** → **Websites** → موقعك → **FTP Accounts** (أو **Files** → FTP details)

أضف **ثلاثة أسرار إلزامية** في GitHub → **Settings** → **Secrets and variables** → **Actions**:

| Secret (اسم مطابق) | ماذا تضع |
|--------------------|----------|
| `HOSTINGER_FTP_SERVER` | `ftp.hostinger.com` (أو Host من اللوحة) |
| `HOSTINGER_FTP_USERNAME` | اسم المستخدم FTP (مثل `u123456789`) |
| `HOSTINGER_FTP_PASSWORD` | كلمة مرور FTP |

اختياري:

| Secret | القيمة |
|--------|--------|
| `HOSTINGER_FTP_REMOTE_DIR` | `./public_html/` |
| `HOSTINGER_FTP_PORT` | `21` |

إذا ظهر `Input required and not supplied: server` فالسر **`HOSTINGER_FTP_SERVER`** غير موجود أو اسمه مختلف.

### تشغيل

**Actions** → **Deploy Frontend to Hostinger** → **Run workflow**

## يدوي

```powershell
npm run build
```

ارفع محتويات `dist/` إلى `public_html` (مع `.htaccess`).
