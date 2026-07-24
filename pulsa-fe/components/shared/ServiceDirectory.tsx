"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BadgePercent,
  BookOpen,
  BriefcaseBusiness,
  Car,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Gamepad2,
  GraduationCap,
  HandHeart,
  HeartPulse,
  Home,
  Landmark,
  MonitorPlay,
  Plane,
  QrCode,
  ReceiptText,
  Search,
  ShieldCheck,
  Smartphone,
  Tv,
  WalletCards,
  Waves,
  Wifi,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type DirectoryMode = "guest" | "user";

type ServiceItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  tone: string;
};

type ServiceGroup = {
  id: string;
  title: string;
  eyebrow: string;
  items: ServiceItem[];
};

type ServiceDirectoryProps = {
  mode?: DirectoryMode;
  role?: string | null;
};

const guestPath = {
  pulsaData: "/pulsa-data",
  pulsa: "/pulsa",
  paketData: "/paket-data",
  ewallet: "/ewallet",
  transferBank: "/kategori?layanan=transfer-bank",
  game: "/game",
  pln: "/listrik",
  tokenPln: "/listrik/token",
  pdam: "/pdam",
  pgn: "/pgn",
  bpjs: "/bpjs",
  tv: "/tv",
  internet: "/internet-pascabayar",
  hpPascabayar: "/hp-pascabayar",
};

const userPath = {
  pulsaData: "/user/pulsa-data",
  pulsa: "/user/pulsa",
  paketData: "/user/paket-data",
  ewallet: "/user/ewallet",
  transferBank: "/user/transfer-bank",
  game: "/user/kategori?layanan=voucher-game",
  pln: "/user/listrik",
  tokenPln: "/user/listrik/token",
  pdam: "/user/kategori?layanan=pdam",
  pgn: "/user/kategori?layanan=gas-pgn",
  bpjs: "/user/kategori?layanan=bpjs",
  tv: "/user/kategori?layanan=tv-kabel",
  internet: "/user/kategori?layanan=internet-wifi",
  hpPascabayar: "/user/kategori?layanan=hp-pascabayar",
};

function fallbackPath(mode: DirectoryMode, slug: string) {
  return mode === "user" ? `/user/kategori?layanan=${slug}` : `/kategori?layanan=${slug}`;
}

