# Copies signed/debug APK into public/downloads/schoolixiq.apk for web deploy.
param(
  [Parameter(ParameterSetName = 'FromPath')]
  [string]$ApkPath,

  [Parameter(ParameterSetName = 'Build')]
  [switch]$BuildDebug,

  [Parameter(ParameterSetName = 'Find')]
  [switch]$AutoFind
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$dest = Join-Path $root 'public\downloads\schoolixiq.apk'
$androidDir = Join-Path $root 'android'

function Resolve-JavaHome {
  if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME 'bin\java.exe'))) {
    return $env:JAVA_HOME
  }

  $javaCmd = Get-Command java -ErrorAction SilentlyContinue
  if ($javaCmd -and $javaCmd.Source) {
    $bin = Split-Path $javaCmd.Source -Parent
    return (Resolve-Path (Join-Path $bin '..')).Path
  }

  $candidates = @(
    "$env:ProgramFiles\Android\Android Studio\jbr",
    "${env:ProgramFiles(x86)}\Android\Android Studio\jbr",
    "$env:LOCALAPPDATA\Programs\Android\Android Studio\jbr",
    "$env:ProgramFiles\Android\Android Studio1\jbr"
  )

  foreach ($dir in @("$env:ProgramFiles\Java", "$env:ProgramFiles\Microsoft")) {
    if (Test-Path $dir) {
      $candidates += Get-ChildItem $dir -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^jdk|^jbr|jdk-' } |
        ForEach-Object { $_.FullName }
    }
  }

  foreach ($c in $candidates) {
    if ($c -and (Test-Path (Join-Path $c 'bin\java.exe'))) {
      return $c
    }
  }
  return $null
}

