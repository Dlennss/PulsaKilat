import { NextResponse } from "next/server";
import { requireApiBase, forwardAuth } from "@/lib/adminApi";

export async function GET(req: Request) {
  const base = requireApiBase();
  const auth = forwardAuth(new Headers(req.headers));
  const url = new URL(req.url);
  const qs = new URLSearchParams(url.searchParams);

  // backward-compatible FE param
  const search = qs.get("search");
  if (search && !qs.get("q")) qs.set("q", search);
  qs.delete("search");

  const r = await fetch(`${base}/v1/admin/users?${qs.toString()}`, {
    headers: auth ? { Authorization: auth } : {},
    cache: "no-store",
  });

  const j = await r.json().catch(() => ({}));
  // normalize shape for existing UI that expects { items: [...] }
  if (j && typeof j === "object" && !Array.isArray(j)) {
    const rows = Array.isArray((j as { rows?: unknown[] }).rows) ? (j as { rows: unknown[] }).rows : [];
    if (!(j as { items?: unknown[] }).items) {
      (j as Record<string, unknown>).items = rows;
    }
  }
  return NextResponse.json(j, { status: r.status });
}
