# Oqerun OS

> The Web, Reimagined as an Operating System.

Oqerun OS is an open-source, browser-native operating system built with TypeScript, HTML, CSS, WebAssembly, and Vite.

## Current architecture

- **Frontend:** GitHub Pages
- **Cloud runtime:** Cloudflare Workers
- **Session store:** Cloudflare KV
- **Cloud provider:** Google Drive
- **OAuth secrets:** Cloudflare Worker secrets
- **Token storage:** encrypted Google refresh tokens stored in Cloudflare KV

The browser never receives the Google OAuth client secret or the stored refresh token.

## Cloud API

The Cloudflare Worker provides:

- `GET /api/health` — Worker and KV health check
- `GET /api/cloud/google/connect` — starts Google OAuth
- `GET /api/cloud/google/callback` — completes OAuth and creates the Oqerun session
- `GET /api/cloud/google/status` — checks the current Google Drive session
- `GET /api/cloud/google/files` — lists Google Drive metadata
- `POST /api/cloud/google/files` — creates a Google Drive folder
- `GET /api/cloud/google/content` — downloads a Drive file
- `POST /api/cloud/google/content` — creates or updates Drive file content
- `GET /api/cloud/google/disconnect` — removes the Oqerun cloud session

Cloudflare KV stores short-lived Oqerun cloud sessions. Google refresh tokens are encrypted with AES-256-GCM before being stored.

## Cloudflare configuration

The Worker is configured by `wrangler.jsonc`.

KV namespace:

- Binding: `OQERUN_KV`
- Namespace: `oqerun-sessions`

Worker secrets must be configured in the Cloudflare dashboard under **Workers & Pages → oqerun-os → Settings → Variables and Secrets**:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `OQERUN_TOKEN_ENCRYPTION_KEY`

The encryption key must be a base64-encoded random 32-byte value.

The Google OAuth client must authorize this redirect URI:

`https://oqerun-os.vruntimelabs.workers.dev/api/cloud/google/callback`

The frontend uses:

- `VITE_OQERUN_CLOUD_API_URL=https://oqerun-os.vruntimelabs.workers.dev`

Never commit real secrets, refresh tokens, bearer tokens, or encryption keys.

## Google Drive security model

Oqerun uses a server-side OAuth flow. Google refresh tokens are encrypted before they are written to Cloudflare KV. The browser receives only the Oqerun session cookie and normalized cloud metadata.

The current implementation requests the Google Drive scope needed for the Oqerun virtual-drive experience. File transfers are currently limited to 4 MB per request; resumable larger-file transfers are planned separately.

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

The frontend and Cloudflare Worker are deployed from the same GitHub repository.

Cloudflare uses `wrangler.jsonc` as the Worker configuration source of truth. Static assets are served through the Worker asset binding, while `/api/*` routes execute in the Worker first.

## Security rules

- Enter cloud passwords only on the provider's official authorization page.
- Keep OAuth client secrets server-side.
- Never paste refresh tokens, bearer tokens, or encryption keys into the Oqerun desktop or Git repository.
- Request only the provider permissions required for the feature.
- Allow users to disconnect the cloud session.
- Treat provider security warnings and OAuth consent details carefully.

## Roadmap

- [x] 0.1.0 Boot
- [x] Cloud backend foundation
- [x] Google Drive OAuth/session foundation
- [x] Cloudflare Worker + KV migration
- [ ] 0.2.0 Pulse
- [ ] Text Editor
- [ ] Oqerun Browser
- [ ] Oqerun Drive UI integration
- [ ] Resumable large-file cloud transfers
- [ ] Additional cloud providers
- [ ] 1.0.0 Genesis

## License

MIT
