import { ChevronDown, LogOut } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { BrandLogo } from "./BrandLogo";
import { NavItem } from "./NavItem";
import { type NavSection } from "./nav";

type Props = {
  sections: NavSection[];
  onLogout: () => void;
};

export function SidebarDesktop({ sections, onLogout }: Props) {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  return (
    <aside className="hidden w-72 shrink-0 self-start border-r border-emerald-100 bg-[#f8fffb] md:sticky md:top-0 md:flex md:h-screen md:flex-col">
      <div className="border-b border-emerald-100 bg-white px-5 py-4">
        <div className="flex justify-center">
          <BrandLogo />
        </div>
        <p className="mt-3 text-center text-[11px] font-black uppercase tracking-[0.18em] text-[#064e3b]">
          Control Center
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {sections.map((section, idx) => {
          const key = section.title || `section-${idx}`;
          const active = section.items.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"));
          const isOpen = section.title ? openSections[key] ?? active : true;

          return (
            <div key={key} className={idx === 0 ? "space-y-1" : "mt-5 border-t border-emerald-100 pt-4"}>
              {section.title ? (
                <button
                  type="button"
                  className={`mb-2 flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left text-[13px] font-black uppercase tracking-[0.09em] outline-none transition focus-visible:ring-4 focus-visible:ring-emerald-200 ${
                    active
                      ? "border-[#052e26] bg-white text-[#052e26] shadow-[0_10px_22px_rgba(6,78,59,0.07)]"
                      : "border-transparent text-slate-700 hover:border-slate-300 hover:bg-white hover:text-slate-950"
                  }`}
                  onClick={() => setOpenSections((prev) => ({ ...prev, [key]: !isOpen }))}
                >
                  <span>{section.title}</span>
                  <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180 text-[#052e26]" : "text-slate-600"}`} />
                </button>
              ) : null}
              {isOpen ? (
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <NavItem key={item.href} href={item.href} label={item.label} />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="border-t border-emerald-100 bg-white p-4">
        <button
          type="button"
          onClick={onLogout}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-sm font-black text-rose-700 transition hover:bg-rose-100"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
