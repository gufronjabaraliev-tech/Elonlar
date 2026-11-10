import { categoryLabel } from "@/lib/telegram";

export type ActivityRow = {
  id: string;
  created_at: string;
  owner: number;
  category: string;
  city: string;
  status: string;
  views: number;
  fee: number;
  payment: string;
  title: string;
};

export type ActivityExpense = {
  created_at: string;
  amount: number;
};

export type DayPoint = {
  date: string;
  label: string;
  income: number;
  expense: number;
  listings: number;
  customers: number;
  totalCustomers: number;
};

export type MetricPair = {
  current: number;
  previous: number;
};

export type DashboardReport = {
  todayLabel: string;
  points: DayPoint[];
  spark: number[];
  income: MetricPair;
  expense: MetricPair;
  net: MetricPair;
  customers: MetricPair;
  listings: MetricPair;
  views: MetricPair;
  paidCount: number;
  averageFee: number;
  waiting: number;
  allTimeBalance: number;
  statuses: {
    pending: number;
    approved: number;
    rejected: number;
    hidden: number;
  };
  approvalRate: number;
  categories: { key: string; label: string; count: number }[];
  cities: { name: string; count: number }[];
  viewed: { id: string; title: string; views: number; city: string }[];
  customerTotal: number;
};

const DAY = 86_400_000;
const MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
];

function tashkentDate(input: Date | string) {
  const date = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(date);
}

function rangeKeys(today: string, count: number) {
  const [year, month, day] = today.split("-").map(Number);
  const start = Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  const keys: string[] = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    keys.push(new Date(start - index * DAY).toISOString().slice(0, 10));
  }
  return keys;
}

function axisLabel(key: string) {
  const [, month, day] = key.split("-");
  return `${Number(day)}.${month}`;
}

function prettyDate(key: string) {
  const [, month, day] = key.split("-").map(Number);
  return `${day} ${MONTHS[(month ?? 1) - 1] ?? ""}`;
}

function isWaiting(row: ActivityRow) {
  return (
    row.fee > 0 &&
    (row.payment === "checking" || (row.payment === "unpaid" && row.status === "pending"))
  );
}

function sumIn(keys: Set<string>, values: Map<string, number>) {
  let total = 0;
  for (const key of keys) total += values.get(key) ?? 0;
  return total;
}

export function dashboardReport(
  rows: ActivityRow[],
  expenses: ActivityExpense[],
  days: number,
  now = new Date(),
): DashboardReport {
  const today = tashkentDate(now);
  const keys = rangeKeys(today, days * 2);
  const currentKeys = keys.slice(days);
  const previousKeys = keys.slice(0, days);
  const current = new Set(currentKeys);
  const previous = new Set(previousKeys);

  const incomeByDay = new Map<string, number>();
  const listingsByDay = new Map<string, number>();
  const viewsByDay = new Map<string, number>();
  const expenseByDay = new Map<string, number>();
  const firstSeen = new Map<number, string>();

  let allIncome = 0;
  let waiting = 0;
  let paidCount = 0;
  const statuses = { pending: 0, approved: 0, rejected: 0, hidden: 0 };
  const categoryCount = new Map<string, number>();
  const cityCount = new Map<string, number>();

  for (const row of rows) {
    const key = tashkentDate(row.created_at);
    const seen = firstSeen.get(row.owner);
    if (!seen || key < seen) firstSeen.set(row.owner, key);
    listingsByDay.set(key, (listingsByDay.get(key) ?? 0) + 1);
    viewsByDay.set(key, (viewsByDay.get(key) ?? 0) + row.views);
    if (row.payment === "paid" && row.fee > 0) {
      incomeByDay.set(key, (incomeByDay.get(key) ?? 0) + row.fee);
      allIncome += row.fee;
      if (current.has(key)) paidCount += 1;
    }
    if (isWaiting(row)) waiting += row.fee;
    if (row.status === "pending" && current.has(key)) statuses.pending += 1;
    if (row.status === "approved" && current.has(key)) statuses.approved += 1;
    if (row.status === "rejected" && current.has(key)) statuses.rejected += 1;
    if (row.status === "hidden" && current.has(key)) statuses.hidden += 1;
    if (current.has(key)) {
      categoryCount.set(row.category, (categoryCount.get(row.category) ?? 0) + 1);
      const city = row.city.trim();
      if (city) cityCount.set(city, (cityCount.get(city) ?? 0) + 1);
    }
  }

  for (const expense of expenses) {
    const key = tashkentDate(expense.created_at);
    expenseByDay.set(key, (expenseByDay.get(key) ?? 0) + expense.amount);
  }

  const newByDay = new Map<string, number>();
  for (const seen of firstSeen.values()) newByDay.set(seen, (newByDay.get(seen) ?? 0) + 1);

  let runningCustomers = 0;
  const seenBefore = [...firstSeen.values()].filter((key) => key < (currentKeys[0] ?? today)).length;
  runningCustomers = seenBefore;

  const points: DayPoint[] = currentKeys.map((date) => {
    const fresh = newByDay.get(date) ?? 0;
    runningCustomers += fresh;
    return {
      date,
      label: axisLabel(date),
      income: incomeByDay.get(date) ?? 0,
      expense: expenseByDay.get(date) ?? 0,
      listings: listingsByDay.get(date) ?? 0,
      customers: fresh,
      totalCustomers: runningCustomers,
    };
  });

  let sparkRun = 0;
  const spark = points.map((point) => {
    sparkRun += point.income - point.expense;
    return sparkRun;
  });

  const income = { current: sumIn(current, incomeByDay), previous: sumIn(previous, incomeByDay) };
  const expense = { current: sumIn(current, expenseByDay), previous: sumIn(previous, expenseByDay) };
  const periodListings = sumIn(current, listingsByDay);
  const allExpense = [...expenseByDay.values()].reduce((sum, amount) => sum + amount, 0);
  const statusTotal = statuses.pending + statuses.approved + statuses.rejected + statuses.hidden;

  return {
    todayLabel: prettyDate(today),
    points,
    spark,
    income,
    expense,
    net: { current: income.current - expense.current, previous: income.previous - expense.previous },
    customers: { current: sumIn(current, newByDay), previous: sumIn(previous, newByDay) },
    listings: { current: periodListings, previous: sumIn(previous, listingsByDay) },
    views: { current: sumIn(current, viewsByDay), previous: sumIn(previous, viewsByDay) },
    paidCount,
    averageFee: paidCount > 0 ? Math.round(income.current / paidCount) : 0,
    waiting,
    allTimeBalance: allIncome - allExpense,
    statuses,
    approvalRate: statusTotal > 0 ? Math.round((statuses.approved / statusTotal) * 100) : 0,
    categories: ["uy", "mashina", "boshqa"].map((key) => ({
      key,
      label: categoryLabel(key),
      count: categoryCount.get(key) ?? 0,
    })),
    cities: [...cityCount.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "uz"))
      .slice(0, 5)
      .map(([name, count]) => ({ name, count })),
    viewed: [...rows]
      .sort((a, b) => b.views - a.views || b.created_at.localeCompare(a.created_at))
      .slice(0, 3)
      .filter((row) => row.views > 0)
      .map((row) => ({ id: row.id, title: row.title, views: row.views, city: row.city })),
    customerTotal: firstSeen.size,
  };
}
