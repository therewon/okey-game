import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, signInAnonymously, type Auth } from "firebase/auth";
import { connectDatabaseEmulator, get, getDatabase, ref, update, type Database } from "firebase/database";
import type { OkeyTile, Player, PublicGameState, RoomMeta } from "@okey/shared";
import { afterAll, describe, expect, it } from "vitest";
import { createDirectRoomService, type DirectRoomService } from "../src/services/directRoomService";

interface ClientSession {
  app: FirebaseApp;
  auth: Auth;
  database: Database;
  service: DirectRoomService;
  uid: string;
}

const hasEmulators = Boolean(process.env.FIREBASE_EMULATOR_HUB || (
  process.env.FIREBASE_AUTH_EMULATOR_HOST && process.env.FIREBASE_DATABASE_EMULATOR_HOST
));
const describeWithEmulators = hasEmulators ? describe : describe.skip;
const projectId = "demo-okey-online";
const databaseNamespace = `${projectId}-default-rtdb`;
const sessions: ClientSession[] = [];

async function createSession(label: string): Promise<ClientSession> {
  const app = initializeApp({
    apiKey: "demo-api-key",
    projectId,
    databaseURL: `http://127.0.0.1:9000?ns=${databaseNamespace}`,
  }, `direct-${label}-${Date.now()}`);
  const auth = getAuth(app);
  const database = getDatabase(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectDatabaseEmulator(database, "127.0.0.1", 9000);
  const credential = await signInAnonymously(auth);
  const session = {
    app,
    auth,
    database,
    service: createDirectRoomService(auth, database),
    uid: credential.user.uid,
  };
  sessions.push(session);
  return session;
}

afterAll(async () => Promise.all(sessions.map((session) => deleteApp(session.app))));

describeWithEmulators("simplified direct-database multiplayer", () => {
  it("runs a five-client room, turn, reconnect, and rematch flow", async () => {
    const [host, second, third, fourth, fifth] = await Promise.all([
      createSession("host"), createSession("second"), createSession("third"), createSession("fourth"), createSession("fifth"),
    ]);
    if (!host || !second || !third || !fourth || !fifth) throw new Error("Sessions were not created.");

    const { roomCode } = await host.service.create("Rəvan");
    const players = [host, second, third, fourth];
    const nicknames = ["Rəvan", "Murad", "Elvin", "Nərmin"];
    await Promise.all(players.slice(1).map((session, index) => session.service.join(nicknames[index + 1] ?? "Oyunçu", roomCode)));

    await expect(fifth.service.join("Beşinci", roomCode)).rejects.toMatchObject({ code: "room/full" });
    await expect(second.service.start(roomCode)).rejects.toMatchObject({ code: "room/host-only" });
    await Promise.all(players.slice(1).map((session) => session.service.setReady(roomCode)));
    await host.service.start(roomCode);

    const meta = (await get(ref(host.database, `rooms/${roomCode}/meta`))).val() as RoomMeta;
    const playerMap = (await get(ref(host.database, `rooms/${roomCode}/players`))).val() as Record<string, Player>;
    const publicGame = (await get(ref(host.database, `rooms/${roomCode}/publicGame`))).val() as PublicGameState;
    expect(meta.status).toBe("playing");
    expect(Object.keys(playerMap)).toHaveLength(4);
    expect(Object.values(playerMap).map((player) => player.tileCount).sort()).toEqual([14, 14, 14, 15]);
    expect(publicGame.remainingTileCount).toBe(48);

    const sessionByUid = new Map(players.map((session) => [session.uid, session]));
    const starter = sessionByUid.get(meta.currentPlayerId ?? "");
    if (!starter) throw new Error("Starter was not found.");
    const nonStarter = players.find((session) => session.uid !== starter.uid);
    if (!nonStarter) throw new Error("Non-starter was not found.");
    const starterHand = (await get(ref(starter.database, `rooms/${roomCode}/privateState/hands/${starter.uid}`))).val() as OkeyTile[];
    expect(starterHand).toHaveLength(15);
    await expect(nonStarter.service.draw(roomCode)).rejects.toMatchObject({ code: "room/not-turn" });

    const firstDiscard = starterHand[0];
    if (!firstDiscard) throw new Error("Starter hand was empty.");
    await starter.service.discard(roomCode, firstDiscard.id);

    const nextMeta = (await get(ref(host.database, `rooms/${roomCode}/meta`))).val() as RoomMeta;
    const next = sessionByUid.get(nextMeta.currentPlayerId ?? "");
    if (!next) throw new Error("Next player was not found.");
    await next.service.draw(roomCode);
    await expect(next.service.draw(roomCode)).rejects.toMatchObject({ code: "room/double-draw" });

    const starterRemaining = (await get(ref(starter.database, `rooms/${roomCode}/privateState/hands/${starter.uid}`))).val() as OkeyTile[];
    const foreignTile = starterRemaining[0];
    if (!foreignTile) throw new Error("Foreign tile was not found.");
    await expect(next.service.discard(roomCode, foreignTile.id)).rejects.toMatchObject({ code: "room/not-your-tile" });

    const nextHand = (await get(ref(next.database, `rooms/${roomCode}/privateState/hands/${next.uid}`))).val() as OkeyTile[];
    const nextDiscard = nextHand[0];
    if (!nextDiscard) throw new Error("Next hand was empty.");
    await next.service.discard(roomCode, nextDiscard.id);

    const thirdMeta = (await get(ref(host.database, `rooms/${roomCode}/meta`))).val() as RoomMeta;
    const thirdTurn = sessionByUid.get(thirdMeta.currentPlayerId ?? "");
    if (!thirdTurn) throw new Error("Third player was not found.");
    await thirdTurn.service.takeDiscard(roomCode);
    const thirdHand = (await get(ref(thirdTurn.database, `rooms/${roomCode}/privateState/hands/${thirdTurn.uid}`))).val() as OkeyTile[];
    expect(thirdHand).toHaveLength(15);
    expect(thirdHand.some((tile) => tile.id === nextDiscard.id)).toBe(true);

    await update(ref(thirdTurn.database, `rooms/${roomCode}/players/${thirdTurn.uid}`), { connected: false });
    await update(ref(thirdTurn.database, `rooms/${roomCode}/players/${thirdTurn.uid}`), { connected: true });
    const restoredHand = (await get(ref(thirdTurn.database, `rooms/${roomCode}/privateState/hands/${thirdTurn.uid}`))).val() as OkeyTile[];
    expect(restoredHand.map((tile) => tile.id)).toEqual(thirdHand.map((tile) => tile.id));

    await update(ref(host.database, `rooms/${roomCode}`), {
      "meta/status": "finished",
      "publicGame/winnerId": starter.uid,
    });
    const results = [] as Array<{ restarted: boolean; votes: number }>;
    for (const session of players) results.push(await session.service.rematch(roomCode));
    expect(results.slice(0, 3).every((result) => !result.restarted)).toBe(true);
    expect(results[3]?.restarted).toBe(true);

    const rematchMeta = (await get(ref(host.database, `rooms/${roomCode}/meta`))).val() as RoomMeta;
    expect(rematchMeta.status).toBe("playing");
    expect(rematchMeta.round).toBe(2);
    await host.service.leave(roomCode);
  }, 120_000);
});
