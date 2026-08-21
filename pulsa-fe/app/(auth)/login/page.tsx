import { LoginCard } from "@/components/auth/LoginCard";
import { BackgroundAuth } from "@/components/auth/BackgroundAuth";

export default function LoginPage() {
  return (
    <BackgroundAuth>
      <LoginCard />
    </BackgroundAuth>
  );
}
