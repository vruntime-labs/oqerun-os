const SESSION_COOKIE = "oqerun_cloud_session";
const STATE_COOKIE = "oqerun_oauth_state";
const SESSION_TTL = 60 * 60 * 24 * 30;
const STATE_TTL = 600;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const FOLDER_MIME = "application/vnd.google-apps.folder";

export interface CloudEnv {
  OQERUN_KV: KVNamespace;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  OQERUN_TOKEN_ENCRYPTION_KEY: string;
}

type SessionRecord = {
  provider: "google-drive";
  refreshToken: string;
  scope: string;
  createdAt: string;
};

type DriveFile = {
  id?: string;
  name?: string;
  mimeType?: string;
  size?: string;
  modifiedTime?: string;
  parents?: string[];
  webViewLink?: string;
};

const ALLOWED_CORS_ORIGINS = new Set([
  "https://oqerun-os.vercel.app",
  "https://vruntime-labs.github.io"
]);

export function corsHeaders(request?: Request): Headers {
  const requestOrigin = request?.headers.get("Origin") ?? "";
  const origin = ALLOWED_CORS_ORIGINS.has(requestOrigin)
    ? requestOrigin
    : "https://vruntime-labs.github.io";

  const headers = new Headers({
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin"
  });

  return headers;
}

export function optionsResponse(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request)
  });
}

export function json(
  request: Request,
  data: unknown,
  status = 200,
  extra?: HeadersInit
): Response {
  const headers = corsHeaders(request);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");

  if (extra) {
    new Headers(extra).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return Response.json(data, { status, headers });
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie") ?? "";

  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) {
      return decodeURIComponent(value.join("="));
    }
  }

  return null;
}

export function serializeCookie(
  name: string,
  value: string,
  options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Lax" | "Strict" | "None";
    path?: string;
    maxAge?: number;
  } = {}
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.path) parts.push(`Path=${options.path}`);
  if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);

  return parts.join("; ");
}

export function randomHex(bytes = 32): string {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return Array.from(values, value => value.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value
    .replaceAll("-", "+")
    .replaceAll("_", "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export function encryptionKeyBytes(value: string): Uint8Array {
  const encoded = value.trim();

  if (!encoded) {
    throw new Error("OQERUN_TOKEN_ENCRYPTION_KEY is not configured.");
  }

  // Accept the two common 32-byte formats used for Cloudflare secrets:
  // 64-character hexadecimal or base64/base64url.
  if (/^[0-9a-fA-F]{64}$/.test(encoded)) {
    const bytes = new Uint8Array(32);

    for (let index = 0; index < 32; index += 1) {
      bytes[index] = Number.parseInt(
        encoded.slice(index * 2, index * 2 + 2),
        16
      );
    }

    return bytes;
  }

  const bytes = base64UrlToBytes(encoded);

  if (bytes.length !== 32) {
    throw new Error(
      "OQERUN_TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes. Use a 64-character hex key or a 32-byte base64 key."
    );
  }

  return bytes;
}

async function getEncryptionKey(env: CloudEnv): Promise<CryptoKey> {
  const bytes = encryptionKeyBytes(
    env.OQERUN_TOKEN_ENCRYPTION_KEY ?? ""
  );

  return crypto.subtle.importKey(
    "raw",
    bytes,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptSecret(
  value: string,
  env: CloudEnv
): Promise<string> {
  const key = await getEncryptionKey(env);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(value)
  );

  return [
    bytesToBase64Url(iv),
    bytesToBase64Url(new Uint8Array(encrypted))
  ].join(".");
}

export async function decryptSecret(
  payload: string,
  env: CloudEnv
): Promise<string> {
  const [ivPart, encryptedPart] = payload.split(".");

  if (!ivPart || !encryptedPart) {
    throw new Error("Invalid encrypted token payload.");
  }

  const key = await getEncryptionKey(env);
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64UrlToBytes(ivPart)
    },
    key,
    base64UrlToBytes(encryptedPart)
  );

  return new TextDecoder().decode(decrypted);
}

export function validId(value: string | null): value is string {
  return !!value && /^[A-Za-z0-9_-]+$/.test(value);
}

function redirectUri(request: Request): string {
  return new URL("/api/cloud/google/callback", request.url).toString();
}

function configurationMissing(env: CloudEnv): string[] {
  return [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "OQERUN_TOKEN_ENCRYPTION_KEY"
  ].filter(key => {
    const value = env[key as keyof CloudEnv];
    return typeof value !== "string" || !value.trim();
  });
}

function callbackHtml(
  message: string,
  success: boolean,
  sessionId?: string,
  targetOrigin = "https://oqerun-os.vercel.app"
): Response {
  const safeMessage = message
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const messageScript = `
    try {
      if (window.opener) {
        window.opener.postMessage(
          {
            source: "oqerun-cloud",
            type: "${success ? "google-connected" : "google-error"}",
            sessionId: ${success && sessionId ? JSON.stringify(sessionId) : "null"}
          },
          "${targetOrigin.replaceAll('"', "\\\"")}"
        );
      }
    } catch {}
  `;

  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store"
  });

  if (success) {
    headers.append(
      "Set-Cookie",
      serializeCookie(STATE_COOKIE, "", {
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
        path: "/",
        maxAge: 0
      })
    );
  }

  return new Response(`<!doctype html>
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
</html>`, { status: success ? 200 : 400, headers });
}

