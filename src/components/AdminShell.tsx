import { Link, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  Clock,
  EyeOff,
  LayoutDashboard,
  LayoutList,
  MessageCircle,
  PlusCircle,
  Settings,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";

import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useTelegramSession } from "@/hooks/useTelegramSession";
import { publicPlatform } from "@/lib/listings.functions";
import { useWebAdmin } from "@/hooks/useWebAdmin";
import { webAdminLogout } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

export const ADMIN_TABS = [
  { status: "pending", label: "Tekshiruv", icon: Clock },
  { status: "approved", label: "Tasdiq", icon: CheckCircle2 },
  { status: "rejected", label: "Rad", icon: XCircle },
  { status: "hidden", label: "Yashirin", icon: EyeOff },
  { status: "all", label: "Barchasi", icon: LayoutList },
] as const;

export type AdminStatus = (typeof ADMIN_TABS)[number]["status"];

export function adminStatusFromSearch(search: unknown): AdminStatus {
  const value =
    search && typeof search === "object" && "status" in search
      ? (search as { status?: unknown }).status
      : undefined;
  return ADMIN_TABS.some((tab) => tab.status === value) ? (value as AdminStatus) : "pending";
}

const NAV = [
  {
    to: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    active: (pathname: string) => pathname === "/admin/dashboard",
  },
  {
    to: "/admin",
    label: "E'lonlar",
    icon: LayoutList,
    active: (pathname: string) => pathname === "/admin" || pathname.startsWith("/admin/listing"),
  },
  {
    to: "/admin/new",
    label: "Yaratish",
    icon: PlusCircle,
    active: (pathname: string) => pathname === "/admin/new",
  },
  {
    to: "/admin/customers",
    label: "Mijozlar",
    icon: Users,
    active: (pathname: string) => pathname.startsWith("/admin/customers"),
  },
  {
    to: "/admin/settings",
    label: "Sozlamalar",
    icon: Settings,
    active: (pathname: string) => pathname.startsWith("/admin/settings"),
  },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const chatActive = pathname === "/admin/chat" || pathname.startsWith("/admin/chat/");
  const fetchPlatform = useServerFn(publicPlatform);
  const platform = useQuery({ queryKey: ["platform"], queryFn: () => fetchPlatform() });
  const brand = platform.data?.campaignName || "E'lonlar";

  useEffect(() => {
    document.title = `${brand} — admin`;
  }, [brand]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-chrome">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link to="/admin/dashboard" className="flex min-w-0 items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
              {brand.slice(0, 1)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-semibold tracking-tight">{brand}</span>
              <span className="block text-[11px] leading-none text-muted-foreground">Admin</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link
              to="/admin/chat"
              aria-label="Chat"
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
        <div className="mx-auto flex max-w-5xl items-stretch pb-[env(safe-area-inset-bottom)]">
          {NAV.map((item) => (
            <AdminNavLink key={item.to} item={item} pathname={pathname} mobile />
          ))}
        </div>
      </nav>

      <div className="fixed left-1/2 top-3 z-40 hidden -translate-x-1/2 sm:block">
        <div className="flex items-center gap-1 rounded-full border border-border bg-chrome px-1.5 py-1 shadow-sm">
          {NAV.map((item) => (
            <AdminNavLink key={item.to} item={item} pathname={pathname} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminNavLink({
  item,
  pathname,
  mobile = false,
}: {
  item: (typeof NAV)[number];
  pathname: string;
  mobile?: boolean;
}) {
  const active = item.active(pathname);
  const className = mobile
    ? cn(
        "flex min-w-0 flex-1 flex-col items-center gap-1 px-0.5 py-2.5 text-[10px] font-medium leading-tight transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )
    : cn(
        "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      );
  const content = mobile ? (
    <>
      <item.icon className="h-5 w-5" />
      {item.label}
    </>
  ) : (
    item.label
  );

  if (item.to === "/admin") {
    return (
      <Link to="/admin" search={{ status: "pending" }} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <Link to={item.to} className={className}>
      {content}
    </Link>
  );
}

export function AdminLogout() {
  const qc = useQueryClient();
  const logout = useServerFn(webAdminLogout);
  const submit = useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["web-admin"] });
      void qc.removeQueries({ queryKey: ["admin-listings"] });
      void qc.removeQueries({ queryKey: ["admin-stats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Xatolik"),
  });

  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-xl"
      onClick={() => submit.mutate()}
      disabled={submit.isPending}
    >
      Chiqish
    </Button>
  );
}
