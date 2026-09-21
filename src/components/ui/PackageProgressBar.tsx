interface PackageProgressBarProps {
  used: number;
  total: number;
  size?: "sm" | "lg";
}

export function PackageProgressBar({ used, total, size = "sm" }: PackageProgressBarProps) {
  const remaining = Math.max(0, total - used);
  const ratio = total > 0 ? Math.min(1, used / total) : 0;
  const low = remaining <= 1 && total > 0;
  const height = size === "lg" ? "h-2.5" : "h-1.5";

  return (
    <div className="flex flex-col gap-1">
      <div className={`w-full overflow-hidden rounded-full bg-[var(--color-surface-2)] ${height}`}>
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${ratio * 100}%`,
            background: low ? "var(--color-danger)" : "var(--color-gold)",
          }}
        />
      </div>
      {size === "lg" && (
        <p className="text-[12px] text-[var(--color-ash)]">
          <span className="font-medium text-[var(--color-ink)]">{remaining}</span> ders kaldı · {used}/{total} kullanıldı
        </p>
      )}
    </div>
  );
}
