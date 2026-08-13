import { Wifi, WifiOff } from "lucide-react";

export function ConnectionPill({ connected }: { connected: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${connected ? "bg-emerald-400/12 text-emerald-300" : "bg-red-400/12 text-red-300"}`}>
      {connected ? <Wifi className="size-3" /> : <WifiOff className="size-3" />}
      {connected ? "Onlayn" : "Offline"}
    </span>
  );
}
