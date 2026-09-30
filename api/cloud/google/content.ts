export const runtime = "nodejs";

import { getRedis } from "../../lib/redis";
import { decryptSecret } from "../../lib/google-token";
import { readCookie } from "../../lib/cookies";
import { corsHeaders, handleCorsOptions } from "../../lib/cors";

const SESSION_COOKIE = "oqerun_cloud_session";
const MAX_FILE_BYTES = 4 * 1024 * 1024;

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

async function getAccessToken(request: Request): Promise<string | null> {
  const sessionId = readCookie(request, SESSION_COOKIE);
  if (!sessionId) return null;

  const redis = await getRedis();
  const key = `oqerun:cloud:session:${sessionId}`;
  const raw = await redis.get(key);
  if (!raw) return null;

  const session = JSON.parse(raw) as SessionRecord;
  if (session.provider !== "google-drive" || !session.refreshToken) {
    return null;
  }

  const clientId = (process.env.GOOGLE_CLIENT_ID ?? "").trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET ?? "").trim();
  if (!clientId || !clientSecret) {
    throw new Error("Google Drive backend configuration is incomplete.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: decryptSecret(session.refreshToken),
      grant_type: "refresh_token"
    }).toString()
  });

  const data = (await response.json()) as GoogleRefreshResponse;
  if (!response.ok || !data.access_token) {
    if (data.error === "invalid_grant") {
      await redis.del(key);
    }
    throw new Error("The Google Drive session has expired. Please reconnect Google Drive.");
  }

  await redis.expire(key, 60 * 60 * 24 * 30);
  return data.access_token;
}

function validId(value: string | null): value is string {
  return !!value && /^[A-Za-z0-9_-]+$/.test(value);
}

export function OPTIONS(): Response {
  return handleCorsOptions();
}

export async function GET(request: Request): Promise<Response> {
  const headers = corsHeaders();
  headers.set("Cache-Control", "no-store");

  try {
    const token = await getAccessToken(request);
    const fileId = new URL(request.url).searchParams.get("fileId");

    if (!token) {
      return Response.json(
        { ok: false, error: "Google Drive is not connected." },
        { status: 401, headers }
      );
    }

    if (!validId(fileId)) {
      return Response.json(
        { ok: false, error: "A valid Google Drive file id is required." },
        { status: 400, headers }
      );
    }

    const metadataResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,capabilities/canDownload`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!metadataResponse.ok) {
      return Response.json(
        { ok: false, error: "Google Drive could not read this file." },
        { status: metadataResponse.status === 404 ? 404 : 502, headers }
      );
    }

    const metadata = (await metadataResponse.json()) as {
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
        { status: 413, headers }
      );
    }

    if (metadata.capabilities?.canDownload === false) {
      return Response.json(
        { ok: false, error: "Google Drive does not allow this file to be downloaded." },
        { status: 403, headers }
      );
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (!response.ok) {
      return Response.json(
        { ok: false, error: "Google Drive could not download this file." },
        { status: response.status === 404 ? 404 : 502, headers }
      );
    }

    const responseHeaders = new Headers(headers);
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
      { status: 503, headers }
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  const headers = corsHeaders();
  headers.set("Cache-Control", "no-store");

  try {
    const token = await getAccessToken(request);
    if (!token) {
      return Response.json(
        { ok: false, error: "Google Drive is not connected." },
        { status: 401, headers }
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    const name = String(form.get("name") ?? "").trim();
    const parentId = String(form.get("parentId") ?? "root").trim();
    const fileId = String(form.get("fileId") ?? "").trim();

    if (!(file instanceof File) || !name) {
      return Response.json(
        { ok: false, error: "A file and file name are required." },
        { status: 400, headers }
      );
    }

    if (!validId(parentId) || (fileId && !validId(fileId))) {
      return Response.json(
        { ok: false, error: "Invalid Google Drive identifier." },
        { status: 400, headers }
      );
    }

    if (file.size > MAX_FILE_BYTES) {
      return Response.json(
        {
          ok: false,
          error: "This build limits cloud uploads to 4 MB because Vercel function request payloads are currently capped at about 4.5 MB."
        },
        { status: 413, headers }
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
        return Response.json(
          { ok: false, error: "Google Drive could not create the file." },
          { status: 502, headers }
        );
      }

      const created = (await createResponse.json()) as { id?: string };
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
      return Response.json(
        { ok: false, error: "Google Drive could not store the file content." },
        { status: 502, headers }
      );
    }

    const metadata = (await uploadResponse.json()) as Record<string, unknown>;

    return Response.json(
      {
        ok: true,
        provider: "google-drive",
        file: metadata
      },
      { headers }
    );
  } catch (error) {
    console.error("[oqerun-cloud] Google content POST failed:", error);
    return Response.json(
      {
        ok: false,
        error: error instanceof Error
          ? error.message
          : "Google Drive upload failed."
      },
      { status: 503, headers }
    );
  }
}
