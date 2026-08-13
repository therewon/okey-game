import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { get, ref, set } from "firebase/database";
import { afterAll, beforeAll, describe, it } from "vitest";

const describeWithEmulator = process.env.FIREBASE_DATABASE_EMULATOR_HOST ? describe : describe.skip;

describeWithEmulator("simplified Realtime Database rules", () => {
  let environment: RulesTestEnvironment;
  const projectId = "demo-okey-rules";
  const roomCode = "ABC234";

  beforeAll(async () => {
    const [host, portText] = (process.env.FIREBASE_DATABASE_EMULATOR_HOST ?? "127.0.0.1:9000").split(":");
    environment = await initializeTestEnvironment({
      projectId,
      database: {
        host: host ?? "127.0.0.1",
        port: Number(portText ?? 9000),
        rules: readFileSync(resolve("database.rules.json"), "utf8"),
      },
    });
    await environment.withSecurityRulesDisabled(async (context) => {
      await set(ref(context.database(), `rooms/${roomCode}`), {
        meta: {
          hostId: "u1", status: "waiting", createdAt: 1, updatedAt: 1, lastActivityAt: 1,
          currentPlayerIndex: -1, playerOrder: ["u1"], round: 0,
        },
        players: {
          u1: { uid: "u1", nickname: "Rəvan", connected: true, ready: true, tileCount: 0, joinedAt: 1 },
        },
      });
    });
  });

  afterAll(async () => environment.cleanup());

  it("blocks unauthenticated access", async () => {
    const database = environment.unauthenticatedContext().database();
    await assertFails(get(ref(database, `rooms/${roomCode}`)));
    await assertFails(set(ref(database, `rooms/NEW234`), { test: true }));
  });

  it("lets authenticated users read a room code and join a waiting room", async () => {
    const database = environment.authenticatedContext("u2").database();
    await assertSucceeds(get(ref(database, `rooms/${roomCode}`)));
    const snapshot = await get(ref(database, `rooms/${roomCode}`));
    const room = snapshot.val() as Record<string, unknown>;
    const players = room.players as Record<string, unknown>;
    players.u2 = { uid: "u2", nickname: "Murad", connected: true, ready: false, tileCount: 0, joinedAt: 2 };
    await assertSucceeds(set(ref(database, `rooms/${roomCode}`), room));
  });

  it("allows a room member to update game state", async () => {
    const database = environment.authenticatedContext("u1").database();
    const snapshot = await get(ref(database, `rooms/${roomCode}`));
    const room = snapshot.val() as Record<string, unknown>;
    const meta = room.meta as Record<string, unknown>;
    meta.updatedAt = 3;
    await assertSucceeds(set(ref(database, `rooms/${roomCode}`), room));
  });

  it("rejects malformed room creation", async () => {
    const database = environment.authenticatedContext("u3").database();
    await assertFails(set(ref(database, "rooms/BAD234"), {
      meta: { hostId: "someone-else", status: "waiting" },
      players: {},
    }));
  });
});
