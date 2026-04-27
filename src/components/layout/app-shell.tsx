"use client";

import {
  Bell,
  CalendarDays,
  FileText,
  LogOut,
  MessageCircle,
  Menu,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { createClient } from "@/lib/supabase/client";
import { useHousehold, useUser } from "@/lib/supabase/hooks";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: typeof CalendarDays;
};

const NAV: NavItem[] = [
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Messages", href: "/messages", icon: MessageCircle },
  { label: "Children", href: "/children", icon: Users },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Notifications", href: "/notifications", icon: Bell },
];

function avatarInitials(input: string | null | undefined) {
  if (!input) return "U";
  const trimmed = input.trim();
  if (!trimmed) return "U";
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { profile, user } = useUser();
  const { household, loading: householdLoading } = useHousehold();

  const showNav = !!household;
  const isOnboarding = pathname === "/onboarding";

  // If the authenticated user has no household, push them to onboarding so the
  // rest of the (app) routes don't render against missing data.
  useEffect(() => {
    if (householdLoading) return;
    if (!household && !isOnboarding) {
      router.replace("/onboarding");
    }
  }, [household, householdLoading, isOnboarding, router]);
  const displayName =
    profile?.display_name ?? user?.email?.split("@")[0] ?? "Account";
  const avatarSrc = profile?.avatar_url ?? undefined;

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside
        className={cn(
          "hidden border-r bg-card transition-[width] duration-200 md:flex md:flex-col",
          collapsed ? "w-16" : "w-60",
        )}
      >
        <div className="flex h-14 items-center gap-2 px-4">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
            CH
          </div>
          {!collapsed ? (
            <span className="text-sm font-semibold tracking-tight">
              Coparenting
            </span>
          ) : null}
        </div>
        <Separator />
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {showNav
            ? NAV.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname?.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      "text-muted-foreground hover:bg-primary-soft hover:text-foreground",
                      active &&
                        "bg-primary-soft text-foreground hover:bg-primary-soft",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed ? <span>{item.label}</span> : null}
                  </Link>
                );
              })
            : !collapsed ? (
                <p className="px-3 py-2 text-xs text-muted-foreground">
                  Set up a household to unlock navigation.
                </p>
              ) : null}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((v) => !v)}
          >
            <Menu />
          </Button>
          <div className="flex-1" />
          <ThemeToggle />
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              {avatarSrc ? <AvatarImage src={avatarSrc} alt="" /> : null}
              <AvatarFallback className="bg-primary-soft text-foreground">
                {avatarInitials(profile?.display_name ?? user?.email)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium md:inline">
              {displayName}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            onClick={handleSignOut}
          >
            <LogOut />
          </Button>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
