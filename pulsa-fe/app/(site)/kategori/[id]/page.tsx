import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth";
import { getBrandsByKategori, getCategories } from "@/lib/api.products";
import type { UserCategoryItem, UserSession } from "@/components/user/types";
import { getBrandLogo } from "@/lib/brand-logos";
import { GuestBottomNav } from "@/components/guest/GuestBottomNav";
import { GuestPulsaQuickOrder } from "@/components/guest/GuestPulsaQuickOrder";
import { redirect } from "next/navigation";
import { getGuestCategoryPathById } from "@/lib/category-routes";
import { buildBreadcrumbJsonLd, buildCollectionJsonLd, buildPageMetadata } from "@/lib/site-search";

type SessionShape = {
  user?: UserSession;
  backendToken?: string;
};

type PageProps = {
  params: { id: string };
};

function findCategory(categories: UserCategoryItem[], id: string) {
  return categories.find((item) => String(item.id) === String(id));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await Promise.resolve(params);
  const categories = (await getCategories()) as UserCategoryItem[];
  const category = findCategory(categories, id);
  if (!category) {
    return buildPageMetadata({
      title: "Kategori Produk | PulsaKilat",
      description: "Lihat kategori produk PulsaKilat.",
      path: "/kategori",
    });
  }

  return buildPageMetadata({
    title: `${category.nama} | PulsaKilat`,
    description: `Lihat pilihan brand dan produk ${category.nama} di PulsaKilat.`,
    path: `/kategori/${id}`,
    keywords: [String(category.nama).toLowerCase(), "produk pulsakilat", "pulsakilat"],
  });
}

export default async function GuestKategoriPage({ params }: PageProps) {
  const session = (await getServerSession(authOptions)) as SessionShape | null;
  const [{ id }] = await Promise.all([params]);
  const categories = (await getCategories()) as UserCategoryItem[];
  const category = findCategory(categories, id);
  const dedicatedPath = getGuestCategoryPathById(String(id));
  if (dedicatedPath) {
    redirect(dedicatedPath);
  }
  const brands = await getBrandsByKategori(id);
  const categoryName = category?.nama || `Kategori ${id}`;
  const collectionJsonLd = buildCollectionJsonLd({
    title: `${categoryName} | PulsaKilat`,
    description: `Lihat pilihan brand dan produk ${categoryName} di PulsaKilat.`,
    path: `/kategori/${id}`,
    itemNames: brands.map((brand) => brand.nama),
  });
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "Beranda", path: "/" },
    { name: "Kategori", path: "/kategori" },
    { name: categoryName, path: `/kategori/${id}` },
  ]);

  return (
    <main className="bg-sky-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div className="space-y-4 px-4 pt-4">
        {String(id) === "1" ? (
          <GuestPulsaQuickOrder
            kategoriId={String(id)}
            brands={brands}
            authToken={session?.backendToken}
            buyerRole={session?.user?.role}
          />
        ) : null}

        {String(id) !== "1" ? (
          <section>
            {brands.length === 0 ? (
              <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm text-slate-500">
                Belum ada brand aktif untuk kategori ini.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4">
                {brands.map((brand) => {
                  const logo = getBrandLogo(brand.nama);
                  return (
                    <Link
                      key={brand.id}
                      href={`/kategori/${id}/brand/${brand.id}?name=${brand.nama}`}
                      aria-label={brand.nama}
                      className="group flex flex-col items-center gap-2 text-center transition-transform duration-200 hover:-translate-y-1"
                    >
                      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-[1.4rem] bg-transparent">
                        {logo ? (
                          <Image
                            src={logo.src}
                            alt={logo.alt}
                            title={logo.alt}
                            width={56}
                            height={56}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-base font-black uppercase tracking-tight text-sky-700">
                            {brand.nama.slice(0, 2)}
                          </span>
                        )}
                      </div>
                      <span className="line-clamp-2 text-xs font-semibold leading-tight text-slate-700">
                        {brand.nama}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        ) : null}
      </div>

      <GuestBottomNav isLoggedIn={!!session?.backendToken} />
    </main>
  );
}
