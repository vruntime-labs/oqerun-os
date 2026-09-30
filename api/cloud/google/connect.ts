import { randomBytes } from "node:crypto";

const STATE_COOKIE = "oqerun_oauth_state";

function getRedirectUri(request: Request): string {
  return new URL("/api/cloud/google/callback", request.url).toString();
}

function missingConfiguration(): string[] {
  const required = [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET"
  ];

  return required.filter(
    key => !(process.env[key] ?? "").trim()
  );
}

export async function GET(request: Request): Promise<Response> {
  const missing = missingConfiguration();

  if (missing.length > 0) {
    return Response.json(
      {
        ok: false,
        error: "Google Drive is not configured.",
        missing
      },
      { status: 503 }
    );
  }

  const state = randomBytes(32).toString("hex");
  const redirectUri = getRedirectUri(request);

  const url = new URL(
    "https://accounts.google.com/o/oauth2/v2/auth"
  );

  url.searchParams.set(
    "client_id",
    process.env.GOOGLE_CLIENT_ID!.trim()
  );
  url.searchParams.set(
    "redirect_uri",
    redirectUri
  );
  url.searchParams.set(
    "response_type",
    "code"
  );

  /*
   * Oqerun Drive is a real virtual disk backed by the user's
   * Google Drive account. The server keeps the OAuth refresh
   * token private; the browser only receives the session cookie.
   */
  url.searchParams.set(
    "scope",
    "https://www.googleapis.com/auth/drive"
  );

  url.searchParams.set(
    "access_type",
    "offline"
  );
  url.searchParams.set(
    "include_granted_scopes",
    "true"
  );
  url.searchParams.set(
    "prompt",
    "consent"
  );
  url.searchParams.set(
    "state",
    state
  );

  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      "Set-Cookie": [
        `${STATE_COOKIE}=${state}`,
        "Path=/",
        "HttpOnly",
        "Secure",
        "SameSite=Lax",
        "Max-Age=600"
      ].join("; ")
    }
  });
}
