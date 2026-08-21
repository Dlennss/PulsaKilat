"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Camera,
  Check,
  ChevronRight,
  Clock3,
  FileText,
  HandCoins,
  Home,
  Landmark,
  Loader2,
  PenLine,
  QrCode,
  RotateCcw,
  SearchCheck,
  Store,
  Upload,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react";
import type { AgentCreditApplication } from "@/lib/api.auth";

type UserAgentCreditPageContentProps = {
  name: string;
  email: string;
  phone: string;
  mainBalance?: number;
  initialApplications?: AgentCreditApplication[];
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

function SelectField({ name, label, defaultValue = "", className = "", options }: { name: string; label: string; defaultValue?: string; className?: string; options: string[] }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[10px] font-black text-slate-950">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-[#fbfffd] px-4 text-sm font-bold text-slate-950 outline-none transition focus:border-[#047857] focus:ring-4 focus:ring-emerald-100"
      >
        <option value="" disabled>
          Pilih hubungan
        </option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

type StoredImage = {
  name: string;
  type: string;
  size: number;
  data_url: string;
};

function readStoredImage(file: File | null): Promise<StoredImage | null> {
  if (!file) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Gagal membaca file ${file.name}`));
    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        data_url: String(reader.result || ""),
      });
    };
    reader.readAsDataURL(file);
  });
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
          type="button"
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

function getApplicationNotice(application?: AgentCreditApplication) {
  if (!application) return null;
  if (
    (application.status === "submitted" || application.status === "marketing_review" || application.status === "analysis_review" || application.status === "master_review" || application.status === "ready_to_disburse") &&
    !application.has_agent_signature
  ) {
    return {
      title: "Perlu tanda tangan",
      desc: "Lengkapi dokumen, centang ketentuan, lalu tanda tangan agar bisa diperiksa operator.",
      className: "border-amber-200 bg-amber-50 text-amber-700",
      icon: PenLine,
    };
  }
  switch (application.status) {
    case "approved":
      return {
        title: "Pengajuan disetujui",
        desc: `Kredit ${formatIDR(application.approved_amount || application.requested_amount)} sudah disetujui operator dan masuk ke saldo utama.`,
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
        icon: BadgeCheck,
      };
    case "rejected":
    case "analysis_rejected":
    case "master_rejected":
      {
        const note = application.marketing_note || application.analyst_note;
        return {
          title: "Pengajuan ditolak",
          desc: note || "Data belum sesuai. Perbaiki data dan ajukan ulang.",
          className: "border-rose-200 bg-rose-50 text-rose-600",
          icon: XCircle,
        };
      }
    case "legacy_rejected":
      return {
        title: "Pengajuan ditolak",
        desc: application.marketing_note || "Data belum sesuai. Silakan perbaiki data dan ajukan kembali.",
        className: "border-rose-200 bg-rose-50 text-rose-600",
        icon: XCircle,
      };
    case "marketing_review":
      return {
        title: "Sedang dicek",
        desc: "Dokumen agent sudah terkirim dan dapat dipantau oleh marketing.",
        className: "border-amber-200 bg-amber-50 text-amber-700",
        icon: SearchCheck,
      };
    case "ready_to_disburse":
      return {
        title: "Menunggu aktivasi",
        desc: `Operator sudah menyetujui nominal ${formatIDR(application.approved_amount || application.requested_amount)}. Limit sedang disiapkan.`,
        className: "border-sky-200 bg-sky-50 text-sky-700",
        icon: BadgeCheck,
      };
    case "analysis_review":
      return {
        title: "Sedang dicek operator",
        desc: "Operator sedang mengecek kelengkapan data, risiko, dan nominal.",
        className: "border-sky-200 bg-sky-50 text-sky-700",
        icon: SearchCheck,
      };
    case "master_review":
      return {
        title: "Sedang diproses",
        desc: "Dokumen agent sedang diperiksa sebelum keputusan operator.",
        className: "border-sky-200 bg-sky-50 text-sky-700",
        icon: SearchCheck,
      };
    case "submitted":
      return {
        title: "Pengajuan dikirim",
        desc: "Menunggu keputusan dari operator kredit.",
        className: "border-amber-200 bg-amber-50 text-amber-700",
        icon: SearchCheck,
      };
    default:
      return null;
  }
}

function isRejectedStatus(status?: string) {
  return status === "rejected" || status === "analysis_rejected" || status === "master_rejected" || status === "legacy_rejected";
}

function isPaidStatus(application: AgentCreditApplication) {
  return String(application.loan_status || "").toLowerCase() === "paid";
}

function formatIDR(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;
}

const defaultCreditAmount = 500000;

const levelBadgeByCode: Record<string, string> = {
  start: "/agent-levels/kilat-start-badge.png",
  plus: "/agent-levels/kilat-plus-badge.png",
  pro: "/agent-levels/kilat-pro-badge.png",
  max: "/agent-levels/kilat-max-badge.png",
  elite: "/agent-levels/kilat-elite-badge.png",
};

export function UserAgentCreditPageContent({ name, email, phone, mainBalance = 0, initialApplications = [] }: UserAgentCreditPageContentProps) {
  const [agreed, setAgreed] = useState(false);
  const [signatureReady, setSignatureReady] = useState(false);
  const [signatureData, setSignatureData] = useState("");
  const [latestApplication, setLatestApplication] = useState<AgentCreditApplication | undefined>(initialApplications[0]);
  const [applications, setApplications] = useState(initialApplications);
  const [activeCreditTab, setActiveCreditTab] = useState<"list" | "new" | "status">(initialApplications.length ? "list" : "new");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"transfer" | "qris" | "offline">("transfer");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofName, setPaymentProofName] = useState("");
  const [surveyFiles, setSurveyFiles] = useState<Record<string, File | null>>({});
  const [surveyPreviewUrls, setSurveyPreviewUrls] = useState<Record<string, string>>({});
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");
  const [displayMainBalance, setDisplayMainBalance] = useState(mainBalance);
  const router = useRouter();

  useEffect(() => {
    const nextPreviewUrls: Record<string, string> = {};
    Object.entries(surveyFiles).forEach(([key, file]) => {
      if (file) nextPreviewUrls[key] = URL.createObjectURL(file);
    });
    setSurveyPreviewUrls(nextPreviewUrls);

    return () => {
      Object.values(nextPreviewUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [surveyFiles]);

  const notice = getApplicationNotice(latestApplication);
  const NoticeIcon = notice?.icon;
  const isPendingStatus = latestApplication?.status === "submitted" || latestApplication?.status === "marketing_review" || latestApplication?.status === "analysis_review" || latestApplication?.status === "master_review" || latestApplication?.status === "ready_to_disburse";
  const unsignedPendingApplication = Boolean(isPendingStatus && latestApplication && !latestApplication.has_agent_signature);
  const hasOpenApplication = Boolean(isPendingStatus && !unsignedPendingApplication);
  const isPaidOff = latestApplication?.status === "approved" && String(latestApplication.loan_status || "").toLowerCase() === "paid";
  const isCreditSuspended = latestApplication?.status === "approved" && String(latestApplication.loan_status || "").toLowerCase() === "suspended";
  const isApproved = latestApplication?.status === "approved" && !isPaidOff;
  const creditBalanceAvailable = isApproved && displayMainBalance > 0;
  const creditCycleExhausted = isApproved && displayMainBalance <= 0;
  const canReapply = latestApplication?.status === "rejected" || latestApplication?.status === "analysis_rejected" || latestApplication?.status === "master_rejected" || creditCycleExhausted;
  const canRefill = Boolean(isPaidOff);
  const creditLevelCode = String(latestApplication?.credit_level_code || "start").trim().toLowerCase();
  const creditLevelName = latestApplication?.credit_level_name || "Kilat Start";
  const creditLevelImage = levelBadgeByCode[creditLevelCode] || levelBadgeByCode.start;
  const levelSubtitle = latestApplication?.credit_needs_repair ? "Perbaiki" : creditLevelName.replace("Kilat ", "");
  const requestedAmount = defaultCreditAmount;
  const surveyDocumentsComplete = ["ktp", "store", "selfie_ktp", "selfie_marketing"].every((key) => Boolean(surveyFiles[key]));
  const totalPaidAmount = applications.reduce((sum, item) => sum + Number(item.paid_amount || 0), 0);
  const totalActiveCredit = applications.reduce((sum, item) => sum + Math.max(0, Number(item.outstanding_amount || 0)), 0);
  const statusIsApproved = latestApplication?.status === "approved";
  const applicantDefaults = latestApplication?.applicant_data || {};
  const applicantText = (key: string, fallback = "") => {
    const value = applicantDefaults[key];
    return typeof value === "string" && value.trim() ? value.trim() : fallback;
  };
  const totalApplications = applications.length;
  const pendingApplications = applications.filter((item) => (
    item.status === "submitted" ||
    item.status === "marketing_review" ||
    item.status === "analysis_review" ||
    item.status === "master_review" ||
    item.status === "ready_to_disburse"
  )).length;
  const acceptedApplications = applications.filter((item) => item.status === "approved").length;
  const rejectedApplications = applications.filter((item) => isRejectedStatus(item.status)).length;
  const listApplications = applications.length ? applications : [];
  const statusLabel = (item: AgentCreditApplication) => {
    if (item.status === "approved") return String(item.loan_status || "").toLowerCase() === "suspended" ? "Dibekukan" : isPaidStatus(item) ? "Siklus Selesai" : "Modal Aktif";
    if (isRejectedStatus(item.status)) return "Ditolak";
    return "Menunggu";
  };
  const statusClassName = (item: AgentCreditApplication) => {
    if (item.status === "approved") return String(item.loan_status || "").toLowerCase() === "suspended" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800";
    if (isRejectedStatus(item.status)) return "bg-rose-100 text-rose-700";
    return "bg-amber-100 text-amber-800";
  };
  const statusAmount = Number(latestApplication?.approved_amount || latestApplication?.requested_amount || requestedAmount || 0);
  const statusOutstanding = Math.max(0, Number(latestApplication?.outstanding_amount ?? 0));
  const statusIsPaid = statusIsApproved && latestApplication ? isPaidStatus(latestApplication) : false;
  const statusIsRejected = isRejectedStatus(latestApplication?.status);
  const statusIsWaiting = Boolean(latestApplication && !statusIsApproved && !statusIsRejected);
  const systemValidationPassed = latestApplication?.applicant_data?.system_validation_status === "passed";
  const statusPaymentDue = statusIsPaid ? 0 : statusOutstanding;
  const statusApplicationCode = latestApplication?.id ? `KSA-${String(latestApplication.id).padStart(8, "0")}` : "KSA-PENDING";
  const statusHeadline = statusIsRejected
    ? "Pengajuan perlu diperbaiki"
    : statusIsWaiting
      ? "Pengajuan sedang diproses"
      : statusIsPaid
        ? "Siklus modal selesai"
        : isCreditSuspended
          ? "Kredit agent sedang dibekukan"
          : "Limit kredit agent sudah aktif";
  const statusBandLabel = statusIsRejected ? "DITOLAK" : statusIsWaiting ? "MENUNGGU" : statusIsPaid ? "SELESAI" : isCreditSuspended ? "DIBEKUKAN" : "AKTIF";
  const statusBandSubcopy = statusIsRejected
    ? "Lihat catatan dan ajukan ulang"
    : statusIsWaiting
      ? "Menunggu keputusan tim PulsaKilat"
      : statusIsPaid
        ? "Agent dapat mengajukan modal berikutnya"
        : isCreditSuspended
          ? "Penggunaan saldo utama dibatasi sementara"
          : "Nominal kredit telah masuk ke saldo utama";
  const operatorFinished = statusIsApproved || statusIsRejected;
  const statusSteps = [
    { label: "Formulir agent diterima", done: true },
    { label: "Dokumen agent siap diperiksa operator", done: Boolean(latestApplication?.has_agent_signature) },
    { label: statusIsRejected ? "Keputusan operator: perlu perbaikan" : "Keputusan akhir operator", done: operatorFinished },
  ];
  const paymentMethods = [
    {
      id: "transfer" as const,
      title: "Transfer Bank",
      desc: "BCA - 1234567890 a.n. PulsaKilat",
      icon: Landmark,
    },
    {
      id: "qris" as const,
      title: "QRIS / Barcode",
      desc: "Nominal otomatis sesuai pelunasan",
      icon: QrCode,
    },
    {
      id: "offline" as const,
      title: "Penagihan Offline",
      desc: "Marketing datang dan menerima pelunasan langsung",
      icon: HandCoins,
    },
  ];
  const selectedPayment = paymentMethods.find((method) => method.id === selectedPaymentMethod) || paymentMethods[0];

  async function handleCreditPaymentConfirmation() {
    if (!latestApplication || !latestApplication.id || statusPaymentDue <= 0 || paymentSubmitting) return;
    if (!paymentProofFile) {
      setPaymentError("Bukti transfer wajib diupload");
      return;
    }

    setPaymentSubmitting(true);
    setPaymentError("");
    setPaymentSuccess("");
    try {
      const paymentProof = await readStoredImage(paymentProofFile);
      const response = await fetch("/api/agent-credit/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_id: latestApplication.id,
          amount: statusPaymentDue,
          payment_method: selectedPaymentMethod,
          note: `Pelunasan tagihan kredit agent via ${selectedPayment.title}`,
          payment_proof: paymentProof,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; item?: AgentCreditApplication };
      if (!response.ok || !body.ok) {
        throw new Error(body.error || "Konfirmasi pembayaran gagal diproses");
      }
      setPaymentProofFile(null);
      setPaymentProofName("");
      setPaymentSuccess("Pembayaran terkirim. Tim PulsaKilat akan memverifikasi bukti pelunasan.");
      router.refresh();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Konfirmasi pembayaran gagal diproses");
    } finally {
      setPaymentSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!agreed || !signatureReady || !signatureData || submitting) return;

    const surveyKeys = ["ktp", "store", "selfie_ktp", "selfie_marketing"];
    if (surveyKeys.some((key) => !surveyFiles[key])) {
      setError("Empat foto dokumen wajib dilengkapi sebelum pengajuan dikirim.");
      return;
    }

    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError("");
    try {
      const documentEntries = await Promise.all(surveyKeys.map(async (key) => [key, await readStoredImage(surveyFiles[key])] as const));
      const documentData = Object.fromEntries(documentEntries.filter(([, image]) => image));
      const response = await fetch("/api/agent-credit/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: unsignedPendingApplication ? latestApplication?.id : undefined,
          requested_amount: requestedAmount,
          applicant_data: {
            agent_name: String(form.get("agent_name") || ""),
            store_name: String(form.get("store_name") || ""),
            nik: String(form.get("nik") || ""),
            whatsapp: String(form.get("whatsapp") || ""),
            email: String(form.get("email") || ""),
            home_address: String(form.get("home_address") || ""),
            store_address: String(form.get("store_address") || ""),
            family_name: String(form.get("family_name") || ""),
            family_whatsapp: String(form.get("family_whatsapp") || ""),
            family_relation: String(form.get("family_relation") || ""),
            family_address: String(form.get("family_address") || ""),
            terms_accepted: agreed,
            terms_version: "pulsakilat-agent-credit-2026-07",
          },
          document_data: documentData,
          agent_signature: signatureData,
          terms_accepted: agreed,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; item?: AgentCreditApplication };
      if (!response.ok || !body.ok) {
        throw new Error(body.error || "Pengajuan gagal dikirim");
      }
      if (body.item) {
        setLatestApplication(body.item);
        setApplications((current) => {
          const nextItem = body.item as AgentCreditApplication;
          const exists = current.some((item) => item.id === nextItem.id);
          return exists ? current.map((item) => (item.id === nextItem.id ? nextItem : item)) : [nextItem, ...current];
        });
        setActiveCreditTab("list");
        setSurveyFiles({});
      }
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
          <Link
            href="/user/saldo/kredit-agent/level"
            className="flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-white px-2.5 text-[#047857] shadow-[0_10px_22px_rgba(0,0,0,0.08)]"
            aria-label={`Lihat level ${creditLevelName}`}
          >
            <span className="relative h-9 w-9 shrink-0">
              <Image src={creditLevelImage} alt={creditLevelName} fill sizes="36px" className="object-contain" />
            </span>
            <span className="hidden min-w-0 text-left min-[380px]:block">
              <span className="block text-[9px] font-black leading-3 text-slate-400">Level</span>
              <span className="block max-w-[72px] truncate text-[10px] font-black leading-3 text-[#047857]">{levelSubtitle}</span>
            </span>
          </Link>
        </div>
      </section>

      <div className="-mt-4 space-y-4 px-3">
        <section className="overflow-hidden rounded-[28px] border border-emerald-100 bg-white shadow-[0_20px_48px_rgba(6,78,59,0.12)]">
          <div className="flex items-center gap-3 border-b border-emerald-50 p-4">
            <span className="relative h-16 w-16 shrink-0 rounded-[22px] bg-emerald-50 p-2 ring-1 ring-emerald-100">
              <Image src={creditLevelImage} alt={creditLevelName} fill sizes="64px" className="object-contain p-1" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-black text-slate-950">{name || "Agent PulsaKilat"}</p>
              <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-500">
                {acceptedApplications} pengajuan diterima
              </p>
            </div>
            <span className="rounded-full bg-emerald-950 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white">
              {levelSubtitle}
            </span>
          </div>

          <div className="space-y-3 p-4">
            <div className="overflow-hidden rounded-[24px] bg-[linear-gradient(135deg,#052e26_0%,#047857_58%,#84cc16_145%)] text-white shadow-[0_18px_34px_rgba(4,120,87,0.22)]">
              <div className="min-w-0 p-4">
                <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-lime-100/85">Saldo Utama</p>
                <p className="mt-2 truncate text-2xl font-black">{formatIDR(displayMainBalance)}</p>
                <p className="mt-2 text-[10px] font-semibold leading-4 text-emerald-50/80">Saldo untuk pembelian produk dan transaksi harian. Kredit yang disetujui operator langsung masuk ke saldo ini.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2 rounded-[24px] border border-emerald-100 bg-emerald-50 p-2 shadow-[0_14px_30px_rgba(6,78,59,0.08)]">
          <button
            type="button"
            onClick={() => setActiveCreditTab("list")}
            className={activeCreditTab === "list"
              ? "flex min-h-14 items-center gap-3 rounded-[20px] bg-white px-3 text-left text-[#047857] shadow-[0_12px_22px_rgba(6,78,59,0.10)]"
              : "flex min-h-14 items-center gap-3 rounded-[20px] px-3 text-left text-slate-500"}
          >
            <FileText className="h-5 w-5 shrink-0" strokeWidth={2.4} />
            <span className="min-w-0">
              <span className="block truncate text-xs font-black">Semua Peminjam</span>
              <span className="block truncate text-[10px] font-semibold">{totalApplications} pengajuan tersimpan</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCreditTab("new")}
            className={activeCreditTab === "new"
              ? "flex min-h-14 items-center gap-3 rounded-[20px] bg-white px-3 text-left text-[#047857] shadow-[0_12px_22px_rgba(6,78,59,0.10)]"
              : "flex min-h-14 items-center gap-3 rounded-[20px] px-3 text-left text-slate-500"}
          >
            <UserRound className="h-5 w-5 shrink-0" strokeWidth={2.4} />
            <span className="min-w-0">
              <span className="block truncate text-xs font-black">Daftar Baru</span>
              <span className="block truncate text-[10px] font-semibold">Tambah orang yang ingin meminjam</span>
            </span>
          </button>
        </section>

        {activeCreditTab === "list" ? (
          <section className="rounded-[26px] border border-emerald-100 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.10)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#047857]">Data Pengajuan Agent</p>
            <h2 className="mt-1 text-xl font-black leading-6 text-slate-950">Orang yang didaftarkan</h2>
            <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-500">
              Semua pengajuan tersimpan rapi di sini. Pilih salah satu untuk melihat status dan detail pengajuan.
            </p>

            <div className="mt-4 grid grid-cols-4 overflow-hidden rounded-[22px] border border-emerald-100 bg-[linear-gradient(135deg,#f0fdf4,#ffffff)]">
              {[
                ["Total", totalApplications],
                ["Menunggu", pendingApplications],
                ["Diterima", acceptedApplications],
                ["Ditolak", rejectedApplications],
              ].map(([label, value]) => (
                <div key={label} className="border-r border-emerald-100 px-2 py-3 text-center last:border-r-0">
                  <p className="text-lg font-black text-slate-950">{value}</p>
                  <p className="mt-1 text-[9px] font-black text-slate-500">{label}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {["Semua", "Menunggu", "Diterima", "Ditolak"].map((filter, index) => (
                <span
                  key={filter}
                  className={index === 0
                    ? "shrink-0 rounded-full border border-[#047857] bg-white px-3 py-2 text-[10px] font-black text-[#047857]"
                    : "shrink-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-500"}
                >
                  {filter}
                </span>
              ))}
            </div>

            <p className="mt-2 text-[10px] font-semibold text-slate-500">
              Menampilkan {listApplications.length} dari {totalApplications} pengajuan
            </p>

            <div className="mt-4 space-y-3">
              {listApplications.length ? (
                listApplications.map((item, index) => {
                  const data = item.applicant_data || {};
                  const agentName = String(data.agent_name || data.nama_lengkap || `Agent PulsaKilat ${index + 1}`);
                  const storeName = String(data.store_name || data.nama_toko || "Pengajuan kredit saldo");
                  return (
                    <div key={item.id || index} className="flex items-center gap-3 rounded-[22px] border border-emerald-100 bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-[#047857]">
                        <FileText className="h-5 w-5" strokeWidth={2.4} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-950">{agentName}</p>
                        <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-500">{storeName}</p>
                        <p className="mt-1 text-xs font-black text-[#047857]">{formatIDR(Number(item.approved_amount || item.requested_amount || 0))}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${statusClassName(item)}`}>
                          {statusLabel(item)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setLatestApplication(item);
                            setActiveCreditTab("status");
                          }}
                          className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-[10px] font-black text-[#047857]"
                        >
                          Lihat Status
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[24px] border border-dashed border-emerald-200 bg-emerald-50/40 px-4 py-10 text-center">
                  <UserRound className="mx-auto h-9 w-9 text-[#047857]" strokeWidth={2.2} />
                  <p className="mt-3 text-sm font-black text-slate-950">Belum ada pengajuan</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">Mulai dari tab Daftar Baru untuk membuat pengajuan kredit saldo.</p>
                </div>
              )}
            </div>
          </section>
        ) : activeCreditTab === "status" && latestApplication ? (
          <section className="space-y-4">
            <div className="relative overflow-hidden rounded-[28px] border border-emerald-200 bg-[linear-gradient(135deg,#f0fdf4_0%,#ffffff_72%)] p-5 shadow-[0_18px_42px_rgba(6,78,59,0.10)]">
              <div className="pointer-events-none absolute -right-14 -top-14 h-32 w-32 rounded-full bg-sky-100/70" />
              <div className="relative flex items-start justify-between gap-3">
                <span className={statusIsRejected ? "grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100" : "grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-[#047857] ring-1 ring-emerald-200"}>
                  {statusIsRejected ? <XCircle className="h-7 w-7" strokeWidth={2.5} /> : <BadgeCheck className="h-7 w-7" strokeWidth={2.5} />}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveCreditTab("list")}
                  className="rounded-full border border-emerald-100 bg-white px-3 py-2 text-[10px] font-black text-[#047857] shadow-[0_10px_22px_rgba(6,78,59,0.08)]"
                >
                  Kembali
                </button>
              </div>

              <p className={statusIsRejected ? "relative mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-rose-600" : "relative mt-5 text-[10px] font-black uppercase tracking-[0.18em] text-[#047857]"}>
                {statusIsRejected ? "Pengajuan Ditolak" : statusIsPaid ? "Siklus Modal Selesai" : statusIsWaiting ? "Menunggu Proses" : "Modal Disetujui"}
              </p>
              <h2 className="relative mt-1 text-2xl font-black leading-7 text-slate-950">{statusHeadline}</h2>
              <p className="relative mt-2 text-[11px] font-semibold leading-5 text-slate-500">
                {statusIsRejected
                  ? "Data belum bisa diproses. Perbaiki catatan dari operator lalu ajukan kembali."
                  : statusIsWaiting
                    ? systemValidationPassed
                      ? "Data lolos pemeriksaan awal sistem dan sudah masuk ke antrean Marketing untuk verifikasi lapangan."
                      : "Pengajuan sedang diperiksa sistem sebelum diteruskan ke Marketing."
                    : "Nominal yang disetujui operator sudah masuk langsung ke saldo utama dan dapat digunakan selama agent masih aktif menjadi mitra."}
              </p>

              <div className="relative mt-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_12px_24px_rgba(15,23,42,0.04)]">
                <span className="min-w-0 truncate text-xs font-black text-slate-600">{statusApplicationCode}</span>
                <span className="shrink-0 text-sm font-black text-[#047857]">{formatIDR(statusAmount)}</span>
              </div>

              <div className={statusIsRejected ? "relative mt-4 rounded-[24px] bg-[linear-gradient(135deg,#be123c,#fb7185)] p-5 text-white shadow-[0_18px_34px_rgba(225,29,72,0.20)]" : statusIsWaiting ? "relative mt-4 rounded-[24px] bg-[linear-gradient(135deg,#b45309,#f59e0b)] p-5 text-white shadow-[0_18px_34px_rgba(245,158,11,0.20)]" : "relative mt-4 rounded-[24px] bg-[linear-gradient(135deg,#047857,#16a34a,#22c55e)] p-5 text-white shadow-[0_18px_34px_rgba(4,120,87,0.22)]"}>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 ring-1 ring-white/20">
                    {statusIsRejected ? <XCircle className="h-5 w-5" strokeWidth={2.5} /> : <BadgeCheck className="h-5 w-5" strokeWidth={2.5} />}
                  </span>
                  <div>
                    <p className="text-3xl font-black tracking-tight">{statusBandLabel}</p>
                    <p className="mt-1 text-[10px] font-semibold text-white/80">{statusBandSubcopy}</p>
                  </div>
                </div>
              </div>

              <div className="relative mt-4 h-1.5 rounded-full bg-[linear-gradient(90deg,#6d5dfc_0%,#0ea5e9_48%,#10b981_100%)]" />

              <div className="relative mt-4 space-y-3">
                {statusSteps.map((step) => (
                  <div key={step.label} className={step.done ? "flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-3" : "flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3"}>
                    <span className={step.done ? "grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#047857] bg-white text-[#047857]" : "grid h-5 w-5 shrink-0 place-items-center rounded-full border border-slate-300 bg-white text-slate-400"}>
                      {step.done ? <Check className="h-3 w-3" strokeWidth={3} /> : <Clock3 className="h-3 w-3" strokeWidth={2.5} />}
                    </span>
                    <p className={step.done ? "text-[11px] font-black leading-4 text-slate-800" : "text-[11px] font-black leading-4 text-slate-500"}>{step.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {false && !statusIsRejected && !statusIsWaiting ? (
              <div className="rounded-[28px] border border-emerald-100 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.10)]">
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-[#047857]">
                    <FileText className="h-6 w-6" strokeWidth={2.4} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-slate-950">Pelunasan Tagihan Kredit</h3>
                    <p className="mt-1 text-[10px] font-semibold leading-4 text-slate-500">
                      Bayar tagihan kredit secara penuh melalui metode pembayaran yang tersedia.
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl bg-[linear-gradient(135deg,#064e3b,#047857,#16a34a)] px-4 py-3 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-black">Total yang harus dilunasi</span>
                    <span className="text-lg font-black">{formatIDR(statusPaymentDue)}</span>
                  </div>
                </div>
                <div className="mt-3 rounded-[22px] border border-slate-200 bg-[#fbfffd] p-4">
                  <p className="text-xs font-black text-slate-950">
                    Pelunasan Tagihan Kredit
                  </p>
                  <p className="mt-1 text-[10px] font-semibold leading-4 text-slate-500">
                    Setelah lunas, pinjaman selesai dan agent dapat mengajukan kredit berikutnya.
                  </p>
                  <p className="mt-3 text-lg font-black text-[#047857]">{formatIDR(statusPaymentDue)}</p>
                  <button
                    type="button"
                    disabled={statusPaymentDue <= 0}
                    onClick={() => {
                      setPaymentModalOpen(true);
                      setPaymentError("");
                      setPaymentSuccess("");
                    }}
                    className="mt-3 h-11 w-full rounded-2xl bg-[linear-gradient(135deg,#047857,#16a34a)] text-xs font-black text-white shadow-[0_12px_24px_rgba(4,120,87,0.18)] disabled:bg-none disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    {statusPaymentDue <= 0 ? "Belum Ada Tagihan" : "Bayar Sekarang"}
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : (
          <>
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
            <Field name="agent_name" label="Nama Agent" placeholder="Nama agent" defaultValue={applicantText("agent_name", name)} />
            <Field name="store_name" label="Nama Toko" placeholder="Nama toko/usaha" defaultValue={applicantText("store_name")} />
            <Field name="nik" label="NIK" placeholder="16 digit NIK" defaultValue={applicantText("nik")} />
            <Field name="whatsapp" label="Nomor WA" placeholder="08xxxxxxxxxx" defaultValue={applicantText("whatsapp", phone !== "-" ? phone : "")} />
            <Field name="email" label="Email" placeholder="email@domain.com" defaultValue={applicantText("email", email !== "-" ? email : "")} />
            <Field name="home_address" label="Alamat Rumah" placeholder="Alamat lengkap rumah" defaultValue={applicantText("home_address")} textarea className="sm:col-span-2" />
            <Field name="store_address" label="Alamat Toko" placeholder="Alamat lengkap toko" defaultValue={applicantText("store_address")} textarea className="sm:col-span-2" />
            <div className="rounded-[22px] border border-emerald-100 bg-[linear-gradient(135deg,#f0fdf4,#ffffff)] p-4 sm:col-span-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">Nominal Kredit Saldo</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{formatIDR(requestedAmount)}</p>
              <p className="mt-1 text-[10px] font-semibold text-slate-400">
                Nominal kredit saldo sudah tetap dan tidak bisa diubah.
              </p>
              <input type="hidden" name="requested_amount" value={requestedAmount} />
            </div>
          </div>
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
            <Field name="family_name" label="Nama" placeholder="Nama keluarga" defaultValue={applicantText("family_name")} />
            <Field name="family_whatsapp" label="Nomor WA" placeholder="08xxxxxxxxxx" defaultValue={applicantText("family_whatsapp")} />
            <SelectField name="family_relation" label="Hubungan" defaultValue={applicantText("family_relation")} options={["Orang tua", "Saudara", "Pasangan", "Anak", "Kerabat"]} />
            <Field name="family_address" label="Alamat" placeholder="Alamat keluarga yang dapat dihubungi" defaultValue={applicantText("family_address")} textarea className="sm:col-span-2" />
          </div>
        </section>

        <section className="relative isolate overflow-hidden rounded-[30px] border border-emerald-100 bg-white shadow-[0_22px_54px_rgba(6,78,59,0.12)]">
          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-lime-100/70" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-24 rounded-full bg-emerald-50" />
          <div className="relative p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[22px] bg-[linear-gradient(135deg,#ecfdf5,#d9f99d)] text-[#047857] ring-1 ring-emerald-100 shadow-[0_12px_24px_rgba(4,120,87,0.10)]">
                <Camera className="h-6 w-6" strokeWidth={2.4} />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-600">Survey Lapangan</p>
                <h2 className="mt-1 text-xl font-black leading-6 text-slate-950">Dokumen Pengajuan Agent</h2>
                <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500">
                  Lengkapi empat foto yang jelas sebelum mengirim pengajuan. Marketing hanya dapat memantau hasilnya.
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { key: "ktp", title: "Foto KTP", desc: "KTP asli agent", icon: Upload },
                { key: "store", title: "Foto Toko", desc: "Tampak depan usaha", icon: Store },
                { key: "selfie_ktp", title: "Selfie Pegang KTP", desc: "Wajah dan KTP jelas", icon: UserRound },
                { key: "selfie_marketing", title: "Selfie Verifikasi", desc: "Wajah agent terlihat jelas", icon: UsersRound },
              ].map((item) => {
                const Icon = item.icon;
                const selected = surveyFiles[item.key];
                return (
                  <label key={item.title} className={selected ? "min-w-0 cursor-pointer rounded-[22px] border border-emerald-300 bg-emerald-50 p-3 shadow-[0_10px_22px_rgba(6,78,59,0.055)]" : "min-w-0 cursor-pointer rounded-[22px] border border-dashed border-emerald-200 bg-[linear-gradient(135deg,#f0fdf4,#ffffff)] p-3 shadow-[0_10px_22px_rgba(6,78,59,0.055)]"}>
                    <div className="flex items-start justify-between gap-2">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-[#047857] ring-1 ring-emerald-100">
                        <Icon className="h-5 w-5" strokeWidth={2.4} />
                      </span>
                      <span className={selected ? "grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-600 text-white" : "grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-400"}>
                        {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Upload className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                    </div>
                    {selected && surveyPreviewUrls[item.key] ? (
                      <div className="mt-3 h-24 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-emerald-100">
                        <img
                          src={surveyPreviewUrls[item.key]}
                          alt={`Preview ${item.title}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : null}
                    <p className="mt-3 truncate text-[11px] font-black text-slate-950">{item.title}</p>
                    <p className="mt-0.5 truncate text-[9px] font-semibold text-slate-500">{selected ? selected.name : item.desc}</p>
                    <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => setSurveyFiles((current) => ({ ...current, [item.key]: event.target.files?.[0] || null }))} />
                  </label>
                );
              })}
            </div>
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
            <li>1. Pinjaman saldo hanya digunakan untuk kebutuhan transaksi operasional di PulsaKilat.</li>
            <li>2. Data agent, foto dokumen, selfie, dan tanda tangan wajib benar serta dapat dipertanggungjawabkan oleh agent.</li>
            <li>3. Modal yang disetujui masuk ke saldo utama dan dapat dipakai untuk transaksi selama agent masih aktif menjadi mitra.</li>
            <li>4. Pengajuan modal berikutnya hanya dapat dilakukan setelah saldo utama dari pengajuan sebelumnya habis digunakan.</li>
            <li>5. Jika agent ingin berhenti menjadi mitra, penyelesaian modal ditentukan dan diproses oleh operator.</li>
            <li>6. PulsaKilat berhak menolak, menunda, atau mengevaluasi ulang pengajuan jika data/bukti tidak sesuai.</li>
          </ol>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border border-[#047857] bg-white text-[#047857]">
              {agreed ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
            </span>
            <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} className="sr-only" />
            <span className="text-[11px] font-black leading-4 text-slate-950">Saya sudah membaca, memahami, dan menyetujui syarat & ketentuan kredit saldo PulsaKilat.</span>
          </label>
        </section>

        <section className="rounded-[26px] border border-emerald-950/5 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.10)]">
          <div className="mb-4 flex items-start gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-[#047857]">
              <PenLine className="h-5 w-5" strokeWidth={2.4} />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950">Tanda Tangan & Persetujuan</h2>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-400">Agent tanda tangan lalu operator kredit memberi keputusan final.</p>
            </div>
          </div>

          {notice ? (
            isApproved ? (
              <div className="mb-4 overflow-hidden rounded-[24px] border border-emerald-200 bg-white shadow-[0_16px_34px_rgba(4,120,87,0.12)]">
                <div className="relative bg-[linear-gradient(135deg,#047857_0%,#16a34a_62%,#84cc16_130%)] px-4 py-4 text-white">
                  <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/14" />
                  <div className="relative flex items-center gap-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-emerald-700 shadow-[0_10px_22px_rgba(0,0,0,0.10)]">
                      {NoticeIcon ? <NoticeIcon className="h-6 w-6" strokeWidth={2.6} /> : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/75">Notifikasi Kredit</p>
                      <h3 className="mt-1 text-base font-black leading-5">Pengajuan disetujui</h3>
                      <p className="mt-1 text-[11px] font-semibold leading-4 text-white/80">Limit saldo agent sudah aktif dan siap digunakan.</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 p-3 min-[380px]:grid-cols-2">
                  <div className="rounded-2xl bg-emerald-50 px-3 py-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-600">Limit Aktif</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{formatIDR(latestApplication?.approved_amount || latestApplication?.requested_amount || 0)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-3 py-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">Status</p>
                    <p className="mt-1 text-sm font-black text-emerald-700">Disetujui master</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className={`mb-4 flex items-start gap-3 rounded-[22px] border px-4 py-3 shadow-[0_10px_22px_rgba(15,23,42,0.04)] ${notice.className}`}>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white">
                  {NoticeIcon ? <NoticeIcon className="h-5 w-5" strokeWidth={2.4} /> : null}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black">{notice.title}</p>
                  <p className="mt-0.5 text-[10px] font-semibold leading-4 opacity-75">{notice.desc}</p>
                </div>
              </div>
            )
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
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-xs font-black text-rose-600">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!agreed || !signatureReady || !signatureData || !surveyDocumentsComplete || hasOpenApplication || creditBalanceAvailable || submitting}
          className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 flex h-14 w-full items-center justify-center gap-2 rounded-[22px] bg-[linear-gradient(135deg,#052e26,#047857,#84cc16)] text-sm font-black text-white shadow-[0_18px_36px_rgba(4,120,87,0.24)] transition disabled:opacity-50"
        >
          {creditBalanceAvailable ? "Saldo Modal Masih Tersedia" : hasOpenApplication ? "Menunggu Review" : submitting ? "Mengirim..." : !surveyDocumentsComplete ? "Lengkapi 4 Foto" : unsignedPendingApplication ? "Kirim Tanda Tangan" : canRefill ? "Ajukan Modal Lagi" : canReapply ? "Ajukan Modal Berikutnya" : "Ajukan Modal"}
          <ChevronRight className="h-4 w-4" strokeWidth={2.6} />
        </button>

        <p className="pb-2 text-center text-[10px] font-semibold text-[#047857]">Dokumen hanya digunakan untuk verifikasi pengajuan agent PulsaKilat.</p>
          </>
        )}
      </div>

      {false && paymentModalOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/64 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-[520px] rounded-[26px] bg-white p-4 shadow-[0_28px_70px_rgba(15,23,42,0.34)] sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#047857]">Pelunasan Kredit</p>
                <h3 className="mt-1 text-xl font-black leading-6 text-slate-950">Pelunasan Tagihan Kredit</h3>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                aria-label="Tutup pelunasan kredit"
              >
                <XCircle className="h-5 w-5" strokeWidth={2.3} />
              </button>
            </div>

            <div className="mt-4 rounded-[22px] bg-[linear-gradient(135deg,#064e3b,#047857,#16a34a)] p-4 text-white shadow-[0_16px_34px_rgba(4,120,87,0.20)]">
              <p className="text-[10px] font-semibold text-white/80">Total yang harus dibayar</p>
              <p className="mt-2 text-3xl font-black tracking-tight">{formatIDR(statusPaymentDue)}</p>
              <p className="mt-2 text-[10px] font-semibold text-white/78">Nominal penuh sesuai pinjaman yang disetujui</p>
            </div>

            <div className="mt-3 space-y-2">
              {paymentMethods.map((method) => {
                const MethodIcon = method.icon;
                const selected = method.id === selectedPaymentMethod;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => {
                      setSelectedPaymentMethod(method.id);
                      setPaymentError("");
                    }}
                    className={selected
                      ? "flex min-h-[58px] w-full items-center gap-3 rounded-[18px] border border-[#047857] bg-emerald-50 px-3 text-left shadow-[0_10px_22px_rgba(4,120,87,0.08)]"
                      : "flex min-h-[58px] w-full items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/40"}
                  >
                    <span className={selected ? "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-[#047857]" : "grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-[#047857]"}>
                      <MethodIcon className="h-5 w-5" strokeWidth={2.4} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-black text-slate-800">{method.title}</span>
                      <span className="mt-1 block truncate text-[10px] font-semibold text-slate-400">{method.desc}</span>
                    </span>
                    {selected ? <Check className="h-4 w-4 shrink-0 text-[#047857]" strokeWidth={3} /> : null}
                  </button>
                );
              })}
            </div>

            <label className="mt-3 flex min-h-[54px] cursor-pointer items-center gap-3 rounded-[18px] border border-dashed border-emerald-200 bg-emerald-50/30 px-3 transition hover:bg-emerald-50">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-[#047857]">
                <Upload className="h-5 w-5" strokeWidth={2.4} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-black text-slate-800">Bukti transfer wajib</span>
                <span className="mt-1 block truncate text-[10px] font-semibold text-slate-400">{paymentProofName || "Unggah foto/screenshot bukti pembayaran"}</span>
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setPaymentProofFile(file);
                  setPaymentProofName(file?.name || "");
                  setPaymentError("");
                }}
              />
            </label>

            {paymentError ? (
              <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-center text-[11px] font-black text-rose-600">
                {paymentError}
              </div>
            ) : null}
            {paymentSuccess ? (
              <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-[11px] font-black text-[#047857]">
                {paymentSuccess}
              </div>
            ) : null}

            <button
              type="button"
              disabled={paymentSubmitting || statusPaymentDue <= 0}
              onClick={handleCreditPaymentConfirmation}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-[linear-gradient(135deg,#047857,#16a34a,#84cc16)] text-xs font-black text-white shadow-[0_14px_28px_rgba(4,120,87,0.18)] transition disabled:opacity-60"
            >
              {paymentSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.6} />
                  Memproses Pembayaran
                </>
              ) : (
                <>
                  Konfirmasi Pembayaran
                  <ArrowRight className="h-4 w-4" strokeWidth={2.6} />
                </>
              )}
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
