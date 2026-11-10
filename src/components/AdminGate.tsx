import type { ReactNode } from "react";

import { useTelegramSession } from "@/hooks/useTelegramSession";
import { useWebAdmin } from "@/hooks/useWebAdmin";

export function AdminGate({ children }: { children: ReactNode }) {
  const { isAdmin: telegramAdmin, user, ready: telegramReady } = useTelegramSession();
  const { isWebAdmin, ready: webReady } = useWebAdmin();
  const isAdmin = telegramAdmin || isWebAdmin;

  if (!telegramReady || !webReady) return null;
  if (user && !telegramAdmin) {
    return (
      <p className="mx-auto max-w-sm py-20 text-center text-sm text-muted-foreground">
        Bu sahifa ijara egasi uchun. Sizning Telegram ID ingiz admin sifatida biriktirilmagan.
      </p>
    );
  }
  if (!isAdmin) {
    return (
      <p className="mx-auto max-w-sm py-20 text-center text-sm text-muted-foreground">
        Admin panel ijara egasining Telegram ID si bilan, shu ijaraning Mini App ichida ochiladi.
      </p>
    );
  }
  return children;
}
