import { LoaderCircle } from "lucide-react";

export function LoadingScreen({ label = "Oyun hazırlanır..." }: { label?: string }) {
  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-6 text-cream">
      <div className="text-center">
        <LoaderCircle className="mx-auto mb-4 size-9 animate-spin text-gold" />
        <p className="text-sm font-semibold text-white/60">{label}</p>
      </div>
    </main>
  );
}
