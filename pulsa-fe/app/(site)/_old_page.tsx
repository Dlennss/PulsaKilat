import Link from "next/link";
import Image from "next/image";

const brandBlue = "#2d8fdc";

export default function OldHomePage() {
  const highlights = ["Operasional 24 Jam", "Transaksi Cepat & Stabil", "Support Retail dan H2H"];

  return (
    <main className="relative isolate overflow-hidden bg-slate-50 text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-130 bg-[radial-gradient(760px_340px_at_12%_0%,rgba(45,143,220,0.18),transparent_60%),radial-gradient(760px_400px_at_100%_0%,rgba(14,165,233,0.14),transparent_58%),linear-gradient(180deg,#eef7ff_0%,rgba(248,250,252,0)_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.22] bg-[linear-gradient(rgba(45,143,220,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(45,143,220,0.12)_1px,transparent_1px)] bg-size-[56px_56px]" />

      <section className="relative mx-auto grid min-h-[calc(100svh-80px)] w-full max-w-7xl items-center gap-4 px-4 pb-6 pt-2 sm:pt-3 md:gap-10 md:px-6 md:pt-12 lg:min-h-[calc(100vh-80px)] lg:grid-cols-[1.02fr_1fr] lg:gap-10 lg:pb-16">
        <div className="order-1 relative mx-auto w-full max-w-190 lg:order-2 lg:max-w-205">
          <div className="relative min-h-55 sm:min-h-80 lg:min-h-108">
            <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-sky-200/30 via-transparent to-cyan-200/20" />
            <div className="relative overflow-hidden sm:min-h-80 lg:min-h-108">
              <div className="relative z-20 px-2 pt-1 lg:hidden">
                <h1 className="text-balance text-4xl font-black leading-[1.02] tracking-tight text-slate-950 sm:text-5xl">
                  Layanan Topup Digital Cepat, Aman, dan Aktif 24 Jam
                </h1>
                <p className="mt-2 max-w-[18rem] text-sm leading-5 text-slate-600 sm:max-w-md sm:text-base sm:leading-6">
                  Pulsa, paket data, e-money, dan PPOB dalam satu layanan yang stabil untuk personal hingga bisnis.
                </p>
              </div>
              <Image
                src="/pulsakilat-ewallet.png"
                alt="PulsaKilat CTA Visual"
                width={1600}
                height={1100}
                priority
                className="relative z-10 mx-auto mt-1 h-auto w-[82%] object-contain drop-shadow-[0_24px_50px_rgba(15,23,42,0.18)] sm:w-[76%] lg:absolute lg:bottom-0 lg:left-1/2 lg:mt-0 lg:w-[92%] lg:-translate-x-1/2"
              />
              <div className="absolute inset-x-0 bottom-0 hidden h-28 bg-linear-to-t from-slate-100/70 via-slate-100/10 to-transparent lg:block" />
            </div>
          </div>

          <p className="mt-2 text-center text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6 lg:hidden">
            Solusi transaksi digital untuk kebutuhan harian hingga skala bisnis.
          </p>
        </div>

        <div className="order-2 max-w-xl lg:order-1">
          <h1 className="hidden text-balance text-4xl font-black leading-[1.03] tracking-tight text-gray-700 md:text-6xl lg:block">
            Layanan Topup Digital Cepat, Aman, dan Aktif 24 Jam
          </h1>
          <p className="mt-3 hidden max-w-lg text-base leading-8 text-slate-600 md:text-xl lg:block">
            PulsaKilat menghadirkan layanan pulsa, paket data, e-money, dan PPOB dalam satu platform yang stabil untuk pelanggan personal hingga mitra bisnis.
          </p>

          <ul className="mt-3 grid gap-2.5 lg:mt-8 lg:gap-3">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-3 text-base text-slate-800 sm:text-lg">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-xs text-emerald-600 sm:h-6 sm:w-6">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3 lg:mt-9">
            <Link
              href="https://wa.me/6282219107558"
              className="inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(45,143,220,0.28)] transition hover:brightness-105 sm:h-12 sm:px-7 sm:text-base"
              style={{ backgroundColor: brandBlue, color: "#ffffff" }}
            >
              Hubungi Kami
            </Link>
            <Link
              href="/tentang"
              className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-100 sm:h-12 sm:px-7 sm:text-base"
            >
              Profil Perusahaan
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

