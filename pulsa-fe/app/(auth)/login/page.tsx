import { Suspense } from "react";
import { LoginCard } from "@/components/auth/LoginCard";
import { BackgroundAuth } from "@/components/auth/BackgroundAuth";

export default function LoginPage() {
  return (
    <BackgroundAuth>
      <Suspense fallback={<div className="min-h-[620px] w-full" aria-hidden="true" />}>
        <LoginCard />
      </Suspense>
    </BackgroundAuth>
  );
}
