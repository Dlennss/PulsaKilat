import { getAppServerSession } from "@/lib/server-auth";
import { getAgentCreditApplications } from "@/lib/api.auth";
import { AgentCreditRiskPage } from "@/components/dashboard/credit-risk/AgentCreditRiskPage";

type SessionShape = { backendToken?: string };

export default async function MarketingAgentsPage() {
  const session = (await getAppServerSession()) as SessionShape | null;
  const applications = session?.backendToken ? await getAgentCreditApplications(session.backendToken, 50) : [];
  return <AgentCreditRiskPage applications={applications} mode="marketing" />;
}