function getGroups(mode: DirectoryMode, role?: string | null): ServiceGroup[] {
  const path = mode === "user" ? userPath : guestPath;
  const normalizedRole = String(role || "").trim().toLowerCase();
  const canUseAgentCredit = mode === "user" && (normalizedRole === "agent" || normalizedRole === "master");

  return [
    {
      id: "komunikasi",
      title: "Komunikasi",
      eyebrow: "Kebutuhan nomor",
      items: [
        { label: "Pulsa", href: path.pulsaData, icon: Smartphone, tone: "from-[#052e26] via-[#047857] to-[#a3e635]" },
        { label: "Paket Data", href: path.pulsaData, icon: Wifi, tone: "from-[#052e26] via-[#047857] to-[#a3e635]" },
        { label: "HP Pascabayar", href: path.hpPascabayar, icon: ReceiptText, tone: "from-sky-500 to-cyan-400" },
        { label: "eSIM & Roaming", href: fallbackPath(mode, "esim-roaming"), icon: Smartphone, tone: "from-violet-500 to-indigo-400" },
      ],
    },
    {
      id: "keuangan",
      title: "Keuangan",
      eyebrow: "Saldo & pembayaran",
      items: [
        { label: "E-Wallet", href: path.ewallet, icon: WalletCards, tone: "from-emerald-500 to-lime-400" },
        { label: "Transfer Bank", href: mode === "user" ? path.transferBank : fallbackPath(mode, "transfer-bank"), icon: Landmark, tone: "from-blue-500 to-cyan-400" },
        { label: "Pembayaran QRIS", href: fallbackPath(mode, "qris"), icon: QrCode, tone: "from-purple-500 to-fuchsia-400" },
        { label: "Uang Elektronik", href: fallbackPath(mode, "uang-elektronik"), icon: CreditCard, tone: "from-indigo-500 to-blue-400" },
        ...(canUseAgentCredit ? [{ label: "Kredit Saldo Agent", href: "/user/saldo/kredit-agent", icon: BadgePercent, tone: "from-amber-500 to-yellow-400" }] : []),
        { label: "Kartu Kredit", href: fallbackPath(mode, "kartu-kredit"), icon: CreditCard, tone: "from-violet-500 to-indigo-400" },
        { label: "Asuransi", href: fallbackPath(mode, "asuransi"), icon: ShieldCheck, tone: "from-green-500 to-emerald-400" },
      ],
    },
    {
      id: "tagihan",
      title: "Tagihan",
      eyebrow: "Bayar rutin",
      items: [
        { label: "BPJS", href: path.bpjs, icon: HeartPulse, tone: "from-rose-500 to-orange-400" },
      ],
    },
    {
      id: "rumah",
      title: "Rumah Tangga",
      eyebrow: "Kebutuhan rumah",
      items: [
        { label: "Token PLN", href: path.tokenPln, icon: Zap, tone: "from-lime-400 to-emerald-500" },
        { label: "PDAM", href: path.pdam, icon: Waves, tone: "from-cyan-500 to-teal-400" },
        { label: "Gas PGN", href: path.pgn, icon: Home, tone: "from-orange-500 to-amber-400" },
        { label: "Internet & WiFi", href: path.internet, icon: Wifi, tone: "from-sky-500 to-blue-400" },
      ],
    },
    {
      id: "hiburan",
      title: "Hiburan",
      eyebrow: "Digital fun",
      items: [
        { label: "TV Kabel", href: path.tv, icon: Tv, tone: "from-purple-500 to-violet-400" },
        { label: "Voucher Game", href: path.game, icon: Gamepad2, tone: "from-[#052e26] via-[#047857] to-[#a3e635]" },
        { label: "Voucher Digital", href: fallbackPath(mode, "voucher-digital"), icon: BadgePercent, tone: "from-red-500 to-orange-400" },
        { label: "Streaming & Musik", href: fallbackPath(mode, "streaming-musik"), icon: MonitorPlay, tone: "from-fuchsia-500 to-pink-400" },
      ],
    },
    {
      id: "kesehatan",
      title: "Kesehatan",
      eyebrow: "Layanan sehat",
      items: [
        { label: "Klinik & Kesehatan", href: fallbackPath(mode, "klinik-kesehatan"), icon: HeartPulse, tone: "from-rose-500 to-pink-400" },
      ],
    },
    {
      id: "pendidikan",
      title: "Pendidikan",
      eyebrow: "Biaya sekolah",
      items: [
        { label: "Uang Sekolah", href: fallbackPath(mode, "uang-sekolah"), icon: GraduationCap, tone: "from-blue-500 to-indigo-400" },
      ],
    },
    {
      id: "cicilan",
      title: "Cicilan",
      eyebrow: "Bayar angsuran",
      items: [
        { label: "Cicilan Kendaraan", href: fallbackPath(mode, "cicilan-kendaraan"), icon: Car, tone: "from-sky-500 to-cyan-400" },
        { label: "Cicilan Multifinance", href: fallbackPath(mode, "cicilan-multifinance"), icon: CircleDollarSign, tone: "from-amber-500 to-yellow-400" },
      ],
    },
    {
      id: "pajak",
      title: "Pajak",
      eyebrow: "Kewajiban resmi",
      items: [
        { label: "PBB", href: fallbackPath(mode, "pbb"), icon: Home, tone: "from-violet-500 to-purple-400" },
        { label: "Pajak & Negara", href: fallbackPath(mode, "pajak-negara"), icon: Landmark, tone: "from-emerald-500 to-teal-400" },
      ],
    },
    {
      id: "perjalanan",
      title: "Perjalanan",
      eyebrow: "Mobilitas",
      items: [
        { label: "Tiket Perjalanan", href: fallbackPath(mode, "tiket-perjalanan"), icon: Plane, tone: "from-sky-500 to-blue-400" },
        { label: "Saldo Kartu Tol", href: fallbackPath(mode, "saldo-kartu-tol"), icon: CreditCard, tone: "from-emerald-500 to-lime-400" },
        { label: "Parkir Digital", href: fallbackPath(mode, "parkir-digital"), icon: Car, tone: "from-blue-500 to-cyan-400" },
        { label: "Kurir & Pengiriman", href: fallbackPath(mode, "kurir-pengiriman"), icon: BriefcaseBusiness, tone: "from-orange-500 to-amber-400" },
      ],
    },
    {
      id: "sosial",
      title: "Sosial",
      eyebrow: "Berbagi",
      items: [
        { label: "Zakat & Donasi", href: fallbackPath(mode, "zakat-donasi"), icon: HandHeart, tone: "from-rose-500 to-orange-400" },
      ],
    },
  ];
}

