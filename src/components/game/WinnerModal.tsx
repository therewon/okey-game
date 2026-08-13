import type { Player } from "@okey/shared";
import { LoaderCircle, LogOut, RotateCcw, Trophy } from "lucide-react";

interface WinnerModalProps {
  winner: Player | undefined;
  votes: number;
  total: number;
  hasVoted: boolean;
  busy: boolean;
  onRematch: () => void;
  onLeave: () => void;
}

export function WinnerModal({ winner, votes, total, hasVoted, busy, onRematch, onLeave }: WinnerModalProps) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="winner-title">
      <div className="winner-card">
        <span className="winner-icon"><Trophy /></span>
        <p className="section-kicker">Oyun bitdi</p>
        <h2 id="winner-title" className="mt-2 font-display text-3xl font-black text-cream sm:text-4xl">{winner?.nickname ?? "Oyunçu"} qalib gəldi!</h2>
        <p className="mt-3 text-sm text-white/50">Yeni masa üçün bütün oyunçuların səsi lazımdır.</p>
        <div className="my-6">
          <div className="mb-2 flex justify-between text-xs font-bold text-white/55"><span>Yenidən oyun</span><span>{votes} / {total}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gold transition-all" style={{ width: `${total > 0 ? (votes / total) * 100 : 0}%` }} /></div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" className={hasVoted ? "ready-button" : "primary-button"} onClick={onRematch} disabled={hasVoted || busy}>
            {busy ? <LoaderCircle className="animate-spin" /> : <RotateCcw />} {hasVoted ? "Səs verdiniz" : "Yenidən oyna"}
          </button>
          <button type="button" className="secondary-button" onClick={onLeave} disabled={busy}><LogOut /> Otaqdan çıx</button>
        </div>
      </div>
    </div>
  );
}
