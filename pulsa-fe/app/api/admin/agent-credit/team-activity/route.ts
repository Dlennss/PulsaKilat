import { NextResponse } from "next/server";
import { forwardAuth, requireApiBase } from "@/lib/adminApi";

export async function GET(req: Request) {
  const base = requireApiBase();
  const auth = forwardAuth(new Headers(req.headers));
  const query = new URL(req.url).searchParams.toString();
  const response = await fetch(`${base}/v1/admin/agent-credit/team-activity?${query}`, {
    headers: auth ? { Authorization: auth } : {},
    cache: "no-store",
  });
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
