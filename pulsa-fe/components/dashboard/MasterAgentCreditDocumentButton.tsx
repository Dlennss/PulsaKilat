"use client";

import { Download, FileText } from "lucide-react";

type CreditDocumentImage = {
  label: string;
  src: string;
};

function imageTypeFromDataUrl(src: string) {
  return src.startsWith("data:image/png") ? "PNG" : "JPEG";
}

export function MasterAgentCreditDocumentButton({
  agentName,
  documents,
}: {
  agentName: string;
  documents: CreditDocumentImage[];
}) {
  const readyDocuments = documents.filter((doc) => doc.src);
  const canDownload = readyDocuments.length > 0;

  async function downloadPDF() {
    if (!canDownload) return;
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

    const fileName = `dokumen-kredit-${agentName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "agent"}.pdf`;
    pdf.save(fileName);
  }

  return (
    <button
      type="button"
      disabled={!canDownload}
      onClick={downloadPDF}
      className="flex w-full items-center gap-3 rounded-3xl border border-emerald-100 bg-white p-3 text-left shadow-[0_12px_26px_rgba(5,122,69,0.08)] transition hover:-translate-y-0.5 hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-55"
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
        <FileText className="h-6 w-6" strokeWidth={2.4} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-black text-slate-950">PDF Dokumen</span>
        <span className="mt-0.5 block text-[10px] font-bold text-slate-500">
          {canDownload ? `${readyDocuments.length} foto digabung` : "Belum ada foto"}
        </span>
      </span>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-600 text-white">
        <Download className="h-4 w-4" strokeWidth={2.6} />
      </span>
    </button>
  );
}
