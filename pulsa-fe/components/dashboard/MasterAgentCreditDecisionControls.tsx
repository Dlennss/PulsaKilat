"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, RotateCcw, XCircle } from "lucide-react";

type Props = {
  applicationId: number;
  requestedAmount: number;
  approvedAmount?: number;
  marketingNote?: string;
  analystNote?: string;
  analystRecommendation?: string;
  analystRecommendedAmount?: number;
  status: string;
  mode?: "marketing" | "master" | "analyst" | "admin";
  canApprove?: boolean;
  approveBlockReason?: string;
};

type ApiBody = {
  ok?: boolean;
  error?: string;
};

type DecisionAction = "approved" | "rejected" | "forward_to_analysis";

function ReviewSignaturePad({
  label,
  signerName,
  value,
  onChange,
}: {
  label: string;
  signerName: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const inkRef = useRef(Boolean(value));
  const [hasInk, setHasInk] = useState(Boolean(value));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 1.35;
      ctx.strokeStyle = "#047857";
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    const pos = point(event);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const pos = point(event);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    inkRef.current = true;
    setHasInk(true);
  }

  function end(event: React.PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (inkRef.current || value) onChange(canvas.toDataURL("image/png"));
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    inkRef.current = false;
    setHasInk(false);
    onChange("");
  }

  return (
    <div className="rounded-[24px] border border-emerald-300 bg-[linear-gradient(180deg,#ffffff_0%,#f3fff9_100%)] p-4 text-center shadow-[0_12px_26px_rgba(4,120,87,0.10)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-950">{label}</p>
        <button type="button" onClick={clear} className="grid h-7 w-7 place-items-center rounded-full bg-rose-50 text-rose-500 transition hover:bg-rose-100" aria-label="Hapus tanda tangan">
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="relative mt-3 overflow-hidden rounded-[22px] border border-slate-200 bg-[#fbfffd]">
        <canvas
          ref={canvasRef}
          className="h-40 w-full touch-none"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          aria-label={`Area tanda tangan ${label.toLowerCase()}`}
        />
        {!hasInk ? <span className="pointer-events-none absolute inset-0 grid place-items-center text-[10px] font-semibold text-slate-400">Tanda tangan</span> : null}
      </div>
      <p className="mt-3 truncate text-[11px] font-black text-slate-500">{signerName}</p>
      <p className={hasInk ? "mt-1 text-[9px] font-black text-[#047857]" : "mt-1 text-[9px] font-black text-slate-400"}>
        {hasInk ? "Siap dikirim" : "Belum tanda tangan"}
      </p>
    </div>
  );
}

