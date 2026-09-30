import {
  callback,
  connect,
  contentGet,
  contentPost,
  createFolder,
  disconnect,
  files,
  health,
  optionsResponse,
  status,
  type CloudEnv
} from "./google";
import * as onedrive from "./onedrive";
import * as dropbox from "./dropbox";

interface Env extends CloudEnv, onedrive.OneDriveEnv, dropbox.DropboxEnv {
  ASSETS: Fetcher;
}

export default {
  async fetch(
    request: Request,
    env: Env
  ): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return optionsResponse(request);
    }

    try {
      if (url.pathname === "/api/health" && request.method === "GET") {
        return health(request, env);
      }

      if (url.pathname === "/api/cloud/onedrive/connect" && request.method === "GET") {
        return onedrive.connect(request, env);
      }
      if (url.pathname === "/api/cloud/onedrive/callback" && request.method === "GET") {
        return onedrive.callback(request, env);
      }
      if (url.pathname === "/api/cloud/onedrive/status" && request.method === "GET") {
        return onedrive.status(request, env);
      }
      if (url.pathname === "/api/cloud/onedrive/disconnect" && (request.method === "GET" || request.method === "POST")) {
        return onedrive.disconnect(request, env);
      }
      if (url.pathname === "/api/cloud/onedrive/files" && request.method === "GET") {
        return onedrive.files(request, env);
      }
      if (url.pathname === "/api/cloud/onedrive/files" && request.method === "POST") {
        return onedrive.createFolder(request, env);
      }
      if (url.pathname === "/api/cloud/onedrive/content" && request.method === "GET") {
        return onedrive.contentGet(request, env);
      }

      if (url.pathname === "/api/cloud/dropbox/connect" && request.method === "GET") {
        return dropbox.connect(request, env);
      }
      if (url.pathname === "/api/cloud/dropbox/callback" && request.method === "GET") {
        return dropbox.callback(request, env);
      }
      if (url.pathname === "/api/cloud/dropbox/status" && request.method === "GET") {
        return dropbox.status(request, env);
      }
      if (url.pathname === "/api/cloud/dropbox/disconnect" && (request.method === "GET" || request.method === "POST")) {
        return dropbox.disconnect(request, env);
      }
      if (url.pathname === "/api/cloud/dropbox/files" && request.method === "GET") {
        return dropbox.files(request, env);
      }
      if (url.pathname === "/api/cloud/dropbox/files" && request.method === "POST") {
        return dropbox.createFolder(request, env);
      }
      if (url.pathname === "/api/cloud/dropbox/content" && request.method === "GET") {
        return dropbox.contentGet(request, env);
      }
      if (url.pathname === "/api/cloud/dropbox/content" && request.method === "POST") {
        return dropbox.contentPost(request, env);
      }

      if (
        url.pathname === "/api/cloud/google/connect" &&
        request.method === "GET"
      ) {
        return connect(request, env);
      }

      if (
        url.pathname === "/api/cloud/google/callback" &&
        request.method === "GET"
      ) {
        return callback(request, env);
      }

      if (
        url.pathname === "/api/cloud/google/status" &&
        request.method === "GET"
      ) {
        return status(request, env);
      }

      if (
        url.pathname === "/api/cloud/google/disconnect" &&
        (request.method === "GET" || request.method === "POST")
      ) {
        return disconnect(request, env);
      }

      if (
        url.pathname === "/api/cloud/google/files" &&
        request.method === "GET"
      ) {
        return files(request, env);
      }

      if (
        url.pathname === "/api/cloud/google/files" &&
        request.method === "POST"
      ) {
        return createFolder(request, env);
      }

      if (
        url.pathname === "/api/cloud/google/content" &&
        request.method === "GET"
      ) {
        return contentGet(request, env);
      }

      if (
        url.pathname === "/api/cloud/google/content" &&
        request.method === "POST"
      ) {
        return contentPost(request, env);
      }

      if (url.pathname.startsWith("/api/")) {
        return Response.json(
          { ok: false, error: "Oqerun API route not found." },
          { status: 404 }
        );
      }

      return env.ASSETS.fetch(request);
    } catch (error) {
      console.error("[oqerun-cloud] Worker request failed:", error);

      if (url.pathname.startsWith("/api/")) {
        return Response.json(
          {
            ok: false,
            error: error instanceof Error
              ? error.message
              : "Oqerun API request failed."
          },
          { status: 500 }
        );
      }

      return env.ASSETS.fetch(request);
    }
  }
} satisfies ExportedHandler<Env>;
