export function PayDetails({
  card,
  click,
  payme,
}: {
  card: string;
  click: string;
  payme: string;
}) {
  const rows = [
    card ? { label: "Karta", value: card } : null,
    click ? { label: "Click", value: click } : null,
    payme ? { label: "Payme", value: payme } : null,
  ].filter((row) => row !== null);

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Admin hali to'lov rekvizitini kiritmagan.</p>;
  }

  return (
    <ul className="space-y-1 text-sm">
      {rows.map((row) => (
        <li key={row.label}>
          <span className="text-muted-foreground">{row.label}: </span>
          <span className="font-medium">{row.value}</span>
        </li>
      ))}
    </ul>
  );
}
