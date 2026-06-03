# One-time setup: GitHub Actions -> GCP via Workload Identity Federation (no JSON keys in GitHub).
# Windows PowerShell: run after gcloud auth login
# Usage: .\scripts\gcp-setup-github-wif.ps1

$ErrorActionPreference = "Continue"

$PROJECT_ID = if ($env:GCP_PROJECT_ID) { $env:GCP_PROJECT_ID } else { "yala-safari-iq" }
$GITHUB_REPO = if ($env:GITHUB_REPO) { $env:GITHUB_REPO } else { "hamzakzem/SchoolixiQ-" }
$SA_ID = if ($env:GCP_DEPLOY_SA_ID) { $env:GCP_DEPLOY_SA_ID } else { "github-deployer" }
$SA_EMAIL = "$SA_ID@$PROJECT_ID.iam.gserviceaccount.com"
$POOL_ID = if ($env:WIF_POOL_ID) { $env:WIF_POOL_ID } else { "github-actions-pool" }
$PROVIDER_ID = if ($env:WIF_PROVIDER_ID) { $env:WIF_PROVIDER_ID } else { "github-provider" }

function Resolve-GcloudExe {
    $candidates = @(
        (Join-Path ${env:ProgramFiles(x86)} "Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"),
        (Join-Path $env:ProgramFiles "Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"),
        (Join-Path $env:CLOUDSDK_ROOT "bin\gcloud.cmd")
    ) | Where-Object { $_ -and (Test-Path $_) }

    if ($candidates.Count -gt 0) {
        return $candidates[0]
    }
    return "gcloud"
}

$script:GcloudExe = Resolve-GcloudExe
Write-Host "Using gcloud: $script:GcloudExe" -ForegroundColor DarkGray

function Invoke-Gcloud {
    param(
        [Parameter(Mandatory, ValueFromRemainingArguments = $true)]
        [string[]]$GcloudArguments
    )
    # gcloud.ps1 on Windows writes progress to stderr; only exit code matters.
    $merged = & $script:GcloudExe @GcloudArguments 2>&1
    $exit = $LASTEXITCODE
    if ($null -eq $exit) { $exit = 0 }
    if ($exit -ne 0) {
        $text = ($merged | Out-String).Trim()
        throw "gcloud exit $exit`: gcloud $($GcloudArguments -join ' ')`n$text"
    }
    return $merged
}

function Test-GcloudOk {
    param(
        [Parameter(Mandatory, ValueFromRemainingArguments = $true)]
        [string[]]$GcloudArguments
    )
    Invoke-Gcloud @GcloudArguments | Out-Null
    return $true
}

function Try-GcloudOk {
    param(
        [Parameter(Mandatory, ValueFromRemainingArguments = $true)]
        [string[]]$GcloudArguments
    )
    try {
        Invoke-Gcloud @GcloudArguments | Out-Null
        return $true
    } catch {
        return $false
    }
}

try {
    Write-Host "==> Project: $PROJECT_ID"
    $PROJECT_NUMBER = (Invoke-Gcloud projects describe $PROJECT_ID --format="value(projectNumber)" | Out-String).Trim()
    if (-not $PROJECT_NUMBER) { throw "Could not read project number for $PROJECT_ID" }
    Write-Host "==> Project number: $PROJECT_NUMBER"

    Write-Host "==> Enabling required APIs (may take 1-2 min)..."
    Invoke-Gcloud services enable `
        iam.googleapis.com `
        iamcredentials.googleapis.com `
        sts.googleapis.com `
        run.googleapis.com `
        cloudbuild.googleapis.com `
        artifactregistry.googleapis.com `
        --project=$PROJECT_ID `
        --quiet | Out-Null
    Write-Host "    APIs OK"

    Write-Host "==> Service account: $SA_EMAIL"
    if (-not (Try-GcloudOk iam service-accounts describe $SA_EMAIL --project=$PROJECT_ID)) {
        Invoke-Gcloud iam service-accounts create $SA_ID `
            --project=$PROJECT_ID `
            --display-name="GitHub Actions Cloud Run Deployer" | Out-Null
        Write-Host "    Created service account"
    } else {
        Write-Host "    Service account exists"
    }

    Write-Host "==> IAM roles for deploy..."
    $roles = @(
        "roles/run.admin",
        "roles/iam.serviceAccountUser",
        "roles/cloudbuild.builds.editor",
        "roles/artifactregistry.writer",
        "roles/storage.admin"
    )
    foreach ($role in $roles) {
        Invoke-Gcloud projects add-iam-policy-binding $PROJECT_ID `
            --member="serviceAccount:$SA_EMAIL" `
            --role=$role `
            --quiet | Out-Null
        Write-Host "    $role"
    }

    Write-Host "==> Workload Identity Pool..."
    if (-not (Try-GcloudOk iam workload-identity-pools describe $POOL_ID --project=$PROJECT_ID --location=global)) {
        Invoke-Gcloud iam workload-identity-pools create $POOL_ID `
            --project=$PROJECT_ID `
            --location=global `
            --display-name="GitHub Actions" | Out-Null
        Write-Host "    Pool created"
    } else {
        Write-Host "    Pool exists"
    }

    Write-Host "==> OIDC provider (GitHub)..."
    if (-not (Try-GcloudOk iam workload-identity-pools providers describe $PROVIDER_ID `
            --project=$PROJECT_ID `
            --location=global `
            --workload-identity-pool=$POOL_ID)) {
        Invoke-Gcloud iam workload-identity-pools providers create-oidc $PROVIDER_ID `
            --project=$PROJECT_ID `
            --location=global `
            --workload-identity-pool=$POOL_ID `
            --display-name="GitHub OIDC" `
            --issuer-uri="https://token.actions.githubusercontent.com" `
            --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.ref=assertion.ref" `
            --attribute-condition="assertion.repository=='$GITHUB_REPO'" | Out-Null
        Write-Host "    Provider created"
    } else {
        Write-Host "    Provider exists"
    }

    Write-Host "==> GitHub repo binding..."
    $MEMBER = "principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/attribute.repository/$GITHUB_REPO"
    Invoke-Gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL `
        --project=$PROJECT_ID `
        --role=roles/iam.workloadIdentityUser `
        --member=$MEMBER `
        --quiet | Out-Null

    $PROVIDER_RESOURCE = "projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/providers/$PROVIDER_ID"

    Write-Host ""
    Write-Host "================================================================================" -ForegroundColor Green
    Write-Host "SUCCESS"
    Write-Host ""
    Write-Host "GitHub -> Settings -> Secrets and variables -> Actions -> New secret"
    Write-Host ""
    Write-Host "  Name:  GCP_WORKLOAD_IDENTITY_PROVIDER"
    Write-Host "  Value: $PROVIDER_RESOURCE"
    Write-Host ""
    Write-Host "Then: Actions -> Deploy to Cloud Run -> Run workflow"
    Write-Host "================================================================================" -ForegroundColor Green
}
catch {
    Write-Host ""
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