function Ensure-JavaForGradle {
  $javaHome = Resolve-JavaHome
  if (-not $javaHome) {
    throw @"
Java (JDK) not found. Gradle cannot build the APK.

Fix (PowerShell — this session only):
  `$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
  `$env:Path = "`$env:JAVA_HOME\bin;" + `$env:Path
  npm run prepare-apk:build

Permanent fix (Windows):
  Settings -> System -> About -> Advanced system settings -> Environment Variables
  New user variable: JAVA_HOME = C:\Program Files\Android\Android Studio\jbr
  Edit Path -> add %JAVA_HOME%\bin

Or build APK in Android Studio (Build -> Build APK), then:
  .\scripts\prepare-apk-release.ps1 -AutoFind
"@
  }

  $env:JAVA_HOME = $javaHome
  if ($env:Path -notlike "*$javaHome\bin*") {
    $env:Path = "$javaHome\bin;$env:Path"
  }
  Write-Host "Using JAVA_HOME: $javaHome" -ForegroundColor Cyan
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  cmd /c "`"$javaHome\bin\java.exe`" -version 2>&1"
  $ErrorActionPreference = $prevEap
}

function Find-LatestApk {
  $dirs = @(
    (Join-Path $androidDir 'app\build\outputs\apk\release'),
    (Join-Path $androidDir 'app\build\outputs\apk\debug'),
    (Join-Path $androidDir 'app\build\outputs\apk')
  )
  $found = @()
  foreach ($d in $dirs) {
    if (Test-Path $d) {
      $found += Get-ChildItem -Path $d -Recurse -Filter '*.apk' -ErrorAction SilentlyContinue
    }
  }
  if ($found.Count -eq 0) { return $null }
  return ($found | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
}

function Test-GradleWrapperJar {
  $jar = Join-Path $androidDir 'gradle\wrapper\gradle-wrapper.jar'
  if (-not (Test-Path $jar)) { return $false }
  try {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $count = [System.IO.Compression.ZipFile]::OpenRead($jar).Entries.Count
    return $count -gt 0
  } catch {
    return $false
  }
}

function Invoke-DebugBuild {
  $skipGradle = $env:SKIP_GRADLE_BUILD -eq '1'

  if (-not $skipGradle) {
    Write-Host '==> npm run build:web'
    Push-Location $root
    try {
      npm run build:web
      if ($LASTEXITCODE -ne 0) { throw "build:web failed (exit $LASTEXITCODE)" }

      Write-Host '==> npx cap sync android'
      npx cap sync android
      if ($LASTEXITCODE -ne 0) { throw "cap sync failed (exit $LASTEXITCODE)" }
    } finally {
      Pop-Location
    }
  } else {
    Write-Host 'SKIP_GRADLE_BUILD=1 — skipping build:web and cap sync' -ForegroundColor Yellow
  }

  $existing = Find-LatestApk
  if ($skipGradle -and $existing) {
    Write-Host "Using existing APK: $existing"
    return
  }

  $gradlew = Join-Path $androidDir 'gradlew.bat'
  if (-not (Test-Path $gradlew)) { throw "gradlew.bat not found at $gradlew" }

  if (-not (Test-GradleWrapperJar)) {
    throw @"
gradle-wrapper.jar is missing or corrupt (common cause: Invalid or corrupt jarfile).

Recommended fix — Android Studio (easiest):
  1. Open folder: $androidDir
  2. Wait for Gradle sync to finish
  3. Build -> Build Bundle(s) / APK(s) -> Build APK(s)
  4. Then run: .\scripts\prepare-apk-release.ps1 -AutoFind

Or repair wrapper then retry CLI:
  - In Android Studio: File -> Sync Project with Gradle Files
  - Or replace android\gradle\wrapper\gradle-wrapper.jar from a fresh Capacitor/Android project

After APK exists, copy only:
  `$env:SKIP_GRADLE_BUILD='1'; .\scripts\prepare-apk-release.ps1 -BuildDebug
"@
  }

  Ensure-JavaForGradle

  Write-Host '==> gradlew assembleDebug (first run may take several minutes)'
  Push-Location $androidDir
  try {
    & $gradlew assembleDebug --no-daemon
    if ($LASTEXITCODE -ne 0) { throw "assembleDebug failed (exit $LASTEXITCODE)" }
  } finally {
    Pop-Location
  }
}

$sourceApk = $null

if ($BuildDebug) {
  Invoke-DebugBuild
  $sourceApk = Find-LatestApk
  if (-not $sourceApk) {
    Write-Error @"
Debug build finished but no APK was found under android\app\build\outputs\apk\
Open Android Studio: Build -> Build Bundle(s) / APK(s) -> Build APK(s)
Then run: .\scripts\prepare-apk-release.ps1 -AutoFind
"@
  }
  Write-Host "Using built APK: $sourceApk"
} elseif ($AutoFind) {
  $sourceApk = Find-LatestApk
  if (-not $sourceApk) {
    Write-Error @"
No APK found on disk.

Option A — build debug APK from this project:
  .\scripts\prepare-apk-release.ps1 -BuildDebug

Option B — after Android Studio build, auto-copy:
  .\scripts\prepare-apk-release.ps1 -AutoFind

Option C — copy manually (replace with YOUR real path, not the word مسار):
  .\scripts\prepare-apk-release.ps1 -ApkPath "C:\Users\hamza\Downloads\app-release.apk"

Typical Android Studio output:
  android\app\build\outputs\apk\debug\app-debug.apk
  android\app\build\outputs\apk\release\app-release.apk
"@
  }
  Write-Host "Found APK: $sourceApk"
} else {
  if (-not $ApkPath) {
    Write-Error @"
Missing -ApkPath. Example (use your real file path):

  .\scripts\prepare-apk-release.ps1 -ApkPath "C:\Users\hamza\Downloads\app-release.apk"

Or build + copy automatically:

  .\scripts\prepare-apk-release.ps1 -BuildDebug
"@
  }
  if ($ApkPath -match 'مسار|path\\to|YOUR|example|\?\?\?\?') {
    Write-Warning "ApkPath looks like a placeholder, not a real file."
  }
  if (-not (Test-Path -LiteralPath $ApkPath)) {
    Write-Error @"
APK not found: $ApkPath

The path must point to an existing .apk file on your PC.
Build it in Android Studio first, or run:
  .\scripts\prepare-apk-release.ps1 -BuildDebug
"@
  }
  $sourceApk = (Resolve-Path -LiteralPath $ApkPath).Path
}

New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
Copy-Item -Force $sourceApk $dest
$sizeMb = [math]::Round((Get-Item $dest).Length / 1MB, 2)
Write-Host ""
Write-Host "OK: Copied to public/downloads/schoolixiq.apk ($sizeMb MB)" -ForegroundColor Green
Write-Host "Next:"
Write-Host "  npm run build:web"
Write-Host "  git add public/downloads/schoolixiq.apk   # optional if you commit APK"
Write-Host "  deploy / upload dist/downloads/schoolixiq.apk to Hostinger"
