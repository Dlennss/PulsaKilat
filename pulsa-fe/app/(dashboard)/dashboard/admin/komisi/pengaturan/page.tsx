import Link from "next/link";

const cards = [
  {
    title: "Komisi Retail",
    description:
      "Atur komisi flat per transaksi untuk akun retail ber-role agent dan master. Pengaturan dilakukan per akun.",
    href: "/dashboard/admin/master/members?scope=retail&panel=commission",
  },
  {
    title: "Komisi H2H",
    description:
      "Atur komisi flat per transaksi untuk akun H2H ber-role agent member dan master member. Pengaturan dilakukan per akun.",
    href: "/dashboard/admin/master/members?scope=h2h&panel=commission",
  },
];

export default function AdminCommissionSettingsPage() {
  return (
    <div className="space-y-6 p-2">
      <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-[0_18px_44px_-28px_rgba(250,204,21,0.35)]">
        <h1 className="text-xl font-semibold text-white">Pengaturan Komisi</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-300">
          Pilih domain bisnis lebih dulu, lalu buka daftar akun untuk mengatur komisi flat per transaksi pada akun agent atau master yang sesuai.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {cards.map((card) => (
          <section
            key={card.title}
            className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-[0_18px_44px_-28px_rgba(34,211,238,0.28)]"
          >
            <h2 className="text-lg font-semibold text-white">{card.title}</h2>
            <p className="mt-2 text-sm text-slate-300">{card.description}</p>
            <div className="mt-5">
              <Link
                href={card.href}
                className="inline-flex h-11 items-center rounded-xl bg-linear-to-r from-amber-500 to-orange-500 px-4 text-sm font-semibold text-slate-950 shadow-[0_12px_26px_-14px_rgba(251,191,36,0.8)] hover:from-amber-400 hover:to-orange-400"
              >
                Buka {card.title}
              </Link>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
