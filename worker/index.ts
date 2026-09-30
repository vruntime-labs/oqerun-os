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

interface Env extends CloudEnv {
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
