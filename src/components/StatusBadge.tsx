const MAP: Record<string, { label: string; className: string }> = {
  pending: { label: "Tekshiruvda", className: "bg-accent text-accent-foreground" },
  approved: { label: "Tasdiqlangan", className: "bg-primary/15 text-primary" },
  rejected: { label: "Rad etilgan", className: "bg-destructive/15 text-destructive" },
  hidden: { label: "Yashirilgan", className: "bg-muted text-muted-foreground" },
};

export function StatusBadge({ status }: { status: string }) {
  const item = MAP[status] ?? MAP["pending"]!;
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${item.className}`}>
      {item.label}
    </span>
  );
}

const PAYMENT: Record<string, { label: string; className: string }> = {
  unpaid: { label: "To'lanmagan", className: "bg-destructive/15 text-destructive" },
  checking: { label: "To'lov keldi", className: "bg-accent text-accent-foreground" },
  paid: { label: "To'langan", className: "bg-primary/15 text-primary" },
};

export function PaymentBadge({ status }: { status: string }) {
  const item = PAYMENT[status] ?? PAYMENT["unpaid"]!;
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${item.className}`}>
      {item.label}
    </span>
  );
}
