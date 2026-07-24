"use client";

import { type ReactNode, useEffect } from "react";
import { X } from "lucide-react";

type AppModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidthClassName?: string;
  children: ReactNode;
  footer?: ReactNode;
  hideCloseButton?: boolean;
};

export function AppModal({
  open,
  onClose,
  title,
  subtitle,
  maxWidthClassName = "max-w-lg",
  children,
  footer,
  hideCloseButton = false,
}: AppModalProps) {
  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyPosition = document.body.style.position;
    const originalBodyTop = document.body.style.top;
    const originalBodyWidth = document.body.style.width;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.position = originalBodyPosition;
      document.body.style.top = originalBodyTop;
      document.body.style.width = originalBodyWidth;
      window.scrollTo(0, scrollY);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md" onMouseDown={onClose}>
      <div
        className={`w-full ${maxWidthClassName} overflow-visible rounded-2xl border border-white/10 bg-linear-to-br from-slate-900 via-slate-900 to-slate-800 shadow-[0_30px_80px_-38px_rgba(56,189,248,0.75)]`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-white/10 bg-linear-to-r from-cyan-500/15 via-sky-500/10 to-indigo-500/15 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-slate-100">{title}</h3>
            {subtitle ? <p className="mt-1 text-xs text-slate-300">{subtitle}</p> : null}
          </div>
          {!hideCloseButton ? (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Tutup modal"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="max-h-[72vh] overflow-y-auto px-5 py-4">{children}</div>

        {footer ? <div className="border-t border-white/10 bg-slate-900/70 px-5 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}
