"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgePercent,
  BriefcaseBusiness,
  Car,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Copy,
  CreditCard,
  Gamepad2,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Home,
  Landmark,
  MonitorPlay,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tv,
  WalletCards,
  Waves,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import type { UserAppOrder } from "@/components/user/types";

type ServiceMeta = {
  title: string;
  subtitle: string;
  inputLabel: string;
  placeholder: string;
  icon: LucideIcon;
  providers: string[];
  products: string[];
  accent: string;
};

type DraftOrder = {
  invoiceId: string;
  service: string;
  destination: string;
  provider: string;
  product: string;
  total: number;
};

const serviceMap: Record<string, ServiceMeta> = {
  "hp-pascabayar": {
    title: "HP Pascabayar",
    subtitle: "Cek dan bayar tagihan nomor pascabayar.",
    inputLabel: "Nomor HP",
    placeholder: "Masukkan nomor pascabayar",
    icon: ReceiptText,
    providers: ["Telkomsel Halo", "Indosat Postpaid", "XL Prioritas"],
    products: ["Cek Tagihan", "Bayar Tagihan", "Reminder Bulanan"],
    accent: "from-cyan-500 to-sky-500",
  },
  "esim-roaming": {
    title: "eSIM & Roaming",
    subtitle: "Paket internet perjalanan luar negeri.",
    inputLabel: "Nomor HP",
    placeholder: "Masukkan nomor aktif",
    icon: Smartphone,
    providers: ["Asia Roaming", "Global eSIM", "Umrah & Haji"],
    products: ["1 GB / 3 Hari", "3 GB / 7 Hari", "5 GB / 15 Hari"],
    accent: "from-violet-500 to-indigo-500",
  },
  qris: {
    title: "Pembayaran QRIS",
    subtitle: "Bayar merchant dengan kode QR.",
    inputLabel: "ID / Nama Merchant",
    placeholder: "Masukkan ID merchant",
    icon: QrCode,
    providers: ["QRIS Dinamis", "QRIS Statis", "Merchant Lokal"],
    products: ["Rp 25.000", "Rp 50.000", "Rp 100.000"],
    accent: "from-purple-500 to-fuchsia-500",
  },
  "uang-elektronik": {
    title: "Uang Elektronik",
    subtitle: "Isi saldo kartu transport dan uang elektronik.",
    inputLabel: "Nomor Kartu",
    placeholder: "Masukkan nomor kartu",
    icon: CreditCard,
    providers: ["E-Money", "TapCash", "Brizzi"],
    products: ["Rp 20.000", "Rp 50.000", "Rp 100.000"],
    accent: "from-indigo-500 to-blue-500",
  },
  "kartu-kredit": {
    title: "Kartu Kredit",
    subtitle: "Cek dan bayar tagihan kartu kredit.",
    inputLabel: "Nomor Kartu",
    placeholder: "Masukkan 12-16 digit kartu",
    icon: CreditCard,
    providers: ["BCA Card", "Mandiri Card", "BRI Card"],
    products: ["Cek Tagihan", "Bayar Minimum", "Bayar Penuh"],
    accent: "from-violet-500 to-indigo-500",
  },
  asuransi: {
    title: "Asuransi",
    subtitle: "Bayar premi asuransi dengan cepat.",
    inputLabel: "Nomor Polis",
    placeholder: "Masukkan nomor polis",
    icon: ShieldCheck,
    providers: ["Prudential", "Allianz", "AIA"],
    products: ["Premi Bulanan", "Premi Tahunan", "Cek Polis"],
    accent: "from-emerald-500 to-teal-500",
  },
  bpjs: {
    title: "BPJS",
    subtitle: "Bayar iuran BPJS Kesehatan.",
    inputLabel: "Nomor VA BPJS",
    placeholder: "Masukkan nomor BPJS",
    icon: HeartPulse,
    providers: ["BPJS Kesehatan", "BPJS Ketenagakerjaan"],
    products: ["1 Bulan", "3 Bulan", "6 Bulan"],
    accent: "from-rose-500 to-orange-500",
  },
  pdam: {
    title: "PDAM",
    subtitle: "Cek tagihan air sesuai wilayah.",
    inputLabel: "ID Pelanggan",
    placeholder: "Masukkan ID pelanggan",
    icon: Waves,
    providers: ["PDAM Kota", "PDAM Kabupaten", "Perumda Air"],
    products: ["Cek Tagihan", "Bayar Tagihan", "Simpan ID"],
    accent: "from-cyan-500 to-teal-500",
  },
  "gas-pgn": {
    title: "Gas PGN",
    subtitle: "Bayar tagihan gas rumah tangga.",
    inputLabel: "ID Pelanggan",
    placeholder: "Masukkan ID pelanggan",
    icon: Home,
    providers: ["PGN Rumah", "PGN Bisnis", "Gas Pintar"],
    products: ["Cek Tagihan", "Bayar Tagihan", "Riwayat Meter"],
    accent: "from-orange-500 to-amber-500",
  },
  "internet-wifi": {
    title: "Internet & WiFi",
    subtitle: "Bayar internet rumah dan WiFi.",
    inputLabel: "ID Pelanggan",
    placeholder: "Masukkan nomor pelanggan",
    icon: Wifi,
    providers: ["IndiHome", "Iconnet", "Biznet"],
    products: ["Cek Tagihan", "Bayar Bulanan", "Perpanjang Paket"],
    accent: "from-sky-500 to-blue-500",
  },
  "tv-kabel": {
    title: "TV Kabel",
    subtitle: "Bayar langganan TV kabel.",
    inputLabel: "ID Pelanggan",
    placeholder: "Masukkan ID pelanggan",
    icon: Tv,
    providers: ["K-Vision", "Transvision", "MNC Vision"],
    products: ["Paket Dasar", "Paket Sport", "Paket Family"],
    accent: "from-purple-500 to-violet-500",
  },
  "voucher-game": {
    title: "Voucher Game",
    subtitle: "Top up game dan voucher digital.",
    inputLabel: "User ID / Email",
    placeholder: "Masukkan ID game atau email",
    icon: Gamepad2,
    providers: ["Mobile Legends", "Free Fire", "PUBG Mobile"],
    products: ["86 Diamonds", "172 Diamonds", "Weekly Pass"],
    accent: "from-emerald-600 to-lime-500",
  },
  "voucher-digital": {
    title: "Voucher Digital",
    subtitle: "Beli voucher digital favorit.",
    inputLabel: "Email / Nomor HP",
    placeholder: "Masukkan tujuan voucher",
    icon: BadgePercent,
    providers: ["Google Play", "Apple Gift", "Steam Wallet"],
    products: ["Rp 25.000", "Rp 50.000", "Rp 100.000"],
    accent: "from-red-500 to-orange-500",
  },
  "streaming-musik": {
    title: "Streaming & Musik",
    subtitle: "Langganan hiburan digital.",
    inputLabel: "Email / Nomor HP",
    placeholder: "Masukkan akun tujuan",
    icon: MonitorPlay,
    providers: ["Spotify", "Vidio", "Netflix"],
    products: ["7 Hari", "30 Hari", "90 Hari"],
    accent: "from-fuchsia-500 to-pink-500",
  },
  "klinik-kesehatan": {
    title: "Klinik & Kesehatan",
    subtitle: "Pembayaran layanan kesehatan.",
    inputLabel: "Nomor Pasien",
    placeholder: "Masukkan nomor pasien",
    icon: HeartPulse,
    providers: ["Klinik Umum", "Apotek", "Telemedis"],
    products: ["Registrasi", "Tebus Obat", "Konsultasi"],
    accent: "from-rose-500 to-pink-500",
  },
  "uang-sekolah": {
    title: "Uang Sekolah",
    subtitle: "Bayar pendidikan lebih praktis.",
    inputLabel: "NIS / ID Siswa",
    placeholder: "Masukkan nomor siswa",
    icon: GraduationCap,
    providers: ["SD / SMP", "SMA / SMK", "Kampus"],
    products: ["SPP", "Uang Buku", "Daftar Ulang"],
    accent: "from-blue-500 to-indigo-500",
  },
  "cicilan-kendaraan": {
    title: "Cicilan Kendaraan",
    subtitle: "Bayar angsuran kendaraan.",
    inputLabel: "Nomor Kontrak",
    placeholder: "Masukkan nomor kontrak",
    icon: Car,
    providers: ["FIF", "Adira", "WOM Finance"],
    products: ["Cek Tagihan", "Bayar Cicilan", "Denda / Admin"],
    accent: "from-sky-500 to-cyan-500",
  },
  "cicilan-multifinance": {
    title: "Cicilan Multifinance",
    subtitle: "Bayar angsuran multifinance.",
    inputLabel: "Nomor Kontrak",
    placeholder: "Masukkan nomor kontrak",
    icon: CircleDollarSign,
    providers: ["Home Credit", "Kredivo", "Akulaku"],
    products: ["Cek Tagihan", "Bayar Cicilan", "Pelunasan"],
    accent: "from-amber-500 to-yellow-500",
  },
  pbb: {
    title: "PBB",
    subtitle: "Bayar pajak bumi dan bangunan.",
    inputLabel: "NOP",
    placeholder: "Masukkan nomor objek pajak",
    icon: Home,
    providers: ["PBB Kota", "PBB Kabupaten", "Pajak Daerah"],
    products: ["Cek Tagihan", "Bayar Pajak", "Unduh Bukti"],
    accent: "from-violet-500 to-purple-500",
  },
  "pajak-negara": {
    title: "Pajak & Negara",
    subtitle: "Pembayaran administrasi negara.",
    inputLabel: "Kode Billing",
    placeholder: "Masukkan kode billing",
    icon: Landmark,
    providers: ["MPN", "Samsat", "Pajak Daerah"],
    products: ["Cek Billing", "Bayar Billing", "Simpan Bukti"],
    accent: "from-emerald-500 to-teal-500",
  },
  "tiket-perjalanan": {
    title: "Tiket Perjalanan",
    subtitle: "Pembayaran tiket dan perjalanan.",
    inputLabel: "Kode Booking",
    placeholder: "Masukkan kode booking",
    icon: BriefcaseBusiness,
    providers: ["Kereta", "Travel", "Pesawat"],
    products: ["Cek Booking", "Bayar Tiket", "Asuransi Trip"],
    accent: "from-sky-500 to-blue-500",
  },
  "saldo-kartu-tol": {
    title: "Saldo Kartu Tol",
    subtitle: "Top up kartu tol elektronik.",
    inputLabel: "Nomor Kartu",
    placeholder: "Masukkan nomor kartu",
    icon: CreditCard,
    providers: ["E-Toll", "Flazz", "TapCash"],
    products: ["Rp 50.000", "Rp 100.000", "Rp 200.000"],
    accent: "from-emerald-500 to-lime-500",
  },
  "parkir-digital": {
    title: "Parkir Digital",
    subtitle: "Bayar parkir tanpa ribet.",
    inputLabel: "Nomor Kendaraan",
    placeholder: "Contoh: B1234ABC",
    icon: Car,
    providers: ["Parkir Mall", "Parkir Kota", "Langganan"],
    products: ["1 Jam", "3 Jam", "Harian"],
    accent: "from-blue-500 to-cyan-500",
  },
  "kurir-pengiriman": {
    title: "Kurir & Pengiriman",
    subtitle: "Bayar layanan pengiriman.",
    inputLabel: "Nomor Resi",
    placeholder: "Masukkan nomor resi",
    icon: BriefcaseBusiness,
    providers: ["JNE", "J&T", "SiCepat"],
    products: ["Cek Resi", "Bayar Ongkir", "Asuransi Paket"],
    accent: "from-orange-500 to-amber-500",
  },
  "zakat-donasi": {
    title: "Zakat & Donasi",
    subtitle: "Salurkan bantuan secara digital.",
    inputLabel: "Nama Donatur",
    placeholder: "Masukkan nama donatur",
    icon: HandHeart,
    providers: ["Zakat", "Donasi Sosial", "Sedekah"],
    products: ["Rp 25.000", "Rp 50.000", "Rp 100.000"],
    accent: "from-rose-500 to-orange-500",
  },
};

