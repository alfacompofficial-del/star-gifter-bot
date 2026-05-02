import { Star } from "lucide-react";

export function StarsBadge({ value, label }: { value: number; label?: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 gradient-card px-4 py-2 shadow-card">
      <Star className="h-4 w-4 fill-primary text-primary" />
      <span className="font-semibold text-gold tabular-nums">{value.toLocaleString()}</span>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  );
}
