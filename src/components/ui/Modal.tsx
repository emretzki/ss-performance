import type { ReactNode } from "react";
import clsx from "clsx";
import { X } from "@phosphor-icons/react";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { useEscapeClose } from "@/hooks/useEscapeClose";

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, subtitle, onClose, children }: ModalProps) {
  const isDesktop = useIsDesktop();
  useEscapeClose(onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-[var(--color-paper)]/72 transition-opacity duration-200" onClick={onClose} />
      <div
        className={clsx(
          "relative z-10 flex w-full flex-col gap-5 bg-[var(--color-surface)] p-5 shadow-[var(--shadow-float)] transition-transform duration-200",
          isDesktop ? "max-w-sm rounded-[var(--radius-lg)]" : "max-h-[90dvh] overflow-y-auto rounded-t-[var(--radius-lg)] pb-[max(20px,env(safe-area-inset-bottom))]",
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-[20px] font-bold leading-none">{title}</p>
            {subtitle && <p className="mt-1 text-[13px] text-[var(--color-ash)]">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ash)] hover:bg-[var(--color-surface-2)]" aria-label="Kapat">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
