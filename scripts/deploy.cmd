@echo off
setlocal
cd /d "%~dp0\.."

if "%~1"=="" (
  set "MSG=deploy %date% %time%"
) else (
  set "MSG=%~1"
)

git add src/ public/ index.html vite.config.mjs package.json package-lock.json backend/ firebase.json firestore.rules storage.rules .github/workflows/deploy-hostinger.yml scripts/deploy.ps1 scripts/deploy.cmd

git diff --cached --quiet
if %errorlevel%==0 (
  echo Nothing to deploy - no staged changes in src/, public/, or workflow.
  exit /b 0
)

git commit -m "%MSG%"
if %errorlevel% neq 0 exit /b %errorlevel%

git push origin main
if %errorlevel% neq 0 (
  echo.
  echo Push failed. Update remote if GitHub says the repo moved:
  echo   git remote set-url origin https://github.com/hamzakzem/SchoolixiQ-.git
  exit /b %errorlevel%
)

echo.
echo Pushed. GitHub Actions will deploy to Hostinger in ~2-4 min.
echo Track: https://github.com/hamzakzem/SchoolixiQ-/actions
echo Then: hPanel - Cache Manager - Purge, then Ctrl+Shift+R on https://schoolixiq.com
