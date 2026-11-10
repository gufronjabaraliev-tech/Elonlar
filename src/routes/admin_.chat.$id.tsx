import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ChatFrame } from "@/components/ChatFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTelegramSession } from "@/hooks/useTelegramSession";
import { adminChatMessages, adminSendChat } from "@/lib/listings.functions";
import { imageUrl, orderCode } from "@/lib/telegram";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin_/chat/$id")({
  head: () => ({ meta: [{ title: "Chat" }] }),
  component: ThreadPage,
});

function ThreadPage() {
  return <Thread />;
}

function stamp(iso: string) {
  return new Date(iso).toLocaleString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

function Thread() {
  const { id } = Route.useParams();
  const customerId = Number(id);
  const router = useRouter();
  const { initData } = useTelegramSession();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const fetchMessages = useServerFn(adminChatMessages);
  const send = useServerFn(adminSendChat);

  const thread = useQuery({
    queryKey: ["admin-chat", customerId],
    enabled: Number.isFinite(customerId),
    queryFn: () => fetchMessages({ data: { initData, customerId } }),
  });

  const submit = useMutation({
    mutationFn: () => send({ data: { initData, customerId, text } }),
    onSuccess: () => {
      setText("");
      void qc.invalidateQueries({ queryKey: ["admin-chat", customerId] });
      void qc.invalidateQueries({ queryKey: ["admin-chats"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Xatolik"),
  });

  if (!Number.isFinite(customerId)) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Mijoz topilmadi.</p>;
  }

  const customer = thread.data?.customer;

  return (
    <ChatFrame
      scrollKey={thread.data?.messages.length ?? 0}
      header={
        <>
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) router.history.back();
              else void router.navigate({ to: "/admin/chat" });
            }}
            className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Chat
          </button>
          {customer ? (
            <div className="mt-2">
              <h1 className="text-lg font-bold">{customer.name}</h1>
              <p className="text-xs text-muted-foreground">
                {customer.phone || "Telefon yo'q"}
                {customer.city ? ` · ${customer.city}` : ""}
              </p>
            </div>
          ) : null}
        </>
      }
      composer={
        thread.data ? (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!text.trim()) return;
              submit.mutate();
            }}
          >
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Xabar yozing"
              className="rounded-xl"
            />
            <Button type="submit" className="h-11 rounded-xl px-3" disabled={submit.isPending || !text.trim()}>
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
        <p className="py-10 text-center text-sm text-muted-foreground">Hali xabar yo'q. Birinchi xabarni yozing.</p>
      ) : (
        thread.data.messages.map((message) => (
                <div
                  key={message.id}
                  className={cn("flex", message.from === "admin" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                      message.from === "admin"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                    )}
                  >
                    {message.listingId ? (
                      <Link
                        to="/admin/listing/$id"
                        params={{ id: message.listingId }}
                        className="block font-semibold underline"
                      >
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
                        message.from === "admin" ? "text-primary-foreground/70" : "text-muted-foreground",
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
