# One command: stage frontend changes, commit, push → GitHub deploys to Hostinger + Cloud Run if backend changed.
param([string]$Message = "")
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not $Message) {
  $Message = "deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

git add src/ public/ index.html vite.config.ts vite-plugin-sq-build.ts package.json package-lock.json backend/ .github/workflows/deploy-hostinger.yml scripts/deploy.ps1 scripts/prepare-apk-release.ps1
if (Test-Path "public/downloads/schoolixiq.apk") {
  git add -f public/downloads/schoolixiq.apk
  Write-Host "Staged public/downloads/schoolixiq.apk for deploy"
}

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
