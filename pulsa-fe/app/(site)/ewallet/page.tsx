import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth";
import { getBrandsByKategori, getCategories } from "@/lib/api.products";
import type { UserBrandItem, UserCategoryItem, UserSession } from "@/components/user/types";
import { GuestBottomNav } from "@/components/guest/GuestBottomNav";
import { getDedicatedGuestBrandPath } from "@/lib/dedicated-category-brand-routes";
import { buildBreadcrumbJsonLd, buildCollectionJsonLd, buildPageMetadata } from "@/lib/site-search";
import { EwalletProviderPicker } from "@/components/site/EwalletProviderPicker";

type SessionShape = {
  user?: UserSession;
  backendToken?: string;
};

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function pickCategory(categories: UserCategoryItem[], keyword: string) {
  return categories.find((item) => item.aktif && normalizeName(item.nama).includes(keyword));
}

function pickEwalletCategory(categories: UserCategoryItem[]) {
  return pickCategory(categories, "e-wallet") ?? pickCategory(categories, "e-money");
}

function pickBrand(brands: UserBrandItem[], patterns: string[]) {
  return brands.find((brand) => {
    const normalized = normalizeName(brand.nama);
    return patterns.some((pattern) => normalized.includes(pattern));
  }) ?? null;
}

function getEwalletImageSrc(key: string) {
  switch (key) {
    case "dana":
      return "/images/ewallet/logo_dana.png";
    case "gopay":
      return "/images/ewallet/logo_gopay.png";
    case "shopeepay":
      return "/images/ewallet/logo_shopee.png";
    case "linkaja":
      return "/images/ewallet/logo_linkaja.png";
    case "ovo":
      return "/images/ewallet/logo_ovo.png";
    case "astrapay":
      return "/images/ewallet/logo_astrapay.svg";
    case "isaku":
      return "/images/ewallet/logo_isaku.svg";
    default:
      return "";
  }
}

function getEwalletAccent(key: string) {
  switch (key) {
    case "dana":
      return "from-sky-500 to-blue-700";
    case "gopay":
      return "from-cyan-400 to-sky-600";
    case "ovo":
      return "from-violet-500 to-purple-800";
    case "shopeepay":
      return "from-orange-400 to-red-500";
    case "linkaja":
      return "from-red-500 to-rose-700";
    case "astrapay":
      return "from-blue-500 to-indigo-700";
    case "isaku":
      return "from-rose-500 to-red-700";
    default:
      return "from-emerald-500 to-lime-500";
  }
}

export const metadata: Metadata = buildPageMetadata({
  title: "Top Up E-Wallet | PulsaKilat",
  description: "Top up DANA, OVO, GoPay, LinkAja, dan ShopeePay di PulsaKilat dengan nominal tetap maupun bebas nominal.",
  path: "/ewallet",
  keywords: ["top up dana", "top up ovo", "top up gopay", "top up linkaja", "ewallet pulsakilat"],
});

export default async function GuestEwalletPage() {
  const session = (await getServerSession(authOptions)) as SessionShape | null;
  const categories = (await getCategories()) as UserCategoryItem[];
  const ewalletCategory = pickEwalletCategory(categories);
  const brands = ewalletCategory ? await getBrandsByKategori(String(ewalletCategory.id)) : [];

  const cards = [
    { key: "dana", title: "DANA", brand: pickBrand(brands, ["dana"]) },
    { key: "gopay", title: "GoPay", brand: pickBrand(brands, ["gopay", "go pay"]) },
    { key: "ovo", title: "OVO", brand: pickBrand(brands, ["ovo"]) },
    { key: "shopeepay", title: "ShopeePay", brand: pickBrand(brands, ["shopeepay", "shopee pay"]) },
    { key: "linkaja", title: "LinkAja", brand: pickBrand(brands, ["linkaja", "link aja"]) },
    { key: "astrapay", title: "AstraPay", brand: pickBrand(brands, ["astrapay", "astra pay"]) },
    { key: "isaku", title: "i.saku", brand: pickBrand(brands, ["i.saku", "isaku"]) },
  ].filter((item) => item.brand) as Array<{
    key: string;
    title: string;
    brand: UserBrandItem;
  }>;
  const pickerItems = cards.map((card) => ({
    key: card.key,
    title: card.title,
    href: getDedicatedGuestBrandPath(String(ewalletCategory?.id ?? 2), card.brand) || `/kategori/${ewalletCategory?.id ?? 2}/brand/${card.brand.id}?name=${encodeURIComponent(card.brand.nama)}`,
    imageSrc: getEwalletImageSrc(card.key),
    accent: getEwalletAccent(card.key),
  }));
  const collectionJsonLd = buildCollectionJsonLd({
    title: "Top Up E-Wallet | PulsaKilat",
    description: "Top up DANA, OVO, GoPay, LinkAja, dan ShopeePay di PulsaKilat dengan nominal tetap maupun bebas nominal.",
    path: "/ewallet",
    itemNames: cards.map((item) => item.title),
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Beranda", path: "/" },
    { name: "E-Wallet", path: "/ewallet" },
  ]);

  return (
    <main className="bg-sky-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div className="space-y-4 px-4 pt-4">
        {!ewalletCategory ? (
          <section className="grid min-h-40 place-items-center rounded-md border border-dashed border-slate-200 bg-white px-4 text-center text-sm text-slate-500 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
            Kategori e-wallet belum tersedia.
          </section>
        ) : cards.length === 0 ? (
          <section className="grid min-h-40 place-items-center rounded-md border border-dashed border-slate-200 bg-white px-4 text-center text-sm text-slate-500 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
            Provider e-wallet belum tersedia.
          </section>
        ) : (
          <EwalletProviderPicker items={pickerItems} />
        )}
      </div>

      <GuestBottomNav isLoggedIn={!!session?.backendToken} />
    </main>
  );
}
