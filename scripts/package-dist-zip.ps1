# Creates schoolixiq-dist.zip from dist/ for Hostinger File Manager upload.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $root "dist"
if (-not (Test-Path (Join-Path $dist "index.html"))) {
    Push-Location $root
    npm run build
    Pop-Location
}
$zip = Join-Path $root "schoolixiq-dist.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $dist "*") -DestinationPath $zip -Force
Write-Host "Created: $zip"
Write-Host "Upload to Hostinger public_html and Extract."
