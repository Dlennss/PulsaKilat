import { getAppServerSession } from "@/lib/server-auth";
import { getAgentCreditApplications } from "@/lib/api.auth";
import { MarketingReportCenter } from "@/components/dashboard/MarketingReportCenter";

type SessionShape = { backendToken?: string };

export default async function MarketingReportsPage() {
  const session = (await getAppServerSession()) as SessionShape | null;
  const applications = session?.backendToken ? await getAgentCreditApplications(session.backendToken, 50) : [];
  return (
    <main className="bg-sky-50 px-4 py-4">
      <section className="mx-auto w-full max-w-md">
        <MarketingReportCenter applications={applications} />
      </section>
    </main>
  );
}
