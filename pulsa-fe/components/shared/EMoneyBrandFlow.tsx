"use client";

import * as React from "react";
import Image from "next/image";
import { Wallet } from "lucide-react";
import { UserProductGrid } from "@/components/user/UserProductGrid";
import type { UserProductItem } from "@/components/user/types";
import { getBrandLogo } from "@/lib/brand-logos";

type EMoneyBrandFlowProps = {
  items: UserProductItem[];
  isLoggedIn: boolean;
  authToken?: string;
  mode: "guest" | "user";
  buyerRole?: string;
  initialDest?: string;
};

type EMoneyBucket = {
  key: string;
  label: string;
  items: UserProductItem[];
};

const SUBCATEGORY_PRIORITY = [
  "NON ADMIN DIRECT",
  "NON ADMIN",
  "DIRECT",
  "REGULER",
  "DRIVER",
  "PROMO",
  "ADMIN",
  "LAINNYA",
  "BEBAS NOMINAL",
] as const;

function formatBucketLabel(key: string) {
  return key.replace(/\s+/g, " ").trim();
}

function isCheckAccountProduct(item: UserProductItem) {
  const upperName = String(item.nama || "").toUpperCase();
  const upperSku = String(item.sku || "").toUpperCase();
  return upperSku.startsWith("CEK") || upperName.includes("CEK NAMA AKUN") || upperName.includes("CEK AKUN");
}

function extractNominalSortValue(item: UserProductItem) {
  const upper = String(item.nama || "").toUpperCase();
  const dotted = upper.match(/(\d{1,3}(?:\.\d{3})+)/);
  if (dotted) {
    return Number.parseInt(dotted[1].replaceAll(".", ""), 10);
  }

  const compact = upper.match(/(\d+)\s*K\b/);
  if (compact) {
    return Number.parseInt(compact[1], 10) * 1000;
  }

  return Number(item.nominal || item.harga_dasar_app || 0);
}

function classifyEMoneySubcategory(item: UserProductItem) {
  const backendGroup = String(item.group_name || "").trim();
  if (backendGroup) {
    return backendGroup;
  }

  const upper = String(item.nama || "").toUpperCase();

  if (item.tipe_harga === "OPEN_AMOUNT" || upper.includes("BEBAS NOMINAL")) {
    return "BEBAS NOMINAL";
  }
  if (upper.includes("NON ADMIN") && upper.includes("DIRECT")) {
    return "NON ADMIN DIRECT";
  }
  if (upper.includes("NON ADMIN")) {
    return "NON ADMIN";
  }
  if (upper.includes("DIRECT")) {
    return "DIRECT";
  }
  if (upper.includes("DRIVER")) {
    return "DRIVER";
  }
  if (upper.includes("PROMO")) {
    return "PROMO";
  }
  if (upper.includes("ADMIN")) {
    return "ADMIN";
  }
  return "REGULER";
}

function sortBuckets(a: EMoneyBucket, b: EMoneyBucket) {
  const aIsOpenAmount = a.key.toUpperCase().includes("BEBAS NOMINAL");
  const bIsOpenAmount = b.key.toUpperCase().includes("BEBAS NOMINAL");
  if (aIsOpenAmount !== bIsOpenAmount) {
    return aIsOpenAmount ? 1 : -1;
  }

  const aIndex = SUBCATEGORY_PRIORITY.indexOf(a.key as (typeof SUBCATEGORY_PRIORITY)[number]);
  const bIndex = SUBCATEGORY_PRIORITY.indexOf(b.key as (typeof SUBCATEGORY_PRIORITY)[number]);
  const aRank = aIndex === -1 ? SUBCATEGORY_PRIORITY.length : aIndex;
  const bRank = bIndex === -1 ? SUBCATEGORY_PRIORITY.length : bIndex;
  if (aRank !== bRank) return aRank - bRank;
  return a.label.localeCompare(b.label);
}

function buildBuckets(items: UserProductItem[]) {
  const visibleItems = items.filter((item) => !isCheckAccountProduct(item));
  const buckets = new Map<string, UserProductItem[]>();

  for (const item of visibleItems) {
    const key = classifyEMoneySubcategory(item);
    const current = buckets.get(key) ?? [];
    current.push(item);
    buckets.set(key, current);
  }

  return Array.from(buckets.entries())
    .map(([key, bucketItems]) => ({
      key,
      label: formatBucketLabel(key),
      items: [...bucketItems].sort((a, b) => {
        if (a.tipe_harga !== b.tipe_harga) return a.tipe_harga === "FIXED" ? -1 : 1;
        const nominalDiff = extractNominalSortValue(a) - extractNominalSortValue(b);
        if (nominalDiff !== 0) return nominalDiff;
        return a.nama.localeCompare(b.nama);
      }),
    }))
    .sort(sortBuckets);
}

export function EMoneyBrandFlow({ items, isLoggedIn, authToken, buyerRole, initialDest = "" }: EMoneyBrandFlowProps) {
  const buckets = React.useMemo(() => buildBuckets(items), [items]);
  const defaultBucketKey = React.useMemo(
    () => buckets.find((bucket) => bucket.key !== "BEBAS NOMINAL")?.key ?? buckets[0]?.key ?? "",
    [buckets],
  );
  const [selectedKey, setSelectedKey] = React.useState<string>(defaultBucketKey);

  React.useEffect(() => {
    const hasSelected = buckets.some((bucket) => bucket.key === selectedKey);
    if (!hasSelected) {
      setSelectedKey(defaultBucketKey);
    }
  }, [buckets, defaultBucketKey, selectedKey]);

  const selectedBucket = buckets.find((bucket) => bucket.key === selectedKey) ?? buckets[0] ?? null;
  const brandName = String(items[0]?.brand_nama || "").trim();
  const brandLogo = brandName ? getBrandLogo(brandName) : null;

  if (!selectedBucket) {
    return (
      <div className="grid min-h-40 place-items-center rounded-3xl border border-dashed border-slate-200 bg-white px-4 text-center text-sm text-slate-500 shadow-[0_8px_22px_rgba(15,23,42,0.13)]">
        Belum ada produk aktif untuk brand ini.
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-2">
      {brandName ? (
        <section className="rounded-md bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.10)]">
          {brandLogo?.src ? (
            <Image
              src={brandLogo.src}
              alt={brandLogo.alt || brandName}
              width={160}
              height={56}
              className="mx-auto h-10 w-auto object-contain"
            />
          ) : (
            <div className="text-center text-lg font-bold text-slate-900">{brandName}</div>
          )}
        </section>
      ) : null}

      {buckets.length > 1 ? (
        <div className="mb-3 flex snap-x snap-mandatory gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {buckets.map((bucket) => {
            const active = bucket.key === selectedBucket.key;
            return (
              <button
                key={bucket.key}
                type="button"
                onClick={() => setSelectedKey(bucket.key)}
                className={`shrink-0 snap-start whitespace-nowrap rounded-full px-2.5 py-2 text-[10px] font-semibold leading-tight transition ${
                  active
                    ? "bg-sky-600 text-white shadow-[0_8px_18px_rgba(15,111,203,0.22)]"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {bucket.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <UserProductGrid
        items={selectedBucket.items}
        isLoggedIn={isLoggedIn}
        authToken={authToken}
        buyerRole={buyerRole}
        initialDest={initialDest}
        enableGuestHint={false}
        icon={Wallet}
      />
    </div>
  );
}
