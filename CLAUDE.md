# SchoolixiQ - AI Agent Instructions

## Project Structure
- src/ → Frontend only (React + Vite)
- backend/ → Backend only (Express + Node)
- .github/workflows/deploy.yml → DO NOT DELETE OR MODIFY

## Rules
1. Frontend changes → edit files in src/ only
2. Backend changes → edit files in backend/ only
3. NEVER delete .github/workflows/deploy.yml
4. NEVER merge server.ts from root into backend/server.ts
5. NEVER add Vite imports to backend/server.ts
6. After any change, verify .github/workflows/deploy.yml still exists

## Deployment
- Backend → Cloud Run (auto deploy via GitHub Actions)
- Frontend → Vite build (separate)

## Backend URL
https://schoolixiq-backend-377979165565.europe-west2.run.app