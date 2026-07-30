import { NextResponse } from "next/server";
import { decodeJwt } from "@/lib/jwt";
import { PK_AUTH_COOKIE } from "@/lib/server-auth";

export const runtime = "nodejs";

type ReqBody = {
  token?: string;
};

export async function POST(req: Request) {
  const headerToken = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const body = (await req.json().catch(() => ({}))) as ReqBody;
  const token = headerToken || String(body.token || "").trim();

  if (!decodeJwt(token)) {
    return NextResponse.json({ ok: false, error: "invalid token" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(PK_AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.url.startsWith("https://") || process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
