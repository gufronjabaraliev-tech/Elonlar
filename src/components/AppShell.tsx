import { Link, useRouterState } from "@tanstack/react-router";
import { Heart, Home, LayoutList, MessageCircle, UserRound } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { NoticeBell } from "@/components/NoticeBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTelegramSession } from "@/hooks/useTelegramSession";
import { cn } from "@/lib/utils";
import { publicPlatform } from "@/lib/listings.functions";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fetchPlatform = useServerFn(publicPlatform);
  const platform = useQuery({ queryKey: ["platform"], queryFn: () => fetchPlatform() });
  const { isAdmin } = useTelegramSession();
  const brand = platform.data?.campaignName || "E'lonlar";
  const chatActive = pathname === "/chat";

  useEffect(() => {
    document.title = brand;
  }, [brand]);

  const items = [
    { to: "/", label: "E'lonlar", icon: Home, active: (path: string) => path === "/" },
    { to: "/saved", label: "Sevimlilar", icon: Heart, active: (path: string) => path === "/saved" },
    {
      to: "/my",
      label: "E'lonlarim",
      icon: LayoutList,
      active: (path: string) => path === "/my" || path.startsWith("/edit/"),
    },
    { to: "/profile", label: "Profil", icon: UserRound, active: (path: string) => path === "/profile" },
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-chrome">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex min-w-0 items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
              {brand.slice(0, 1)}
            </span>
            <span className="truncate text-base font-semibold tracking-tight">{brand}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle />
            {isAdmin ? (
              <Link to="/admin" search={{ status: "pending" }} className="rounded-xl px-2.5 py-1.5 text-sm font-semibold text-primary">
                Admin
              </Link>
            ) : null}
            <NoticeBell active={pathname === "/notices"} />
            <Link
              to="/chat"
              aria-label="Admin bilan gaplashish"
              className={cn(
                "grid h-9 w-9 place-items-center rounded-xl transition-colors",
                chatActive ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-foreground/5",
              )}
            >
              <MessageCircle className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-4 sm:pb-12">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-chrome sm:hidden">
        <div className="mx-auto flex max-w-5xl items-stretch">
          {items.map((item) => {
            const active = item.active(pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="fixed left-1/2 top-3 z-40 hidden -translate-x-1/2 sm:block">
        <div className="flex items-center gap-1 rounded-full border border-border bg-chrome px-1.5 py-1 shadow-sm">
          {items.map((item) => {
            const active = item.active(pathname);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
