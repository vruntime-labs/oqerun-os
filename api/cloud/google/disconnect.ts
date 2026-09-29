import { getRedis } from "../../lib/redis";
import { readCookie, serializeCookie } from "../../lib/cookies";

const SESSION_COOKIE = "oqerun_cloud_session";

export async function GET(request: Request): Promise<Response> {
  const sessionId = readCookie(
    request,
    SESSION_COOKIE
  );

  if (sessionId) {
    try {
      const redis = await getRedis();
      await redis.del(`oqerun:cloud:session:${sessionId}`);
    } catch (error) {
      console.error(
        "[oqerun-cloud] Google disconnect failed:",
        error
      );
    }
  }

  return Response.json(
    { connected: false },
    {
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": serializeCookie(
          SESSION_COOKIE,
          "",
          {
            httpOnly: true,
            secure: true,
            sameSite: "Lax",
            path: "/",
            maxAge: 0
          }
        )
      }
    }
  );
}
