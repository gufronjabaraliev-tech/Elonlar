import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDownRight,
  ArrowUpRight,
  Eye,
  ImageOff,
  Megaphone,
  Minus,
  Users,
  Wallet,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Area, Bar, CartesianGrid, ComposedChart, XAxis, YAxis } from "recharts";

import { AdminGate } from "@/components/AdminGate";
import { type AdminStatus } from "@/components/AdminShell";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { useTelegramSession } from "@/hooks/useTelegramSession";
import { dashboardReport, type MetricPair } from "@/lib/dashboard-metrics";
import { adminDashboard, adminListings, publicPlatform } from "@/lib/listings.functions";
import { categoryLabel, formatPrice, imageUrl } from "@/lib/telegram";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin_/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard" }, { name: "description", content: "Daromad va mijozlar ko'rsatkichlari." }],
  }),
  component: DashboardPage,
});

const PERIODS = [
  { days: 7, label: "7 kun" },
  { days: 30, label: "30 kun" },
  { days: 90, label: "90 kun" },
] as const;

type Period = (typeof PERIODS)[number]["days"];

const moneyConfig = {
  income: { label: "Kirim", color: "var(--primary)" },
  expense: { label: "Harajat", color: "var(--destructive)" },
} satisfies ChartConfig;

const peopleConfig = {
  customers: { label: "Yangi", color: "var(--primary)" },
  totalCustomers: { label: "Jami", color: "var(--foreground)" },
} satisfies ChartConfig;

function DashboardPage() {
  return (
    <AdminGate>
      <Dashboard />
    </AdminGate>
  );
}

