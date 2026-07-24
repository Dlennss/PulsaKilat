"use client";

import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { FormEventHandler } from "react";
import type { ExportKind, MutasiRow } from "./types";

type MutasiSectionProps = {
  loading: boolean;
  rows: MutasiRow[];
  total: number;
  hasNext: boolean;
  offset: number;
  pageSize: number;
  refID: string;
  arah: string;
  date: string;
  from: string;
  to: string;
  exporting: ExportKind;
  setRefID: (v: string) => void;
  setArah: (v: string) => void;
  setDate: (v: string) => void;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
  setOffset: (fn: (v: number) => number) => void;
  onApplyFilter: FormEventHandler<HTMLFormElement>;
  onResetFilter: () => void;
  onExportCSV: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  fmtDate: (s: string) => string;
  fmtID: (n: number) => string;
};

export function MutasiSection(props: MutasiSectionProps) {
  const {
    loading,
    rows,
    total,
    hasNext,
    offset,
    pageSize,
    refID,
    arah,
    date,
    from,
    to,
    exporting,
    setRefID,
    setArah,
    setDate,
    setFrom,
    setTo,
    setOffset,
    onApplyFilter,
    onResetFilter,
    onExportCSV,
    onExportExcel,
    onExportPDF,
    fmtDate,
    fmtID,
  } = props;

  function arahTone(v: string) {
    const a = (v || "").toLowerCase();
    if (a === "credit") return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30";
    if (a === "debit") return "bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30";
    return "bg-white/10 text-slate-200 ring-1 ring-white/20";
  }

  const columns: DataTableColumn<MutasiRow>[] = [
    {
      id: "waktu",
      header: "Waktu",
      tdClassName: "whitespace-nowrap text-slate-100",
      render: (m) => fmtDate(m.dibuat_pada),
    },
    {
      id: "arah",
      header: "Arah",
      render: (m) => (
        <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${arahTone(m.arah)}`}>{m.arah || "-"}</span>
      ),
    },
    {
      id: "jumlah",
      header: "Jumlah",
      tdClassName: "whitespace-nowrap font-semibold text-cyan-200",
      render: (m) => `Rp ${fmtID(m.jumlah)}`,
    },
    {
      id: "alasan",
      header: "Alasan",
      tdClassName: "whitespace-nowrap text-slate-200",
      render: (m) => m.alasan,
    },
    {
      id: "catatan",
      header: "Catatan",
      tdClassName: "whitespace-nowrap text-slate-300",
      render: (m) => m.catatan || "-",
    },
    {
      id: "saldo",
      header: "Saldo",
      tdClassName: "whitespace-nowrap font-mono text-xs text-slate-200",
      render: (m) => `${m.saldo_sebelum ?? "-"} → ${m.saldo_sesudah ?? "-"}`,
    },
    {
      id: "ref",
      header: "Ref",
      tdClassName: "whitespace-nowrap font-mono text-xs text-slate-300",
      render: (m) => m.ref_id,
    },
  ];
  columns.splice(5, 0, {
    id: "actor",
    header: "Diubah Oleh",
    tdClassName: "whitespace-nowrap text-slate-300",
    render: (m) =>
      m.diubah_oleh_nama && m.diubah_oleh
        ? `${m.diubah_oleh_nama} (${m.diubah_oleh})`
        : m.diubah_oleh
          ? String(m.diubah_oleh)
          : "-",
  });

  return (
    <>
      <form
        onSubmit={onApplyFilter}
        className="mt-4 rounded-2xl border border-sky-200/20 bg-linear-to-br from-slate-900/85 via-slate-900/70 to-cyan-950/35 p-4 shadow-[0_16px_40px_-24px_rgba(34,211,238,0.45)] backdrop-blur"
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-4">
            <label className="mb-1 block text-xs text-slate-300">Ref ID</label>
            <input
              value={refID}
              onChange={(e) => setRefID(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/20 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-85 [&::-webkit-calendar-picker-indicator]:invert hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
              placeholder="Cari ref_id"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-slate-300">Arah</label>
            <select
              value={arah}
              onChange={(e) => setArah(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/20 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-85 [&::-webkit-calendar-picker-indicator]:invert hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
            >
              <option value="">Semua</option>
              <option value="credit">Credit</option>
              <option value="debit">Debit</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-slate-300">Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/20 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-85 [&::-webkit-calendar-picker-indicator]:invert hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-slate-300">Dari</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/20"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-slate-300">Sampai</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/20"
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

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(m) => m.id}
        rowNumberStart={offset + 1}
        minWidthClassName="min-w-[980px]"
        emptyText="Tidak ada data mutasi."
        pagination={{
          page: Math.floor(offset / pageSize) + 1,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
          onPrev: () => setOffset((v) => Math.max(0, v - pageSize)),
          onNext: () => setOffset((v) => v + pageSize),
          disablePrev: loading || offset === 0,
          disableNext: loading || !hasNext,
        }}
      />
    </>
  );
}
