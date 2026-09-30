export const runtime = "nodejs";

import { getRedis } from "../../lib/redis";
import { decryptSecret } from "../../lib/google-token";
import { readCookie } from "../../lib/cookies";
import { corsHeaders, handleCorsOptions } from "../../lib/cors";

const SESSION_COOKIE = "oqerun_cloud_session";
const SESSION_TTL = 60 * 60 * 24 * 30;
const FOLDER_MIME = "application/vnd.google-apps.folder";

type SessionRecord = {
  provider: "google-drive";
  refreshToken: string;
  scope: string;
  createdAt: string;
};

type GoogleRefreshResponse = {
  access_token?: string;
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
): Promise<string | null> {
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

  return data.access_token;
}

function validId(
  value: string | null
): value is string {
  return !!value &&
    /^[A-Za-z0-9_-]+$/.test(value);
}

export function OPTIONS(): Response {
  return handleCorsOptions();
}

export async function GET(
  request: Request
): Promise<Response> {
  const headers = corsHeaders();
  headers.set(
    "Cache-Control",
    "no-store"
  );

  try {
    const token =
      await getAccessToken(request);

    if (!token) {
      return Response.json(
        {
          ok: false,
          error:
            "Google Drive is not connected."
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
      validId(requestedParent)
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
            `Bearer ${token}`
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
          status:
            response.status === 401
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

export async function POST(
  request: Request
): Promise<Response> {
  const headers = corsHeaders();
  headers.set(
    "Cache-Control",
    "no-store"
  );

  try {
    const token =
      await getAccessToken(request);

    if (!token) {
      return Response.json(
        {
          ok: false,
          error:
            "Google Drive is not connected."
        },
        {
          status: 401,
          headers
        }
      );
    }

    const body =
      await request.json() as {
        name?: string;
        parentId?: string;
        mimeType?: string;
      };

    const name =
      (body.name ?? "").trim();
    const parentId =
      (body.parentId ?? "root").trim();
    const mimeType =
      (body.mimeType ?? FOLDER_MIME).trim();

    if (
      !name ||
      name.length > 255
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "A valid folder name is required."
        },
        {
          status: 400,
          headers
        }
      );
    }

    if (
      !validId(parentId) ||
      mimeType !== FOLDER_MIME
    ) {
      return Response.json(
        {
          ok: false,
          error:
            "Only Google Drive folders can be created by this endpoint."
        },
        {
          status: 400,
          headers
        }
      );
    }

    const response =
      await fetch(
        "https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,parents,modifiedTime",
        {
          method: "POST",
          headers: {
            Authorization:
              `Bearer ${token}`,
            "Content-Type":
              "application/json"
          },
          body: JSON.stringify({
            name,
            parents: [parentId],
            mimeType: FOLDER_MIME
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        "[oqerun-cloud] Drive folder create failed:",
        data
      );

      return Response.json(
        {
          ok: false,
          error:
            "Google Drive could not create the folder."
        },
        {
          status: 502,
          headers
        }
      );
    }

    return Response.json(
      {
        ok: true,
        provider: "google-drive",
        file: data
      },
      { headers }
    );
  } catch (error) {
    console.error(
      "[oqerun-cloud] Drive folder create endpoint failed:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Google Drive folder creation failed."
      },
      {
        status: 503,
        headers
      }
    );
  }
}
