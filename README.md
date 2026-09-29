# Oqerun OS

> The Web, Reimagined as an Operating System.

Oqerun OS is an open-source, browser-native operating system built with TypeScript, HTML, CSS, and Vite.

## Current architecture

- **Frontend:** GitHub Pages
- **Cloud API:** Vercel
- **Session store:** Redis connected to the Oqerun Vercel project
- **Cloud provider:** Google Drive
- **OAuth secrets:** server-side only
- **Token storage:** encrypted refresh tokens stored in Redis

The browser never receives the Google OAuth client secret or the stored refresh token.

## Cloud API

The Vercel backend provides:

- `GET /api/health` — backend and Redis health check
- `GET /api/cloud/google/connect` — starts Google OAuth
- `GET /api/cloud/google/callback` — completes OAuth and creates the Oqerun session
- `GET /api/cloud/google/status` — checks the current Google Drive session
- `GET /api/cloud/google/files` — lists Google Drive metadata
- `GET /api/cloud/google/disconnect` — removes the Oqerun cloud session

Redis is used for short-lived cloud sessions. The Vercel Redis integration supplies the server-side Redis connection environment variable; the application reads it as `REDIS_URL`.

## Required Vercel environment variables

Configure these on the Oqerun Vercel project:

- `REDIS_URL` — supplied by the connected Redis resource
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `OQERUN_TOKEN_ENCRYPTION_KEY`
- `OQERUN_FRONTEND_ORIGIN`

The frontend additionally uses:

- `VITE_OQERUN_CLOUD_API_URL` — the public URL of the Oqerun Vercel Cloud API

Never commit real secrets, Redis credentials, OAuth credentials, refresh tokens, or encryption keys.

## Google Drive security model

Oqerun uses a server-side OAuth flow. Google refresh tokens are encrypted before they are written to Redis. The browser receives only the Oqerun session cookie and cloud metadata.

The current Drive API scope is intentionally limited to metadata listing. File-content editing and broader Drive permissions can be added later when the corresponding application features are implemented.

## Local development

Install dependencies:

```bash
npm install
```

Start the Vite frontend:

```bash
npm run dev
```

Build:

```bash
npm run build
```

## Deployment

The frontend is deployed to GitHub Pages from `main`.

The cloud API is deployed separately to Vercel from the same repository. Vercel environment variables and the connected Redis resource are not stored in Git.

After changing Vercel environment variables or connecting/changing a Marketplace resource, redeploy the Vercel project so the deployment receives the updated environment configuration.

## Security rules

- Enter cloud passwords only on the provider's official authorization page.
- Keep OAuth client secrets server-side.
- Never paste refresh tokens, bearer tokens, Redis URLs, or encryption keys into the Oqerun desktop or Git repository.
- Request only the provider permissions required for the feature.
- Allow users to disconnect the cloud session.
- Treat provider security warnings and OAuth consent details carefully.

## Roadmap

- [x] 0.1.0 Boot
- [x] Cloud backend foundation
- [x] Google Drive OAuth/session foundation
- [x] Redis-backed cloud sessions
- [ ] 0.2.0 Pulse
- [ ] Text Editor
- [ ] Oqerun Browser
- [ ] Oqerun Drive UI integration
- [ ] 1.0.0 Genesis

## License

MIT
