import { getRedis, isRedisConfigured } from "./lib/redis";

export async function GET(): Promise<Response> {
  if (!isRedisConfigured()) {
    return Response.json(
      {
        ok: true,
        service: "oqerun-cloud-api",
        version: "0.1.0",
        redis: "not-configured"
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const redis = await getRedis();
    const pong = await redis.ping();

    return Response.json(
      {
        ok: true,
        service: "oqerun-cloud-api",
        version: "0.1.0",
        redis: pong === "PONG" ? "connected" : "unexpected-response"
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[oqerun-cloud] Redis health check failed:", error);

    return Response.json(
      {
        ok: false,
        service: "oqerun-cloud-api",
        version: "0.1.0",
        redis: "error"
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" }
      }
    );
  }
}
