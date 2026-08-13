import { CircleDot } from "lucide-react";
import { Link } from "react-router-dom";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2 text-cream" aria-label="OKEY ana səhifə">
      <span className="grid size-9 place-items-center rounded-xl border border-gold/40 bg-gold/10 text-gold">
        <CircleDot className="size-5" />
      </span>
      {!compact && <span className="font-display text-xl font-black tracking-[0.16em]">OKEY</span>}
    </Link>
  );
}
