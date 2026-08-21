import { getAppServerSession } from "@/lib/server-auth";
import { redirect } from "next/navigation";
import { getMyAgentCreditApplications, getUserProfile } from "@/lib/api.auth";
import { UserCreditBillPayLaterContent } from "@/components/user/UserCreditBillPayLaterContent";
import { UserBottomNav } from "@/components/user/UserBottomNav";
import type { UserSession } from "@/components/user/types";

type SessionShape = {
  user?: UserSession;
  backendToken?: string;
};

export default async function UserSaldoTagihanPage() {
  const session = (await getAppServerSession()) as SessionShape | null;
  if (!session?.backendToken) redirect("/login");

  const profile = await getUserProfile(session.backendToken);
  const role = String(profile?.role || session.user?.role || "").trim().toLowerCase();
  if (role !== "agent" && role !== "user") redirect("/user/saldo");

  const applications = await getMyAgentCreditApplications(session.backendToken);
  const bills = applications.filter((item) => item.status === "approved");

  return (
    <main className="min-h-screen bg-[#eef8f3] px-3 pb-24 pt-3">
      <UserCreditBillPayLaterContent bills={bills} />
      <UserBottomNav />
    </main>
  );
}
