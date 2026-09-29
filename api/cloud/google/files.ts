import { getRedis } from "../../lib/redis";
import { decryptSecret } from "../../lib/google-token";
import { readCookie } from "../../lib/cookies";
import { corsHeaders, handleCorsOptions } from "../../lib/cors";

const SESSION_COOKIE = "oqerun_cloud_session";
const SESSION_TTL = 60 * 60 * 24 * 30;

type SessionRecord = {
  provider: "google-drive";
  refreshToken: string;
  scope: string;
  createdAt: string;
};

type GoogleRefreshResponse = {
  access_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
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

type DriveListResponse = {
  files?: DriveFile[];
  nextPageToken?: string;
  error?: {
    message?: string;
  };
};

async function getAccessToken(
  request: Request
): Promise<{
  token: string;
  redisKey: string;
} | null> {
  const sessionId = readCookie(
    request,
    SESSION_COOKIE
  );

  if (!sessionId) {
    return null;
  }

  const redis = await getRedis();
  const redisKey =
    `oqerun:cloud:session:${sessionId}`;
  const raw = await redis.get(redisKey);

  if (!raw) {
    return null;
  }

  const session =
    JSON.parse(raw) as SessionRecord;

  if (
    session.provider !== "google-drive" ||
    !session.refreshToken
  ) {
    return null;
  }

  const refreshToken =
    decryptSecret(
      session.refreshToken
    );

  const clientId =
    (process.env.GOOGLE_CLIENT_ID ?? "").trim();
  const clientSecret =
    (process.env.GOOGLE_CLIENT_SECRET ?? "").trim();

  if (!clientId || !clientSecret) {
    throw new Error(
      "Google Drive backend configuration is incomplete."
    );
  }

  const tokenRequest =
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    });

  const response = await fetch(
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

  const data =
    (await response.json()) as GoogleRefreshResponse;

  if (!response.ok || !data.access_token) {
    if (data.error === "invalid_grant") {
      await redis.del(redisKey);
    }

    throw new Error(
      "The Google Drive session has expired. Please reconnect Google Drive."
    );
  }

  await redis.expire(
    redisKey,
    SESSION_TTL
  );

  return {
    token: data.access_token,
    redisKey
  };
}

export function OPTIONS(): Response {
  return handleCorsOptions();
}

export async function GET(
  request: Request
): Promise<Response> {
  const headers = corsHeaders();
  headers.set("Cache-Control", "no-store");

  try {
    const session =
      await getAccessToken(request);

    if (!session) {
      return Response.json(
        {
          ok: false,
          error: "Google Drive is not connected."
        },
        {
          status: 401,
          headers
        }
      );
    }

    const url = new URL(
      "https://www.googleapis.com/drive/v3/files"
    );

    const requestedParent =
      new URL(request.url)
        .searchParams
        .get("parentId");

    const parentId =
      requestedParent &&
      /^[A-Za-z0-9_-]+$/.test(
        requestedParent
      )
        ? requestedParent
        : "root";

    const pageToken =
      new URL(request.url)
        .searchParams
        .get("pageToken");

    url.searchParams.set(
      "q",
      `'${parentId}' in parents and trashed = false`
    );
    url.searchParams.set(
      "pageSize",
      "100"
    );
    url.searchParams.set(
      "orderBy",
      "folder,name"
    );
    url.searchParams.set(
      "fields",
      "nextPageToken,files(id,name,mimeType,size,modifiedTime,parents,webViewLink)"
    );
    url.searchParams.set(
      "supportsAllDrives",
      "true"
    );
    url.searchParams.set(
      "includeItemsFromAllDrives",
      "true"
    );

    if (
      pageToken &&
      pageToken.length < 2000
    ) {
      url.searchParams.set(
        "pageToken",
        pageToken
      );
    }

    const response = await fetch(
      url,
      {
        headers: {
          Authorization:
            `Bearer ${session.token}`
        }
      }
    );

    const data =
      (await response.json()) as DriveListResponse;

    if (!response.ok) {
      console.error(
        "[oqerun-cloud] Drive list failed:",
        data.error?.message ??
          "unknown error"
      );

      return Response.json(
        {
          ok: false,
          error:
            "Google Drive could not return this folder."
        },
        {
          status: response.status === 401
            ? 401
            : 502,
          headers
        }
      );
    }

    return Response.json(
      {
        ok: true,
        provider: "google-drive",
        files: data.files ?? [],
        nextPageToken:
          data.nextPageToken ?? null
      },
      { headers }
    );
  } catch (error) {
    console.error(
      "[oqerun-cloud] Drive files endpoint failed:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Google Drive is unavailable."
      },
      {
        status: 503,
        headers
      }
    );
  }
}