const defaultService: ServiceMeta = {
  title: "Layanan PulsaKilat",
  subtitle: "Isi data tujuan untuk melanjutkan transaksi.",
  inputLabel: "Data Tujuan",
  placeholder: "Masukkan data tujuan",
  icon: WalletCards,
  providers: ["PulsaKilat", "Instan", "Reguler"],
  products: ["Rp 25.000", "Rp 50.000", "Rp 100.000"],
  accent: "from-emerald-600 to-lime-500",
};

function formatSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function productPrice(product: string, index: number) {
  const match = product.match(/Rp\s?([\d.]+)/i);
  if (match?.[1]) return Number(match[1].replace(/\./g, ""));
  const base = [12500, 25000, 50000, 75000, 100000];
  return base[index] || 25000;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function toLocalAppOrder(order: DraftOrder): UserAppOrder {
  const now = new Date().toISOString();
  const subtotal = order.total > 100000 ? order.total - 1500 : order.total - 1000;
  return {
    id: Date.now() * -1,
    invoice_id: order.invoiceId,
    member_id: null,
    member_nama: "PulsaKilat User",
    produk_id: 0,
    produk_sku_snapshot: `LOCAL-${order.service.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`,
    produk_nama_snapshot: `${order.service} - ${order.product}`,
    dest: order.destination,
    qty: 1,
    nominal: subtotal,
    buyer_type: "user",
    harga_dasar: subtotal,
    fee: order.total - subtotal,
    harga_final: order.total,
    status: "pending_payment",
    sn: null,
    dibuat_pada: now,
    diubah_pada: now,
  };
}

function saveLocalOrder(order: DraftOrder) {
  const key = "pulsakilat_local_service_orders";
  const current = JSON.parse(window.localStorage.getItem(key) || "[]") as UserAppOrder[];
  window.localStorage.setItem(key, JSON.stringify([toLocalAppOrder(order), ...current].slice(0, 30)));
}

export function UserUniversalServicePageContent({ serviceSlug }: { serviceSlug: string }) {
  const service = useMemo(() => {
    const meta = serviceMap[serviceSlug] || defaultService;
    return serviceMap[serviceSlug] ? meta : { ...meta, title: formatSlug(serviceSlug) || meta.title };
  }, [serviceSlug]);
  const Icon = service.icon;
  const [destination, setDestination] = useState("");
  const [selectedProvider, setSelectedProvider] = useState(service.providers[0]);
  const [selectedProduct, setSelectedProduct] = useState(service.products[0]);
  const [completedOrder, setCompletedOrder] = useState<DraftOrder | null>(null);

  const selectedProductIndex = Math.max(0, service.products.indexOf(selectedProduct));
  const subtotal = productPrice(selectedProduct, selectedProductIndex);
  const adminFee = subtotal >= 100000 ? 1500 : 1000;
  const total = subtotal + adminFee;
  const canContinue = destination.trim().length >= 3;

  function createOrder() {
    if (!canContinue) return;
    const order: DraftOrder = {
      invoiceId: `PK${Date.now().toString().slice(-9)}`,
      service: service.title,
      destination: destination.trim(),
      provider: selectedProvider,
      product: selectedProduct,
      total,
    };
    saveLocalOrder(order);
    setCompletedOrder(order);
  }

  return (
    <main className="min-h-screen bg-[#eef8f3] pb-24">
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#052e26_0%,#047857_58%,#a3e635_150%)] px-4 pb-9 pt-5 text-white">
        <div className="pointer-events-none absolute -right-14 -top-16 h-44 w-44 rounded-full bg-lime-300/20 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-8 h-36 w-56 rounded-full bg-emerald-300/15 blur-2xl" />
        <div className="relative mx-auto flex w-full max-w-md items-center gap-3">
          <Link href="/user/kategori" className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/12 ring-1 ring-white/15">
            <ArrowLeft className="h-5 w-5" strokeWidth={2.4} />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-black">{service.title}</h1>
            <p className="mt-0.5 truncate text-[11px] font-semibold text-white/75">{service.subtitle}</p>
          </div>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-[#047857] shadow-[0_12px_26px_rgba(0,0,0,0.16)]">
            <Icon className="h-5 w-5" strokeWidth={2.5} />
          </span>
        </div>

        <div className="relative mx-auto mt-5 grid w-full max-w-md grid-cols-3 gap-2">
          {["Data", "Produk", "Bayar"].map((step, index) => (
            <div key={step} className="rounded-2xl bg-white/10 px-3 py-2 ring-1 ring-white/12">
              <p className="text-[10px] font-black text-lime-100">0{index + 1}</p>
              <p className="mt-0.5 text-xs font-black">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto -mt-5 w-full max-w-md space-y-4 px-4">
        {completedOrder ? (
          <section className="overflow-hidden rounded-[30px] border border-emerald-100 bg-white shadow-[0_22px_50px_rgba(6,78,59,0.14)]">
            <div className="bg-[linear-gradient(135deg,#052e26,#047857,#84cc16)] px-5 py-6 text-center text-white">
              <div className="mx-auto grid h-18 w-18 place-items-center rounded-full bg-white text-[#047857] shadow-lg">
                <Check className="h-9 w-9" strokeWidth={3} />
              </div>
              <h2 className="mt-4 text-xl font-black">Transaksi Dibuat</h2>
              <p className="mt-1 text-xs font-semibold text-white/75">Invoice siap dibayar.</p>
            </div>
            <div className="space-y-3 p-5">
              {[
                ["Invoice", completedOrder.invoiceId],
                ["Layanan", completedOrder.service],
                ["Tujuan", completedOrder.destination],
                ["Produk", completedOrder.product],
                ["Total", formatCurrency(completedOrder.total)],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3">
                  <span className="text-[11px] font-bold text-slate-500">{label}</span>
                  <span className="max-w-[190px] truncate text-right text-sm font-black text-slate-950">{value}</span>
                </div>
              ))}
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(completedOrder.invoiceId)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-[18px] border-2 border-[#047857] bg-white text-sm font-black !text-[#047857] shadow-[0_10px_20px_rgba(6,78,59,0.08)]"
                style={{ color: "#047857" }}
              >
                <Copy className="h-4 w-4" />
                Salin Invoice
              </button>
              <Link
                href="/user/transaksi"
                className="flex h-13 w-full items-center justify-center gap-2 rounded-[20px] border-2 border-[#052e26] bg-[linear-gradient(135deg,#064e3b_0%,#047857_72%,#55c72f_145%)] text-sm font-black !text-white shadow-[0_14px_28px_rgba(6,78,59,0.20)]"
                style={{ color: "#ffffff" }}
              >
                <span className="!text-white" style={{ color: "#ffffff" }}>Lihat Riwayat</span>
                <ChevronRight className="h-4 w-4 !text-white" strokeWidth={2.6} />
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section className="rounded-[28px] border border-emerald-950/5 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.10)]">
              <div className="mb-3 flex items-center gap-3">
                <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${service.accent} text-white shadow-[0_14px_28px_rgba(6,78,59,0.16)]`}>
                  <Icon className="h-6 w-6" strokeWidth={2.5} />
                </span>
                <div>
                  <p className="text-sm font-black text-slate-950">{service.inputLabel}</p>
                  <p className="text-[11px] font-semibold text-slate-400">Pastikan data tujuan sudah benar.</p>
                </div>
              </div>
              <div className="flex h-14 overflow-hidden rounded-[20px] border border-emerald-200 bg-[#fbfffd] focus-within:border-[#047857] focus-within:ring-4 focus-within:ring-emerald-100">
                <span className="grid w-14 shrink-0 place-items-center border-r border-emerald-100 text-[#047857]">
                  ID
                </span>
                <input
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  placeholder={service.placeholder}
                  className="min-w-0 flex-1 bg-transparent px-4 text-sm font-black text-slate-950 outline-none placeholder:text-slate-400"
                />
              </div>
            </section>

            <section className="rounded-[28px] border border-emerald-950/5 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.10)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-black text-slate-950">Pilih Penyedia</h2>
                <span className="rounded-full bg-lime-100 px-3 py-1 text-[10px] font-black text-[#047857]">Tersedia</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {service.providers.map((provider) => {
                  const active = selectedProvider === provider;
                  return (
                    <button
                      key={provider}
                      type="button"
                      onClick={() => setSelectedProvider(provider)}
                      className={
                        active
                          ? "relative min-h-[104px] rounded-[24px] border border-[#047857] bg-emerald-50 p-2.5 text-center shadow-[0_16px_30px_rgba(4,120,87,0.15)]"
                          : "min-h-[104px] rounded-[24px] border border-slate-200 bg-white p-2.5 text-center shadow-[0_10px_22px_rgba(15,23,42,0.04)] transition hover:border-emerald-200"
                      }
                    >
                      {active ? <CheckCircle2 className="absolute right-2 top-2 h-4 w-4 text-[#047857]" /> : null}
                      <span className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${service.accent} text-white`}>
                        <Icon className="h-5 w-5" strokeWidth={2.4} />
                      </span>
                      <span className="mt-2 line-clamp-2 block text-[10px] font-black leading-tight text-slate-950">{provider}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[28px] border border-emerald-950/5 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.10)]">
              <h2 className="text-base font-black text-slate-950">Pilih Produk</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {service.products.map((product, index) => {
                  const active = selectedProduct === product;
                  return (
                    <button
                      key={product}
                      type="button"
                      onClick={() => setSelectedProduct(product)}
                      className={
                        active
                          ? "relative overflow-hidden rounded-[22px] border border-[#047857] bg-[#ecfdf5] px-3 py-4 text-left shadow-[0_14px_26px_rgba(4,120,87,0.13)]"
                          : "rounded-[22px] border border-slate-200 bg-white px-3 py-4 text-left shadow-sm"
                      }
                    >
                      {active ? <Sparkles className="absolute right-3 top-3 h-4 w-4 text-[#047857]" /> : null}
                      <span className="block pr-5 text-sm font-black text-slate-950">{product}</span>
                      <span className="mt-2 block text-xs font-black text-[#047857]">{formatCurrency(productPrice(product, index))}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[28px] border border-emerald-950/5 bg-white p-4 shadow-[0_18px_42px_rgba(6,78,59,0.10)]">
              <h2 className="text-base font-black text-slate-950">Ringkasan</h2>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-500">Produk</span>
                  <span className="font-black text-slate-950">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-500">Biaya admin</span>
                  <span className="font-black text-slate-950">{formatCurrency(adminFee)}</span>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="flex justify-between">
                  <span className="text-sm font-black text-slate-950">Total bayar</span>
                  <span className="text-lg font-black text-[#047857]">{formatCurrency(total)}</span>
                </div>
              </div>
            </section>

            <button
              type="button"
              disabled={!canContinue}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-[22px] bg-[linear-gradient(135deg,#052e26,#047857,#84cc16)] text-sm font-black text-white shadow-[0_18px_34px_rgba(4,120,87,0.22)] transition hover:brightness-105 disabled:bg-none disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              onClick={createOrder}
            >
              Buat Transaksi
              <ChevronRight className="h-4 w-4" strokeWidth={2.6} />
            </button>
          </>
        )}
      </div>
    </main>
  );
}
