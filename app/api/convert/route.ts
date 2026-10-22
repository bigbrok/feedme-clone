import { convertUrl } from "@/features/conversion";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { url?: unknown } | null;
  const input = typeof body?.url === "string" ? body.url : "";

  const result = await convertUrl(input);
  return Response.json(result, { status: result.ok ? 200 : 422 });
}
