import { NextResponse } from "next/server";
import { getAppServerSession } from "@/lib/server-auth";

type SessionShape = {
  backendToken?: string;
};

const apiBase = () => process.env.NEXT_PUBLIC_API_BASE || process.env.API_BASE || "http://127.0.0.1:8083";

async function proxyProfile(method: "GET" | "PATCH", req?: Request) {
  const session = (await getAppServerSession()) as SessionShape | null;
  const token = String(session?.backendToken || "").trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = method === "PATCH" && req ? await req.text() : undefined;
  const res = await fetch(`${apiBase()}/v1/me/profile`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
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

export async function GET() {
  return proxyProfile("GET");
}

export async function PATCH(req: Request) {
  return proxyProfile("PATCH", req);
}
