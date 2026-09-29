# Oqerun OS

> The Web, Reimagined as an Operating System.

Oqerun OS is an open-source, browser-native operating system built with TypeScript, HTML, CSS, and WebAssembly.

## Features

- Kernel-first architecture
- Virtual File System
- Process Manager
- Window Manager
- WebAssembly Runtime
- PWA support

## Roadmap

- [x] 0.1.0 Boot
- [ ] 0.2.0 Pulse
- [ ] 1.0.0 Genesis

## License

MIT## Unified Cloud

Oqerun uses a provider-agnostic cloud connection layer so Explorer can eventually expose Google Drive, OneDrive, Dropbox, Box, SharePoint and other supported storage providers through one interface.

The browser side intentionally does **not** hold provider OAuth secrets, refresh tokens, or bearer tokens. The production connection flow is designed around a secure backend/session service (for example, Apideck Vault + File Storage API) that handles provider authorization and token storage. Apideck currently documents unified File Storage support for Google Drive, OneDrive, Dropbox, Box and SharePoint. citeturn1search0turn1search2

For Google Drive, Oqerun should prefer the narrowest practical permission model. Google documents `drive.file` as a per-file scope that works with Google Picker and limits access to files the user selects or opens with the app. Broad scopes such as full `drive` access are restricted and can require additional verification. citeturn0search0turn0search5

### Security rules

- Cloud passwords are entered only on the provider's official authorization page.
- Provider OAuth client secrets stay on the secure backend/provider configuration.
- Oqerun never asks users to paste OAuth secrets, refresh tokens, or bearer tokens into the desktop.
- Request the minimum provider scopes needed for the requested operation.
- Show the provider name and requested permissions before authorization.
- Let users disconnect/revoke the cloud connection.
- Treat a provider warning or unverified-app screen as a reason to inspect the application name and permissions, not something to blindly bypass.

### Current connection state

The Connected Cloud UI is now a secure backend-ready entry point. If `VITE_OQERUN_CLOUD_CONNECT_URL` is not configured, the button intentionally does not start a fake or unsafe login flow; it reports that the secure connection is not configured.

The next implementation step is the backend endpoint that creates an Apideck Vault session for the Oqerun user, redirects them through the selected provider's OAuth consent screen, and then exposes the normalized File Storage API to Explorer without returning provider credentials to the browser. Apideck documents that OAuth/token refresh and credential storage are handled on its side of the connection. citeturn1search1turn1search2

## Roadmap

- [x] 0.1.0 Boot
- [ ] 0.2.0 Pulse
- [ ] 1.0.0 Genesis

## License

MIT
