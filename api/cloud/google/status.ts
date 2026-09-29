import { getRedis } from "../../lib/redis";
import { readCookie } from "../../lib/cookies";

const SESSION_COOKIE = "oqerun_cloud_session";
const SESSION_TTL = 60 * 60 * 24 * 30;

export async function GET(request: Request): Promise<Response> {
  const sessionId = readCookie(
    request,
    SESSION_COOKIE
  );

  if (!sessionId) {
    return Response.json(
      { connected: false },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const redis = await getRedis();
    const key = `oqerun:cloud:session:${sessionId}`;
    const exists = await redis.exists(key);

    if (!exists) {
      return Response.json(
        { connected: false },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    await redis.expire(key, SESSION_TTL);

    return Response.json(
      {
        connected: true,
        provider: "google-drive"
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[oqerun-cloud] Google status failed:", error);

    return Response.json(
      { connected: false, error: "Cloud session unavailable." },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" }
      }
    );
  }
}
