# Copies signed APK into public/downloads for web deploy (Hostinger FTP includes dist/downloads/)
param(
  [Parameter(Mandatory = $true)]
  [string]$ApkPath
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dest = Join-Path $root "public\downloads\schoolixiq.apk"

if (-not (Test-Path $ApkPath)) {
  Write-Error "APK not found: $ApkPath"
}

New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
Copy-Item -Force $ApkPath $dest
Write-Host "Copied to public/downloads/schoolixiq.apk"
Write-Host "Next: npm run deploy"
Write-Host "Or upload dist/downloads/schoolixiq.apk via hPanel File Manager after build:web"
