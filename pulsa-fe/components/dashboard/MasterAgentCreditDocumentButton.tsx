"use client";

import { Download, Eye, FileText, X } from "lucide-react";
import { useEffect, useState } from "react";

type CreditDocumentImage = {
  label: string;
  src: string;
};

export function MasterAgentCreditDocumentButton({
  agentName,
  documents,
}: {
  agentName: string;
  documents: CreditDocumentImage[];
}) {
  const readyDocuments = documents.filter((doc) => doc.src);
  const canPreview = readyDocuments.length > 0;
  const [open, setOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  function imageTypeFromDataUrl(src: string) {
    return src.startsWith("data:image/png") ? "PNG" : "JPEG";
  }

  async function buildPDF() {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;

    readyDocuments.forEach((doc, index) => {
      if (index > 0) pdf.addPage();
      pdf.setFillColor(5, 46, 38);
      pdf.rect(0, 0, pageWidth, 64, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.text("PulsaKilat - Dokumen Kredit Agent", margin, 38);

      pdf.setTextColor(15, 23, 42);
      pdf.setFontSize(12);
      pdf.text(`${doc.label} - ${agentName}`, margin, 92);

      const maxWidth = pageWidth - margin * 2;
      const maxHeight = pageHeight - 142;
      pdf.addImage(doc.src, imageTypeFromDataUrl(doc.src), margin, 112, maxWidth, maxHeight, undefined, "FAST");
    });

    return pdf;
  }

  async function openPreview() {
    if (!canPreview || loading) return;
    setLoading(true);
    try {
      const pdf = await buildPDF();
      const blob = pdf.output("blob");
      setPdfUrl((oldUrl) => {
        if (oldUrl) URL.revokeObjectURL(oldUrl);
        return URL.createObjectURL(blob);
      });
      setOpen(true);
    } finally {
      setLoading(false);
    }
  }

  async function downloadPDF() {
    if (!canPreview || loading) return;
    setLoading(true);
    try {
      const pdf = await buildPDF();
      const fileName = `dokumen-kredit-${agentName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "agent"}.pdf`;
      pdf.save(fileName);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={!canPreview || loading}
        onClick={openPreview}
        className="flex w-full items-center gap-3 rounded-3xl border border-emerald-100 bg-white p-3 text-left shadow-[0_12px_26px_rgba(5,122,69,0.08)] transition hover:-translate-y-0.5 hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-55"
        title={agentName}
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          <FileText className="h-6 w-6" strokeWidth={2.4} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-black text-slate-950">PDF Dokumen</span>
          <span className="mt-0.5 block text-[10px] font-bold text-slate-500">
            {canPreview ? `${readyDocuments.length} foto tersimpan` : "Belum ada foto"}
          </span>
        </span>
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white">
          <Eye className="h-4 w-4" strokeWidth={2.6} />
        </span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 backdrop-blur-sm">
          <section className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.35)]">
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                <FileText className="h-5 w-5" strokeWidth={2.4} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-black text-slate-950">Preview Dokumen</h3>
                <p className="truncate text-[11px] font-bold text-slate-500">{agentName}</p>
              </div>
              <button
                type="button"
                onClick={downloadPDF}
                className="inline-flex h-10 items-center gap-2 rounded-2xl bg-emerald-600 px-3 text-xs font-black text-white transition hover:bg-emerald-700"
              >
                <Download className="h-4 w-4" strokeWidth={2.5} />
                Download
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                aria-label="Tutup preview"
              >
                <X className="h-4 w-4" strokeWidth={2.6} />
              </button>
            </div>
            <div className="h-[78vh] bg-slate-100">
              {pdfUrl ? (
                <iframe src={pdfUrl} title={`Preview dokumen ${agentName}`} className="h-full w-full border-0" />
              ) : (
                <div className="grid h-full place-items-center text-sm font-black text-slate-500">Menyiapkan PDF...</div>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
