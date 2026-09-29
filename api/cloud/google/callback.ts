import { randomBytes } from "node:crypto";
import { getRedis } from "../../lib/redis";
import { encryptSecret, isTokenEncryptionConfigured } from "../../lib/google-token";
import { readCookie, serializeCookie } from "../../lib/cookies";

const STATE_COOKIE = "oqerun_oauth_state";
const SESSION_COOKIE = "oqerun_cloud_session";
const SESSION_TTL = 60 * 60 * 24 * 30;

type GoogleTokenResponse = {
  refresh_token?: string;
  scope?: string;
  error?: string;
};

function html(message: string, success: boolean): Response {
  const safeMessage = message
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const targetOrigin =
    (process.env.OQERUN_FRONTEND_ORIGIN ?? "").trim();

  const messageScript = targetOrigin
    ? `
      try {
        if (window.opener) {
          window.opener.postMessage(
            {
              source: "oqerun-cloud",
              type: "${success ? "google-connected" : "google-error"}"
            },
            "${targetOrigin.replaceAll('"', "\\\"")}"
          );
        }
      } catch {}
    `
    : "";

  return new Response(
    `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Oqerun Cloud</title>
</head>
<body style="font-family:system-ui,sans-serif;background:#07112c;color:#eef4ff;display:grid;place-items:center;min-height:100vh;margin:0">
  <main style="max-width:520px;padding:32px;text-align:center">
    <h1>Oqerun Cloud</h1>
    <p>${safeMessage}</p>
    <p style="color:#8fa3c7">You can close this window.</p>
  </main>
  <script>
    ${messageScript}
    if (${success ? "true" : "false"}) {
      window.setTimeout(() => window.close(), 900);
    }
  </script>
</body>
</html>`,
    {
      status: success ? 200 : 400,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
      }
    }
  );
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const storedState = readCookie(request, STATE_COOKIE);

  if (error) {
    return html(
      "Google authorization was not completed.",
      false
    );
  }

  if (!code || !state || !storedState || state !== storedState) {
    return html(
      "The Google connection could not be verified. Please start the connection again.",
      false
    );
  }

  const clientId =
    (process.env.GOOGLE_CLIENT_ID ?? "").trim();
  const clientSecret =
    (process.env.GOOGLE_CLIENT_SECRET ?? "").trim();

  if (!clientId || !clientSecret) {
    return html(
      "Google Drive backend configuration is incomplete.",
      false
    );
  }

  if (!isTokenEncryptionConfigured()) {
    return html(
      "Oqerun Cloud token encryption is not configured on the server yet.",
      false
    );
  }

  try {
    const redirectUri = new URL(
      "/api/cloud/google/callback",
      request.url
    ).toString();

    const tokenRequest = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    });

    const tokenResponse = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded"
        },
        body: tokenRequest.toString()
      }
    );

    const tokenData =
      (await tokenResponse.json()) as GoogleTokenResponse;

    if (
      !tokenResponse.ok ||
      !tokenData.refresh_token
    ) {
      console.error(
        "[oqerun-cloud] Google token exchange failed:",
        tokenData.error ?? "unknown error"
      );

      return html(
        "Google authorization succeeded, but Oqerun could not securely store the resulting session. Please try connecting again.",
        false
      );
    }

    const sessionId =
      randomBytes(32).toString("hex");

    const redis = await getRedis();

    await redis.setEx(
      `oqerun:cloud:session:${sessionId}`,
      SESSION_TTL,
      JSON.stringify({
        provider: "google-drive",
        refreshToken: encryptSecret(
          tokenData.refresh_token
        ),
        scope: tokenData.scope ?? "",
        createdAt: new Date().toISOString()
      })
    );

    const response = html(
      "Google Drive is now securely connected to Oqerun.",
      true
    );

    response.headers.append(
      "Set-Cookie",
      serializeCookie(
        SESSION_COOKIE,
        sessionId,
        {
          httpOnly: true,
          secure: true,
          sameSite: "None",
          path: "/",
          maxAge: SESSION_TTL
        }
      )
    );

    response.headers.append(
      "Set-Cookie",
      serializeCookie(
        STATE_COOKIE,
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

    return response;
  } catch (error) {
    console.error(
      "[oqerun-cloud] Google callback failed:",
      error
    );

    return html(
      "The secure Google Drive connection could not be completed. Please try again.",
      false
    );
  }
}
