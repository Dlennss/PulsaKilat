"use client";
import { fmtID } from "@/lib/format";

import { useEffect, useMemo, useState, type FormEventHandler } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { alertError, alertSuccess, alertWarning } from "@/components/ui/alerts";
import { CancelTransaksiModal } from "./_components/CancelTransaksiModal";
import { MutasiSection } from "./_components/MutasiSection";
import { TransaksiSection } from "./_components/TransaksiSection";
import type { ExportKind, MutasiRow, TrxRow } from "./_components/types";

type MemberInfo = {
  id: number;
  email: string;
  nama: string;
  role: string;
  aktif: boolean;
  saldo: number;
  dibuat_pada: string;
};

type MonthStats = {
  month: string;
  trx_success_count: number;
  trx_failed_count: number;
  trx_success_amount: number;
  trx_failed_amount: number;
  dep_approved_count: number;
  dep_rejected_count: number;
  dep_approved_amount: number;
  dep_rejected_amount: number;
};

type MemberApiResponse = { ok?: boolean; item?: MemberInfo; error?: string };
type StatsApiResponse = { ok?: boolean; items?: MonthStats[]; error?: string };
type MutasiApiResponse = { ok?: boolean; items?: MutasiRow[]; total?: number; error?: string };
type TrxApiResponse = { ok?: boolean; items?: TrxRow[]; total?: number; error?: string };
type DepositRow = {
  id: number;
  member_id: number;
  amount: number;
  metode: string;
  bukti_url: string;
  status: string;
  note?: string;
  dibuat_pada: string;
  diproses_pada?: string | null;
  diproses_oleh?: number | null;
  diproses_nama?: string | null;
};
type DepositApiResponse = { ok?: boolean; items?: DepositRow[]; error?: string };
const PAGE_SIZE = 10;
const DEPOSIT_PAGE_SIZE = 10;

function authHeader(): Record<string, string> {
  const t = localStorage.getItem("auth_token") || "";
  return t ? { Authorization: `Bearer ${t}` } : {};
}

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

function rupiah(n: number) {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n || 0);
  } catch {
    return String(n || 0);
  }
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map((x) => Number(x));
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleString("id-ID", { month: "long", year: "numeric" });
}

