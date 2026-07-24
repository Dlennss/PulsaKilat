"use client";

import { Button } from "@/components/ui/button";
import type { TrxRow } from "./types";

type CancelTransaksiModalProps = {
  open: boolean;
  target: TrxRow | null;
  reason: string;
  loading: boolean;
  onReasonChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function CancelTransaksiModal({
  open,
  target,
  reason,
  loading,
  onReasonChange,
  onClose,
  onConfirm,
}: CancelTransaksiModalProps) {
  if (!open || !target) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-black p-4 shadow-2xl">
        <div className="text-base font-semibold">Batalkan Transaksi Pending</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Ref: {target.ref_id} • Tujuan: {target.tujuan}
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs text-muted-foreground">Alasan Pembatalan</label>
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            placeholder="Contoh: Pending terlalu lama, dibatalkan manual oleh admin."
          />
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Batal
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={loading}>
            {loading ? "Membatalkan..." : "Batalkan Transaksi"}
          </Button>
        </div>
      </div>
    </div>
  );
}

