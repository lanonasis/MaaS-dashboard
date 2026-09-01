import { useRef, type ReactNode, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

export interface GlareCardProps {
  children: ReactNode;
  className?: string;
}

/**
 * GlareCard — a card with a soft "glare" highlight that follows the
 * pointer. Designed to match the feature-card surfaces on the public
 * landing page. Mouse position is exposed via `--mouse-x` / `--mouse-y`
 * CSS variables on the container, and a radial gradient on a child
 * layer reads those vars to render the highlight.
 */
export const GlareCard = ({ children, className }: GlareCardProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const node = containerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    node.style.setProperty("--mouse-x", `${x}px`);
    node.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className={cn(
        "group relative isolate flex flex-col items-stretch justify-end overflow-hidden rounded-xl",
        "bg-card border border-gray-200/60 dark:border-gray-700/60",
        "ring-0 ring-primary/0 transition-all duration-300",
        "hover:ring-2 hover:ring-primary/40 hover:-translate-y-0.5 hover:shadow-subtle-md",
        className,
      )}
      style={{
        // Initial values so the gradient has a valid origin on first paint
        // before the user moves their pointer over the card.
        ["--mouse-x" as string]: "50%",
        ["--mouse-y" as string]: "50%",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[2] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(400px circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.08), transparent 60%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(250px circle at var(--mouse-x) var(--mouse-y), rgba(59,130,246,0.18), transparent 50%)",
        }}
      />
      {children}
    </div>
  );
};

GlareCard.displayName = "GlareCard";
