import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
}

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium transition-[transform,background-color,border-color] duration-100 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none",
        size === "md" ? "h-10 px-4 text-[14px]" : "h-12 px-5 text-[15px]",
        variant === "primary" && "bg-[var(--color-gold)] text-[var(--color-paper)] hover:bg-[var(--color-gold-deep)]",
        variant === "secondary" &&
          "bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-line-strong)] hover:border-[var(--color-ink)]",
        variant === "ghost" && "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]",
        className,
      )}
      {...props}
    />
  );
}
