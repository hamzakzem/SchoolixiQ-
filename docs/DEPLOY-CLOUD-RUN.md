# Deploy backend to Cloud Run (GitHub Actions)

Workflow: `.github/workflows/deploy.yml`  
Service: `schoolixiq-backend` · Region: `europe-west2` · Project: `yala-safari-iq`

## Error: `invalid_grant: Invalid JWT Signature`

This means the JSON in GitHub secret **`GCP_SA_KEY`** is invalid for Google auth. Common causes:

1. Key was **deleted or rotated** in GCP but the secret was not updated.
2. Secret was **truncated** or edited (extra spaces, missing `{`, broken `private_key` newlines).
3. Wrong key uploaded (e.g. Firebase Admin SDK key instead of the deploy service account).

The workflow must use a key for:

`github-deployer@yala-safari-iq.iam.gserviceaccount.com`

Do **not** use `firebase-adminsdk-*@...` for Cloud Run deploy unless you grant that account deploy roles and update the workflow accordingly.

## Fix (recommended)

### 1. Create or open the deploy service account

1. [Google Cloud Console](https://console.cloud.google.com/) → project **yala-safari-iq**
2. **IAM & Admin** → **Service accounts**
3. Open **github-deployer@yala-safari-iq.iam.gserviceaccount.com** (or create it)

Required roles (minimum):

- `Cloud Run Admin`
- `Service Account User`
- `Artifact Registry Writer` (if using source deploy)
- `Cloud Build Editor` / `Cloud Build Service Account` (for `--source` builds)

### 2. New JSON key

1. Service account → **Keys** → **Add key** → **Create new key** → **JSON**
2. Download the file once (you cannot download it again).

### 3. Update GitHub secret

1. Repo → **Settings** → **Secrets and variables** → **Actions**
2. Edit **`GCP_SA_KEY`**
3. Paste the **entire** JSON file (starts with `{`, includes `"type": "service_account"`).
4. Verify `client_email` is `github-deployer@yala-safari-iq.iam.gserviceaccount.com`.

### 4. Re-run deploy

**Actions** → failed workflow → **Re-run all jobs**.

## Local check (optional)

```bash
gcloud auth activate-service-account --key-file=path/to/github-deployer.json
gcloud config set project yala-safari-iq
gcloud run services describe schoolixiq-backend --region europe-west2
```

If this fails locally, the key or IAM roles are wrong before fixing GitHub.

## Security

- Never commit `*.json` service account keys to the repo.
- Add `key.json`, `key.json.json`, and `*-sa-key.json` to `.gitignore` if needed.
- After a key leak, **delete the old key** in GCP and create a new one.
