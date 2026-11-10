import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["TELEGRAM_WEBHOOK_SECRET"];
        if (secret && request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
          return new Response("Forbidden", { status: 403 });
        }
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Bad request", { status: 400 });
        }
        const message = contactMessage(body);
        if (message && message.contact.user_id === message.fromId) {
          const { rememberTelegramPhone } = await import("@/lib/telegram-profile.server");
          rememberTelegramPhone(message.fromId, message.contact.phone_number);
        }
        return Response.json({ ok: true });
      },
    },
  },
});

function contactMessage(body: unknown): { fromId: number; contact: { user_id: number; phone_number: string } } | null {
  if (!body || typeof body !== "object") return null;
  const message = "message" in body ? body.message : null;
  if (!message || typeof message !== "object") return null;
  const from = "from" in message ? message.from : null;
  const contact = "contact" in message ? message.contact : null;
  if (!from || typeof from !== "object" || !contact || typeof contact !== "object") return null;
  const fromId = "id" in from ? from.id : null;
  const userId = "user_id" in contact ? contact.user_id : null;
  const phone = "phone_number" in contact ? contact.phone_number : null;
  if (typeof fromId !== "number" || typeof userId !== "number" || typeof phone !== "string") return null;
  return { fromId, contact: { user_id: userId, phone_number: phone } };
}
