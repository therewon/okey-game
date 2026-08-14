import { CircleDot } from "lucide-react";
import { Link } from "react-router-dom";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2 text-cream" aria-label="OKEY ana səhifə">
      {!compact && <span className="font-display text-xl font-black tracking-[0.16em]">OKEY-MOKEY</span>}
    </Link>
  );
}
