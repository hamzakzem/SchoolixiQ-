# One-time setup: GitHub Actions -> GCP via Workload Identity Federation (no JSON keys in GitHub).
# Run in PowerShell (Windows) after: gcloud auth login  &&  gcloud config set project yala-safari-iq
# Usage: .\scripts\gcp-setup-github-wif.ps1

$ErrorActionPreference = "Stop"

$PROJECT_ID = if ($env:GCP_PROJECT_ID) { $env:GCP_PROJECT_ID } else { "yala-safari-iq" }
$GITHUB_REPO = if ($env:GITHUB_REPO) { $env:GITHUB_REPO } else { "hamzakzem/SchoolixiQ-" }
$SA_ID = if ($env:GCP_DEPLOY_SA_ID) { $env:GCP_DEPLOY_SA_ID } else { "github-deployer" }
$SA_EMAIL = "$SA_ID@$PROJECT_ID.iam.gserviceaccount.com"
$POOL_ID = if ($env:WIF_POOL_ID) { $env:WIF_POOL_ID } else { "github-actions-pool" }
$PROVIDER_ID = if ($env:WIF_PROVIDER_ID) { $env:WIF_PROVIDER_ID } else { "github-provider" }

function Invoke-Gcloud {
    param([string[]]$Args)
    & gcloud @Args
    if ($LASTEXITCODE -ne 0) {
        throw "gcloud failed: gcloud $($Args -join ' ')"
    }
}

function Test-GcloudOk {
    param([string[]]$Args)
    & gcloud @Args 2>$null | Out-Null
    return ($LASTEXITCODE -eq 0)
}

Write-Host "==> Project: $PROJECT_ID"
$PROJECT_NUMBER = (Invoke-Gcloud @("projects", "describe", $PROJECT_ID, "--format=value(projectNumber)") | Out-String).Trim()
Write-Host "==> Project number: $PROJECT_NUMBER"

Write-Host "==> Enabling required APIs..."
Invoke-Gcloud @(
    "services", "enable",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "--project=$PROJECT_ID"
)

Write-Host "==> Service account: $SA_EMAIL"
if (-not (Test-GcloudOk @("iam", "service-accounts", "describe", $SA_EMAIL, "--project=$PROJECT_ID"))) {
    Invoke-Gcloud @(
        "iam", "service-accounts", "create", $SA_ID,
        "--project=$PROJECT_ID",
        "--display-name=GitHub Actions Cloud Run Deployer"
    )
}

Write-Host "==> IAM roles for deploy (source-based Cloud Run)..."
$roles = @(
    "roles/run.admin",
    "roles/iam.serviceAccountUser",
    "roles/cloudbuild.builds.editor",
    "roles/artifactregistry.writer",
    "roles/storage.admin"
)
foreach ($role in $roles) {
    Invoke-Gcloud @(
        "projects", "add-iam-policy-binding", $PROJECT_ID,
        "--member=serviceAccount:$SA_EMAIL",
        "--role=$role",
        "--quiet"
    ) | Out-Null
}

Write-Host "==> Workload Identity Pool..."
if (-not (Test-GcloudOk @("iam", "workload-identity-pools", "describe", $POOL_ID, "--project=$PROJECT_ID", "--location=global"))) {
    Invoke-Gcloud @(
        "iam", "workload-identity-pools", "create", $POOL_ID,
        "--project=$PROJECT_ID",
        "--location=global",
        "--display-name=GitHub Actions"
    )
}

Write-Host "==> OIDC provider (GitHub)..."
$providerExists = Test-GcloudOk @(
    "iam", "workload-identity-pools", "providers", "describe", $PROVIDER_ID,
    "--project=$PROJECT_ID",
    "--location=global",
    "--workload-identity-pool=$POOL_ID"
)
if (-not $providerExists) {
    Invoke-Gcloud @(
        "iam", "workload-identity-pools", "providers", "create-oidc", $PROVIDER_ID,
        "--project=$PROJECT_ID",
        "--location=global",
        "--workload-identity-pool=$POOL_ID",
        "--display-name=GitHub OIDC",
        "--issuer-uri=https://token.actions.githubusercontent.com",
        "--attribute-mapping=google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.ref=assertion.ref",
        "--attribute-condition=assertion.repository=='$GITHUB_REPO'"
    )
}

Write-Host "==> Allow GitHub repo to impersonate service account..."
$MEMBER = "principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/attribute.repository/$GITHUB_REPO"
Invoke-Gcloud @(
    "iam", "service-accounts", "add-iam-policy-binding", $SA_EMAIL,
    "--project=$PROJECT_ID",
    "--role=roles/iam.workloadIdentityUser",
    "--member=$MEMBER",
    "--quiet"
) | Out-Null

$PROVIDER_RESOURCE = "projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/providers/$PROVIDER_ID"

Write-Host ""
Write-Host "================================================================================"
Write-Host "SUCCESS. Add this GitHub Actions secret (Settings -> Secrets -> Actions):"
Write-Host ""
Write-Host "  Name:  GCP_WORKLOAD_IDENTITY_PROVIDER"
Write-Host "  Value: $PROVIDER_RESOURCE"
Write-Host ""
Write-Host "Optional (repo Variables -> Actions):"
Write-Host "  GCP_PROJECT_ID = $PROJECT_ID"
Write-Host "  GCP_SERVICE_ACCOUNT = $SA_EMAIL"
Write-Host ""
Write-Host "You can DELETE old JSON keys for $SA_EMAIL and remove secret GCP_SA_KEY."
Write-Host "Re-run the Deploy workflow on main."
Write-Host "================================================================================"
