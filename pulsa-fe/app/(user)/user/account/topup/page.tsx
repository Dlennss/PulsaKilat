import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/nextauth";
import type { UserSession } from "@/components/user/types";
import { UserBottomNav } from "@/components/user/UserBottomNav";
import { RetailTopupClient } from "@/components/user/RetailTopupClient";

type SessionShape = {
  user?: UserSession;
  backendToken?: string;
};

export default async function UserAccountTopupPage() {
  const session = (await getServerSession(authOptions)) as SessionShape | null;
  if (!session?.backendToken) redirect("/login");

  return (
    <main className="min-h-screen bg-[#eef8f3] px-4 pb-24 pt-5">
      <div className="mx-auto w-full max-w-md space-y-4">
        <RetailTopupClient authToken={session.backendToken} />
      </div>
      <UserBottomNav />
    </main>
  );
}
