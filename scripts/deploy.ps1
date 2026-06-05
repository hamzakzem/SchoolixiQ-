# One command: stage frontend changes, commit, push → GitHub deploys to Hostinger + Cloud Run if backend changed.
param([string]$Message = "")
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not $Message) {
  $Message = "deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

git add src/ public/ index.html vite.config.ts vite-plugin-sq-build.ts package.json package-lock.json backend/ .github/workflows/deploy-hostinger.yml scripts/deploy.ps1 scripts/prepare-apk-release.ps1

# NOTE: the APK (~150MB) exceeds GitHub's 100MB file limit and CANNOT be pushed
# through git. It must be uploaded directly to Hostinger. We intentionally do NOT
# stage it here (force-adding it previously caused 'remote rejected' push failures).
$apkPath = "public/downloads/schoolixiq.apk"
if (Test-Path $apkPath) {
  $apkSizeMB = [math]::Round((Get-Item $apkPath).Length / 1MB, 1)
  Write-Host "NOTE: $apkPath ($apkSizeMB MB) is NOT committed (exceeds GitHub 100MB limit)." -ForegroundColor Yellow
  Write-Host "      Upload it manually to Hostinger -> public_html/downloads/schoolixiq.apk" -ForegroundColor Yellow
}
# Ensure a stale large APK is never accidentally staged.
git restore --staged $apkPath 2>$null

$staged = git diff --cached --name-only
if (-not $staged) {
  Write-Host "Nothing to deploy (no changes in src/, public/, backend/)."
  exit 0
}

git commit -m $Message
git push origin main

Write-Host ""
Write-Host "Pushed. GitHub is deploying now (~2-4 min)."
Write-Host "Track: https://github.com/hamzakzem/SchoolixiQ-/actions"
Write-Host "Then: hPanel Cache Purge + Ctrl+Shift+R on https://schoolixiq.com"
