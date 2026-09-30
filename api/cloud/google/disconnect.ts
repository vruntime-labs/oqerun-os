export const runtime = "nodejs";

import { getRedis } from "../../lib/redis";
import { readCookie, serializeCookie } from "../../lib/cookies";
import { corsHeaders, handleCorsOptions } from "../../lib/cors";

const SESSION_COOKIE = "oqerun_cloud_session";

export function OPTIONS(): Response {
  return handleCorsOptions();
}

export async function GET(request: Request): Promise<Response> {
  const sessionId = readCookie(
    request,
    SESSION_COOKIE
  );

  if (sessionId) {
    try {
      const redis = await getRedis();
      await redis.del(
        `oqerun:cloud:session:${sessionId}`
      );
    } catch (error) {
      console.error(
        "[oqerun-cloud] Google disconnect failed:",
        error
      );
    }
  }

  const headers = corsHeaders();
  headers.set(
    "Cache-Control",
    "no-store"
  );
  headers.append(
    "Set-Cookie",
    serializeCookie(
      SESSION_COOKIE,
      "",
      {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        path: "/",
        maxAge: 0
      }
    )
  );

  return Response.json(
    { connected: false },
    { headers }
  );
}
