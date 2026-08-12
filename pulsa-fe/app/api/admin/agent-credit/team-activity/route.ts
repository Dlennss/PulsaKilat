import { NextResponse } from "next/server";
import { forwardAuth, requireApiBase } from "@/lib/adminApi";

export async function GET(req: Request) {
  const base = requireApiBase();
  const auth = forwardAuth(new Headers(req.headers));
  const query = new URL(req.url).searchParams.toString();
  try {
    const response = await fetch(`${base}/v1/admin/agent-credit/team-activity?${query}`, {
      headers: auth ? { Authorization: auth } : {},
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Backend pemantauan tim tidak dapat dihubungi" },
      { status: 502 },
    );
  }
}
