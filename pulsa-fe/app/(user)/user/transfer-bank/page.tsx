import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/nextauth";
import { UserBottomNav } from "@/components/user/UserBottomNav";
import { UserTransferBankPageContent } from "@/components/user/UserTransferBankPageContent";
import type { UserSession } from "@/components/user/types";

type SessionShape = {
  user?: UserSession;
  backendToken?: string;
};

export default async function UserTransferBankPage() {
  const session = (await getServerSession(authOptions)) as SessionShape | null;
  if (!session?.backendToken) redirect("/login");

  return (
    <main className="min-h-screen bg-[#eef8f3] pb-24">
      <UserTransferBankPageContent />
      <UserBottomNav />
    </main>
  );
}
