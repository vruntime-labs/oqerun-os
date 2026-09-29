export async function GET(): Promise<Response> {
  return Response.json({
    ok: true,
    service: "oqerun-cloud-api",
    version: "0.1.0"
  });
}
