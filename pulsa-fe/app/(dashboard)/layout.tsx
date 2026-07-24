"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { decodeJwt, type JwtClaims } from "@/lib/jwt";
import { HeaderMobile } from "@/components/dashboard/HeaderMobile";
import { MainContent } from "@/components/dashboard/MainContent";
import { SidebarDesktop } from "@/components/dashboard/SidebarDesktop";
import { SidebarMobile } from "@/components/dashboard/SidebarMobile";
import { adminNavSections, auditorNavSections, getMemberNavSections, masterNavSections, operatorNavSections, staffNavSections, walletNavSections, type H2HRole } from "@/components/dashboard/nav";

type AppRole = "admin" | "staff" | "auditor" | "member" | "agent_member" | "master_member" | "operator_trx" | "operator_wallet" | "user" | "agent" | "master";

const staffBlockedAdminPrefixes = [
  "/dashboard/admin/master/members",
  "/dashboard/admin/master/aktivasi-h2h",
  "/dashboard/admin/members",
  "/dashboard/admin/komisi/pengaturan",
];

function targetPathByRole(role: AppRole): string {
  if (role === "admin" || role === "staff") return "/dashboard/admin";
  if (role === "auditor") return "/dashboard/auditor";
  if (role === "member" || role === "agent_member" || role === "master_member") return "/dashboard/member";
  if (role === "master") return "/dashboard/master";
  if (role === "operator_trx") return "/dashboard/operator";
  if (role === "operator_wallet") return "/dashboard/wallet";
  return "/user";
}

const TOKEN_REFRESH_THRESHOLD_MS = 12 * 60 * 60 * 1000;

function normalizeAppRole(role?: string): AppRole {
  const rawRole = (role || "").toLowerCase();
  return rawRole === "admin"
    ? "admin"
    : rawRole === "staff"
      ? "staff"
      : rawRole === "auditor"
        ? "auditor"
        : rawRole === "member"
          ? "member"
          : rawRole === "agent_member"
            ? "agent_member"
            : rawRole === "master_member"
              ? "master_member"
              : rawRole === "agent"
                ? "agent"
                : rawRole === "master"
                  ? "master"
                  : rawRole === "operator_trx"
                    ? "operator_trx"
                    : rawRole === "operator_wallet"
                      ? "operator_wallet"
                      : "user";
}

async function refreshDashboardTokenIfNeeded(token: string, claims: JwtClaims): Promise<{ token: string; claims: JwtClaims } | null> {
  const expMs = claims.exp ? claims.exp * 1000 : 0;
  if (!expMs || expMs - Date.now() > TOKEN_REFRESH_THRESHOLD_MS) {
    return { token, claims };
  }

  try {
    const r = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (r.status === 401 || r.status === 403) return null;
    if (!r.ok) return { token, claims };

    const data = (await r.json().catch(() => ({}))) as { ok?: boolean; token?: string };
    const nextToken = typeof data.token === "string" ? data.token : "";
    const nextClaims = nextToken ? (decodeJwt(nextToken) as JwtClaims | null) : null;
    if (!data.ok || !nextToken || !nextClaims) return { token, claims };

    localStorage.setItem("auth_token", nextToken);
    localStorage.setItem("auth_source", "refresh");
    return { token: nextToken, claims: nextClaims };
  } catch {
    return { token, claims };
  }
}

export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [currentRole, setCurrentRole] = useState<AppRole | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  const forceLogoutToLogin = useCallback(() => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_source");
    void signOut({ redirect: false }).finally(() => {
      router.replace("/login");
    });
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    void (async () => {
      const token = localStorage.getItem("auth_token") || "";
      if (!token) {
        forceLogoutToLogin();
        return;
      }

      const claims = decodeJwt(token) as JwtClaims | null;
      if (!claims) {
        forceLogoutToLogin();
        return;
      }

      if (claims.exp && claims.exp * 1000 <= Date.now()) {
        forceLogoutToLogin();
        return;
      }

      const refreshed = await refreshDashboardTokenIfNeeded(token, claims);
      if (cancelled) return;
      if (!refreshed) {
        forceLogoutToLogin();
        return;
      }

      const normalizedRole = normalizeAppRole(refreshed.claims.role);

      if (pathname === "/dashboard") {
        router.replace(targetPathByRole(normalizedRole));
        return;
      }

      const inAdminArea = pathname.startsWith("/dashboard/admin");
      const inAuditorArea = pathname.startsWith("/dashboard/auditor");
      const inMemberArea = pathname.startsWith("/dashboard/member");
      const inOperatorArea = pathname.startsWith("/dashboard/operator");
      const inWalletArea = pathname.startsWith("/dashboard/wallet");
      const inMasterArea = pathname.startsWith("/dashboard/master");

      if ((normalizedRole === "admin" || normalizedRole === "staff") && !inAdminArea) {
        router.replace("/dashboard/admin");
        return;
      }

      if (
        normalizedRole === "staff" &&
        staffBlockedAdminPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
      ) {
        router.replace("/dashboard/admin");
        return;
      }

      if (normalizedRole === "auditor" && !inAuditorArea) {
        router.replace("/dashboard/auditor");
        return;
      }

      if ((normalizedRole === "member" || normalizedRole === "agent_member" || normalizedRole === "master_member") && !inMemberArea) {
        router.replace("/dashboard/member");
        return;
      }

      if (normalizedRole === "operator_trx" && !inOperatorArea) {
        router.replace("/dashboard/operator");
        return;
      }

      if (normalizedRole === "operator_wallet" && !inWalletArea) {
        router.replace("/dashboard/wallet");
        return;
      }

      if (normalizedRole === "master" && !inMasterArea) {
        router.replace("/dashboard/master");
        return;
      }

      if (normalizedRole === "user" || normalizedRole === "agent") {
        router.replace("/user");
        return;
      }

      setCurrentRole(normalizedRole);
      timer = setTimeout(() => setReady(true), 0);
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [forceLogoutToLogin, pathname, router]);

  const navSections = useMemo(() => {
    if (pathname.startsWith("/dashboard/admin")) return currentRole === "staff" ? staffNavSections : adminNavSections;
    if (pathname.startsWith("/dashboard/auditor")) return auditorNavSections;
    if (pathname.startsWith("/dashboard/operator")) return operatorNavSections;
    if (pathname.startsWith("/dashboard/wallet")) return walletNavSections;
    if (pathname.startsWith("/dashboard/master")) return masterNavSections;
    const h2hRole: H2HRole =
      currentRole === "agent_member" || currentRole === "master_member" ? currentRole : "member";
    return getMemberNavSections(h2hRole);
  }, [currentRole, pathname]);

  useEffect(() => {
    const timer = setTimeout(() => setOpen(false), 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [open]);

  const logout = () => {
    forceLogoutToLogin();
  };

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#050A14] text-sm text-white/70">
        Memeriksa sesi...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050A14] text-white">
      <div className="flex min-h-screen">
        <SidebarDesktop sections={navSections} onLogout={logout} />

        <div className="flex min-w-0 flex-1 flex-col">
          <HeaderMobile onOpenMenu={() => setOpen(true)} />
          <MainContent>{children}</MainContent>
        </div>
      </div>

      <SidebarMobile sections={navSections} open={open} onClose={() => setOpen(false)} onLogout={logout} />
    </div>
  );
}
