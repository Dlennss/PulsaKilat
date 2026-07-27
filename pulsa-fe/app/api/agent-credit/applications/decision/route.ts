import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { authOptions } from "@/lib/nextauth";

type SessionShape = {
  backendToken?: string;
};

export const runtime = "nodejs";

const apiBase = () => process.env.NEXT_PUBLIC_API_BASE || process.env.API_BASE || "http://127.0.0.1:8081";
const execFileAsync = promisify(execFile);

function databaseURL() {
  return process.env.DATABASE_URL || "postgres://postgres:postgres@127.0.0.1:5432/PulsaKilat?sslmode=disable";
}

function sqlText(value: unknown) {
  return String(value || "").replace(/'/g, "''");
}

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions)) as SessionShape | null;
  const incomingAuthorization = String(req.headers.get("authorization") || "").trim();
  const token = incomingAuthorization || (session?.backendToken ? `Bearer ${session.backendToken}` : "");
  if (!token) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const rawBody = await req.text();
  const referer = String(req.headers.get("referer") || "");
  const reviewerMode = String(req.headers.get("x-reviewer-mode") || "");
  let body = rawBody;
  const payload = JSON.parse(rawBody || "{}") as Record<string, unknown>;
  const analystMode = reviewerMode === "analyst" || referer.includes("/dashboard/master/analis") || String(payload.reviewer_mode || "") === "analyst" || String(payload.decision || "").startsWith("recommend_");
  if (analystMode) {
    payload.reviewer_mode = "analyst";
    if (payload.decision === "approved") payload.decision = "recommend_approve";
    if (payload.decision === "rejected") payload.decision = "recommend_reject";
    const id = Number(payload.id || 0);
    const amount = Math.max(0, Number(payload.approved_amount || 0));
    const decision = String(payload.decision || "");
    const recommendation = decision === "recommend_reject" ? "rejected" : "approved";
    const note = sqlText(payload.note || (recommendation === "approved" ? "Agent layak dengan risiko terkendali." : "Risiko belum memenuhi kriteria."));
    if (!id) {
      return NextResponse.json({ ok: false, error: "pengajuan tidak valid" }, { status: 400 });
    }
    await execFileAsync("psql", [
      databaseURL(),
      "-v",
      "ON_ERROR_STOP=1",
      "-c",
      `UPDATE public.agent_credit_application
SET
  status = 'master_review',
  approved_amount = 0,
  analyst_reviewed_at = now(),
  analyst_note = '${note}',
  analyst_recommendation = '${recommendation}',
  analyst_recommended_amount = ${recommendation === "approved" ? amount : 0},
  updated_at = now()
WHERE id = ${id}
  AND status IN ('submitted', 'marketing_review', 'analysis_review')
RETURNING id;`,
    ]);
    return NextResponse.json({ ok: true });
  }

  if (referer.includes("/dashboard/master/analis")) {
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
