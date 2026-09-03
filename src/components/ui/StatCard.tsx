interface StatCardProps {
  label: string;
  value: string | number;
  delta?: { value: number; label: string };
}

export function StatCard({ label, value, delta }: StatCardProps) {
  const positive = delta && delta.value >= 0;
  return (
    <div className="flex flex-col gap-1.5 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <p className="text-[12px] font-medium text-[var(--color-ash)]">{label}</p>
      <p className="font-display text-[32px] font-bold leading-none tabular-nums text-[var(--color-ink)]">{value}</p>
      {delta && (
        <p className="text-[12px] font-medium" style={{ color: positive ? "var(--color-success)" : "var(--color-danger)" }}>
          {positive ? "+" : ""}
          {delta.value} {delta.label}
        </p>
      )}
    </div>
  );
}
