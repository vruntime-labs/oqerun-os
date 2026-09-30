# Legacy API directory

The original Oqerun cloud API was implemented as Vercel Functions in this directory.

Oqerun has now migrated its cloud runtime to **Cloudflare Workers + Cloudflare KV**.

The active implementation lives in:

- `worker/index.ts`
- `worker/google.ts`
- `wrangler.jsonc`

The frontend uses:

`https://oqerun-os.vruntimelabs.workers.dev`

This directory is retained temporarily while the Cloudflare deployment is verified. It is not part of the active Cloudflare Worker runtime.

Do not add new cloud API functionality here.
