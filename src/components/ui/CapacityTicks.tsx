import { MAX_SESSIONS_PER_SLOT } from "@/lib/types";

interface CapacityTicksProps {
  colors: string[]; // color per filled slot, in order
  size?: "sm" | "md";
}

export function CapacityTicks({ colors, size = "sm" }: CapacityTicksProps) {
  const height = size === "sm" ? 12 : 16;
  const width = size === "sm" ? 4 : 5;

  return (
    <div className="flex items-end gap-[3px]" aria-hidden="true">
      {Array.from({ length: MAX_SESSIONS_PER_SLOT }).map((_, i) => {
        const color = colors[i];
        return (
          <span
            key={i}
            className="rounded-[1.5px] transition-colors duration-150"
            style={{
              width,
              height,
              background: color ?? "transparent",
              border: color ? "none" : "1.5px solid var(--color-line-strong)",
            }}
          />
        );
      })}
    </div>
  );
}