async function getSession(
  request: Request,
  env: CloudEnv
): Promise<{ id: string; record: SessionRecord } | null> {
  const authorization = request.headers.get("Authorization") ?? "";
  const bearer = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;

  const cookieSessionId = readCookie(request, SESSION_COOKIE);
  const sessionId = validId(bearer)
    ? bearer
    : cookieSessionId;

  if (!sessionId) return null;

  const raw = await env.OQERUN_KV.get(`oqerun:cloud:session:${sessionId}`);
  if (!raw) return null;

  const record = JSON.parse(raw) as SessionRecord;

  if (
    record.provider !== "google-drive" ||
    !record.refreshToken
  ) {
    return null;
  }

  return { id: sessionId, record };
}

async function getAccessToken(
  request: Request,
  env: CloudEnv
): Promise<string | null> {
  const session = await getSession(request, env);
  if (!session) return null;

  const refreshToken = await decryptSecret(
    session.record.refreshToken,
    env
  );

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID.trim(),
      client_secret: env.GOOGLE_CLIENT_SECRET.trim(),
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    }).toString()
  });

  const data = await response.json() as {
    access_token?: string;
    error?: string;
  };

  if (!response.ok || !data.access_token) {
    if (data.error === "invalid_grant") {
      await env.OQERUN_KV.delete(
        `oqerun:cloud:session:${session.id}`
      );
    }

    throw new Error(
      "The Google Drive session has expired. Please reconnect Google Drive."
    );
  }

  await env.OQERUN_KV.put(
    `oqerun:cloud:session:${session.id}`,
    JSON.stringify(session.record),
    { expirationTtl: SESSION_TTL }
  );

  return data.access_token;
}

export async function health(
  request: Request,
  env: CloudEnv
): Promise<Response> {
  const key = "system:health";
  const timestamp = new Date().toISOString();

  await env.OQERUN_KV.put(key, timestamp, {
    expirationTtl: 60
  });

  const stored = await env.OQERUN_KV.get(key);

  return json(request, {
    ok: true,
    service: "oqerun-os",
    runtime: "cloudflare-workers",
    kv: stored === timestamp
  });
}

export async function connect(
  request: Request,
  env: CloudEnv
): Promise<Response> {
  const missing = configurationMissing(env);

  if (missing.length > 0) {
    return json(request, 
      {
        ok: false,
        error: "Google Drive is not configured on the Cloudflare Worker.",
        missing
      },
      503
    );
  }

  const state = randomHex();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID.trim());
  url.searchParams.set("redirect_uri", redirectUri(request));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/drive");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);

  const headers = new Headers({
    Location: url.toString(),
    "Cache-Control": "no-store"
  });

  await env.OQERUN_KV.put(
    `oqerun:cloud:oauth-state:${state}`,
    JSON.stringify({
      createdAt: new Date().toISOString()
    }),
    { expirationTtl: STATE_TTL }
  );

  return new Response(null, {
    status: 302,
    headers
  });
}

