import type { ReactNode } from "react";

// Auth pages call into the Supabase browser client at module load; skip the
// build-time prerender so missing env vars don't fail static generation.
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
            CH
          </div>
          <span className="text-base font-semibold tracking-tight">
            Coparenting
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
