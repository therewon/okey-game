import { ArrowLeft, Check, Clipboard, Crown, LoaderCircle, LogOut, Play, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Brand } from "../components/common/Brand";
import { LoadingScreen } from "../components/common/LoadingScreen";
import { PlayerSlot } from "../components/lobby/PlayerSlot";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { usePresence } from "../hooks/usePresence";
import { useRoom } from "../hooks/useRoom";
import { friendlyError } from "../services/errors";
import { roomService } from "../services/roomService";
import { localProfile } from "../utils/storage";

export function RoomPage() {
  const { roomCode = "" } = useParams();
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const { showToast } = useToast();
  const room = useRoom(roomCode);
  const [busy, setBusy] = useState(false);
  usePresence(roomCode, Boolean(room.meta));

  const me = user ? room.playerMap?.[user.uid] : undefined;
  const isHost = user?.uid === room.meta?.hostId;
  const canStart = room.players.length === 4 && room.players.every((player) => player.ready);
  const slots = useMemo(() => Array.from({ length: 4 }, (_, index) => room.players[index]), [room.players]);

  useEffect(() => {
    if (room.meta?.status === "playing" || room.meta?.status === "finished") {
      navigate(`/game/${roomCode}`, { replace: true });
    }
  }, [navigate, room.meta?.status, roomCode]);

  useEffect(() => {
    if (ready && !room.loading && (room.denied || !room.meta)) {
      localProfile.clearRoom();
      navigate("/", { replace: true });
    }
  }, [navigate, ready, room.denied, room.loading, room.meta]);

  if (!ready || room.loading || !room.meta || !user) return <LoadingScreen label="Otaq açılır..." />;

  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try { await action(); } catch (error) { showToast(friendlyError(error), "error"); } finally { setBusy(false); }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      showToast("Otaq kodu kopyalandı.", "success");
    } catch { showToast("Kodu kopyalamaq mümkün olmadı.", "error"); }
  };

  const leave = () => run(async () => {
    await roomService.leave(roomCode);
    localProfile.clearRoom();
    navigate("/");
  });

  return (
    <main className="lobby-page">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
        <Brand />
        <button type="button" className="ghost-button" onClick={leave} disabled={busy}><LogOut /> Otaqdan çıx</button>
      </nav>
      <section className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-8 px-5 pb-10 sm:px-8 lg:grid-cols-[340px_1fr]">
        <aside className="room-code-card">
          <span className="eyebrow"><UsersRound /> Şəxsi otaq</span>
          <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-white/40">Otaq kodu</p>
          <strong className="my-3 block font-display text-5xl font-black tracking-[0.16em] text-cream">{roomCode}</strong>
          <button type="button" onClick={copyCode} className="secondary-button w-full"><Clipboard /> Kopyala</button>
          <div className="mt-7 border-t border-white/10 pt-6">
            <p className="text-sm leading-6 text-white/50">Bu kodu dostlarınıza göndərin. Dörd oyunçu hazır olduqda masa açılacaq.</p>
          </div>
        </aside>

        <div className="lobby-panel">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div><p className="section-kicker">Oyunçular</p><h1 className="font-display text-3xl font-black text-cream">Masa hazırlanır</h1></div>
            <span className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold text-white/55">{room.players.length} / 4</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {slots.map((player, index) => <PlayerSlot key={player?.uid ?? index} player={player} index={index} isHost={player?.uid === room.meta?.hostId} />)}
          </div>

          <div className="mt-7 rounded-2xl border border-white/10 bg-black/20 p-4">
            {isHost ? (
              <button type="button" className="primary-button w-full" disabled={!canStart || busy} onClick={() => run(() => roomService.start(roomCode))}>
                {busy ? <LoaderCircle className="animate-spin" /> : <Play />} Oyuna başla
              </button>
            ) : (
              <button type="button" className={me?.ready ? "ready-button w-full" : "primary-button w-full"} disabled={busy} onClick={() => run(() => roomService.setReady(roomCode))}>
                {busy ? <LoaderCircle className="animate-spin" /> : me?.ready ? <Check /> : <Crown />}
                {me?.ready ? "Hazırsınız" : "Hazıram"}
              </button>
            )}
            <p className="mt-3 text-center text-xs text-white/40">
              {room.players.length < 4 ? `${4 - room.players.length} oyunçu gözlənilir...` : canStart ? "Hamı hazırdır — başlaya bilərsiniz." : "Oyunçuların hazır olması gözlənilir..."}
            </p>
          </div>
        </div>
      </section>
      <button type="button" className="fixed left-4 top-20 hidden text-white/30 hover:text-white sm:block" onClick={() => navigate("/")} aria-label="Ana səhifəyə qayıt"><ArrowLeft /></button>
    </main>
  );
}