export function ServiceDirectory({ mode = "guest", role }: ServiceDirectoryProps) {
  const groups = useMemo(() => getGroups(mode, role), [mode, role]);
  const [activeGroup, setActiveGroup] = useState("semua");
  const [query, setQuery] = useState("");

  const normalizedQuery = query.trim().toLowerCase();
  const filteredGroups = groups
    .filter((group) => activeGroup === "semua" || group.id === activeGroup)
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.label.toLowerCase().includes(normalizedQuery)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <section className="space-y-3 pb-24">
      <div className="sticky top-0 z-20 -mx-4 bg-[#f7fbf8]/92 px-4 pb-3 pt-3 backdrop-blur-xl">
        <label className="flex h-13 items-center gap-3 rounded-[22px] border border-emerald-950/10 bg-white px-4 shadow-[0_12px_30px_rgba(6,78,59,0.08)]">
          <Search className="h-5 w-5 shrink-0 text-[#047857]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari pulsa, tagihan, voucher..."
            className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400"
          />
        </label>

        <div className="-mx-4 mt-3 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-2">
            <button
              type="button"
              onClick={() => setActiveGroup("semua")}
              className={cn(
                "h-9 rounded-full px-4 text-xs font-black transition",
                activeGroup === "semua"
                  ? "bg-[#052e26] text-white shadow-[0_10px_20px_rgba(5,46,38,0.22)]"
                  : "border border-emerald-950/10 bg-white text-slate-600"
              )}
            >
              Semua
            </button>
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setActiveGroup(group.id)}
                className={cn(
                  "h-9 rounded-full px-4 text-xs font-black transition",
                  activeGroup === group.id
                    ? "bg-[#052e26] text-white shadow-[0_10px_20px_rgba(5,46,38,0.22)]"
                    : "border border-emerald-950/10 bg-white text-slate-600"
                )}
              >
                {group.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-lime-200/70 bg-linear-to-r from-[#fff8e7] via-white to-[#f3fce7] px-4 py-3 shadow-[0_12px_28px_rgba(6,78,59,0.08)]">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-orange-100 text-orange-500">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-black text-[#052e26]">Transaksi makin praktis</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">Pilih layanan, isi data, lalu selesaikan pembayaran.</p>
          </div>
        </div>
      </div>

      {filteredGroups.length > 0 ? (
        filteredGroups.map((group) => (
          <div
            key={group.id}
            className="overflow-hidden rounded-[26px] border border-emerald-950/[0.08] bg-white p-4 shadow-[0_14px_34px_rgba(6,78,59,0.08)]"
          >
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-[17px] font-black tracking-tight text-slate-950">{group.title}</h2>
              <span className="rounded-full bg-lime-100 px-2 py-1 text-[10px] font-black text-[#047857]">
                {group.items.length} layanan
              </span>
            </div>

            <div className="grid grid-cols-4 gap-x-2 gap-y-5">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={`${group.id}-${item.label}`}
                    href={item.href}
                    prefetch={false}
                    className="group flex min-h-[82px] flex-col items-center justify-start gap-2 text-center"
                  >
                    <span className="relative grid h-13 w-13 place-items-center overflow-hidden rounded-[20px] bg-linear-to-br from-[#052e26] via-[#047857] to-[#a3e635] text-white shadow-[0_12px_24px_rgba(6,78,59,0.18)] ring-1 ring-white/70 transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_16px_30px_rgba(6,78,59,0.24)]">
                      <span className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.34),transparent_34%)]" />
                      <span className="absolute -bottom-5 -right-4 h-10 w-10 rounded-full bg-lime-200/28 blur-md" />
                      <Icon className="relative h-6 w-6 drop-shadow" strokeWidth={2.35} />
                    </span>
                    <span className="line-clamp-2 max-w-[76px] text-[10px] font-black leading-tight text-slate-950">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-[26px] border border-dashed border-emerald-200 bg-white p-8 text-center shadow-[0_14px_34px_rgba(6,78,59,0.08)]">
          <BookOpen className="mx-auto h-8 w-8 text-[#047857]" />
          <p className="mt-3 text-sm font-black text-slate-900">Layanan tidak ditemukan</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">Coba kata kunci yang lebih singkat.</p>
        </div>
      )}

      <Link
        href={mode === "user" ? "/user" : "/"}
        prefetch={false}
        className="group flex items-center justify-between rounded-[24px] bg-[#052e26] px-4 py-4 text-white shadow-[0_16px_34px_rgba(5,46,38,0.22)]"
      >
        <span>
          <span className="block text-sm font-black">Kembali ke beranda</span>
          <span className="mt-0.5 block text-xs font-semibold text-white/65">Lihat promo dan produk utama.</span>
        </span>
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-lime-300 text-[#052e26] transition group-hover:translate-x-0.5">
          <ChevronRight className="h-5 w-5" strokeWidth={2.6} />
        </span>
      </Link>
    </section>
  );
}
