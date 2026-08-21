export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark">
      <div className="min-h-svh bg-background text-foreground">
        {/* background glow modern */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(700px_420px_at_20%_10%,rgba(59,130,246,.30),transparent_60%),radial-gradient(700px_420px_at_80%_75%,rgba(34,211,238,.18),transparent_60%)]" />
        </div>

        {children}
      </div>
    </div>
  );
}
