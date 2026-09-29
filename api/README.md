# Oqerun Cloud API

Server-side cloud integration layer for Oqerun OS.

## Current Google Drive flow

1. Oqerun opens Google's official OAuth authorization page.
2. The API creates and validates an OAuth state value.
3. Google returns an authorization code to the server callback.
4. The server exchanges the code for a refresh token.
5. The refresh token is encrypted with AES-256-GCM.
6. The encrypted token is stored in Redis under a random per-session ID.
7. The browser receives only an HttpOnly session cookie.
8. Drive API requests refresh the short-lived Google access token server-side.
9. The browser receives normalized Drive metadata, never the provider refresh token.

Google's web-server OAuth guidance recommends state for maintaining authorization state, offline access when refresh tokens are needed, and secure persistent storage for refresh tokens. The Drive API supports files.list with a q filter and partial fields responses for folder/file metadata.

## Required Vercel environment variables

### Google OAuth

- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET

### Redis

- REDIS_URL

The Redis connection is supplied by the Vercel Redis integration. Do not commit its value.

### Oqerun security

- OQERUN_TOKEN_ENCRYPTION_KEY — a base64-encoded random 32-byte key.
- OQERUN_FRONTEND_ORIGIN — the exact public origin of the Oqerun frontend.

Never put any of these server-side values in VITE_* variables.

## Endpoints

- GET /api/health
- GET /api/cloud/google/connect
- GET /api/cloud/google/callback
- GET /api/cloud/google/status
- GET /api/cloud/google/disconnect
- GET /api/cloud/google/files?parentId=root

The Google integration currently requests the narrow drive.metadata.readonly scope. File content access will require a deliberate scope expansion later.

## Deployment

The frontend remains a static GitHub Pages application. The API is intended to run as Vercel Functions with the repository's api/ directory.

Do not use GitHub Actions secrets or public frontend environment variables for Google or Redis credentials.
