import { NextResponse } from "next/server";
import { getAppServerSession } from "@/lib/server-auth";

type SessionShape = {
  backendToken?: string;
};

const apiBase = () => process.env.NEXT_PUBLIC_API_BASE || process.env.API_BASE || "http://127.0.0.1:8083";

async function proxy(path: string, method: "GET" | "POST", req?: Request) {
  const session = (await getAppServerSession()) as SessionShape | null;
  const incomingAuthorization = String(req?.headers.get("authorization") || "").trim();
  const token = incomingAuthorization || (session?.backendToken ? `Bearer ${session.backendToken}` : "");
  if (!token) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = method === "POST" && req ? await req.text() : undefined;
  const res = await fetch(`${apiBase()}${path}`, {
    method,
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

export async function GET(req: Request) {
  return proxy("/v1/master/agent-credit/applications", "GET", req);
}

export async function POST(req: Request) {
  return proxy("/v1/me/agent-credit/applications", "POST", req);
}
