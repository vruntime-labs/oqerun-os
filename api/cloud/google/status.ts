import { getRedis } from "../../lib/redis";
import { readCookie } from "../../lib/cookies";
import { corsHeaders, handleCorsOptions } from "../../lib/cors";

const SESSION_COOKIE = "oqerun_cloud_session";
const SESSION_TTL = 60 * 60 * 24 * 30;

export function OPTIONS(): Response {
  return handleCorsOptions();
}

export async function GET(request: Request): Promise<Response> {
  const headers = corsHeaders();
  headers.set("Cache-Control", "no-store");

  const sessionId = readCookie(
    request,
    SESSION_COOKIE
  );

  if (!sessionId) {
    return Response.json(
      { connected: false },
      { headers }
    );
  }

  try {
    const redis = await getRedis();
    const key =
      `oqerun:cloud:session:${sessionId}`;
    const exists = await redis.exists(key);

    if (!exists) {
      return Response.json(
        { connected: false },
        { headers }
      );
    }

    await redis.expire(
      key,
      SESSION_TTL
    );

    return Response.json(
      {
        connected: true,
        provider: "google-drive"
      },
      { headers }
    );
  } catch (error) {
    console.error(
      "[oqerun-cloud] Google status failed:",
      error
    );

    return Response.json(
      {
        connected: false,
        error: "Cloud session unavailable."
      },
      {
        status: 503,
        headers
      }
    );
  }
}
