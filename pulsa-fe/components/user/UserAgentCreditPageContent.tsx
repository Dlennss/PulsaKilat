"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BellRing,
  Camera,
  Check,
  ChevronRight,
  FileText,
  Home,
  PenLine,
  RotateCcw,
  SearchCheck,
  Store,
  Upload,
  UserRound,
  UsersRound,
  WalletCards,
} from "lucide-react";

type UserAgentCreditPageContentProps = {
  name: string;
  email: string;
  phone: string;
};

type InputProps = {
  name: string;
  label: string;
  placeholder: string;
  defaultValue?: string;
  className?: string;
  textarea?: boolean;
};

function Field({ name, label, placeholder, defaultValue = "", className = "", textarea = false }: InputProps) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[10px] font-black text-slate-950">{label}</span>
      {textarea ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          rows={4}
          className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-[#fbfffd] px-4 py-3 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#047857] focus:ring-4 focus:ring-emerald-100"
        />
      ) : (
        <input
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-[#fbfffd] px-4 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#047857] focus:ring-4 focus:ring-emerald-100"
        />
      )}
    </label>
  );
}

function UploadBox({ name, title, desc, icon: Icon }: { name: string; title: string; desc: string; icon: typeof Upload }) {
  return (
    <label className="flex cursor-pointer items-center gap-4 rounded-[22px] border border-dashed border-emerald-200 bg-[#fbfffd] p-4 transition hover:border-[#047857] hover:bg-emerald-50/60">
      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-[#047857] ring-1 ring-emerald-100">
        <Icon className="h-6 w-6" strokeWidth={2.3} />
      </span>
      <span className="min-w-0 flex-1 text-center">
        <span className="block text-sm font-black text-slate-950">{title}</span>
        <span className="mt-1 block text-[10px] font-semibold leading-4 text-slate-400">{desc}</span>
      </span>
      <input name={name} type="file" className="hidden" />
    </label>
  );
}

function SignaturePad({ signerName, onSignatureChange }: { signerName: string; onSignatureChange: (ready: boolean, dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const [hasSignature, setHasSignature] = useState(false);

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
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function startDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    const pos = point(event);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function moveDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = point(event);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
    onSignatureChange(true, "");
  }

  function endDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    if (canvas) {
      onSignatureChange(true, canvas.toDataURL("image/png"));
    }
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onSignatureChange(false, "");
  }

  return (
    <div className="rounded-[24px] border border-emerald-300 bg-[linear-gradient(180deg,#ffffff_0%,#f3fff9_100%)] p-4 text-center shadow-[0_12px_26px_rgba(4,120,87,0.10)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-950">Agent</p>
        <button
          type="submit"
          onClick={clearSignature}
          className="grid h-7 w-7 place-items-center rounded-full bg-rose-50 text-rose-500 transition hover:bg-rose-100"
          aria-label="Hapus tanda tangan"
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.4} />
        </button>
      </div>
      <div className="relative mt-3 overflow-hidden rounded-[22px] border border-slate-200 bg-[#fbfffd]">
        <canvas
          ref={canvasRef}
          className="h-40 w-full touch-none"
          onPointerDown={startDraw}
          onPointerMove={moveDraw}
          onPointerUp={endDraw}
          onPointerCancel={endDraw}
          aria-label="Area tanda tangan agent"
        />
        {!hasSignature ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-[10px] font-semibold text-slate-400">
            Tanda tangan
          </div>
        ) : null}
      </div>
      <p className="mt-3 truncate text-[11px] font-black text-slate-500">{signerName}</p>
      <p className={hasSignature ? "mt-1 text-[9px] font-black text-[#047857]" : "mt-1 text-[9px] font-black text-slate-400"}>
        {hasSignature ? "Siap dikirim" : "Belum tanda tangan"}
      </p>
    </div>
  );
}

function ReviewCard({
  title,
  desc,
  icon: Icon,
  active,
}: {
  title: string;
  desc: string;
  icon: typeof SearchCheck;
  active?: boolean;
}) {
  return (
    <div
      className={
        active
          ? "rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 text-center shadow-[0_10px_22px_rgba(4,120,87,0.08)]"
          : "rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-4 text-center"
      }
    >
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-950">{title}</p>
      <Icon className={active ? "mx-auto mt-8 h-8 w-8 text-[#047857]" : "mx-auto mt-8 h-8 w-8 text-slate-400"} strokeWidth={2.4} />
      <p className={active ? "mt-3 text-[10px] font-black leading-4 text-[#047857]" : "mt-3 text-[10px] font-black leading-4 text-slate-500"}>
        {desc}
      </p>
    </div>
  );
}

