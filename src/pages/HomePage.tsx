import { ArrowRight, Copy, DoorOpen, Eye, LoaderCircle, Plus, ShieldCheck, UsersRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Brand } from "../components/common/Brand";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { useEmulators } from "../firebase/firebase";
import { friendlyError } from "../services/errors";
import { roomService } from "../services/roomService";
import { localProfile } from "../utils/storage";

type HomeMode = "create" | "join";

export function HomePage() {
  const navigate = useNavigate();
  const { user, ready, error } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState<HomeMode>("create");
  const [nickname, setNickname] = useState(localProfile.getNickname());
  const [roomCode, setRoomCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || busy) return;
    setBusy(true);
    try {
      const result = mode === "create"
        ? await roomService.create(nickname)
        : await roomService.join(nickname, roomCode);
      localProfile.setNickname(nickname.trim());
      localProfile.setRoom(result.roomCode);
      navigate(`/room/${result.roomCode}`);
    } catch (submissionError) {
      showToast(friendlyError(submissionError), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="home-page">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <nav className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Brand />
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-white/50"><span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399]" /> Canlı oyun</span>
      </nav>

      <section className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-5 pb-10 pt-5 sm:px-8 lg:grid-cols-[1fr_430px] lg:gap-16">
        <div className="max-w-2xl pt-4 lg:pt-0">
          <span className="eyebrow"><ShieldCheck /> Təhlükəsiz · Real vaxt · 4 oyunçu</span>
          <h1 className="mt-6 font-display text-5xl font-black leading-[0.92] tracking-[-0.05em] text-cream sm:text-7xl lg:text-8xl">
            Dostlarınızla<br /><span className="text-gold">eyni masa</span> ətrafında.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/55 sm:text-lg">Şəxsi otaq yaradın, kodu paylaşın və klassik Okey həyəcanını istənilən cihazdan birlikdə yaşayın.</p>
          <div className="mt-8 flex flex-wrap gap-6 text-xs font-bold uppercase tracking-[0.14em] text-white/40">
            <span className="flex items-center gap-2"><UsersRound className="size-4 text-gold" /> 4 nəfərlik</span>
            <span className="flex items-center gap-2"><Copy className="size-4 text-gold" /> Tək kodla giriş</span>
          </div>
        </div>

        <div className="entry-card">
          <div className="mode-tabs" role="tablist" aria-label="Otaq əməliyyatı">
            <button type="button" className={mode === "create" ? "active" : ""} onClick={() => setMode("create")}><Plus /> Otaq yarat</button>
            <button type="button" className={mode === "join" ? "active" : ""} onClick={() => setMode("join")}><DoorOpen /> Otağa qoşul</button>
          </div>

          <form onSubmit={submit} className="mt-7 space-y-5">
            <label className="field-label">Adınız
              <input value={nickname} onChange={(event) => setNickname(event.target.value)} minLength={2} maxLength={24} required placeholder="Məsələn, Rəvan" autoComplete="nickname" />
            </label>
            {mode === "join" && (
              <label className="field-label">Otaq kodu
                <input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, "").slice(0, 6))} minLength={6} maxLength={6} required placeholder="A7K9P2" className="room-code-input" autoComplete="off" />
              </label>
            )}
            <button type="submit" className="primary-button w-full" disabled={!ready || !user || busy}>
              {busy ? <LoaderCircle className="animate-spin" /> : mode === "create" ? <Plus /> : <ArrowRight />}
              {busy ? "Qoşulur..." : mode === "create" ? "Otaq yarat" : "Otağa qoşul"}
            </button>
            {error && <p className="text-center text-sm text-red-300">{error}</p>}
          </form>

          {import.meta.env.DEV && (
            <button type="button" className="secondary-button mt-3 w-full" onClick={() => navigate("/design-preview")}>
              <Eye /> Oyun dizaynına bax
            </button>
          )}

          {useEmulators && <p className="mt-5 rounded-xl bg-sky-400/10 px-3 py-2 text-center text-[11px] font-semibold text-sky-200">Yerli sınaq rejimi aktivdir</p>}
        </div>
      </section>
    </main>
  );
}
