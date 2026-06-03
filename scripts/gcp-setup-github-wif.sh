#!/usr/bin/env bash
# One-time setup: GitHub Actions → GCP via Workload Identity Federation (no JSON keys in GitHub).
# Run in Google Cloud Shell or locally with: gcloud auth login && gcloud config set project yala-safari-iq
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-yala-safari-iq}"
GITHUB_REPO="${GITHUB_REPO:-hamzakzem/SchoolixiQ-}"
SA_ID="${GCP_DEPLOY_SA_ID:-github-deployer}"
SA_EMAIL="${SA_ID}@${PROJECT_ID}.iam.gserviceaccount.com"
POOL_ID="${WIF_POOL_ID:-github-actions-pool}"
PROVIDER_ID="${WIF_PROVIDER_ID:-github-provider}"

echo "==> Project: ${PROJECT_ID}"
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
echo "==> Project number: ${PROJECT_NUMBER}"

echo "==> Enabling required APIs..."
gcloud services enable \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  --project="${PROJECT_ID}"

echo "==> Service account: ${SA_EMAIL}"
if ! gcloud iam service-accounts describe "${SA_EMAIL}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
  gcloud iam service-accounts create "${SA_ID}" \
    --project="${PROJECT_ID}" \
    --display-name="GitHub Actions Cloud Run Deployer"
fi

echo "==> IAM roles for deploy (source-based Cloud Run)..."
for ROLE in \
  roles/run.admin \
  roles/iam.serviceAccountUser \
  roles/cloudbuild.builds.editor \
  roles/artifactregistry.writer \
  roles/storage.admin; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${ROLE}" \
    --quiet >/dev/null
done

echo "==> Workload Identity Pool..."
if ! gcloud iam workload-identity-pools describe "${POOL_ID}" \
  --project="${PROJECT_ID}" --location=global >/dev/null 2>&1; then
  gcloud iam workload-identity-pools create "${POOL_ID}" \
    --project="${PROJECT_ID}" \
    --location=global \
    --display-name="GitHub Actions"
fi

echo "==> OIDC provider (GitHub)..."
if ! gcloud iam workload-identity-pools providers describe "${PROVIDER_ID}" \
  --project="${PROJECT_ID}" --location=global \
  --workload-identity-pool="${POOL_ID}" >/dev/null 2>&1; then
  gcloud iam workload-identity-pools providers create-oidc "${PROVIDER_ID}" \
    --project="${PROJECT_ID}" \
    --location=global \
    --workload-identity-pool="${POOL_ID}" \
    --display-name="GitHub OIDC" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
    --attribute-condition="assertion.repository=='${GITHUB_REPO}'"
fi

echo "==> Allow GitHub repo to impersonate service account..."
MEMBER="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${GITHUB_REPO}"
gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="${MEMBER}" \
  --quiet

PROVIDER_RESOURCE="projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}"

echo ""
echo "================================================================================"
echo "SUCCESS. Add this GitHub Actions secret (Settings → Secrets → Actions):"
echo ""
echo "  Name:  GCP_WORKLOAD_IDENTITY_PROVIDER"
echo "  Value: ${PROVIDER_RESOURCE}"
echo ""
echo "Optional (repo Variables → Actions):"
echo "  GCP_PROJECT_ID = ${PROJECT_ID}"
echo "  GCP_SERVICE_ACCOUNT = ${SA_EMAIL}"
echo ""
echo "You can DELETE old JSON keys for ${SA_EMAIL} and remove secret GCP_SA_KEY."
echo "Re-run the Deploy workflow on main."
echo "================================================================================"
