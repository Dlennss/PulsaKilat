import { NextResponse } from "next/server";

export const runtime = "nodejs";

const apiBase = () => process.env.NEXT_PUBLIC_API_BASE || process.env.API_BASE || "http://127.0.0.1:8083";

export async function POST(req: Request) {
  const authorization = req.headers.get("authorization") || "";
  if (!authorization) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const response = await fetch(`${apiBase()}/v1/master/operator/marketing`, {
    method: "POST",
    headers: { Authorization: authorization, "Content-Type": "application/json" },
    body: await req.text(),
    cache: "no-store",
  });
  const body = await response.text();
  return new NextResponse(body, { status: response.status, headers: { "Content-Type": "application/json" } });
}
