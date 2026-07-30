import { redirect } from "next/navigation";
import { getAppServerSession } from "@/lib/server-auth";
import { isJwtValid } from "@/lib/jwt";
import { LoginCard } from "@/components/auth/LoginCard";
import { BackgroundAuth } from "@/components/auth/BackgroundAuth";

type SessionShape = { backendToken?: string; user?: { role?: string } };

function toPathByRole(role?: string | null) {
  const r = (role || "").toLowerCase();
  if (r === "admin" || r === "staff") return "/dashboard/admin";
  if (r === "analis" || r === "analyst") return "/dashboard/master";
  if (r === "master") return "/dashboard/master";
  if (r === "user" || r === "agent") return "/user";
  if (r === "operator_trx") return "/dashboard/operator";
  if (r === "operator_wallet") return "/dashboard/wallet";
  return "/dashboard/member";
}

export default async function LoginPage() {
  const session = (await getAppServerSession()) as SessionShape | null;
  const isValid = isJwtValid(session?.backendToken);
  if (session?.backendToken && isValid) {
    redirect(toPathByRole(session.user?.role || "member"));
  }

  return (
    <BackgroundAuth>
      <LoginCard />
    </BackgroundAuth>
  );
}
