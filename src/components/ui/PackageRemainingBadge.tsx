interface PackageRemainingBadgeProps {
  used: number;
  total: number;
}

/** A PT can still log a session once a member's package is used up — the
 * owner would rather see it and settle it on renewal than have the session
 * silently blocked or the shortfall hidden. Clamping to "0 ders kaldı"
 * would erase that debt; this shows it instead. */
export function PackageRemainingBadge({ used, total }: PackageRemainingBadgeProps) {
  const remaining = total - used;
  if (remaining >= 0) {
    return <span className="shrink-0 text-[12px] font-medium text-[var(--color-ink-soft)]">{remaining} ders kaldı</span>;
  }
  return <span className="shrink-0 text-[12px] font-medium text-[var(--color-danger)]">{Math.abs(remaining)} ders borçlu</span>;
}