export function UserAgentCreditPageContent({ name, email, phone }: UserAgentCreditPageContentProps) {
  const [agreed, setAgreed] = useState(false);
  const [signatureReady, setSignatureReady] = useState(false);
  const [signatureData, setSignatureData] = useState("");
  const [agentSubmitted, setAgentSubmitted] = useState(false);
  const [marketingApproved, setMarketingApproved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const status = window.localStorage.getItem("pulsakilat_agent_credit_status");
        setAgentSubmitted(status === "pending" || status === "approved");
        setMarketingApproved(status === "approved");
      } catch {
        setAgentSubmitted(false);
        setMarketingApproved(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!agreed || !signatureReady || !signatureData || submitting) return;

    const form = new FormData(event.currentTarget);
    const requestedAmount = Number(String(form.get("requested_amount") || "0").replace(/[^\d]/g, ""));
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/agent-credit/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requested_amount: requestedAmount,
          applicant_data: {
            agent_name: String(form.get("agent_name") || ""),
            store_name: String(form.get("store_name") || ""),
            nik: String(form.get("nik") || ""),
            whatsapp: String(form.get("whatsapp") || ""),
            email: String(form.get("email") || ""),
            monthly_transactions: String(form.get("monthly_transactions") || ""),
            home_address: String(form.get("home_address") || ""),
            store_address: String(form.get("store_address") || ""),
            family_name: String(form.get("family_name") || ""),
            family_whatsapp: String(form.get("family_whatsapp") || ""),
            family_relation: String(form.get("family_relation") || ""),
            family_address: String(form.get("family_address") || ""),
          },
          document_data: {
            ktp_uploaded: Boolean(form.get("document_ktp")),
            store_uploaded: Boolean(form.get("document_store")),
            selfie_uploaded: Boolean(form.get("document_selfie")),
          },
          agent_signature: signatureData,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) {
        throw new Error(body.error || "Pengajuan gagal dikirim");
      }
      try {
        window.localStorage.setItem("pulsakilat_agent_credit_status", "pending");
      } catch {
        // Abaikan jika storage browser tidak tersedia.
      }
      setAgentSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pengajuan gagal dikirim");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-md pb-24">
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#052e26_0%,#047857_58%,#84cc16_140%)] px-4 pb-7 pt-5 text-white shadow-[0_18px_42px_rgba(4,120,87,0.22)]">
        <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-white/10" />
        <div className="flex items-center gap-3">
          <Link href="/user/saldo" className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/12 text-white ring-1 ring-white/15">
            <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-black tracking-tight">Kredit Saldo Agent</h1>
            <p className="mt-0.5 truncate text-[11px] font-semibold text-white/75">Ajukan limit saldo untuk operasional</p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-[#047857]">
            <WalletCards className="h-5 w-5" strokeWidth={2.4} />
          </span>
        </div>
      </section>

      <div className="-mt-4 space-y-4 px-3">
        <section className="rounded-[26px] border border-emerald-950/5 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.10)]">
          <div className="mb-4 flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-[#047857]">
              <UserRound className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950">Data Agent</h2>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Isi identitas asli agar pengajuan mudah diverifikasi.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field name="agent_name" label="Nama Agent" placeholder="Nama agent" defaultValue={name} />
            <Field name="store_name" label="Nama Toko" placeholder="Nama toko/usaha" />
            <Field name="nik" label="NIK" placeholder="16 digit NIK" />
            <Field name="whatsapp" label="Nomor WA" placeholder="08xxxxxxxxxx" defaultValue={phone !== "-" ? phone : ""} />
            <Field name="email" label="Email" placeholder="email@domain.com" defaultValue={email !== "-" ? email : ""} />
            <Field name="monthly_transactions" label="Transaksi/Bulan" placeholder="Contoh: 150 transaksi" />
            <Field name="home_address" label="Alamat Rumah" placeholder="Alamat lengkap rumah" textarea className="sm:col-span-2" />
            <Field name="store_address" label="Alamat Toko" placeholder="Alamat lengkap toko" textarea className="sm:col-span-2" />
            <Field name="requested_amount" label="Nominal Kredit Saldo" placeholder="Maksimal 500.000" defaultValue="500000" className="sm:col-span-2" />
          </div>
          <p className="mt-2 text-[10px] font-semibold text-slate-400">Maksimal pengajuan Rp500.000</p>
        </section>

        <section className="rounded-[26px] border border-emerald-950/5 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.10)]">
          <div className="mb-4 flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lime-50 text-[#047857]">
              <Home className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950">Kontak Keluarga</h2>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Wajib diisi untuk kebutuhan verifikasi.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field name="family_name" label="Nama" placeholder="Nama keluarga" />
            <Field name="family_whatsapp" label="Nomor WA" placeholder="08xxxxxxxxxx" />
            <Field name="family_relation" label="Hubungan" placeholder="Orang tua / saudara" />
            <Field name="family_address" label="Alamat" placeholder="Alamat keluarga yang dapat dihubungi" textarea className="sm:col-span-2" />
          </div>
        </section>

        <section className="rounded-[26px] border border-emerald-950/5 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.10)]">
          <div className="mb-4 flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-[#047857]">
              <Camera className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950">Upload Dokumen</h2>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Pastikan foto jelas, tidak blur, dan tidak terpotong.</p>
            </div>
          </div>
          <div className="space-y-3">
            <UploadBox name="document_ktp" title="Foto KTP" desc="KTP asli, jelas, tidak buram" icon={Upload} />
            <UploadBox name="document_store" title="Foto Toko" desc="Tampak depan toko/usaha" icon={Store} />
            <UploadBox name="document_selfie" title="Selfie Pegang KTP" desc="Wajah dan KTP terlihat jelas" icon={UsersRound} />
          </div>
          <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3 text-[10px] font-semibold leading-4 text-[#047857]">
            Tips cepat lolos: cahaya cukup, wajah terlihat, dan foto selfie harus sambil memegang KTP.
          </div>
        </section>

        <section className="rounded-[26px] border border-emerald-950/5 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.10)]">
          <div className="mb-4 flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-lime-50 text-[#047857]">
              <FileText className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950">Ketentuan Umum</h2>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Baca dan setujui sebelum mengajukan.</p>
            </div>
          </div>
          <ol className="space-y-2 text-[11px] font-semibold leading-5 text-slate-600">
            <li>1. Pengajuan hanya untuk agent PulsaKilat yang aktif.</li>
            <li>2. Limit kredit maksimal Rp500.000 dan dapat berubah sesuai hasil penilaian.</li>
            <li>3. Pelunasan wajib dilakukan sesuai tempo agar akses tetap aktif.</li>
            <li>4. Data KTP, toko, selfie, dan tanda tangan dipakai untuk validasi.</li>
          </ol>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border border-[#047857] bg-white text-[#047857]">
              {agreed ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
            </span>
            <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="sr-only" />
            <span className="text-[11px] font-black leading-4 text-slate-950">Saya menyatakan data benar dan bersedia mengikuti ketentuan kredit saldo PulsaKilat.</span>
          </label>
        </section>

        <section className="rounded-[26px] border border-emerald-950/5 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.10)]">
          <div className="mb-4 flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-[#047857]">
              <PenLine className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950">Tanda Tangan & Persetujuan</h2>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Agent tanda tangan, lalu Marketing mengecek dan memberi persetujuan.</p>
            </div>
          </div>

          {marketingApproved ? (
            <div className="mb-4 flex items-center gap-3 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-[#047857]">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white">
                <BellRing className="h-5 w-5" strokeWidth={2.4} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black">Pengajuan disetujui Marketing</p>
                <p className="mt-0.5 text-[10px] font-semibold text-[#047857]/70">Limit kredit saldo akan diproses ke akun agent.</p>
              </div>
            </div>
          ) : agentSubmitted ? (
            <div className="mb-4 flex items-center gap-3 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-700">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white">
                <SearchCheck className="h-5 w-5" strokeWidth={2.4} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black">Pengajuan dikirim</p>
                <p className="mt-0.5 text-[10px] font-semibold text-amber-700/70">Menunggu Marketing mengecek tanda tangan dan data agent.</p>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3">
            <SignaturePad
              signerName={name}
              onSignatureChange={(ready, dataUrl) => {
                setSignatureReady(ready);
                if (dataUrl) setSignatureData(dataUrl);
                if (!ready) setSignatureData("");
              }}
            />
            {marketingApproved ? (
              <ReviewCard
                title="Marketing"
                icon={SearchCheck}
                active
                desc="Sudah disetujui"
              />
            ) : null}
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-xs font-black text-rose-600">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          disabled={!agreed || !signatureReady || !signatureData || agentSubmitted || submitting}
          className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 flex h-14 w-full items-center justify-center gap-2 rounded-[22px] bg-[linear-gradient(135deg,#052e26,#047857,#84cc16)] text-sm font-black text-white shadow-[0_18px_36px_rgba(4,120,87,0.24)] transition disabled:opacity-50"
        >
          {agentSubmitted ? "Pengajuan Dikirim" : submitting ? "Mengirim..." : "Ajukan Kredit Saldo"}
          <ChevronRight className="h-4 w-4" strokeWidth={2.6} />
        </button>

        <p className="pb-2 text-center text-[10px] font-semibold text-[#047857]">Dokumen hanya digunakan untuk verifikasi pengajuan agent PulsaKilat.</p>
      </div>
    </form>
  );
}