export async function callback(
  request: Request,
  env: CloudEnv
): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const storedState = state
    ? await env.OQERUN_KV.get(
        `oqerun:cloud:oauth-state:${state}`
      )
    : null;

  if (error) {
    return callbackHtml(
      "Google authorization was not completed.",
      false
    );
  }

  if (!code || !state || !storedState) {
    return callbackHtml(
      "The Google connection could not be verified. Please start the connection again.",
      false
    );
  }

  await env.OQERUN_KV.delete(
    `oqerun:cloud:oauth-state:${state}`
  );

  const missing = configurationMissing(env);
  if (missing.length > 0) {
    return callbackHtml(
      "Google Drive backend configuration is incomplete on Cloudflare.",
      false
    );
  }

  try {
    const tokenResponse = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          code,
          client_id: env.GOOGLE_CLIENT_ID.trim(),
          client_secret: env.GOOGLE_CLIENT_SECRET.trim(),
          redirect_uri: redirectUri(request),
          grant_type: "authorization_code"
        }).toString()
      }
    );

    const tokenData = await tokenResponse.json() as {
      refresh_token?: string;
      scope?: string;
      error?: string;
    };

    if (!tokenResponse.ok || !tokenData.refresh_token) {
      console.error(
        "[oqerun-cloud] Google token exchange failed:",
        tokenData.error ?? "unknown error"
      );

      return callbackHtml(
        "Google authorization succeeded, but Oqerun could not create the secure cloud session.",
        false
      );
    }

    const sessionId = randomHex();

    const record: SessionRecord = {
      provider: "google-drive",
      refreshToken: await encryptSecret(
        tokenData.refresh_token,
        env
      ),
      scope: tokenData.scope ?? "",
      createdAt: new Date().toISOString()
    };

    await env.OQERUN_KV.put(
      `oqerun:cloud:session:${sessionId}`,
      JSON.stringify(record),
      { expirationTtl: SESSION_TTL }
    );

    // The OAuth popup stays on the Worker callback page.
    // It sends the short-lived session id to the original Oqerun
    // window with postMessage, then closes itself.

    const response = callbackHtml(
      "Google Drive is connected securely. You can close this window.",
      true,
      sessionId,
      "https://vruntime-labs.github.io"
    );

    response.headers.append(
      "Set-Cookie",
      serializeCookie(SESSION_COOKIE, sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        path: "/",
        maxAge: SESSION_TTL
      })
    );

    return response;
  } catch (error) {
    console.error(
      "[oqerun-cloud] Google callback failed:",
      error
    );

    const detail = error instanceof Error
      ? error.message
      : "unknown backend error";

    // Keep secrets and OAuth tokens out of the response, but expose the
    // configuration/processing stage so a failed connection is diagnosable.
    const safeDetail = detail
      .replaceAll("GOOGLE_CLIENT_SECRET", "Google client configuration")
      .replaceAll("OQERUN_TOKEN_ENCRYPTION_KEY", "cloud encryption key")
      .slice(0, 180);

    return callbackHtml(
      `The secure Google Drive connection could not be completed. Backend detail: ${safeDetail}`,
      false
    );
  }
}

export async function status(
  request: Request,
  env: CloudEnv
): Promise<Response> {
  try {
    const session = await getSession(request, env);

    return json(request, 
      session
        ? { connected: true, provider: "google-drive" }
        : { connected: false }
    );
  } catch (error) {
    console.error("[oqerun-cloud] Google status failed:", error);
    return json(request, 
      {
        connected: false,
        error: "Cloud session unavailable."
      },
      503
    );
  }
}

export async function disconnect(
  request: Request,
  env: CloudEnv
): Promise<Response> {
  const authorization = request.headers.get("Authorization") ?? "";
  const bearer = authorization.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;

  const cookieSessionId = readCookie(
    request,
    SESSION_COOKIE
  );

  const sessionId = validId(bearer)
    ? bearer
    : cookieSessionId;

  if (sessionId) {
    await env.OQERUN_KV.delete(
      `oqerun:cloud:session:${sessionId}`
    );
  }

  const headers = corsHeaders(request);
  headers.set("Cache-Control", "no-store");
  headers.append(
    "Set-Cookie",
    serializeCookie(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      path: "/",
      maxAge: 0
    })
  );

  return Response.json(
    { connected: false },
    { headers }
  );
}

