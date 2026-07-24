import Link from "next/link";
import { ChevronLeft, LockKeyhole, PhoneCall, ShieldCheck } from "lucide-react";
import { GuestBottomNav } from "@/components/guest/GuestBottomNav";

const principles = [
  {
    title: "Data yang Kami Kumpulkan",
    items: [
      "Data akun seperti nama, email, nomor WhatsApp, dan informasi profil yang Anda kirim saat mendaftar atau login.",
      "Data transaksi seperti produk yang dibeli, nomor tujuan, nominal, status transaksi, pembayaran, dan riwayat penggunaan layanan.",
      "Data teknis seperti alamat IP, perangkat, browser, aplikasi, dan log sistem yang dibutuhkan untuk keamanan serta analisa gangguan.",
    ],
  },
  {
    title: "Cara Data Digunakan",
    items: [
      "Memproses transaksi produk digital, PPOB, deposit, withdraw, komisi, dan layanan kemitraan yang Anda gunakan di PulsaKilat.",
      "Melakukan verifikasi akun, pencegahan penyalahgunaan, audit keamanan, dan penanganan keluhan atau permintaan bantuan pelanggan.",
      "Mengirim informasi transaksi, status pembayaran, bukti pembelian, notifikasi sistem, dan pembaruan layanan yang relevan.",
    ],
  },
  {
    title: "Pihak Ketiga yang Terkait",
    items: [
      "Penyedia login seperti Google untuk autentikasi akun saat Anda memilih masuk menggunakan Google.",
      "Penyedia pembayaran seperti QRIS, payment gateway, bank, dan mitra biller atau provider produk digital untuk memproses transaksi.",
      "Layanan infrastruktur dan keamanan yang kami gunakan untuk menjaga kestabilan aplikasi, pemantauan, dan perlindungan sistem.",
    ],
  },
  {
    title: "Penyimpanan dan Perlindungan Data",
    items: [
      "Kami menyimpan data yang diperlukan selama akun aktif atau selama dibutuhkan untuk kewajiban hukum, audit, dan penyelesaian sengketa.",
      "Kami menerapkan pembatasan akses internal, pencatatan aktivitas penting, serta kontrol teknis yang wajar untuk melindungi data.",
      "Walaupun kami berupaya menjaga keamanan, tidak ada sistem elektronik yang dapat dijamin 100% bebas risiko.",
    ],
  },
  {
    title: "Hak Pengguna",
    items: [
      "Anda dapat meminta pembaruan data profil, penutupan akun, atau bantuan terkait informasi akun melalui kontak resmi PulsaKilat.",
      "Permintaan tertentu dapat tunduk pada kewajiban penyimpanan data transaksi, audit, dan kepatuhan hukum yang masih berlaku.",
    ],
  },
];

type PrivacyPolicyPageContentProps = {
  backHref?: string;
};

export function PrivacyPolicyPageContent({ backHref = "/" }: PrivacyPolicyPageContentProps) {
  return (
    <main className="relative overflow-hidden bg-sky-50 text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(620px_260px_at_10%_0%,rgba(15,111,203,0.18),transparent_62%),radial-gradient(760px_320px_at_100%_0%,rgba(45,212,191,0.14),transparent_56%),linear-gradient(180deg,#e9f5ff_0%,rgba(233,245,255,0.36)_38%,rgba(233,245,255,0)_100%)]" />

      <section className="relative space-y-5 px-4 pb-5 pt-4">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white/85 px-3 py-1.5 text-sm font-semibold text-sky-700 shadow-[0_10px_24px_rgba(15,111,203,0.08)]"
          aria-label="Kembali"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Kembali</span>
        </Link>

        <div className="overflow-hidden rounded-[28px] border border-white/70 bg-linear-to-br from-[#0f6fcb] via-[#1576d0] to-[#2f92df] px-5 py-6 text-white shadow-[0_24px_60px_rgba(15,111,203,0.22)]">
          <div className="max-w-[20rem]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/72">Kebijakan Privasi</p>
            <h1 className="mt-3 text-balance text-[30px] font-black leading-[1.02] tracking-tight">
              Privasi pengguna PulsaKilat untuk website dan aplikasi Android.
            </h1>
            <p className="mt-4 text-sm leading-6 text-white/90 text-justify">
              Kebijakan ini menjelaskan jenis data yang kami gunakan, tujuan penggunaannya, dan bagaimana PulsaKilat
              melindungi informasi pengguna saat mengakses layanan retail, agen, H2H, website, maupun aplikasi Android.
            </p>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-white/72">Berlaku sejak 6 April 2026</p>
          </div>
        </div>
      </section>

      <section className="relative px-4 pb-4">
        <div className="rounded-[28px] border border-sky-100 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700">Ringkasan</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                PulsaKilat memakai data seperlunya untuk menjalankan transaksi dan menjaga keamanan layanan
              </h2>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            {principles.map((section) => (
              <div key={section.title} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <h3 className="text-sm font-black tracking-tight text-slate-950">{section.title}</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative px-4 pb-4">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sky-700">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-700">Persetujuan & Perubahan</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950">
                Dengan memakai layanan PulsaKilat, Anda menyetujui pengolahan data sesuai kebijakan ini
              </h2>
            </div>
          </div>

          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600 text-justify">
            <p>
              PulsaKilat dapat memperbarui kebijakan privasi ini dari waktu ke waktu untuk menyesuaikan perubahan fitur,
              proses bisnis, atau kewajiban hukum. Versi terbaru akan dipublikasikan pada halaman ini.
            </p>
            <p>
              Jika Anda menggunakan login Google pada aplikasi Android PulsaKilat, data akun Google yang tersedia untuk
              proses autentikasi hanya digunakan untuk masuk ke akun, verifikasi identitas, dan pengamanan akses.
            </p>
          </div>
        </div>
      </section>

      <section className="relative px-4 pb-10">
        <aside className="rounded-[28px] border border-sky-200 bg-linear-to-r from-[#0f6fcb] via-[#1576d0] to-[#2f92df] p-5 text-white shadow-[0_24px_60px_rgba(15,111,203,0.22)]">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/12">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">Kontak Resmi</p>
              <h2 className="mt-2 text-xl font-black tracking-tight">
                Hubungi PulsaKilat jika Anda membutuhkan bantuan terkait privasi dan data akun
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-4 text-sm leading-7 text-white/92">
            <div className="rounded-2xl border border-white/16 bg-white/10 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/64">Badan Usaha</p>
              <p className="mt-2 font-semibold">PT Pulsa Mitra Nasional</p>
            </div>
            <div className="rounded-2xl border border-white/16 bg-white/10 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/64">WhatsApp & Telepon</p>
              <Link href="tel:+6282219107558" className="mt-2 inline-block text-base font-bold text-cyan-100 hover:text-white">
                0822-1910-7558
              </Link>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Link
              href="https://wa.me/6282219107558"
              className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-white px-4 text-center text-sm font-semibold text-[#0f6fcb]! visited:text-[#0f6fcb]! hover:bg-sky-50 hover:text-[#0f6fcb]!"
            >
              WhatsApp
            </Link>
            <Link
              href="/tentang"
              className="inline-flex h-12 flex-1 items-center justify-center rounded-full border border-white/30 bg-white/10 px-4 text-center text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Tentang Kami
            </Link>
          </div>
        </aside>
      </section>

      <GuestBottomNav />
    </main>
  );
}
