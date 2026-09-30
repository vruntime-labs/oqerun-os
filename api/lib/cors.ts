const DEFAULT_FRONTEND_ORIGIN =
  "https://vruntime-labs.github.io";

export function corsHeaders(): Headers {
  const headers = new Headers();
  const configuredOrigin =
    (process.env.OQERUN_FRONTEND_ORIGIN ?? "").trim();

  const origin =
    configuredOrigin ||
    DEFAULT_FRONTEND_ORIGIN;

  headers.set(
    "Access-Control-Allow-Origin",
    origin
  );
  headers.set(
    "Access-Control-Allow-Credentials",
    "true"
  );
  headers.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,DELETE,OPTIONS"
  );
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );
  headers.set(
    "Vary",
    "Origin"
  );

  return headers;
}

export function handleCorsOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}
