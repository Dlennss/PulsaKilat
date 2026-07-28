import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/nextauth";

type SessionShape = {
  backendToken?: string;
};

export const runtime = "nodejs";

const apiBase = () => process.env.NEXT_PUBLIC_API_BASE || process.env.API_BASE || "http://127.0.0.1:8080";

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions)) as SessionShape | null;
  const incomingAuthorization = String(req.headers.get("authorization") || "").trim();
  const token = incomingAuthorization || (session?.backendToken ? `Bearer ${session.backendToken}` : "");
  if (!token) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const rawBody = await req.text();
  let body = rawBody;
  const payload = JSON.parse(rawBody || "{}") as Record<string, unknown>;
  if (payload.reviewer_mode) payload.reviewer_mode = "master";
  if (body !== JSON.stringify(payload)) {
    body = JSON.stringify(payload);
  }

  const res = await fetch(`${apiBase()}/v1/master/agent-credit/applications/decision`, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body,
    cache: "no-store",
  });
  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
