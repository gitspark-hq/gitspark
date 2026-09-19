import { Flame } from "lucide-react";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "h-14 w-14 rounded-2xl" : size === "sm" ? "h-7 w-7 rounded-lg" : "h-8 w-8 rounded-xl";
  const icon = size === "lg" ? "h-7 w-7" : size === "sm" ? "h-4 w-4" : "h-4.5 w-4.5";
  return (
    <span
      className={`inline-flex items-center justify-center ${box} bg-primary text-primary-foreground ring-glow`}
      aria-hidden
    >
      <Flame className={icon} strokeWidth={2.5} />
    </span>
  );
}
