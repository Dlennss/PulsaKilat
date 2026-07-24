import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/nextauth";
import { getUserProfile } from "@/lib/api.auth";
import { UserAgentCreditPageContent } from "@/components/user/UserAgentCreditPageContent";
import { UserBottomNav } from "@/components/user/UserBottomNav";
import type { UserSession } from "@/components/user/types";

type SessionShape = {
  user?: UserSession;
  backendToken?: string;
};

export default async function UserSaldoKreditAgentPage() {
  const session = (await getServerSession(authOptions)) as SessionShape | null;
  if (!session?.backendToken) redirect("/login");

  const profile = await getUserProfile(session.backendToken);
  const role = String(profile?.role || session.user?.role || "").trim().toLowerCase();
  if (role !== "agent") redirect("/user/saldo");

  const profileWithPhone = profile as typeof profile & { phone?: string; no_hp?: string; nomor_hp?: string; telepon?: string };
  const name = profile?.nama || session.user?.name || "User";
  const email = profile?.email || session.user?.email || "-";
  const phone = profileWithPhone?.phone || profileWithPhone?.no_hp || profileWithPhone?.nomor_hp || profileWithPhone?.telepon || "-";

  return (
    <main className="min-h-screen bg-[#eef8f3]">
      <UserAgentCreditPageContent name={name} email={email} phone={phone} />
      <UserBottomNav />
    </main>
  );
}