function safeNum(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function escapeCSV(v: unknown): string {
  const s = String(v ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AdminMemberHistoryPage() {
  const sp = useSearchParams();
  const router = useRouter();

  const memberId = useMemo(() => Number(sp.get("member_id") || "0"), [sp]);
  const [tab, setTab] = useState<"mutasi" | "transaksi">("mutasi");

  const [loading, setLoading] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  const [stats, setStats] = useState<MonthStats[]>([]);
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [mutasi, setMutasi] = useState<MutasiRow[]>([]);
  const [trx, setTrx] = useState<TrxRow[]>([]);
  const [depositRows, setDepositRows] = useState<DepositRow[]>([]);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositTitle, setDepositTitle] = useState("");
  const [depositPage, setDepositPage] = useState(0);
  const [depositExporting, setDepositExporting] = useState<ExportKind>("");
  const [depositMonth, setDepositMonth] = useState("");
  const [depositStatus, setDepositStatus] = useState<"approved" | "rejected" | "">("");

  // Mutasi filters + pagination
  const [mutasiRefID, setMutasiRefID] = useState("");
  const [mutasiArah, setMutasiArah] = useState("");
  const [mutasiDate, setMutasiDate] = useState("");
  const [mutasiFrom, setMutasiFrom] = useState("");
  const [mutasiTo, setMutasiTo] = useState("");
  const [mutasiOffset, setMutasiOffset] = useState(0);
  const [mutasiHasNext, setMutasiHasNext] = useState(false);
  const [mutasiTotal, setMutasiTotal] = useState(0);

  // Transaksi filters + pagination
  const [trxQ, setTrxQ] = useState("");
  const [trxFrom, setTrxFrom] = useState("");
  const [trxTo, setTrxTo] = useState("");
  const [trxOffset, setTrxOffset] = useState(0);
  const [trxHasNext, setTrxHasNext] = useState(false);
  const [trxTotal, setTrxTotal] = useState(0);
  const [cancellingTrxID, setCancellingTrxID] = useState<number | null>(null);
  const [completingTrxID, setCompletingTrxID] = useState<number | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelTargetTrx, setCancelTargetTrx] = useState<TrxRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [mutasiExporting, setMutasiExporting] = useState<ExportKind>("");
  const [trxExporting, setTrxExporting] = useState<ExportKind>("");


  async function loadMember() {
    if (!memberId || Number.isNaN(memberId)) return;

    setMemberLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("member_id", String(memberId));

      const r = await fetch(`/api/admin/members/get?${qs.toString()}`, {
        headers: authHeader(),
        cache: "no-store",
      });

      const j: MemberApiResponse = await r.json().catch(() => ({} as MemberApiResponse));
      if (!r.ok || !j.ok || !j.item) {
        setMember(null);
        return;
      }
      setMember(j.item);
    } finally {
      setMemberLoading(false);
    }
  }

  async function loadStats() {
    if (!memberId || Number.isNaN(memberId)) return;

    setStatsLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("member_id", String(memberId));

      const r = await fetch(`/api/admin/members/stats?${qs.toString()}`, {
        headers: authHeader(),
        cache: "no-store",
      });

      const j: StatsApiResponse = await r.json().catch(() => ({} as StatsApiResponse));
      if (!r.ok || !j.ok) {
        setStats([]);
        return;
      }

      const items = Array.isArray(j.items) ? j.items : [];
      const normalized: MonthStats[] = items.map((it) => ({
        month: String(it.month || ""),
        trx_success_count: safeNum(it.trx_success_count),
        trx_failed_count: safeNum(it.trx_failed_count),
        trx_success_amount: safeNum(it.trx_success_amount),
        trx_failed_amount: safeNum(it.trx_failed_amount),
        dep_approved_count: safeNum(it.dep_approved_count),
        dep_rejected_count: safeNum(it.dep_rejected_count),
        dep_approved_amount: safeNum(it.dep_approved_amount),
        dep_rejected_amount: safeNum(it.dep_rejected_amount),
      }));

      setStats(normalized);
    } finally {
      setStatsLoading(false);
    }
  }

  async function loadMutasi() {
    if (!memberId || Number.isNaN(memberId)) return;

    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("member_id", String(memberId));
      qs.set("limit", String(PAGE_SIZE + 1));
      qs.set("offset", String(mutasiOffset));
      if (mutasiRefID.trim()) qs.set("ref_id", mutasiRefID.trim());
      if (mutasiArah.trim()) qs.set("arah", mutasiArah.trim());
      if (mutasiDate.trim()) qs.set("date", mutasiDate.trim());
      if (mutasiFrom.trim()) qs.set("from", mutasiFrom.trim());
      if (mutasiTo.trim()) qs.set("to", mutasiTo.trim());

      const r = await fetch(`/api/admin/history/mutasi?${qs.toString()}`, {
        headers: authHeader(),
        cache: "no-store",
      });

      const j: MutasiApiResponse = await r.json().catch(() => ({} as MutasiApiResponse));
      if (!r.ok || !j.ok) {
        alert(j.error || "Gagal load mutasi");
        return;
      }

      const all = Array.isArray(j.items) ? j.items : [];
      setMutasiHasNext(all.length > PAGE_SIZE);
      setMutasi(all.slice(0, PAGE_SIZE));
      setMutasiTotal(Number(j.total || 0));
    } finally {
      setLoading(false);
    }
  }

  async function loadTransaksi() {
    if (!memberId || Number.isNaN(memberId)) return;

    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("member_id", String(memberId));
      qs.set("limit", String(PAGE_SIZE + 1));
      qs.set("offset", String(trxOffset));
      if (trxQ.trim()) qs.set("q", trxQ.trim());
      if (trxFrom.trim()) qs.set("from", trxFrom.trim());
      if (trxTo.trim()) qs.set("to", trxTo.trim());

      const r = await fetch(`/api/admin/history/transaksi?${qs.toString()}`, {
        headers: authHeader(),
        cache: "no-store",
      });

      const j: TrxApiResponse = await r.json().catch(() => ({} as TrxApiResponse));
      if (!r.ok || !j.ok) {
        alert(j.error || "Gagal load transaksi");
        return;
      }

      const all = Array.isArray(j.items) ? j.items : [];
      setTrxHasNext(all.length > PAGE_SIZE);
      setTrx(all.slice(0, PAGE_SIZE));
      setTrxTotal(Number(j.total || 0));
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllMutasi(): Promise<MutasiRow[] | null> {
    if (!memberId || Number.isNaN(memberId)) return null;
    const out: MutasiRow[] = [];
    const chunkSize = 200;
    let offset = 0;

    while (true) {
      const qs = new URLSearchParams();
      qs.set("member_id", String(memberId));
      qs.set("limit", String(chunkSize));
      qs.set("offset", String(offset));
      if (mutasiRefID.trim()) qs.set("ref_id", mutasiRefID.trim());
      if (mutasiArah.trim()) qs.set("arah", mutasiArah.trim());
      if (mutasiDate.trim()) qs.set("date", mutasiDate.trim());
      if (mutasiFrom.trim()) qs.set("from", mutasiFrom.trim());
      if (mutasiTo.trim()) qs.set("to", mutasiTo.trim());

      const r = await fetch(`/api/admin/history/mutasi?${qs.toString()}`, {
        headers: authHeader(),
        cache: "no-store",
      });
      const j: MutasiApiResponse = await r.json().catch(() => ({} as MutasiApiResponse));
      if (!r.ok || !j.ok) {
        alert(j.error || "Gagal mengambil data mutasi untuk export");
        return null;
      }

      const chunk = Array.isArray(j.items) ? j.items : [];
      out.push(...chunk);
      if (chunk.length < chunkSize) break;
      offset += chunkSize;
    }

    if (!out.length) {
      alert("Tidak ada data mutasi untuk diexport.");
      return null;
    }
    return out;
  }

  async function fetchAllTrx(): Promise<TrxRow[] | null> {
    if (!memberId || Number.isNaN(memberId)) return null;
    const out: TrxRow[] = [];
    const chunkSize = 200;
    let offset = 0;

    while (true) {
      const qs = new URLSearchParams();
      qs.set("member_id", String(memberId));
      qs.set("limit", String(chunkSize));
      qs.set("offset", String(offset));
      if (trxQ.trim()) qs.set("q", trxQ.trim());
      if (trxFrom.trim()) qs.set("from", trxFrom.trim());
      if (trxTo.trim()) qs.set("to", trxTo.trim());

      const r = await fetch(`/api/admin/history/transaksi?${qs.toString()}`, {
        headers: authHeader(),
        cache: "no-store",
      });
      const j: TrxApiResponse = await r.json().catch(() => ({} as TrxApiResponse));
      if (!r.ok || !j.ok) {
        alert(j.error || "Gagal mengambil data transaksi untuk export");
        return null;
      }

      const chunk = Array.isArray(j.items) ? j.items : [];
      out.push(...chunk);
      if (chunk.length < chunkSize) break;
      offset += chunkSize;
    }

    if (!out.length) {
      alert("Tidak ada data transaksi untuk diexport.");
      return null;
    }
    return out;
  }

  function toMutasiExportRows(items: MutasiRow[]) {
    return items.map((m, idx) => ({
      no: idx + 1,
      id: m.id,
      dibuat_pada: fmtDate(m.dibuat_pada),
      arah: m.arah,
      jumlah: Number(m.jumlah || 0),
      alasan: m.alasan || "",
      catatan: m.catatan || "",
      saldo_sebelum: m.saldo_sebelum ?? "",
      saldo_sesudah: m.saldo_sesudah ?? "",
      ref_id: m.ref_id || "",
    }));
  }

  function toTrxExportRows(items: TrxRow[]) {
    return items.map((t, idx) => ({
      no: idx + 1,
      id: t.id,
      dibuat_pada: fmtDate(t.dibuat_pada),
      ref_id: t.ref_id || "",
      perintah: t.perintah || "",
      kode_produk: t.kode_produk || "",
      tujuan: t.tujuan || "",
      qty: Number(t.qty || 0),
      status: t.status || "",
      biaya_perkiraan: Number(t.biaya_perkiraan || 0),
      biaya_aktual: Number(t.biaya_aktual || 0),
      keterangan: t.keterangan || "",
    }));
  }

  async function exportMutasiCSV() {
    setMutasiExporting("csv");
    try {
      const items = await fetchAllMutasi();
      if (!items) return;
      const rows = toMutasiExportRows(items);
      const headers = Object.keys(rows[0]);
      const body = rows.map((row) => headers.map((h) => row[h as keyof typeof row]));
      const csv = [headers, ...body].map((row) => row.map(escapeCSV).join(",")).join("\n");
      downloadBlob(`admin-mutasi-member-${memberId}.csv`, new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    } finally {
      setMutasiExporting("");
    }
  }

  async function exportMutasiExcel() {
    setMutasiExporting("excel");
    try {
      const items = await fetchAllMutasi();
      if (!items) return;
      const XLSX = await import("xlsx");
      const rows = toMutasiExportRows(items);
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Mutasi");
      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      downloadBlob(
        `admin-mutasi-member-${memberId}.xlsx`,
        new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      );
    } finally {
      setMutasiExporting("");
    }
  }

  async function exportMutasiPDF() {
    setMutasiExporting("pdf");
    try {
      const items = await fetchAllMutasi();
      if (!items) return;
      const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const autoTable = autoTableModule.default;
      const rows = toMutasiExportRows(items);

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.setFontSize(12);
      doc.text(`History Mutasi Member ${memberId}`, 40, 36);
      autoTable(doc, {
        startY: 48,
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [45, 45, 45] },
        head: [["No", "ID", "Waktu", "Arah", "Jumlah", "Alasan", "Catatan", "Saldo Sebelum", "Saldo Sesudah", "Ref ID"]],
        body: rows.map((x) => [
          x.no,
          x.id,
          x.dibuat_pada,
          x.arah,
          fmtID(Number(x.jumlah || 0)),
          x.alasan,
          x.catatan,
          String(x.saldo_sebelum),
          String(x.saldo_sesudah),
          x.ref_id,
        ]),
      });
      const out = doc.output("arraybuffer");
      downloadBlob(`admin-mutasi-member-${memberId}.pdf`, new Blob([out], { type: "application/pdf" }));
    } finally {
      setMutasiExporting("");
    }
  }

  async function exportTrxCSV() {
    setTrxExporting("csv");
    try {
      const items = await fetchAllTrx();
      if (!items) return;
      const rows = toTrxExportRows(items);
      const headers = Object.keys(rows[0]);
      const body = rows.map((row) => headers.map((h) => row[h as keyof typeof row]));
      const csv = [headers, ...body].map((row) => row.map(escapeCSV).join(",")).join("\n");
      downloadBlob(`admin-transaksi-member-${memberId}.csv`, new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    } finally {
      setTrxExporting("");
    }
  }

  async function exportTrxExcel() {
    setTrxExporting("excel");
    try {
      const items = await fetchAllTrx();
      if (!items) return;
      const XLSX = await import("xlsx");
      const rows = toTrxExportRows(items);
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Transaksi");
      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      downloadBlob(
        `admin-transaksi-member-${memberId}.xlsx`,
        new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      );
    } finally {
      setTrxExporting("");
    }
  }

  async function exportTrxPDF() {
    setTrxExporting("pdf");
    try {
      const items = await fetchAllTrx();
      if (!items) return;
      const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const autoTable = autoTableModule.default;
      const rows = toTrxExportRows(items);

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.setFontSize(12);
      doc.text(`History Transaksi Member ${memberId}`, 40, 36);
      autoTable(doc, {
        startY: 48,
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [45, 45, 45] },
        head: [["No", "ID", "Waktu", "Ref ID", "Perintah", "Produk", "Tujuan", "Qty", "Status", "Biaya Est", "Biaya Aktual", "Keterangan"]],
        body: rows.map((x) => [
          x.no,
          x.id,
          x.dibuat_pada,
          x.ref_id,
          x.perintah,
          x.kode_produk,
          x.tujuan,
          x.qty,
          x.status,
          x.biaya_perkiraan,
          x.biaya_aktual,
          x.keterangan,
        ]),
      });
      const out = doc.output("arraybuffer");
      downloadBlob(`admin-transaksi-member-${memberId}.pdf`, new Blob([out], { type: "application/pdf" }));
    } finally {
      setTrxExporting("");
    }
  }

  async function refreshCurrentTab() {
    if (tab === "mutasi") return loadMutasi();
    return loadTransaksi();
  }

  async function cancelPendingTrx(t: TrxRow, reasonInput: string) {
    const st = (t.status || "").toLowerCase();
    if (st !== "pending") return;
    const cleanReason = (reasonInput || "").trim();
    if (!cleanReason) {
      await alertWarning("Alasan pembatalan wajib diisi.");
      return;
    }

    setCancellingTrxID(t.id);
    try {
      const r = await fetch("/api/admin/history/transaksi/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ trx_id: t.id, reason: cleanReason }),
      });
      const j = await r.json().catch(() => ({} as { ok?: boolean; error?: string; item?: { refund_amount?: number } }));
      if (!r.ok || !j.ok) {
        await alertError(j.error || "Gagal membatalkan transaksi.");
        return;
      }

      const refund = Number(j.item?.refund_amount || 0);
      await alertSuccess(`Transaksi dibatalkan. Refund: ${fmtID(refund)}.`);
      setCancelModalOpen(false);
      setCancelTargetTrx(null);
      setCancelReason("");
      await Promise.all([loadTransaksi(), loadMember()]);
    } finally {
      setCancellingTrxID(null);
    }
  }

  async function completePendingTrx(t: TrxRow) {
    const st = (t.status || "").toLowerCase();
    if (st !== "pending" && st !== "failed") return;

    setCompletingTrxID(t.id);
    try {
      const r = await fetch("/api/admin/history/transaksi/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ trx_id: t.id, reason: "diselesaikan manual oleh admin" }),
      });
      const j = await r.json().catch(() => ({} as { ok?: boolean; error?: string; item?: { biaya_aktual?: number } }));
      if (!r.ok || !j.ok) {
        await alertError(j.error || "Gagal menyelesaikan transaksi.");
        return;
      }

      const biayaAktual = Number(j.item?.biaya_aktual || t.biaya_perkiraan || 0);
      await alertSuccess(`Transaksi diselesaikan. Biaya aktual: ${fmtID(biayaAktual)}.`);
      await Promise.all([loadTransaksi(), loadMember()]);
    } finally {
      setCompletingTrxID(null);
    }
  }

  function openCancelModal(t: TrxRow) {
    setCancelTargetTrx(t);
    setCancelReason("");
    setCancelModalOpen(true);
  }

  useEffect(() => {
    if (!memberId || Number.isNaN(memberId)) {
      void alertWarning("member_id tidak valid.");
      router.replace("/dashboard/admin/master/members");
      return;
    }

    loadMember();
    loadStats();
    loadMutasi();

     
  }, [memberId]);

  useEffect(() => {
    if (tab === "mutasi") {
      loadMutasi();
      return;
    }
    loadTransaksi();
     
  }, [tab, mutasiOffset, trxOffset]);

  const headerSubtitle = useMemo(() => {
    if (memberLoading) return `member_id: ${memberId} • loading member...`;
    if (!member) return `member_id: ${memberId}`;
    const status = member.aktif ? "aktif" : "nonaktif";
    return `${member.nama} (${member.email}) • ${member.role} • ${status} • saldo: ${fmtID(member.saldo)}`;
  }, [member, memberId, memberLoading]);

  const onApplyMutasiFilter: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    setMutasiOffset(0);
    if (tab === "mutasi") {
      void loadMutasi();
    }
  };

  function onResetMutasiFilter() {
    setMutasiRefID("");
    setMutasiArah("");
    setMutasiDate("");
    setMutasiFrom("");
    setMutasiTo("");
    setMutasiOffset(0);
  }

  const onApplyTrxFilter: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    setTrxOffset(0);
    if (tab === "transaksi") {
      void loadTransaksi();
    }
  };

  function onResetTrxFilter() {
    setTrxQ("");
    setTrxFrom("");
    setTrxTo("");
    setTrxOffset(0);
  }

  function monthRange(ym: string): { from: string; to: string } | null {
    const m = (ym || "").match(/^(\d{4})-(\d{2})$/);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]);
    if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) return null;
    const from = `${m[1]}-${m[2]}-01`;
    const last = new Date(y, mo, 0); // day 0 of next month = last day current month
    const to = `${m[1]}-${m[2]}-${String(last.getDate()).padStart(2, "0")}`;
    return { from, to };
  }

  async function fetchAllDepositByRange(
    status: "approved" | "rejected",
    from: string,
    to: string
  ): Promise<DepositRow[] | null> {
    if (!memberId || Number.isNaN(memberId)) return null;
    const out: DepositRow[] = [];
    const chunkSize = 200;
    let offset = 0;

    while (true) {
      const qs = new URLSearchParams();
      qs.set("member_id", String(memberId));
      qs.set("status", status);
      qs.set("from", from);
      qs.set("to", to);
      qs.set("limit", String(chunkSize));
      qs.set("offset", String(offset));

      const r = await fetch(`/api/admin/deposit/requests?${qs.toString()}`, {
        headers: authHeader(),
        cache: "no-store",
      });
      const j: DepositApiResponse = await r.json().catch(() => ({} as DepositApiResponse));
      if (!r.ok || !j.ok) {
        alert(j.error || "Gagal load detail deposit");
        return null;
      }

      const chunk = Array.isArray(j.items) ? j.items : [];
      out.push(...chunk);
      if (chunk.length < chunkSize) break;
      offset += chunkSize;
      if (offset > 100000) {
        alert("Data deposit terlalu besar untuk di-load sekaligus.");
        return null;
      }
    }

    return out;
  }

  function toDepositExportRows(items: DepositRow[]) {
    return items.map((d, idx) => ({
      no: idx + 1,
      id: d.id,
      dibuat_pada: fmtDate(d.dibuat_pada),
      amount: Number(d.amount || 0),
      metode: d.metode || "",
      status: d.status || "",
      diproses: d.diproses_nama || (d.diproses_oleh != null ? `ID ${d.diproses_oleh}` : ""),
      note: d.note || "",
      bukti_url: d.bukti_url || "",
    }));
  }

  async function exportDepositCSV() {
    if (!depositRows.length) return;
    setDepositExporting("csv");
    try {
      const rows = toDepositExportRows(depositRows);
      const headers = Object.keys(rows[0]);
      const body = rows.map((row) => headers.map((h) => row[h as keyof typeof row]));
      const csv = [headers, ...body].map((row) => row.map(escapeCSV).join(",")).join("\n");
      const ym = depositMonth || "all";
      const st = depositStatus || "deposit";
      downloadBlob(`admin-deposit-${st}-member-${memberId}-${ym}.csv`, new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    } finally {
      setDepositExporting("");
    }
  }

  async function exportDepositExcel() {
    if (!depositRows.length) return;
    setDepositExporting("excel");
    try {
      const XLSX = await import("xlsx");
      const rows = toDepositExportRows(depositRows);
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Deposit");
      const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const ym = depositMonth || "all";
      const st = depositStatus || "deposit";
      downloadBlob(
        `admin-deposit-${st}-member-${memberId}-${ym}.xlsx`,
        new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      );
    } finally {
      setDepositExporting("");
    }
  }

  async function exportDepositPDF() {
    if (!depositRows.length) return;
    setDepositExporting("pdf");
    try {
      const [{ jsPDF }, autoTableModule] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
      const autoTable = autoTableModule.default;
      const rows = toDepositExportRows(depositRows);
      const st = depositStatus ? depositStatus.toUpperCase() : "DEPOSIT";

      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      doc.setFontSize(12);
      doc.text(`History ${st} Member ${memberId} ${depositMonth ? `(${depositMonth})` : ""}`.trim(), 40, 36);
      autoTable(doc, {
        startY: 48,
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [45, 45, 45] },
        head: [["No", "ID", "Waktu", "Amount", "Metode", "Status", "Diproses", "Note", "Bukti URL"]],
        body: rows.map((x) => [x.no, x.id, x.dibuat_pada, fmtID(x.amount), x.metode, x.status, x.diproses, x.note, x.bukti_url]),
      });
      const out = doc.output("arraybuffer");
      const ym = depositMonth || "all";
      downloadBlob(`admin-deposit-${depositStatus || "deposit"}-member-${memberId}-${ym}.pdf`, new Blob([out], { type: "application/pdf" }));
    } finally {
      setDepositExporting("");
    }
  }

  async function loadDepositDetails(month: string, status: "approved" | "rejected") {
    if (!memberId || Number.isNaN(memberId)) return;
    const rng = monthRange(month);
    if (!rng) return;

    setDepositLoading(true);
    setDepositRows([]);
    setDepositPage(0);
    setDepositExporting("");
    setDepositMonth(month);
    setDepositStatus(status);
    setDepositTitle(`Deposit ${status === "approved" ? "Approved" : "Rejected"} • ${monthLabel(month)}`);
    try {
      const all = await fetchAllDepositByRange(status, rng.from, rng.to);
      if (!all) {
        setDepositRows([]);
        return;
      }
      setDepositRows(all);
    } finally {
      setDepositLoading(false);
    }
  }

  return (
    <div className="space-y-4 p-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold tracking-tight">History Member</div>
          <div className="text-sm text-muted-foreground">{headerSubtitle}</div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/dashboard/admin/master/members")}>Kembali</Button>

          <Button
            variant="primary"
            onClick={async () => {
              await Promise.all([loadMember(), loadStats(), refreshCurrentTab()]);
            }}
            disabled={loading || memberLoading || statsLoading}
          >
            {loading || memberLoading || statsLoading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {statsLoading ? (
          <div className="rounded-2xl border border-cyan-200/20 bg-linear-to-br from-slate-900/85 via-slate-900/70 to-cyan-950/30 p-4 text-sm text-slate-300 md:col-span-3">
            Loading statistik...
          </div>
        ) : stats.length ? (
          stats.slice(0, 3).map((s) => (
            <div
              key={s.month}
              className="rounded-2xl border border-white/15 bg-linear-to-br from-slate-900/85 via-slate-900/70 to-sky-950/30 p-4 shadow-[0_18px_44px_-28px_rgba(56,189,248,0.55)]"
            >
              <div className="text-sm font-semibold text-slate-100">{monthLabel(s.month)}</div>

              <div className="mt-3 text-xs uppercase tracking-wide text-slate-400">Transaksi</div>
              <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl border border-emerald-300/30 bg-emerald-500/10 p-2">
                  <div className="text-xs text-emerald-200/80">Berhasil</div>
                  <div className="font-semibold text-emerald-100">{s.trx_success_count} trx</div>
                  <div className="text-xs text-emerald-200">{rupiah(s.trx_success_amount)}</div>
                </div>
                <div className="rounded-xl border border-rose-300/30 bg-rose-500/10 p-2">
                  <div className="text-xs text-rose-200/80">Gagal</div>
                  <div className="font-semibold text-rose-100">{s.trx_failed_count} trx</div>
                  <div className="text-xs text-rose-200">{rupiah(s.trx_failed_amount)}</div>
                </div>
              </div>

              <div className="mt-3 text-xs uppercase tracking-wide text-slate-400">Deposit</div>
              <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl border border-cyan-300/30 bg-cyan-500/10 p-2">
                  <div className="text-xs text-cyan-200/80">Approved</div>
                  <button
                    type="button"
                    className="font-semibold text-left text-cyan-100 underline-offset-2 hover:underline"
                    onClick={() => loadDepositDetails(s.month, "approved")}
                  >
                    {s.dep_approved_count} dep
                  </button>
                  <div className="text-xs text-cyan-200">{rupiah(s.dep_approved_amount)}</div>
                </div>
                <div className="rounded-xl border border-amber-300/30 bg-amber-500/10 p-2">
                  <div className="text-xs text-amber-200/80">Rejected</div>
                  <button
                    type="button"
                    className="font-semibold text-left text-amber-100 underline-offset-2 hover:underline"
                    onClick={() => loadDepositDetails(s.month, "rejected")}
                  >
                    {s.dep_rejected_count} dep
                  </button>
                  <div className="text-xs text-amber-200">{rupiah(s.dep_rejected_amount)}</div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-white/15 bg-linear-to-br from-slate-900/85 via-slate-900/70 to-sky-950/30 p-4 text-sm text-slate-300 md:col-span-3">
            Statistik belum ada.
          </div>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-white/15 bg-linear-to-br from-slate-900/85 via-slate-900/70 to-indigo-950/30 p-4 shadow-[0_20px_46px_-30px_rgba(129,140,248,0.55)]">
        {(() => {
          const totalDepositPages = Math.max(1, Math.ceil(depositRows.length / DEPOSIT_PAGE_SIZE));
          const safeDepositPage = Math.min(depositPage, totalDepositPages - 1);
          const start = safeDepositPage * DEPOSIT_PAGE_SIZE;
          const end = start + DEPOSIT_PAGE_SIZE;
          const depositPageRows = depositRows.slice(start, end);

          return (
            <>
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-100">{depositTitle || "Detail Deposit (klik angka Approved/Rejected di atas)"}</div>
          {depositRows.length ? (
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={exportDepositCSV} disabled={depositLoading || !!depositExporting}>
                {depositExporting === "csv" ? "Menyiapkan CSV..." : "CSV"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={exportDepositExcel} disabled={depositLoading || !!depositExporting}>
                {depositExporting === "excel" ? "Menyiapkan Excel..." : "Excel"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={exportDepositPDF} disabled={depositLoading || !!depositExporting}>
                {depositExporting === "pdf" ? "Menyiapkan PDF..." : "PDF"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setDepositRows([]);
                  setDepositPage(0);
                  setDepositMonth("");
                  setDepositStatus("");
                }}
              >
                Tutup
              </Button>
            </div>
          ) : null}
        </div>

        {depositLoading ? (
          <div className="mt-3 text-sm text-slate-300">Loading detail deposit...</div>
        ) : depositRows.length ? (
          <div className="mt-3 overflow-auto rounded-2xl border border-white/15 bg-slate-950/55">
            <table className="w-full min-w-230 text-sm">
              <thead className="sticky top-0 z-10 bg-linear-to-r from-indigo-500/20 via-violet-500/10 to-fuchsia-500/20 backdrop-blur">
                <tr className="text-left">
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200">Waktu</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200">Amount</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200">Metode</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200">Status</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200">Diproses</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200">Note</th>
                  <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200">Bukti URL</th>
                </tr>
              </thead>
              <tbody>
                {depositPageRows.map((d) => (
                  <tr key={d.id} className="border-t border-white/10 bg-white/1.5 transition hover:bg-indigo-400/[0.07]">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-100">{fmtDate(d.dibuat_pada)}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-semibold text-indigo-200">{rupiah(Number(d.amount || 0))}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-200">{d.metode || "-"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-200">{d.status || "-"}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-200">{d.diproses_nama || (d.diproses_oleh != null ? `ID ${d.diproses_oleh}` : "-")}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-300">{d.note || "-"}</td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-300">{d.bukti_url || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-3 text-sm text-slate-300">Belum ada detail yang dipilih.</div>
        )}

        {depositRows.length ? (
          <div className="mt-3 flex items-center justify-between rounded-xl border border-white/15 bg-slate-950/45 p-2 text-xs">
            <div className="text-slate-300">
              Halaman {safeDepositPage + 1} / {totalDepositPages}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDepositPage((p) => Math.max(0, p - 1))}
                disabled={depositLoading || safeDepositPage === 0}
              >
                Sebelumnya
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDepositPage((p) => Math.min(totalDepositPages - 1, p + 1))}
                disabled={depositLoading || safeDepositPage >= totalDepositPages - 1}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        ) : null}
            </>
          );
        })()}
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          variant={tab === "mutasi" ? "primary" : "outline"}
          onClick={() => setTab("mutasi")}
        >
          Mutasi Dompet
        </Button>

        <Button
          variant={tab === "transaksi" ? "primary" : "outline"}
          onClick={() => setTab("transaksi")}
        >
          Transaksi
        </Button>
      </div>

      {tab === "mutasi" ? (
        <MutasiSection
          loading={loading}
          rows={mutasi}
          total={mutasiTotal}
          hasNext={mutasiHasNext}
          offset={mutasiOffset}
          pageSize={PAGE_SIZE}
          refID={mutasiRefID}
          arah={mutasiArah}
          date={mutasiDate}
          from={mutasiFrom}
          to={mutasiTo}
          exporting={mutasiExporting}
          setRefID={setMutasiRefID}
          setArah={setMutasiArah}
          setDate={setMutasiDate}
          setFrom={setMutasiFrom}
          setTo={setMutasiTo}
          setOffset={setMutasiOffset}
          onApplyFilter={onApplyMutasiFilter}
          onResetFilter={onResetMutasiFilter}
          onExportCSV={exportMutasiCSV}
          onExportExcel={exportMutasiExcel}
          onExportPDF={exportMutasiPDF}
          fmtDate={fmtDate}
          fmtID={fmtID}
        />
      ) : null}

      {tab === "transaksi" ? (
        <TransaksiSection
          loading={loading}
          rows={trx}
          total={trxTotal}
          hasNext={trxHasNext}
          offset={trxOffset}
          pageSize={PAGE_SIZE}
          q={trxQ}
          from={trxFrom}
          to={trxTo}
          exporting={trxExporting}
          cancellingTrxID={cancellingTrxID}
          completingTrxID={completingTrxID}
          setQ={setTrxQ}
          setFrom={setTrxFrom}
          setTo={setTrxTo}
          setOffset={setTrxOffset}
          onApplyFilter={onApplyTrxFilter}
          onResetFilter={onResetTrxFilter}
          onExportCSV={exportTrxCSV}
          onExportExcel={exportTrxExcel}
          onExportPDF={exportTrxPDF}
          onCancelClick={openCancelModal}
          onCompleteClick={completePendingTrx}
          fmtDate={fmtDate}
        />
      ) : null}

      <CancelTransaksiModal
        open={cancelModalOpen}
        target={cancelTargetTrx}
        reason={cancelReason}
        loading={!!cancellingTrxID}
        onReasonChange={setCancelReason}
        onClose={() => {
          if (cancellingTrxID) return;
          setCancelModalOpen(false);
          setCancelTargetTrx(null);
          setCancelReason("");
        }}
        onConfirm={() => {
          if (!cancelTargetTrx) return;
          void cancelPendingTrx(cancelTargetTrx, cancelReason);
        }}
      />
    </div>
  );
}
