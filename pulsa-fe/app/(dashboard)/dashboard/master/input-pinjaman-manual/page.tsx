import { MarketingAgentCreditCreateForm } from "@/components/dashboard/MarketingAgentCreditCreateForm";

export default function InputPinjamanManualPage() {
  return (
    <main className="-m-2 min-h-screen bg-[#eef7f2] p-3 text-slate-950 sm:p-5 lg:p-7">
      <section className="mx-auto w-full max-w-7xl">
        <MarketingAgentCreditCreateForm defaultOpen />
      </section>
    </main>
  );
}
