import { ChevronDown } from "lucide-react";
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
  const isMasterPanel = pathname.startsWith("/dashboard/master");

  return (
    <aside className={`hidden w-70 shrink-0 self-start border-r md:sticky md:top-0 md:flex md:h-screen md:flex-col ${isMasterPanel ? "border-emerald-300/10 bg-[linear-gradient(180deg,#052e26_0%,#046c3b_52%,#03341f_100%)]" : "border-white/10 bg-[#0A1325]"}`}>
      <div className="border-b border-white/10 px-5 py-2 text-center">
        <div className="mt-1">
          <BrandLogo />
        </div>
        {isMasterPanel ? <p className="-mt-2 mb-3 text-xs font-bold text-lime-100/80"></p> : null}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
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
                    <NavItem key={item.href} href={item.href} label={item.label} />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="border-t border-white/10 p-4">
        <button
          type="button"
          onClick={onLogout}
          className={`w-full rounded-xl border px-3 py-2 text-sm font-medium transition ${isMasterPanel ? "border-white/15 bg-white/10 text-white hover:bg-white/15" : "border-red-300/25 bg-red-400/10 text-red-200 hover:bg-red-400/15"}`}
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
