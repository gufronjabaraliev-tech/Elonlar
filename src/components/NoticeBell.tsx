import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

import { useTelegramSession } from "@/hooks/useTelegramSession";
import { useWebUser } from "@/hooks/useWebUser";
import { userNotices } from "@/lib/listings.functions";
import { cn } from "@/lib/utils";

const SEEN = "elon-notice-seen";

export function NoticeBell({ active }: { active: boolean }) {
  const { initData, user, ready } = useTelegramSession();
  const web = useWebUser();
  const signed = Boolean(user || web.user);
  const fetchNotices = useServerFn(userNotices);
  const [seen, setSeen] = useState("");
  const query = useQuery({
    queryKey: ["notices", user?.id ?? web.user?.id ?? 0],
    enabled: ready && web.ready && signed,
    queryFn: () => fetchNotices({ data: { initData } }),
  });

  useEffect(() => {
    setSeen(localStorage.getItem(SEEN) ?? "");
  }, [active]);

  const count = (query.data ?? []).filter((item) => item.at > seen).length;

  return (
    <Link
      to="/notices"
      aria-label="Bildirishnomalar"
      className={cn(
        "relative grid h-9 w-9 place-items-center rounded-xl transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-foreground/5",
      )}
    >
      <Bell className="h-5 w-5" />
      {count > 0 ? (
        <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}
