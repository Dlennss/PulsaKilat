import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { BrandLogo } from "./BrandLogo";
import { NavItem } from "./NavItem";
import { type NavSection } from "./nav";

type Props = {
  sections: NavSection[];
  open: boolean;
  onClose: () => void;
  onLogout: () => void;
};

export function SidebarMobile({ sections, open, onClose, onLogout }: Props) {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={onClose}>
      <aside
        className="flex h-full w-70 flex-col border-r border-white/10 bg-[#0A1325] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <BrandLogo />
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5"
            onClick={onClose}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {sections.map((section, idx) => {
            const key = section.title || `section-${idx}`;
            const active = section.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"));
            const isOpen = section.title ? openSections[key] ?? active : true;

            return (
              <div key={key} className={idx === 0 ? "space-y-1" : "mt-5 border-t border-white/10 pt-4"}>
                {section.title ? (
                  <button
                    type="button"
                    className={`mb-2 flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-[14px] font-bold uppercase tracking-[0.08em] transition ${
                      active
                        ? "border-cyan-300/35 bg-linear-to-r from-cyan-400/18 via-sky-400/12 to-transparent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                        : "border-transparent text-white/65 hover:border-white/10 hover:bg-white/6 hover:text-white/90"
                    }`}
                    onClick={() => setOpenSections((prev) => ({ ...prev, [key]: !isOpen }))}
                  >
                    <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]">{section.title}</span>
                    <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180 text-white" : "text-white/65"}`} />
                  </button>
                ) : null}
                {isOpen ? (
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <NavItem key={item.href} href={item.href} label={item.label} onClick={onClose} />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="mt-5 border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full rounded-xl border border-red-300/25 bg-red-400/10 px-3 py-2 text-sm font-medium text-red-200 transition hover:bg-red-400/15"
          >
            Logout
          </button>
        </div>
      </aside>
    </div>
  );
}
