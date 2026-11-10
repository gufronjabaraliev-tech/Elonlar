import { Send } from "lucide-react";

export function TelegramRequired() {
  return (
    <div className="mx-auto max-w-sm py-20 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary">
        <Send className="h-6 w-6 text-primary" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">Telegram orqali kiring</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        E'lon joylash, yozishma va profil Telegram Mini App ichida ochiladi. Hisob Telegram ID
        orqali taniladi. Brauzerda esa e'lonlarni ko'rish mumkin.
      </p>
    </div>
  );
}
