# Deploy backend to Cloud Run (GitHub Actions)

| Item | Value |
|------|--------|
| Workflow | `.github/workflows/deploy.yml` |
| Service | `schoolixiq-backend` |
| Region | `europe-west2` |
| Project | `yala-safari-iq` |
| Deploy SA | `github-deployer@yala-safari-iq.iam.gserviceaccount.com` |

## Why `Invalid JWT Signature` keeps happening

Long-lived **JSON service account keys** in GitHub (`GCP_SA_KEY`) often break because:

- Keys are rotated/deleted in GCP but not updated in GitHub
- JSON is corrupted when pasted (newlines in `private_key`, truncation, wrong account)
- Wrong key file (e.g. `firebase-adminsdk-*` instead of `github-deployer`)

**Professional fix:** [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation) — GitHub OIDC → short-lived tokens → no JSON key in secrets.

---

## One-time setup (recommended)

### Option A: Windows (PowerShell)

Prerequisites: [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud` in PATH), logged in:

```powershell
gcloud auth login
gcloud config set project yala-safari-iq
cd C:\Users\hamza\schoolixiQ-\SchoolixiQ-
# If repo name on GitHub differs (case-sensitive):
# $env:GITHUB_REPO = "hamzakzem/SchoolixiQ-"
.\scripts\gcp-setup-github-wif.ps1
```

`chmod` is not used on Windows — run the `.ps1` script directly.

### Option B: Cloud Shell (Linux)

1. Open [Google Cloud Shell](https://shell.cloud.google.com/) with project **yala-safari-iq**.
2. Clone the repo or upload `scripts/gcp-setup-github-wif.sh`.
3. Run:

```bash
chmod +x scripts/gcp-setup-github-wif.sh
# If your GitHub repo path differs (case-sensitive):
# export GITHUB_REPO="your-user/Your-Repo-Name"
./scripts/gcp-setup-github-wif.sh
```

4. Copy the printed **`GCP_WORKLOAD_IDENTITY_PROVIDER`** value into GitHub:
   - Repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

5. (Optional) Delete old JSON keys for `github-deployer` in GCP → **Service account keys**.

6. Remove obsolete secret **`GCP_SA_KEY`** from GitHub if it exists.

7. **Actions** → **Deploy to Cloud Run** → **Run workflow** (or push to `main`).

### Option C: Manual gcloud

See `scripts/gcp-setup-github-wif.sh` for the exact commands (pool, OIDC provider, IAM binding).

Repository attribute must match exactly: `hamzakzem/SchoolixiQ-` (case-sensitive).

---

## What the workflow does

1. Requires secret `GCP_WORKLOAD_IDENTITY_PROVIDER`
2. `google-github-actions/auth@v2` — OIDC token from GitHub → impersonate `github-deployer`
3. Preflight: validates access token
4. `deploy-cloudrun@v2` — `gcloud run deploy --source ./backend`

Permissions on the workflow job:

```yaml
permissions:
  contents: read
  id-token: write   # required for WIF
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Missing `GCP_WORKLOAD_IDENTITY_PROVIDER` | Run setup script, add secret |
| `permission denied` on deploy | Re-run script (IAM roles) or check SA exists |
| `repository` assertion mismatch | Set `GITHUB_REPO` to exact `owner/name` in script |
| WIF works but build fails | Enable Cloud Build API; check `roles/cloudbuild.builds.editor` |

### Local test (after WIF is configured)

You cannot test WIF locally without a GitHub OIDC token. For local deploy use your user account:

```bash
gcloud config set project yala-safari-iq
gcloud run deploy schoolixiq-backend --source ./backend --region europe-west2 --port 8080
```

### Legacy JSON key (not recommended)

If you must use `GCP_SA_KEY`, the email in the JSON must be `github-deployer@...` and the file must be valid JSON. Prefer migrating to WIF instead.

---

## Security

- Do not commit `key.json`, `*-sa-key.json`, or service account JSON.
- Prefer **zero** long-lived keys for CI.
- Restrict WIF with `attribute-condition` to your repo (already in the setup script).