function Dashboard() {
  const { initData } = useTelegramSession();
  const fetchBoard = useServerFn(adminDashboard);
  const fetchList = useServerFn(adminListings);
  const fetchPlatform = useServerFn(publicPlatform);
  const [period, setPeriod] = useState<Period>(30);
  const [chart, setChart] = useState<"money" | "customers">("money");

  const board = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => fetchBoard({ data: { initData } }),
  });
  const platform = useQuery({
    queryKey: ["platform"],
    queryFn: () => fetchPlatform(),
  });
  const pending = useQuery({
    queryKey: ["admin-dashboard-pending"],
    queryFn: () => fetchList({ data: { initData, status: "pending", offset: 0 } }),
  });

  const report = useMemo(
    () => (board.data ? dashboardReport(board.data.rows, board.data.expenses, period) : null),
    [board.data, period],
  );
  const rows = pending.data?.items.slice(0, 4) ?? [];
  const campaign = platform.data?.campaignName || "Dashboard";

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{report?.todayLabel ?? "Bugun"}</p>
          <h1 className="truncate text-2xl font-extrabold tracking-tight">{campaign}</h1>
        </div>
        <PeriodSwitch value={period} onChange={setPeriod} />
      </div>

      {board.isPending || !report ? (
        <BoardSkeleton />
      ) : (
        <>
          <Hero report={report} period={period} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Kpi
              icon={Wallet}
              label="Kirim"
              value={formatPrice(report.income.current, "UZS")}
              pair={report.income}
            />
            <Kpi
              icon={Users}
              label="Yangi mijozlar"
              value={String(report.customers.current)}
              pair={report.customers}
              hint="jami"
              hintValue={String(report.customerTotal)}
            />
            <Kpi
              icon={Megaphone}
              label="E'lonlar"
              value={String(report.listings.current)}
              pair={report.listings}
            />
            <Kpi
              icon={Eye}
              label="Ko'rishlar"
              value={new Intl.NumberFormat("uz-UZ").format(report.views.current)}
              pair={report.views}
            />
          </div>

          <section className="rounded-3xl border border-border/70 bg-card p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold">
                  {chart === "money" ? "Daromad va harajat" : "Mijozlar o'sishi"}
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  {chart === "money"
                    ? `${report.paidCount} ta to'lov · o'rtacha ${formatPrice(report.averageFee, "UZS")}`
                    : `Jami ${report.customerTotal} ta mijoz`}
                </p>
              </div>
              <div className="flex rounded-full bg-muted p-1">
                <ChartTab active={chart === "money"} onClick={() => setChart("money")}>
                  Pul
                </ChartTab>
                <ChartTab active={chart === "customers"} onClick={() => setChart("customers")}>
                  Mijoz
                </ChartTab>
              </div>
            </div>
            {chart === "money" ? <MoneyChart points={report.points} /> : <PeopleChart points={report.points} />}
            <div className="mt-1 flex gap-4 text-[11px] text-muted-foreground">
              {chart === "money" ? (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-primary" /> Kirim
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-destructive" /> Harajat
                  </span>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-primary/40" /> Yangi
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-0.5 w-3 rounded-full bg-primary" /> Jami
                  </span>
                </>
              )}
            </div>
          </section>

          <div className="grid gap-2 sm:grid-cols-2">
            <StatusCard report={report} />
            <CategoryCard report={report} />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <CityCard report={report} />
            <ViewedCard report={report} />
          </div>
        </>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Tekshiruvdagi e'lonlar</h2>
          <Link to="/admin" search={{ status: "pending" }} className="text-xs font-medium text-primary">
            Barchasi
          </Link>
        </div>
        {pending.isPending ? (
          <Skeleton className="h-16 rounded-2xl" />
        ) : rows.length > 0 ? (
          <div className="overflow-hidden rounded-3xl border border-border/70 bg-card">
            {rows.map((listing, index) => (
              <Link
                key={listing.id}
                to="/admin/listing/$id"
                params={{ id: listing.id }}
                className={cn("flex items-center gap-3 px-3 py-2.5", index > 0 && "border-t border-border/70")}
              >
                {listing.images[0] ? (
                  <img
                    src={imageUrl(listing.images[0], listing.imageToken)}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                    <ImageOff className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={listing.status} />
                    <span className="truncate text-[11px] text-muted-foreground">
                      {categoryLabel(listing.category)}
                    </span>
                  </div>
                  <p className="truncate text-sm font-medium">{listing.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatPrice(Number(listing.price), listing.currency)}
                    {listing.city ? ` · ${listing.city}` : ""}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-3xl border border-border/70 bg-card py-8 text-center text-sm text-muted-foreground">
            Tekshiruvda e'lon yo'q.
          </p>
        )}
      </div>
    </div>
  );
}

function PeriodSwitch({ value, onChange }: { value: Period; onChange: (days: Period) => void }) {
  return (
    <div className="flex shrink-0 rounded-full bg-muted p-1">
      {PERIODS.map((item) => (
        <button
          key={item.days}
          type="button"
          onClick={() => onChange(item.days)}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold sm:px-3 sm:text-xs",
            value === item.days ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function Hero({
  report,
  period,
}: {
  report: ReturnType<typeof dashboardReport>;
  period: Period;
}) {
  const negative = report.net.current < 0;
  return (
    <section className="relative overflow-hidden rounded-3xl bg-primary px-5 py-5 text-primary-foreground">
      <div className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-white/15" />
      <div className="pointer-events-none absolute -bottom-14 right-16 h-28 w-28 rounded-full bg-black/10" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium opacity-80">Sof natija · {period} kun</p>
          <p className="mt-1 text-[1.7rem] font-extrabold leading-none tracking-tight">
            {new Intl.NumberFormat("uz-UZ").format(report.net.current)}
            <span className="ml-1 text-sm font-semibold opacity-80">so'm</span>
          </p>
          <p className="mt-1 text-[11px] opacity-80">
            Jami qoldiq {formatPrice(report.allTimeBalance, "UZS")}
            {negative ? " · davr xarajati kirimdan yuqori" : ""}
          </p>
        </div>
        <Sparkline values={report.spark} />
      </div>
      <div className="relative mt-5 grid grid-cols-3 gap-2 border-t border-primary-foreground/15 pt-4">
        <HeroFact label="Kirim" value={formatPrice(report.income.current, "UZS")} />
        <HeroFact label="Harajat" value={formatPrice(report.expense.current, "UZS")} />
        <HeroFact label="Kutilmoqda" value={formatPrice(report.waiting, "UZS")} />
      </div>
    </section>
  );
}

function HeroFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide opacity-70">{label}</p>
      <p className="truncate text-sm font-bold">{value}</p>
    </div>
  );
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const width = 112;
  const height = 42;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const line = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * (height - 6) - 3;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-11 w-28 shrink-0 opacity-90" aria-hidden>
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  pair,
  invert = false,
  hint,
  hintValue,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  pair: MetricPair;
  invert?: boolean;
  hint?: string;
  hintValue?: string;
}) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <Trend current={pair.current} previous={pair.previous} invert={invert} />
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">{label}</p>
      <p className="truncate text-lg font-extrabold tracking-tight">{value}</p>
      <p className="truncate text-[11px] text-muted-foreground">
        {hint && hintValue ? `${hint} ${hintValue}` : `oldingi ${formatPair(pair.previous, label)}`}
      </p>
    </div>
  );
}

function formatPair(value: number, label: string) {
  if (label === "Kirim") return formatPrice(value, "UZS");
  return new Intl.NumberFormat("uz-UZ").format(value);
}

function Trend({
  current,
  previous,
  invert = false,
}: {
  current: number;
  previous: number;
  invert?: boolean;
}) {
  const flat = current === previous;
  const up = current > previous;
  const good = invert ? !up : up;
  const label =
    previous === 0 ? (current === 0 ? "0%" : "yangi") : `${up ? "+" : ""}${Math.round(((current - previous) / Math.abs(previous)) * 100)}%`;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
        flat && "bg-muted text-muted-foreground",
        !flat && good && "bg-primary/15 text-primary",
        !flat && !good && "bg-destructive/15 text-destructive",
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function ChartTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-[11px] font-semibold",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}

function axisMoney(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${Math.round(abs / 100_000) / 10}mln`;
  if (abs >= 1000) return `${sign}${Math.round(abs / 1000)}k`;
  return String(value);
}

function MoneyChart({ points }: { points: ReturnType<typeof dashboardReport>["points"] }) {
  return (
    <ChartContainer config={moneyConfig} className="aspect-auto h-52 w-full">
      <ComposedChart data={points} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-income)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-income)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval={tickEvery(points.length)} fontSize={10} />
        <YAxis tickLine={false} axisLine={false} width={36} fontSize={10} tickFormatter={axisMoney} />
        <ChartTooltip content={<MoneyTip />} />
        <Area
          type="monotone"
          dataKey="income"
          name="Kirim"
          stroke="var(--color-income)"
          fill="url(#incomeFill)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="expense"
          name="Harajat"
          stroke="var(--color-expense)"
          fill="transparent"
          strokeWidth={2}
          strokeDasharray="4 3"
        />
      </ComposedChart>
    </ChartContainer>
  );
}

function PeopleChart({ points }: { points: ReturnType<typeof dashboardReport>["points"] }) {
  return (
    <ChartContainer config={peopleConfig} className="aspect-auto h-52 w-full">
      <ComposedChart data={points} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} interval={tickEvery(points.length)} fontSize={10} />
        <YAxis yAxisId="total" orientation="right" tickLine={false} axisLine={false} width={24} fontSize={10} allowDecimals={false} />
        <ChartTooltip content={<PeopleTip />} />
        <Area
          yAxisId="total"
          type="monotone"
          dataKey="totalCustomers"
          name="Jami"
          stroke="var(--color-customers)"
          fill="var(--color-customers)"
          fillOpacity={0.12}
          strokeWidth={2.4}
        />
        <Bar yAxisId="total" dataKey="customers" name="Yangi" fill="var(--color-customers)" radius={[4, 4, 0, 0]} barSize={12} />
      </ComposedChart>
    </ChartContainer>
  );
}

function tickEvery(length: number) {
  if (length <= 7) return 0;
  if (length <= 31) return 4;
  return 13;
}

function MoneyTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <TipCard label={label ?? ""}>
      {payload.map((item) => (
        <p key={item.name}>
          {item.name}: {formatPrice(Number(item.value ?? 0), "UZS")}
        </p>
      ))}
    </TipCard>
  );
}

function PeopleTip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <TipCard label={label ?? ""}>
      {payload.map((item) => (
        <p key={item.name}>
          {item.name}: {item.value ?? 0}
        </p>
      ))}
    </TipCard>
  );
}

function TipCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
      <p className="mb-1 font-semibold">{label}</p>
      {children}
    </div>
  );
}

function StatusCard({ report }: { report: ReturnType<typeof dashboardReport> }) {
  const items: { key: AdminStatus; label: string; count: number; className: string }[] = [
    { key: "approved", label: "Tasdiq", count: report.statuses.approved, className: "bg-primary" },
    { key: "pending", label: "Tekshiruv", count: report.statuses.pending, className: "bg-amber-500" },
    { key: "rejected", label: "Rad", count: report.statuses.rejected, className: "bg-destructive" },
    { key: "hidden", label: "Yashirin", count: report.statuses.hidden, className: "bg-muted-foreground/50" },
  ];
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return (
    <section className="rounded-3xl border border-border/70 bg-card p-4">
      <h2 className="text-sm font-semibold">Tasdiqlash</h2>
      <div className="mt-3 flex items-center gap-4">
        <div
          className="grid h-16 w-16 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(var(--primary) ${report.approvalRate}%, var(--muted) 0)`,
          }}
        >
          <div className="grid h-11 w-11 place-items-center rounded-full bg-card text-sm font-extrabold">
            {report.approvalRate}%
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
            {total === 0 ? null : items.map((item) =>
              item.count > 0 ? (
                <div
                  key={item.key}
                  className={item.className}
                  style={{ width: `${(item.count / total) * 100}%` }}
                />
              ) : null,
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {items.map((item) => (
              <Link key={item.key} to="/admin" search={{ status: item.key }} className="flex items-center gap-1.5 text-[11px]">
                <span className={cn("h-1.5 w-1.5 rounded-full", item.className)} />
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-semibold">{item.count}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryCard({ report }: { report: ReturnType<typeof dashboardReport> }) {
  const max = Math.max(...report.categories.map((item) => item.count), 1);
  return (
    <section className="rounded-3xl border border-border/70 bg-card p-4">
      <h2 className="text-sm font-semibold">Bo'limlar</h2>
      <div className="mt-3 space-y-3">
        {report.categories.map((item) => (
          <div key={item.key}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span>{item.label}</span>
              <span className="font-semibold">{item.count}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CityCard({ report }: { report: ReturnType<typeof dashboardReport> }) {
  const max = Math.max(...report.cities.map((item) => item.count), 1);
  return (
    <section className="rounded-3xl border border-border/70 bg-card p-4">
      <h2 className="text-sm font-semibold">Shaharlar</h2>
      {report.cities.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Shu davrda joylashuv yo'q.</p>
      ) : (
        <div className="mt-3 space-y-2.5">
          {report.cities.map((item) => (
            <div key={item.name} className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{item.name}</p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary/80" style={{ width: `${(item.count / max) * 100}%` }} />
                </div>
              </div>
              <span className="text-xs font-bold">{item.count}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ViewedCard({ report }: { report: ReturnType<typeof dashboardReport> }) {
  return (
    <section className="rounded-3xl border border-border/70 bg-card p-4">
      <h2 className="text-sm font-semibold">Eng ko'p ko'rilgan</h2>
      {report.viewed.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">Hali ko'rishlar yo'q.</p>
      ) : (
        <div className="mt-2">
          {report.viewed.map((item, index) => (
            <Link
              key={item.id}
              to="/admin/listing/$id"
              params={{ id: item.id }}
              className={cn("flex items-center gap-3 py-2", index > 0 && "border-t border-border/70")}
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-muted text-xs font-bold">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{item.title}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{item.city}</span>
              </span>
              <span className="text-xs font-semibold text-muted-foreground">{item.views}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function BoardSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-40 rounded-3xl" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-28 rounded-3xl" />
        <Skeleton className="h-28 rounded-3xl" />
      </div>
      <Skeleton className="h-64 rounded-3xl" />
    </div>
  );
}
