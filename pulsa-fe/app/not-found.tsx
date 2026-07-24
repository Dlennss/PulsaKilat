import Link from "next/link";

export default function NotFound() {
  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[radial-gradient(1200px_600px_at_20%_-10%,rgba(79,124,255,0.28),transparent_45%),radial-gradient(900px_500px_at_90%_10%,rgba(34,197,94,0.2),transparent_45%),linear-gradient(180deg,#0b1020_0%,#090d1a_100%)]">
      <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:32px_32px]" />

      <section className="relative mx-auto flex min-h-[100svh] max-w-5xl items-center px-6 py-16">
        <div className="w-full rounded-3xl border border-white/15 bg-white/[0.04] p-8 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl md:p-12">
          <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
            Error 404
          </p>

          <div className="mt-5 space-y-4">
            <h1 className="text-balance text-4xl font-black leading-tight text-white md:text-6xl">
              Halaman yang kamu cari tidak ditemukan
            </h1>
            <p className="max-w-2xl text-pretty text-sm leading-7 text-white/70 md:text-base">
              Kemungkinan URL sudah berubah, link sudah tidak aktif, atau halaman dipindahkan. Coba kembali ke beranda atau lanjut ke dashboard.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/" className="btn primary">
              Kembali ke Beranda
            </Link>
            <Link href="/dashboard" className="btn ghost">
              Buka Dashboard
            </Link>
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-black/25 p-5">
            <div className="text-xs uppercase tracking-[0.16em] text-white/50">Petunjuk cepat</div>
            <ul className="mt-3 grid gap-2 text-sm text-white/75 md:grid-cols-3">
              <li>Cek kembali penulisan URL.</li>
              <li>Pastikan kamu sudah login jika membuka halaman private.</li>
              <li>Jika perlu, refresh halaman lalu coba lagi.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
