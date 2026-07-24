"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Eye, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableActions, type DataTableColumn } from "@/components/ui/data-table";
import type { FormEventHandler } from "react";
import type { ExportKind, TrxRow } from "./types";

type TransaksiSectionProps = {
  loading: boolean;
  rows: TrxRow[];
  total: number;
  hasNext: boolean;
  offset: number;
  pageSize: number;
  q: string;
  from: string;
  to: string;
  exporting: ExportKind;
  cancellingTrxID: number | null;
  completingTrxID: number | null;
  setQ: (v: string) => void;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
  setOffset: (fn: (v: number) => number) => void;
  onApplyFilter: FormEventHandler<HTMLFormElement>;
  onResetFilter: () => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  onCancelClick: (t: TrxRow) => void;
  onCompleteClick: (t: TrxRow) => void;
  fmtDate: (s: string) => string;
};

type MenuPos = {
  top: number;
  left: number;
};

export function TransaksiSection(props: TransaksiSectionProps) {
  const {
    loading,
    rows,
    total,
    hasNext,
    offset,
    pageSize,
    q,
    from,
    to,
    exporting,
    cancellingTrxID,
    completingTrxID,
    setQ,
    setFrom,
    setTo,
    setOffset,
    onApplyFilter,
    onResetFilter,
    onExportCSV,
    onExportExcel,
    onExportPDF,
    onCancelClick,
    onCompleteClick,
    fmtDate,
  } = props;

  const [openActionKey, setOpenActionKey] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      const el = target as Element;
      if (!el.closest("[data-action-dropdown]") && !el.closest("[data-action-menu]")) {
        setOpenActionKey(null);
      }
    }

    function onViewportChange() {
      setOpenActionKey(null);
    }

    document.addEventListener("click", onDocClick);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    return () => {
      document.removeEventListener("click", onDocClick);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, []);

  function statusTone(v: string) {
    const s = (v || "").toLowerCase();
    if (s === "success" || s === "sukses") return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30";
    if (s === "failed" || s === "gagal" || s === "error") return "bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30";
    if (s === "pending" || s === "proses") return "bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/30";
    return "bg-white/10 text-slate-200 ring-1 ring-white/20";
  }

  const columns: DataTableColumn<TrxRow>[] = [
    {
      id: "waktu",
      header: "Waktu",
      tdClassName: "whitespace-nowrap text-slate-100",
      render: (t) => fmtDate(t.dibuat_pada),
    },
    {
      id: "ref",
      header: "Ref",
      tdClassName: "whitespace-nowrap font-mono text-xs text-slate-300",
      render: (t) => t.ref_id,
    },
    {
      id: "perintah",
      header: "Perintah",
      tdClassName: "whitespace-nowrap text-slate-200",
      render: (t) => t.perintah,
    },
    {
      id: "produk",
      header: "Produk",
      tdClassName: "whitespace-nowrap text-slate-200",
      render: (t) => t.kode_produk,
    },
    {
      id: "tujuan",
      header: "Tujuan",
      tdClassName: "whitespace-nowrap text-slate-200",
      render: (t) => t.tujuan,
    },
    {
      id: "qty",
      header: "Qty",
      tdClassName: "whitespace-nowrap text-slate-200",
      render: (t) => t.qty,
    },
    {
      id: "status",
      header: "Status",
      render: (t) => (
        <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(t.status)}`}>
          {t.status || "-"}
        </span>
      ),
    },
    {
      id: "biaya",
      header: "Biaya",
      tdClassName: "whitespace-nowrap font-semibold text-indigo-200",
      render: (t) => t.biaya_aktual || t.biaya_perkiraan,
    },
  ];

  const actions: DataTableActions<TrxRow> = {
    header: "Aksi",
    align: "right",
    tdClassName: "whitespace-nowrap",
    render: (t) => {
      const st = (t.status || "").toLowerCase();
      const canComplete = st === "pending" || st === "failed";
      const canCancel = st === "pending";

      if (!canComplete) {
        return <span className="text-xs text-muted-foreground">-</span>;
      }

      return (
        <div className="relative inline-flex" data-action-dropdown>
          <Button
            type="button"
            size="sm"
            className="h-8 w-8 px-0 bg-linear-to-r from-sky-500 to-cyan-500 text-white hover:opacity-90"
            onClick={(e) => {
              const next = openActionKey === String(t.id) ? null : String(t.id);
              if (next) {
                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                const menuWidth = 160;
                const menuHeight = 132;
                const gap = 8;

                const spaceBelow = window.innerHeight - rect.bottom;
                const openUp = spaceBelow < menuHeight && rect.top > spaceBelow;

                const rawLeft = rect.right - menuWidth;
                const left = Math.max(8, Math.min(rawLeft, window.innerWidth - menuWidth - 8));
                const top = openUp ? rect.top - menuHeight - gap : rect.bottom + gap;

                setMenuPos({ top: Math.max(8, top), left });
              }
              setOpenActionKey(next);
            }}
            aria-label="Aksi"
          >
            <Eye className="h-4 w-4" />
          </Button>

          {openActionKey === String(t.id) && menuPos ? (
            <div
              data-action-menu
              className="fixed z-[120] w-40 rounded-xl border border-white/12 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur"
              style={{ top: `${menuPos.top}px`, left: `${menuPos.left}px` }}
            >
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-emerald-300 transition hover:bg-emerald-500/15"
                onClick={() => {
                  setOpenActionKey(null);
                  onCompleteClick(t);
                }}
                disabled={completingTrxID === t.id}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {completingTrxID === t.id ? "Menyelesaikan..." : "Selesaikan"}
              </button>
              <button
                type="button"
                className={`mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition ${
                  canCancel ? "text-rose-300 hover:bg-rose-500/15" : "cursor-not-allowed text-slate-500"
                }`}
                onClick={() => {
                  setOpenActionKey(null);
                  if (canCancel) onCancelClick(t);
                }}
                disabled={!canCancel || cancellingTrxID === t.id}
              >
                <XCircle className="h-3.5 w-3.5" />
                {canCancel ? (cancellingTrxID === t.id ? "Membatalkan..." : "Batalkan") : "Batalkan"}
              </button>
            </div>
          ) : null}
        </div>
      );
    },
  };

  return (
    <>
      <form
        onSubmit={onApplyFilter}
        className="mt-4 rounded-2xl border border-indigo-200/20 bg-linear-to-br from-slate-900/85 via-slate-900/70 to-indigo-950/35 p-4 shadow-[0_16px_40px_-24px_rgba(99,102,241,0.45)] backdrop-blur"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-6">
            <label className="mb-1 block text-xs text-slate-300">Pencarian</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-300/60 focus:ring-2 focus:ring-indigo-400/20 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-85 [&::-webkit-calendar-picker-indicator]:invert hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
              placeholder="ref_id / tujuan / produk / perintah / status / keterangan"
            />
          </div>
          <div className="md:col-span-3">
            <label className="mb-1 block text-xs text-slate-300">Dari</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-300/60 focus:ring-2 focus:ring-indigo-400/20 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-85 [&::-webkit-calendar-picker-indicator]:invert hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
            />
          </div>
          <div className="md:col-span-3">
            <label className="mb-1 block text-xs text-slate-300">Sampai</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-indigo-300/60 focus:ring-2 focus:ring-indigo-400/20"
            />
          </div>

          <div className="md:col-span-12 flex flex-wrap items-center gap-2">
            <Button type="submit" variant="primary" disabled={loading}>
              Terapkan
            </Button>
            <Button type="button" variant="outline" onClick={onResetFilter} disabled={loading}>
              Reset
            </Button>
            <Button type="button" variant="outline" onClick={onExportCSV} disabled={loading || !!exporting}>
              {exporting === "csv" ? "Menyiapkan CSV..." : "CSV"}
            </Button>
            <Button type="button" variant="outline" onClick={onExportExcel} disabled={loading || !!exporting}>
              {exporting === "excel" ? "Menyiapkan Excel..." : "Excel"}
            </Button>
            <Button type="button" variant="outline" onClick={onExportPDF} disabled={loading || !!exporting}>
              {exporting === "pdf" ? "Menyiapkan PDF..." : "PDF"}
            </Button>
            <div className="ml-auto rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-xs text-slate-200">{rows.length} data</div>
          </div>
        </div>
      </form>

      <div className="mt-5 overflow-x-auto">
        <DataTable
          columns={columns}
          wrapperClassName="relative overflow-visible rounded-md border border-white/15 bg-slate-950/50 shadow-[0_18px_42px_-26px_rgba(56,189,248,0.45)]"
          rows={rows}
          rowKey={(t) => t.id}
          rowNumberStart={offset + 1}
          minWidthClassName="min-w-[1100px]"
          emptyText="Tidak ada data transaksi."
          actions={actions}
          pagination={{
            page: Math.floor(offset / pageSize) + 1,
            totalPages: Math.max(1, Math.ceil(total / pageSize)),
            onPrev: () => setOffset((v) => Math.max(0, v - pageSize)),
            onNext: () => setOffset((v) => v + pageSize),
            disablePrev: loading || offset === 0,
            disableNext: loading || !hasNext,
          }}
        />
      </div>
    </>
  );
}
