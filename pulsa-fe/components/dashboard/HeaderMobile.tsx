import { BrandLogo } from "./BrandLogo";

type Props = {
  onOpenMenu: () => void;
};

export function HeaderMobile({ onOpenMenu }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#071022]/90 px-4 py-3 backdrop-blur md:hidden">
      <div className="relative flex items-center justify-end gap-3">
        <div className="pointer-events-none absolute inset-x-0 flex justify-center">
          <BrandLogo />
        </div>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80"
          onClick={onOpenMenu}
          aria-label="Open menu"
        >
          ☰
        </button>
      </div>
    </header>
  );
}

