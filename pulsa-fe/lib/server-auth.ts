import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextauth";
import { decodeJwt } from "@/lib/jwt";
import type { UserSession } from "@/components/user/types";

export type AppServerSession = {
  user?: UserSession;
  backendToken?: string;
};

export const PK_AUTH_COOKIE = "pk_auth_token";

export async function getAppServerSession(): Promise<AppServerSession | null> {
  const session = (await getServerSession(authOptions)) as AppServerSession | null;
  if (session?.backendToken) return session;

  const token = (await cookies()).get(PK_AUTH_COOKIE)?.value || "";
  const claims = decodeJwt(token);
  if (!token || !claims) return null;

  const role = typeof claims.role === "string" ? claims.role : "user";
  return {
    backendToken: token,
    user: {
      name: "",
      email: "",
      role,
    },
  };
}

export async function getBackendAuthorization(req?: Request): Promise<string> {
  const session = await getAppServerSession();
  if (session?.backendToken) return `Bearer ${session.backendToken}`;

  return String(req?.headers.get("authorization") || "").trim();
}
