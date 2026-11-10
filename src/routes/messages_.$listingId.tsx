import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AccountGate, identityReady } from "@/components/AccountGate";
import { useTelegramProfile } from "@/hooks/useTelegramProfile";
import { SideScroll } from "@/components/SideScroll";
import { ChatFrame } from "@/components/ChatFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTelegramSession } from "@/hooks/useTelegramSession";
import { useWebUser } from "@/hooks/useWebUser";
import { listingThread, sendListingMessage } from "@/lib/listings.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/messages_/$listingId")({
  validateSearch: (search: Record<string, unknown>): { buyer?: number } => {
    const buyer = search["buyer"];
    if (typeof buyer === "string" && /^\d+$/.test(buyer)) return { buyer: Number(buyer) };
    if (typeof buyer === "number" && Number.isFinite(buyer)) return { buyer };
    return {};
  },
  head: () => ({
    meta: [{ title: "Yozishma" }, { name: "description", content: "E'lon bo'yicha yozishma." }],
  }),
  component: MessageThreadPage,
});

function stamp(iso: string) {
  return new Date(iso).toLocaleString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

function MessageThreadPage() {
  const { user, ready } = useTelegramSession();
  const web = useWebUser();
  const tgProfile = useTelegramProfile();
  if (!ready || !web.ready || !tgProfile.ready) return null;
  if (!identityReady(user, tgProfile.profile)) {
    return (
      <AccountGate title="Yozishma" hint="Xabar yozish uchun ism, familiya, telefon va manzilni kiriting.">
        {null}
      </AccountGate>
    );
  }
  return <Thread />;
}

function Thread() {
  const { listingId } = Route.useParams();
  const { buyer } = Route.useSearch();
  const { initData } = useTelegramSession();
  const fetchThread = useServerFn(listingThread);
  const send = useServerFn(sendListingMessage);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const thread = useQuery({
    queryKey: ["listing-thread", listingId, buyer ?? 0],
    queryFn: () =>
      fetchThread({
        data: {
          initData,
          listingId,
          ...(typeof buyer === "number" ? { buyerId: buyer } : {}),
        },
      }),
  });

  const submit = useMutation({
    mutationFn: () => {
      const buyerId = thread.data?.role === "owner" ? thread.data.buyerId : undefined;
      return send({
        data: {
          initData,
          listingId,
          text,
          ...(buyerId ? { buyerId } : {}),
        },
      });
    },
    onSuccess: () => {
      setText("");
      void qc.invalidateQueries({ queryKey: ["listing-thread", listingId] });
      void qc.invalidateQueries({ queryKey: ["seller-threads"] });
      void qc.invalidateQueries({ queryKey: ["notices"] });
      void qc.invalidateQueries({ queryKey: ["user-desk"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Xatolik"),
  });

  const mine = thread.data ? (thread.data.role === "buyer" ? "buyer" : "owner") : "buyer";
  const canSend = thread.data?.role === "buyer" || Boolean(thread.data?.buyerId);

  return (
    <ChatFrame
      scrollKey={thread.data?.messages.length ?? 0}
      header={
        <>
          <Link to="/listing/$id" params={{ id: listingId }} className="text-lg font-bold">
            {thread.data?.title || "Yozishma"}
          </Link>
          <p className="text-xs text-muted-foreground">
            {thread.data?.role === "owner" ? thread.data.buyerName || "Xaridor tanlang" : "Sotuvchiga xabar"}
          </p>
          {thread.data?.role === "owner" && thread.data.buyers.length > 1 ? (
            <SideScroll className="mt-3 gap-2">
              {thread.data.buyers.map((item) => (
                <Link
                  key={item.buyerId}
                  to="/messages/$listingId"
                  params={{ listingId }}
                  search={{ buyer: item.buyerId }}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-xs",
                    item.buyerId === thread.data?.buyerId ? "border-primary bg-primary text-primary-foreground" : "border-border",
                  )}
                >
                  {item.buyerName}
                </Link>
              ))}
            </SideScroll>
          ) : null}
        </>
      }
      composer={
        canSend ? (
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!text.trim()) return;
              submit.mutate();
            }}
          >
            <Input value={text} onChange={(event) => setText(event.target.value)} placeholder="Xabar yozing" className="rounded-xl" />
            <Button type="submit" className="h-11 rounded-xl px-3" disabled={submit.isPending || !text.trim()} aria-label="Yuborish">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        ) : null
      }
    >
      {thread.isPending ? (
        <Skeleton className="h-40 rounded-2xl" />
      ) : thread.isError ? (
        <p className="py-16 text-center text-sm text-destructive">
          {thread.error instanceof Error ? thread.error.message : "Ma'lumot yuklanmadi"}
        </p>
      ) : thread.data.messages.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {thread.data.role === "owner" ? "Hali xaridor yozmagan." : "Sotuvchiga birinchi xabarni yozing."}
        </p>
      ) : (
        thread.data.messages.map((message) => {
                const own = message.from === mine;
                return (
                  <div key={message.id} className={cn("flex", own ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                        own ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                      )}
                    >
                      <p>{message.text}</p>
                      <p className={cn("mt-1 text-[10px]", own ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {stamp(message.at)}
                      </p>
                    </div>
                  </div>
                );
        })
      )}
    </ChatFrame>
  );
}
