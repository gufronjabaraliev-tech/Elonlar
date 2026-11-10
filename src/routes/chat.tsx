import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AccountGate, identityReady } from "@/components/AccountGate";
import { useTelegramProfile } from "@/hooks/useTelegramProfile";
import { ChatFrame } from "@/components/ChatFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTelegramSession } from "@/hooks/useTelegramSession";
import { useWebUser } from "@/hooks/useWebUser";
import { fileToJpeg } from "@/lib/image-file";
import { userChat, userSendChat } from "@/lib/listings.functions";
import { imageUrl, orderCode } from "@/lib/telegram";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat")({
  validateSearch: (search: Record<string, unknown>): { listing?: string; order?: string } => {
    const listing = search["listing"];
    const order = search["order"];
    const out: { listing?: string; order?: string } = {};
    if (typeof listing === "string" && /^[A-Za-z0-9-]{4,80}$/.test(listing)) out.listing = listing;
    if (typeof order === "string" && /^[A-Z0-9]{6}$/.test(order)) out.order = order;
    return out;
  },
  head: () => ({
    meta: [{ title: "Chat" }, { name: "description", content: "Admin bilan yozishma." }],
  }),
  component: ChatPage,
});

function stamp(iso: string) {
  return new Date(iso).toLocaleString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

function ChatPage() {
  const { user, ready } = useTelegramSession();
  const web = useWebUser();
  const tgProfile = useTelegramProfile();
  if (!ready || !web.ready || !tgProfile.ready) return null;
  if (!identityReady(user, tgProfile.profile)) {
    return (
      <AccountGate title="Chat" hint="Admin bilan yozishishdan oldin telefon va manzilni saqlang.">
        {null}
      </AccountGate>
    );
  }
  return <Thread />;
}

function Thread() {
  const { listing, order } = Route.useSearch();
  const { initData } = useTelegramSession();
  const fetchChat = useServerFn(userChat);
  const send = useServerFn(userSendChat);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [receipt, setReceipt] = useState("");
  const thread = useQuery({
    queryKey: ["user-chat"],
    queryFn: () => fetchChat({ data: { initData } }),
  });

  const submit = useMutation({
    mutationFn: () =>
      send({
        data: {
          initData,
          text,
          ...(receipt ? { image: receipt } : {}),
          ...(listing ? { listingId: listing } : {}),
        },
      }),
    onSuccess: () => {
      setText("");
      setReceipt("");
      void qc.invalidateQueries({ queryKey: ["user-chat"] });
      void qc.invalidateQueries({ queryKey: ["admin-chats"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Xatolik"),
  });

  return (
    <ChatFrame
      scrollKey={`${thread.data?.messages.length ?? 0}-${receipt ? 1 : 0}`}
      header={
        <>
          <h1 className="text-lg font-bold">{thread.data?.adminName || "Admin"}</h1>
          <p className="text-xs text-muted-foreground">Admin bilan yozishma</p>
          {listing ? (
            <div className="mt-3 rounded-2xl border border-border/70 bg-card p-3">
              <p className="text-sm font-semibold">Buyurtma {order || orderCode(listing)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Chek rasmini xotiradan yuboring. Admin shu raqamni bosib e'lonni ochadi.
              </p>
            </div>
          ) : null}
        </>
      }
      composer={
        thread.data ? (
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!text.trim() && !receipt) return;
              submit.mutate();
            }}
          >
            {receipt ? <img src={receipt} alt="Chek" className="h-20 w-20 rounded-xl object-cover" /> : null}
            <div className="flex gap-2">
              <label className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-border" aria-label="Chek rasmi">
                <ImagePlus className="h-4 w-4" />
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (!file) return;
                    void fileToJpeg(file)
                      .then(setReceipt)
                      .catch((error) => toast.error(error instanceof Error ? error.message : "Rasm yuklanmadi"));
                  }}
                />
              </label>
              <Input
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={listing ? "Chekka izoh" : "Xabar yozing"}
                className="rounded-xl"
              />
              <Button type="submit" className="h-11 rounded-xl px-3" disabled={submit.isPending || (!text.trim() && !receipt)} aria-label="Yuborish">
                <Send className="h-4 w-4" />
              </Button>
            </div>
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
          Hali xabar yo'q. Adminga birinchi xabarni yozing.
        </p>
      ) : (
        thread.data.messages.map((message) => (
                <div key={message.id} className={cn("flex", message.from === "customer" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                      message.from === "customer" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                    )}
                  >
                    {message.listingId ? (
                      <Link to="/listing/$id" params={{ id: message.listingId }} className="block font-semibold underline">
                        Buyurtma {message.orderCode || orderCode(message.listingId)}
                      </Link>
                    ) : null}
                    {message.image ? (
                      <img src={imageUrl(message.image)} alt="Chek" className="mt-1 max-h-48 rounded-xl" />
                    ) : null}
                    {message.text ? <p>{message.text}</p> : null}
                    <p
                      className={cn(
                        "mt-1 text-[10px]",
                        message.from === "customer" ? "text-primary-foreground/70" : "text-muted-foreground",
                      )}
                    >
                      {stamp(message.at)}
                    </p>
                  </div>
                </div>
        ))
      )}
    </ChatFrame>
  );
}
