"use client";

import { FileText } from "lucide-react";

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
  const canDownload = readyDocuments.length > 0;

  return (
    <div
      className="flex w-full items-center gap-3 rounded-3xl border border-emerald-100 bg-white p-3 text-left shadow-[0_12px_26px_rgba(5,122,69,0.08)]"
      title={agentName}
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
        <FileText className="h-6 w-6" strokeWidth={2.4} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-black text-slate-950">PDF Dokumen</span>
        <span className="mt-0.5 block text-[10px] font-bold text-slate-500">
          {canDownload ? `${readyDocuments.length} foto tersimpan` : "Belum ada foto"}
        </span>
      </span>
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black text-emerald-700">
        Nanti
      </span>
    </div>
  );
}
