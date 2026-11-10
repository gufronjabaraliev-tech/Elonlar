import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { TelegramRequired } from "@/components/TelegramRequired";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTelegramProfile } from "@/hooks/useTelegramProfile";
import { useTelegramSession } from "@/hooks/useTelegramSession";
import { telegramProfileSave } from "@/lib/listings.functions";
import { getWebApp } from "@/lib/telegram";

export function identityReady(
  telegramUser: { id: number; last_name?: string } | null | undefined,
  profile: { phone?: string; address?: string; lastName?: string } | null | undefined,
) {
  if (!telegramUser) return false;
  const last = (telegramUser.last_name || profile?.lastName || "").trim();
  return last.length >= 2 && (profile?.phone?.trim().length ?? 0) >= 7 && (profile?.address?.trim().length ?? 0) >= 3;
}

export function AccountGate({
  children,
  title = "Hisob",
  hint = "Ism va familiya Telegramdan olinadi. Telefonni ulashing va manzilni yozing.",
}: {
  children: ReactNode;
  title?: string;
  hint?: string;
}) {
  const telegram = useTelegramSession();
  const extra = useTelegramProfile();
  if (!telegram.ready || !extra.ready) return null;
  if (!telegram.user) return <TelegramRequired />;
  if (identityReady(telegram.user, extra.profile)) return children;
  return <TelegramProfileForm title={title} hint={hint} />;
}

export function TelegramProfileForm({
  title,
  hint,
  onDone,
}: {
  title?: string;
  hint?: string;
  onDone?: () => void;
}) {
  const { user, initData } = useTelegramSession();
  const extra = useTelegramProfile();
  const [lastName, setLastName] = useState(user?.last_name || extra.profile?.lastName || "");
  const [phone, setPhone] = useState(extra.profile?.phone ?? "");
  const [address, setAddress] = useState(extra.profile?.address ?? "");
  useEffect(() => {
    if (extra.profile?.phone) setPhone(extra.profile.phone);
  }, [extra.profile?.phone]);
  const save = useServerFn(telegramProfileSave);
  const qc = useQueryClient();
  const lockedName = Boolean(user?.last_name);

  const submit = useMutation({
    mutationFn: () => save({ data: { initData, lastName, phone, address } }),
    onSuccess: () => {
      toast.success("Saqlandi");
      void qc.invalidateQueries({ queryKey: ["tg-profile"] });
      void qc.invalidateQueries({ queryKey: ["user-desk"] });
      onDone?.();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Xatolik"),
  });

  function sharePhone() {
    const app = getWebApp();
    if (!app?.requestContact) {
      toast.error("Raqamni qo'lda kiriting");
      return;
    }
    app.requestContact((shared) => {
      if (!shared) {
        toast.error("Telefon ulashilmadi");
        return;
      }
      toast.success("Telegram raqamni botga yubordi");
      window.setTimeout(() => {
        void qc.invalidateQueries({ queryKey: ["tg-profile"] });
      }, 1200);
    });
  }

  const shownName = [user?.first_name, lockedName ? user?.last_name : lastName].filter(Boolean).join(" ");

  return (
    <form
      className="mx-auto max-w-sm space-y-4 py-6"
      onSubmit={(event) => {
        event.preventDefault();
        submit.mutate();
      }}
    >
      <div>
        {title ? <h1 className="text-xl font-bold">{title}</h1> : null}
        <p className="mt-1 text-sm text-muted-foreground">
          {hint ?? "Bu Telegram hisobi. Ism o'zgarmaydi."}
        </p>
        {shownName ? <p className="mt-2 text-sm font-medium">{shownName}</p> : null}
        {user?.username ? <p className="text-sm text-muted-foreground">@{user.username}</p> : null}
      </div>
      {lockedName ? null : (
        <Field id="tg-last" label="Familiya" value={lastName} onChange={setLastName} />
      )}
      <div className="space-y-2">
        <Label htmlFor="tg-phone">Telefon</Label>
        <Input
          id="tg-phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+998 90 123 45 67"
          required
          className="rounded-xl"
        />
        <Button type="button" variant="outline" className="h-11 w-full rounded-xl" onClick={sharePhone}>
          Telegramdan ulashish
        </Button>
      </div>
      <Field id="tg-address" label="Manzil" value={address} onChange={setAddress} placeholder="Shahar, ko'cha, uy" />
      <Button type="submit" className="h-11 w-full rounded-xl" disabled={submit.isPending}>
        {submit.isPending ? "Saqlanmoqda..." : "Davom etish"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? ""}
        required
        className="rounded-xl"
      />
    </div>
  );
}
