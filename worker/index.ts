interface Env {
  OQERUN_KV: KVNamespace;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      const key = "system:health";
      const timestamp = new Date().toISOString();

      await env.OQERUN_KV.put(key, timestamp, {
        expirationTtl: 60,
      });

      const stored = await env.OQERUN_KV.get(key);

      return Response.json({
        ok: true,
        service: "oqerun-os",
        runtime: "cloudflare-workers",
        kv: stored === timestamp,
      });
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
