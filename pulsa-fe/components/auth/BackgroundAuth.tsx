import Image from "next/image";
import { Grid2X2, Phone, WalletCards, Wifi, Zap } from "lucide-react";

type Props = {
  children: React.ReactNode;
};

export function BackgroundAuth({ children }: Props) {
  return (
    <main className="relative flex min-h-svh items-start justify-center overflow-x-hidden overflow-y-auto bg-linear-to-br from-[#052e26] via-[#0b7a2d] to-[#9be22b] px-3 py-4 auth-shell sm:min-h-screen sm:items-center sm:py-5">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(560px_360px_at_72%_12%,rgba(190,242,100,0.45),transparent_70%),radial-gradient(620px_420px_at_12%_72%,rgba(20,184,166,0.22),transparent_66%)]" />
        <div className="absolute inset-0 opacity-[0.11] [background-image:linear-gradient(rgba(255,255,255,.55)_1px,transparent_1px)] [background-size:100%_34px]" />

        <div className="absolute -left-14 -top-12 h-48 w-48 rounded-full border border-lime-300/35" />
        <div className="absolute -right-10 top-0 h-72 w-72 rounded-full border border-white/25" />
        <div className="absolute right-16 bottom-28 hidden h-40 w-40 rounded-full border border-lime-300/25 md:block" />
        <div className="absolute right-20 top-28 hidden h-24 w-24 rotate-8 rounded-3xl border border-white/25 md:block" />
        <div className="absolute right-10 bottom-48 hidden h-20 w-20 rotate-12 rounded-3xl border border-lime-200/25 md:block" />
        <div className="absolute left-8 bottom-8 hidden h-14 w-14 rounded-full border border-white/40 md:block" />

        <div className="absolute left-[7%] top-[34%] hidden h-[410px] w-[210px] -rotate-12 rounded-[38px] border-[10px] border-[#85ef5b] bg-[#052e26] shadow-[0_24px_70px_rgba(0,0,0,0.28),0_0_34px_rgba(163,230,53,0.55)] lg:block">
          <div className="absolute left-1/2 top-5 h-1.5 w-16 -translate-x-1/2 rounded-full bg-white/25" />
          <div className="absolute inset-5 rounded-[26px] bg-linear-to-br from-[#083b2d] via-[#047857] to-[#052e26]" />
          <Image src="/images/logo-pulsakilat-header.svg" alt="" width={156} height={36} className="absolute left-1/2 top-40 h-auto w-38 -translate-x-1/2 rounded-md bg-white/95 px-2 py-1" aria-hidden="true" />
          <div className="absolute -bottom-8 left-1/2 h-8 w-44 -translate-x-1/2 rounded-[50%] bg-lime-300/70 blur-sm" />
        </div>

        <div className="absolute left-[3%] top-[44%] hidden h-24 w-24 -rotate-8 rounded-2xl bg-linear-to-br from-sky-400 to-blue-700 p-3 text-white shadow-[0_18px_34px_rgba(14,165,233,0.35)] lg:grid lg:place-items-center">
          <div className="grid gap-1 text-center text-xs font-black"><Wifi className="mx-auto h-8 w-8" />Paket Data</div>
        </div>
        <div className="absolute left-[17%] top-[21%] hidden h-24 w-24 -rotate-8 rounded-2xl bg-linear-to-br from-lime-300 to-green-700 p-3 text-white shadow-[0_18px_34px_rgba(132,204,22,0.35)] lg:grid lg:place-items-center">
          <div className="grid gap-1 text-center text-xs font-black"><Phone className="mx-auto h-8 w-8" />Pulsa</div>
        </div>
        <div className="absolute left-[8%] bottom-[27%] hidden h-24 w-24 -rotate-8 rounded-2xl bg-linear-to-br from-yellow-300 to-amber-600 p-3 text-white shadow-[0_18px_34px_rgba(245,158,11,0.35)] lg:grid lg:place-items-center">
          <div className="grid gap-1 text-center text-xs font-black"><Zap className="mx-auto h-8 w-8 fill-white" />Token PLN</div>
        </div>
        <div className="absolute right-[15%] top-[30%] hidden h-24 w-24 rotate-12 rounded-2xl bg-linear-to-br from-violet-400 to-purple-800 p-3 text-white shadow-[0_18px_34px_rgba(124,58,237,0.35)] lg:grid lg:place-items-center">
          <div className="grid gap-1 text-center text-xs font-black"><WalletCards className="mx-auto h-8 w-8" />E-Wallet</div>
        </div>
        <div className="absolute right-[14%] bottom-[38%] hidden h-24 w-24 rotate-12 rounded-2xl bg-linear-to-br from-lime-300 to-green-700 p-3 text-white shadow-[0_18px_34px_rgba(132,204,22,0.35)] lg:grid lg:place-items-center">
          <div className="grid gap-1 text-center text-xs font-black"><Grid2X2 className="mx-auto h-8 w-8" />More</div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-[390px]">{children}</div>
    </main>
  );
}