export function MasterAgentCreditDecisionControls({
  applicationId,
  requestedAmount,
  approvedAmount = 0,
  marketingNote = "",
  analystNote = "",
  analystRecommendation = "",
  analystRecommendedAmount = 0,
  status,
  mode = "master",
  canApprove = true,
  approveBlockReason = "",
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<DecisionAction | "">("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(approvedAmount || analystRecommendedAmount || requestedAmount));
  const [note, setNote] = useState(analystNote || marketingNote);
  const [signatureData, setSignatureData] = useState("");
  const [riskLevel, setRiskLevel] = useState("perhatian");
  const [riskScore, setRiskScore] = useState("50");
  const isFinal = status === "approved" || status === "rejected" || status === "analysis_rejected" || status === "master_rejected";
  const isMarketingReview = (mode === "marketing" || mode === "master") && (status === "submitted" || status === "marketing_review");
  const isAdminReview = mode === "admin" && ["submitted", "marketing_review", "analysis_review", "master_review", "ready_to_disburse"].includes(status);
  const canAct = isMarketingReview || isAdminReview || (mode === "analyst" && status === "analysis_review") || isFinal;
  const needsReviewerSignature = isMarketingReview;
  const approveLabel = isMarketingReview ? "Kirim ke Operator" : mode === "analyst" || mode === "admin" ? "Setujui Pengajuan" : "Kirim ke Operator";
  const rejectLabel = "Tolak";

  async function decide(decision: DecisionAction) {
    if (busy) return;
    const isPositiveDecision = decision === "approved" || decision === "forward_to_analysis";
    if (isPositiveDecision && !canApprove) {
      setError(approveBlockReason || "Data agent wajib lengkap sebelum dikirim ke operator");
      return;
    }
    if (needsReviewerSignature && !signatureData.startsWith("data:image/")) {
      setError("Tanda tangan marketing wajib diisi");
      return;
    }
    const parsedAmount = Number(amount.replace(/[^\d]/g, ""));
    const defaultNote = isPositiveDecision
        ? mode === "analyst" || mode === "admin"
          ? "Pemeriksaan risiko disetujui. Pinjaman saldo agent aktif."
          : mode === "marketing"
            ? "Marketing sudah cek data lapangan dan dokumen, lalu dikirim ke operator."
            : isMarketingReview
              ? "Marketing sudah cek data lapangan dan dokumen, lalu dikirim ke operator."
            : "Data agent sesuai dan dikirim ke operator."
        : "Data agent belum sesuai.";
    const apiDecision = isMarketingReview && decision === "forward_to_analysis" ? "kirim_analis" : decision;
    setBusy(decision);
    setError("");
    try {
      const token = window.localStorage.getItem("auth_token") || "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch("/api/agent-credit/applications/decision", {
        method: "POST",
        headers,
        body: JSON.stringify({
          id: applicationId,
          decision: apiDecision,
          approved_amount: decision === "approved" && !isMarketingReview ? parsedAmount : 0,
          note: note.trim() || defaultNote,
          reviewer_mode: mode,
          signature_data: needsReviewerSignature ? signatureData : "",
          risk_level: mode === "analyst" || mode === "admin" ? riskLevel : undefined,
          risk_score: mode === "analyst" || mode === "admin" ? Number(riskScore || 0) : undefined,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as ApiBody;
      if (!response.ok || !body.ok) {
        throw new Error(body.error || "Keputusan gagal disimpan");
      }
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Keputusan gagal disimpan");
    } finally {
      setBusy("");
    }
  }

  if (isFinal && !editing) {
    return (
      <div className={status === "approved" ? "rounded-2xl border border-emerald-200 bg-emerald-50 p-2.5 text-emerald-700" : "rounded-2xl border border-rose-200 bg-rose-50 p-2.5 text-rose-600"}>
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white shadow-sm">
            {status === "approved" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          </span>
          <span className="min-w-0 flex-1">
          <span className="block text-sm font-black">{status === "approved" ? "Disetujui Operator" : "Ditolak Operator"}</span>
          <span className="mt-0.5 block truncate text-[10px] font-bold opacity-70">
              {status === "approved" ? "Limit agent sudah aktif dan bisa dipantau." : "Agent akan melihat pemberitahuan dan bisa memperbaiki data."}
            </span>
          </span>
        </div>
        {marketingNote || analystNote ? <p className="mt-2 rounded-2xl bg-white/70 px-3 py-2 text-[10px] font-bold leading-4 opacity-80">{marketingNote || analystNote}</p> : null}
      </div>
    );
  }

  if (!canAct && !editing) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
        <div>
          <p className="text-xs font-black">Menunggu review</p>
          <p className="mt-0.5 text-[10px] font-bold text-slate-400">Belum bisa diputuskan di tahap ini.</p>
        </div>
        {analystRecommendation ? (
          <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-[10px] font-bold text-slate-500">
            Catatan lama: {analystRecommendation === "approved" ? "Layak" : "Tidak layak"} {analystRecommendedAmount ? `- Rp ${new Intl.NumberFormat("id-ID").format(analystRecommendedAmount)}` : ""}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-100 bg-[linear-gradient(135deg,#ffffff_0%,#f8fffb_58%,#ecfdf5_100%)] p-3 shadow-[0_10px_24px_rgba(6,78,59,0.05)]">
      <div className="grid gap-2 xl:grid-cols-[160px_minmax(260px,1fr)_210px] xl:items-stretch">
        <label className="block min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.035)] focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100">
          <span className="block truncate text-[9px] font-black uppercase tracking-[0.08em] text-emerald-600">{isMarketingReview ? "Nominal Diajukan" : "Nominal ACC"}</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="numeric"
            disabled={isMarketingReview}
            className="mt-1 h-8 w-full bg-transparent text-base font-black text-slate-950 outline-none disabled:text-slate-700"
          />
        </label>
        <label className="block min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-[0_8px_18px_rgba(15,23,42,0.035)] focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100">
          <span className="block truncate text-[9px] font-black uppercase tracking-[0.08em] text-emerald-600">Catatan</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={isMarketingReview ? "Catatan hasil pendampingan lapangan" : "Catatan untuk agent"}
            rows={2}
            className="mt-1 min-h-10 w-full resize-none bg-transparent text-xs font-bold leading-5 text-slate-700 outline-none placeholder:text-slate-400"
          />
        </label>
        {mode === "analyst" || mode === "admin" ? (
          <div className="grid gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-[0_8px_18px_rgba(15,23,42,0.035)] min-[420px]:grid-cols-2 xl:col-span-2">
            <label className="block">
              <span className="block text-[9px] font-black uppercase tracking-[0.08em] text-emerald-600">Level Risiko</span>
              <select value={riskLevel} onChange={(event) => setRiskLevel(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-950 outline-none">
                <option value="aman">Aman</option>
                <option value="perhatian">Perlu Perhatian</option>
                <option value="tinggi">Risiko Tinggi</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-[9px] font-black uppercase tracking-[0.08em] text-emerald-600">Skor Risiko</span>
              <input value={riskScore} onChange={(event) => setRiskScore(event.target.value)} inputMode="numeric" className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-950 outline-none" />
            </label>
          </div>
        ) : null}
        {needsReviewerSignature ? (
          <div className="xl:col-span-2">
            <ReviewSignaturePad
              label="Marketing"
              signerName="Marketing PulsaKilat"
              value={signatureData}
              onChange={setSignatureData}
            />
          </div>
        ) : null}
        <div className={`grid min-w-0 grid-cols-1 gap-2 ${isMarketingReview ? "" : "min-[390px]:grid-cols-2 xl:grid-cols-1"}`}>
          <button
            type="button"
            onClick={() => decide(isMarketingReview ? "forward_to_analysis" : "approved")}
            disabled={Boolean(busy) || !canApprove}
            className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#047857,#16a34a)] px-3 text-[11px] font-black leading-3 text-white shadow-[0_10px_18px_rgba(5,150,105,0.18)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:bg-none disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
            title={!canApprove ? approveBlockReason || "Agent belum melengkapi persetujuan" : undefined}
          >
            {busy === "approved" || busy === "forward_to_analysis" ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
            <span className="truncate">{busy === "approved" || busy === "forward_to_analysis" ? "Proses" : approveLabel}</span>
          </button>
          {mode === "analyst" || mode === "admin" ? (
            <button
              type="button"
              onClick={() => decide("rejected")}
              disabled={Boolean(busy)}
              className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 text-[11px] font-black leading-3 text-rose-600 shadow-[0_8px_16px_rgba(225,29,72,0.06)] transition hover:-translate-y-0.5 hover:bg-rose-50 disabled:translate-y-0 disabled:opacity-60"
            >
              {busy === "rejected" ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <XCircle className="h-4 w-4 shrink-0" />}
              <span className="truncate">{busy === "rejected" ? "Proses" : rejectLabel}</span>
            </button>
          ) : null}
        </div>
      </div>
      {editing ? (
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError("");
          }}
          className="mt-3 h-10 w-full rounded-2xl bg-slate-100 text-[10px] font-black text-slate-500 transition hover:bg-slate-200"
        >
          Batal edit
        </button>
      ) : null}
      {!canApprove ? <p className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-center text-[10px] font-black text-amber-700">{approveBlockReason || "Data agent wajib lengkap sebelum dikirim ke operator."}</p> : null}
      {error ? <p className="mt-2 rounded-2xl bg-rose-50 px-3 py-2 text-center text-[10px] font-black text-rose-600">{error}</p> : null}
    </div>
  );
}
