interface EmptyStateProps {
  message: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
      <p className="text-[14px] text-[var(--color-ash)] max-w-[32ch]">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="text-[14px] font-medium text-[var(--color-gold-deep)] underline underline-offset-4 hover:text-[var(--color-gold)]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