export async function files(
  request: Request,
  env: CloudEnv
): Promise<Response> {
  try {
    const token = await getAccessToken(request, env);

    if (!token) {
      return json(request, 
        { ok: false, error: "Google Drive is not connected." },
        401
      );
    }

    const requestUrl = new URL(request.url);
    const requestedParent = requestUrl.searchParams.get("parentId");
    const parentId = requestedParent && validId(requestedParent)
      ? requestedParent
      : "root";
    const pageToken = requestUrl.searchParams.get("pageToken");

    const url = new URL(
      "https://www.googleapis.com/drive/v3/files"
    );

    url.searchParams.set(
      "q",
      `'${parentId}' in parents and trashed = false`
    );
    url.searchParams.set("pageSize", "100");
    url.searchParams.set("orderBy", "folder,name");
    url.searchParams.set(
      "fields",
      "nextPageToken,files(id,name,mimeType,size,modifiedTime,parents,webViewLink)"
    );
    url.searchParams.set("supportsAllDrives", "true");
    url.searchParams.set("includeItemsFromAllDrives", "true");

    if (pageToken && pageToken.length < 2000) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json() as {
      files?: DriveFile[];
      nextPageToken?: string;
      error?: { message?: string };
    };

    if (!response.ok) {
      console.error(
        "[oqerun-cloud] Drive list failed:",
        data.error?.message ?? "unknown error"
      );

      const googleMessage =
        data.error?.message?.trim() ||
        "Google Drive rejected the folder request.";

      return json(
        request,
        {
          ok: false,
          error: `Google Drive request failed (${response.status}): ${googleMessage.slice(0, 240)}`
        },
        response.status === 401 ? 401 : 502
      );
    }

    return json(request, {
      ok: true,
      provider: "google-drive",
      files: data.files ?? [],
      nextPageToken: data.nextPageToken ?? null
    });
  } catch (error) {
    console.error("[oqerun-cloud] Drive files failed:", error);

    return json(request, 
      {
        ok: false,
        error: error instanceof Error
          ? error.message
          : "Google Drive is unavailable."
      },
      503
    );
  }
}

export async function createFolder(
  request: Request,
  env: CloudEnv
): Promise<Response> {
  try {
    const token = await getAccessToken(request, env);

    if (!token) {
      return json(request, 
        { ok: false, error: "Google Drive is not connected." },
        401
      );
    }

    const body = await request.json() as {
      name?: string;
      parentId?: string;
      mimeType?: string;
    };

    const name = (body.name ?? "").trim();
    const parentId = (body.parentId ?? "root").trim();
    const mimeType = (body.mimeType ?? FOLDER_MIME).trim();

    if (!name || name.length > 255) {
      return json(request, 
        { ok: false, error: "A valid folder name is required." },
        400
      );
    }

    if (!validId(parentId) || mimeType !== FOLDER_MIME) {
      return json(request, 
        {
          ok: false,
          error: "Only Google Drive folders can be created by this endpoint."
        },
        400
      );
    }

    const response = await fetch(
      "https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,parents,modifiedTime",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name,
          parents: [parentId],
          mimeType: FOLDER_MIME
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("[oqerun-cloud] Drive folder create failed:", data);

      return json(request, 
        {
          ok: false,
          error: "Google Drive could not create the folder."
        },
        502
      );
    }

    return json(request, {
      ok: true,
      provider: "google-drive",
      file: data
    });
  } catch (error) {
    console.error("[oqerun-cloud] Drive folder create failed:", error);

    return json(request, 
      {
        ok: false,
        error: error instanceof Error
          ? error.message
          : "Google Drive folder creation failed."
      },
      503
    );
  }
}

