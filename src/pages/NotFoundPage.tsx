import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-6 text-center text-cream">
      <div><p className="section-kicker">404</p><h1 className="mt-2 font-display text-4xl font-black">Bu masa tapılmadı</h1><p className="mt-3 text-white/50">Ünvanı yoxlayın və ya yeni otaq yaradın.</p><Link to="/" className="primary-button mt-7"><ArrowLeft /> Ana səhifə</Link></div>
    </main>
  );
}
