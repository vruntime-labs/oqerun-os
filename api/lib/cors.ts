export function corsHeaders(): Headers {
  const headers = new Headers();
  const origin =
    (process.env.OQERUN_FRONTEND_ORIGIN ?? "").trim();

  if (origin) {
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
  }

  return headers;
}

export function handleCorsOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}