export async function contentGet(
  request: Request,
  env: CloudEnv
): Promise<Response> {
  const responseHeaders = corsHeaders(request);
  responseHeaders.set("Cache-Control", "no-store");

  try {
    const token = await getAccessToken(request, env);
    const fileId = new URL(request.url).searchParams.get("fileId");

    if (!token) {
      return Response.json(
        { ok: false, error: "Google Drive is not connected." },
        { status: 401, headers: responseHeaders }
      );
    }

    if (!validId(fileId)) {
      return Response.json(
        { ok: false, error: "A valid Google Drive file id is required." },
        { status: 400, headers: responseHeaders }
      );
    }

    const metadataResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,capabilities/canDownload`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!metadataResponse.ok) {
      return Response.json(
        { ok: false, error: "Google Drive could not read this file." },
        {
          status: metadataResponse.status === 404 ? 404 : 502,
          headers: responseHeaders
        }
      );
    }

    const metadata = await metadataResponse.json() as {
      id?: string;
      name?: string;
      mimeType?: string;
      size?: string;
      capabilities?: { canDownload?: boolean };
    };

    const size = Number(metadata.size ?? 0);

    if (Number.isFinite(size) && size > MAX_FILE_BYTES) {
      return Response.json(
        {
          ok: false,
          error: "This file is larger than the current Oqerun cloud transfer limit (4 MB)."
        },
        { status: 413, headers: responseHeaders }
      );
    }

    if (metadata.capabilities?.canDownload === false) {
      return Response.json(
        {
          ok: false,
          error: "Google Drive does not allow this file to be downloaded."
        },
        { status: 403, headers: responseHeaders }
      );
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!response.ok) {
      return Response.json(
        { ok: false, error: "Google Drive could not download this file." },
        {
          status: response.status === 404 ? 404 : 502,
          headers: responseHeaders
        }
      );
    }

    responseHeaders.set(
      "Content-Type",
      response.headers.get("Content-Type") ??
        metadata.mimeType ??
        "application/octet-stream"
    );
    responseHeaders.set(
      "Content-Disposition",
      `inline; filename="${(metadata.name ?? "download").replaceAll('"', "")}"`
    );
    responseHeaders.set("Cache-Control", "private, no-store");

    return new Response(response.body, {
      status: 200,
      headers: responseHeaders
    });
  } catch (error) {
    console.error("[oqerun-cloud] Google content GET failed:", error);

    return Response.json(
      {
        ok: false,
        error: error instanceof Error
          ? error.message
          : "Google Drive content is unavailable."
      },
      { status: 503, headers: responseHeaders }
    );
  }
}

export async function contentPost(
  request: Request,
  env: CloudEnv
): Promise<Response> {
  try {
    const token = await getAccessToken(request, env);

    if (!token) {
      return json(request, 
        { ok: false, error: "Google Drive is not connected." },
        401
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    const name = String(form.get("name") ?? "").trim();
    const parentId = String(form.get("parentId") ?? "root").trim();
    const fileId = String(form.get("fileId") ?? "").trim();

    if (!(file instanceof File) || !name) {
      return json(request, 
        { ok: false, error: "A file and file name are required." },
        400
      );
    }

    if (!validId(parentId) || (fileId && !validId(fileId))) {
      return json(request, 
        { ok: false, error: "Invalid Google Drive identifier." },
        400
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return json(request, 
        {
          ok: false,
          error: "This build limits cloud uploads to 4 MB. Larger resumable transfers will be added separately."
        },
        413
      );
    }

    const bytes = await file.arrayBuffer();
    let targetId = fileId;

    if (!targetId) {
      const createResponse = await fetch(
        "https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,size,modifiedTime",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name,
            parents: [parentId],
            mimeType: file.type || "application/octet-stream"
          })
        }
      );

      if (!createResponse.ok) {
        console.error(
          "[oqerun-cloud] Drive file metadata create failed:",
          await createResponse.text()
        );

        return json(request, 
          { ok: false, error: "Google Drive could not create the file." },
          502
        );
      }

      const created = await createResponse.json() as { id?: string };
      targetId = created.id ?? "";
    }

    if (!validId(targetId)) {
      throw new Error("Google Drive did not return a valid file id.");
    }

    const uploadResponse = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${targetId}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": file.type || "application/octet-stream"
        },
        body: bytes
      }
    );

    if (!uploadResponse.ok) {
      console.error(
        "[oqerun-cloud] Drive media upload failed:",
        await uploadResponse.text()
      );

      return json(request, 
        {
          ok: false,
          error: "Google Drive could not store the file content."
        },
        502
      );
    }

    const metadata = await uploadResponse.json();

    return json(request, {
      ok: true,
      provider: "google-drive",
      file: metadata
    });
  } catch (error) {
    console.error("[oqerun-cloud] Google content POST failed:", error);

    return json(request, 
      {
        ok: false,
        error: error instanceof Error
          ? error.message
          : "Google Drive upload failed."
      },
      503
    );
  }
}
