import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Heart, LayoutList, Moon, Send, Sun } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";

import { AccountGate, identityReady, TelegramProfileForm } from "@/components/AccountGate";
import { useTelegramProfile } from "@/hooks/useTelegramProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useTelegramSession } from "@/hooks/useTelegramSession";
import { useWebUser } from "@/hooks/useWebUser";
import { userDesk, webUserLogout, webUserUpdate } from "@/lib/listings.functions";

export const Route = createFileRoute("/profile")({
  head: () => ({
      meta: [{ title: "Profil" }, { name: "description", content: "Ism, familiya, telefon va manzil." }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, ready, initData } = useTelegramSession();
  const tgProfile = useTelegramProfile();
  const web = useWebUser();
  const fetchDesk = useServerFn(userDesk);
  const signed = Boolean(user || web.user);
  const desk = useQuery({
    queryKey: ["user-desk", user?.id ?? web.user?.id ?? 0],
    enabled: ready && web.ready && signed,
    queryFn: () => fetchDesk({ data: { initData } }),
  });

  if (!ready || !web.ready || !tgProfile.ready) return null;
  if (!identityReady(user, tgProfile.profile)) {
    return (
      <AccountGate title="Profil" hint="Ism Telegramdan olinadi. Telefonni ulashing va manzilni yozing.">
        {null}
      </AccountGate>
    );
  }
  if (desk.isPending || !desk.data) return <Skeleton className="mx-auto h-80 max-w-md rounded-3xl" />;
  return <Desk data={desk.data} telegram={Boolean(user)} />;
}

function Desk({
  data,
  telegram,
}: {
  telegram: boolean;
  data: {
    name: string;
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    listings: { id: string; title: string; status: string; views: number; payment_status: string }[];
    favorites: number;
  };
}) {
  const [editing, setEditing] = useState(false);
  const [dark, setDark] = useState(false);
  const initial = data.name.trim().slice(0, 1).toUpperCase() || "E";

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("elon-theme", next ? "dark" : "light");
    setDark(next);
  }

  return (
    <div className="mx-auto max-w-md space-y-6 pb-4">
      <header className="flex flex-col items-center px-4 pt-2 text-center">
        <span className="grid h-24 w-24 place-items-center rounded-full bg-muted text-3xl font-semibold text-foreground">
          {initial}
        </span>
        <h1 className="mt-4 text-xl font-bold">{data.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data.phone || (telegram ? "Telegram hisobi" : "Telefon kiritilmagan")}
        </p>
        {data.address ? <p className="mt-0.5 text-sm text-muted-foreground">{data.address}</p> : null}
        <button
          type="button"
          onClick={() => setEditing((open) => !open)}
          className="mt-4 rounded-full border border-primary px-5 py-2 text-sm font-medium text-primary"
        >
          Profilni tahrirlash
        </button>
      </header>

      {editing ? (
        telegram ? (
          <TelegramProfileForm hint="Ism Telegramdan olinadi va shu yerda o'zgarmaydi." onDone={() => setEditing(false)} />
        ) : (
          <WebEditor
            name={data.firstName}
            lastName={data.lastName}
            phone={data.phone}
            address={data.address}
            onDone={() => setEditing(false)}
          />
        )
      ) : null}

      <Group title="Sozlamalar">
        <button type="button" onClick={toggleTheme} className="flex w-full items-center gap-3 py-3.5 text-left">
          {dark ? <Moon className="h-5 w-5 shrink-0" /> : <Sun className="h-5 w-5 shrink-0" />}
          <span className="flex-1 text-sm font-medium">Mavzu</span>
          <span className="text-sm text-muted-foreground">{dark ? "Tun" : "Kun"}</span>
        </button>
        <Link to="/notices" className="flex items-center gap-3 py-3.5">
          <Bell className="h-5 w-5 shrink-0" />
          <span className="flex-1 text-sm font-medium">Bildirishnomalar</span>
          <span className="text-sm text-muted-foreground">Ochish</span>
        </Link>
        <Link to="/chat" className="flex items-center gap-3 py-3.5">
          <Send className="h-5 w-5 shrink-0" />
          <span className="flex-1 text-sm font-medium">Admin bilan bog'lanish</span>
        </Link>
      </Group>

      <Group title="E'lonlar">
        <Link to="/my" className="flex items-center gap-3 py-3.5">
          <LayoutList className="h-5 w-5 shrink-0" />
          <span className="flex-1 text-sm font-medium">E'lonlarim</span>
          <span className="text-sm text-muted-foreground">{data.listings.length}</span>
        </Link>
        <Link to="/saved" className="flex items-center gap-3 py-3.5">
          <Heart className="h-5 w-5 shrink-0" />
          <span className="flex-1 text-sm font-medium">Sevimlilar</span>
          <span className="text-sm text-muted-foreground">{data.favorites}</span>
        </Link>
      </Group>

      {telegram ? null : <LogoutButton />}
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-base font-bold">{title}</h2>
      <div className="rounded-3xl bg-muted/70 px-4">{children}</div>
    </section>
  );
}

function WebEditor({
  name: initialName,
  lastName: initialLast,
  phone: initialPhone,
  address: initialAddress,
  onDone,
}: {
  name: string;
  lastName: string;
  phone: string;
  address: string;
  onDone: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [lastName, setLastName] = useState(initialLast);
  const [phone, setPhone] = useState(initialPhone);
  const [address, setAddress] = useState(initialAddress);
  const update = useServerFn(webUserUpdate);
  const qc = useQueryClient();

  const save = useMutation({
    mutationFn: () => update({ data: { name, lastName, phone, address } }),
    onSuccess: () => {
      toast.success("Profil saqlandi");
      void qc.invalidateQueries({ queryKey: ["web-user"] });
      void qc.invalidateQueries({ queryKey: ["user-desk"] });
      onDone();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Xatolik"),
  });

  return (
    <form
      className="space-y-3 rounded-3xl bg-muted/70 px-4 py-4"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <ProfileField id="profile-name" label="Ism" value={name} onChange={setName} />
      <ProfileField id="profile-last" label="Familiya" value={lastName} onChange={setLastName} />
      <ProfileField id="profile-phone" label="Telefon" value={phone} onChange={setPhone} placeholder="+998 90 123 45 67" />
      <ProfileField id="profile-address" label="Manzil" value={address} onChange={setAddress} placeholder="Shahar, ko'cha, uy" />
      <Button type="submit" className="h-11 w-full rounded-full" disabled={save.isPending}>
        {save.isPending ? "Saqlanmoqda..." : "Saqlash"}
      </Button>
    </form>
  );
}

function ProfileField({
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
        className="rounded-xl bg-background"
      />
    </div>
  );
}

function LogoutButton() {
  const logout = useServerFn(webUserLogout);
  const qc = useQueryClient();
  const exit = useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["web-user"] });
      void qc.removeQueries({ queryKey: ["my-listings"] });
      void qc.removeQueries({ queryKey: ["user-desk"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Xatolik"),
  });

  return (
    <button
      type="button"
      className="h-11 w-full rounded-full border border-border text-sm font-medium text-foreground"
      disabled={exit.isPending}
      onClick={() => exit.mutate()}
    >
      Chiqish
    </button>
  );
}
