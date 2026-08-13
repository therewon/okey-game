import {
  createOkeyTiles,
  dealTiles,
  getOkeyFromIndicator,
  markRoundTiles,
  shuffleTiles,
  validateHand,
  type OkeyTile,
  type RoomData,
} from "@okey/shared";
import type { Auth } from "firebase/auth";
import { get, ref, runTransaction, type Database } from "firebase/database";

const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export class RoomActionError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "RoomActionError";
  }
}

function requireUid(auth: Auth): string {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new RoomActionError("room/unauthenticated", "Oyun xidmətinə yenidən qoşulun.");
  return uid;
}

function normalizeNickname(value: string): string {
  const nickname = value.replace(/\s+/g, " ").trim();
  if (nickname.length < 2 || nickname.length > 24) {
    throw new RoomActionError("room/invalid-name", "Ad 2–24 simvol olmalıdır.");
  }
  return nickname;
}

function normalizeRoomCode(value: string): string {
  const roomCode = value.toUpperCase().replace(/\s+/g, "");
  if (!new RegExp(`^[${ROOM_ALPHABET}]{6}$`).test(roomCode)) {
    throw new RoomActionError("room/invalid-code", "Otaq kodu düzgün deyil.");
  }
  return roomCode;
}

function randomUnit(): number {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return (values[0] ?? 0) / 0x1_0000_0000;
}

function generateRoomCode(): string {
  return Array.from({ length: 6 }, () => ROOM_ALPHABET[Math.floor(randomUnit() * ROOM_ALPHABET.length)] ?? "A").join("");
}

function requireRoom(value: RoomData | null): RoomData {
  if (!value) throw new RoomActionError("room/not-found", "Otaq tapılmadı.");
  return value;
}

function requirePlayer(room: RoomData, uid: string): void {
  if (!room.players[uid]) throw new RoomActionError("room/forbidden", "Bu otağın oyunçusu deyilsiniz.");
}

function initializeRound(room: RoomData, now = Date.now()): RoomData {
  const playerOrder = room.meta.playerOrder.filter((uid) => room.players[uid] !== undefined);
  if (playerOrder.length !== 4) throw new RoomActionError("room/player-count", "Oyuna başlamaq üçün 4 oyunçu lazımdır.");

  const tiles = shuffleTiles(createOkeyTiles(), randomUnit);
  const indicatorIndex = tiles.findIndex((tile) => tile.isFakeJoker !== true);
  const indicatorTile = tiles[indicatorIndex];
  if (!indicatorTile) throw new RoomActionError("room/game-error", "Göstərici seçilə bilmədi.");
  tiles.splice(indicatorIndex, 1);

  const markedTiles = markRoundTiles(tiles, indicatorTile);
  const startingPlayerIndex = Math.floor(randomUnit() * playerOrder.length);
  const startingPlayerId = playerOrder[startingPlayerIndex];
  if (!startingPlayerId) throw new RoomActionError("room/game-error", "Başlayan oyunçu seçilə bilmədi.");
  const deal = dealTiles(markedTiles, playerOrder, startingPlayerId);

  return {
    ...room,
    meta: {
      ...room.meta,
      status: "playing",
      currentPlayerId: startingPlayerId,
      currentPlayerIndex: startingPlayerIndex,
      updatedAt: now,
      lastActivityAt: now,
      round: room.meta.round + 1,
    },
    players: Object.fromEntries(Object.entries(room.players).map(([uid, player]) => [uid, {
      ...player,
      ready: false,
      tileCount: deal.hands[uid]?.length ?? 0,
    }])),
    publicGame: {
      indicatorTile,
      okeyTile: getOkeyFromIndicator(indicatorTile),
      remainingTileCount: deal.closedPile.length,
      turnPhase: "discard",
      discardPiles: {},
      lastDiscard: null,
      winnerId: null,
      startedAt: now,
    },
    privateState: { hands: deal.hands, closedPile: deal.closedPile },
    rematchVotes: {},
  };
}

async function mutateRoom(
  database: Database,
  roomCode: string,
  mutation: (room: RoomData | null) => RoomData | null | undefined,
): Promise<RoomData | null> {
  const roomRef = ref(database, `rooms/${roomCode}`);
  const initialSnapshot = await get(roomRef);
  if (!initialSnapshot.exists()) throw new RoomActionError("room/not-found", "Otaq tapılmadı.");
  const initialRoom = initialSnapshot.val() as RoomData;
  let isInitialCacheProbe = true;
  const result = await runTransaction(
    roomRef,
    (value: RoomData | null) => {
      // A fresh Firebase client invokes the transaction once with an empty local
      // cache. Seed that attempt with the server snapshot; Firebase's compare-and-
      // retry step still protects the room if another player changed it meanwhile.
      if (isInitialCacheProbe && value === null) {
        isInitialCacheProbe = false;
        return mutation(structuredClone(initialRoom));
      }
      isInitialCacheProbe = false;
      return mutation(value);
    },
    { applyLocally: false },
  );
  if (!result.committed) throw new RoomActionError("room/conflict", "Əməliyyat tamamlanmadı. Yenidən yoxlayın.");
  return result.snapshot.exists() ? result.snapshot.val() as RoomData : null;
}

export interface DirectRoomService {
  create: (nickname: string) => Promise<{ roomCode: string }>;
  join: (nickname: string, roomCode: string) => Promise<{ roomCode: string }>;
  leave: (roomCode: string) => Promise<{ left: boolean }>;
  setReady: (roomCode: string) => Promise<{ ready: boolean }>;
  start: (roomCode: string) => Promise<{ started: boolean }>;
  draw: (roomCode: string) => Promise<{ drawn: boolean }>;
  takeDiscard: (roomCode: string) => Promise<{ taken: boolean }>;
  discard: (roomCode: string, tileId: string) => Promise<{ discarded: boolean }>;
  finish: (roomCode: string, tileId: string) => Promise<{ finished: boolean }>;
  rematch: (roomCode: string) => Promise<{ restarted: boolean; votes: number }>;
}

export function createDirectRoomService(auth: Auth, database: Database): DirectRoomService {
  return {
    async create(nicknameValue) {
      const uid = requireUid(auth);
      const nickname = normalizeNickname(nicknameValue);
      for (let attempt = 0; attempt < 8; attempt += 1) {
        const roomCode = generateRoomCode();
        const now = Date.now();
        const room: RoomData = {
          meta: {
            hostId: uid,
            status: "waiting",
            createdAt: now,
            updatedAt: now,
            lastActivityAt: now,
            currentPlayerId: null,
            currentPlayerIndex: -1,
            playerOrder: [uid],
            round: 0,
          },
          players: { [uid]: { uid, nickname, connected: true, ready: true, tileCount: 0, joinedAt: now } },
          rematchVotes: {},
        };
        const result = await runTransaction(
          ref(database, `rooms/${roomCode}`),
          (current: RoomData | null) => current === null ? room : undefined,
          { applyLocally: false },
        );
        if (result.committed) return { roomCode };
      }
      throw new RoomActionError("room/code-error", "Otaq kodu yaradıla bilmədi. Yenidən yoxlayın.");
    },

    async join(nicknameValue, roomCodeValue) {
      const uid = requireUid(auth);
      const nickname = normalizeNickname(nicknameValue);
      const roomCode = normalizeRoomCode(roomCodeValue);
      await mutateRoom(database, roomCode, (value) => {
        const room = requireRoom(value);
        const existing = room.players[uid];
        if (existing) {
          room.players[uid] = { ...existing, nickname, connected: true };
          room.meta.updatedAt = Date.now();
          return room;
        }
        if (room.meta.status !== "waiting") throw new RoomActionError("room/started", "Oyun artıq başlayıb.");
        if (Object.keys(room.players).length >= 4) throw new RoomActionError("room/full", "Otaq artıq doludur.");
        if (Object.values(room.players).some((player) => player.nickname.toLocaleLowerCase("az") === nickname.toLocaleLowerCase("az"))) {
          throw new RoomActionError("room/name-used", "Bu ad otaqda artıq istifadə olunur.");
        }
        const now = Date.now();
        room.players[uid] = { uid, nickname, connected: true, ready: false, tileCount: 0, joinedAt: now };
        room.meta.playerOrder.push(uid);
        room.meta.updatedAt = now;
        room.meta.lastActivityAt = now;
        return room;
      });
      return { roomCode };
    },

    async leave(roomCodeValue) {
      const uid = requireUid(auth);
      const roomCode = normalizeRoomCode(roomCodeValue);
      await mutateRoom(database, roomCode, (value) => {
        const room = requireRoom(value);
        requirePlayer(room, uid);
        const now = Date.now();
        if (room.meta.status === "waiting") {
          delete room.players[uid];
          room.meta.playerOrder = room.meta.playerOrder.filter((playerId) => playerId !== uid);
          if (room.meta.playerOrder.length === 0) return null;
          if (room.meta.hostId === uid) {
            const nextHost = room.meta.playerOrder.find((playerId) => room.players[playerId]?.connected) ?? room.meta.playerOrder[0];
            if (nextHost) {
              room.meta.hostId = nextHost;
              const host = room.players[nextHost];
              if (host) host.ready = true;
            }
          }
        } else {
          const player = room.players[uid];
          if (player) player.connected = false;
        }
        room.meta.updatedAt = now;
        room.meta.lastActivityAt = now;
        return room;
      });
      return { left: true };
    },

    async setReady(roomCodeValue) {
      const uid = requireUid(auth);
      const roomCode = normalizeRoomCode(roomCodeValue);
      const result = await mutateRoom(database, roomCode, (value) => {
        const room = requireRoom(value);
        requirePlayer(room, uid);
        if (room.meta.status !== "waiting") throw new RoomActionError("room/started", "Oyun artıq başlayıb.");
        const player = room.players[uid];
        if (!player) throw new RoomActionError("room/player-missing", "Oyunçu tapılmadı.");
        player.ready = uid === room.meta.hostId ? true : !player.ready;
        room.meta.updatedAt = Date.now();
        return room;
      });
      return { ready: result?.players[uid]?.ready ?? false };
    },

    async start(roomCodeValue) {
      const uid = requireUid(auth);
      const roomCode = normalizeRoomCode(roomCodeValue);
      await mutateRoom(database, roomCode, (value) => {
        const room = requireRoom(value);
        requirePlayer(room, uid);
        if (room.meta.hostId !== uid) throw new RoomActionError("room/host-only", "Yalnız otaq sahibi oyunu başlada bilər.");
        if (room.meta.status !== "waiting") throw new RoomActionError("room/started", "Oyun artıq başlayıb.");
        const players = Object.values(room.players);
        if (players.length !== 4) throw new RoomActionError("room/player-count", "Oyuna başlamaq üçün 4 oyunçu lazımdır.");
        if (players.some((player) => !player.ready)) throw new RoomActionError("room/not-ready", "Bütün oyunçular hazır olmalıdır.");
        return initializeRound(room);
      });
      return { started: true };
    },

    async draw(roomCodeValue) {
      const uid = requireUid(auth);
      const roomCode = normalizeRoomCode(roomCodeValue);
      await mutateRoom(database, roomCode, (value) => {
        const room = requireRoom(value);
        requirePlayer(room, uid);
        if (room.meta.status !== "playing" || !room.publicGame || !room.privateState) throw new RoomActionError("room/not-playing", "Oyun aktiv deyil.");
        if (room.meta.currentPlayerId !== uid) throw new RoomActionError("room/not-turn", "Hazırda sizin növbəniz deyil.");
        if (room.publicGame.turnPhase !== "draw") throw new RoomActionError("room/double-draw", "Yenidən daş götürə bilməzsiniz.");
        const hand = room.privateState.hands[uid];
        if (!hand || hand.length !== 14) throw new RoomActionError("room/hand-count", "Əlinizdə gözlənilməyən sayda daş var.");
        const tile = room.privateState.closedPile.shift();
        if (!tile) throw new RoomActionError("room/pile-empty", "Qapalı daşlar bitib.");
        hand.push(tile);
        room.players[uid]!.tileCount = hand.length;
        room.publicGame.remainingTileCount = room.privateState.closedPile.length;
        room.publicGame.turnPhase = "discard";
        room.meta.updatedAt = Date.now();
        room.meta.lastActivityAt = Date.now();
        return room;
      });
      return { drawn: true };
    },

    async takeDiscard(roomCodeValue) {
      const uid = requireUid(auth);
      const roomCode = normalizeRoomCode(roomCodeValue);
      await mutateRoom(database, roomCode, (value) => {
        const room = requireRoom(value);
        requirePlayer(room, uid);
        if (room.meta.status !== "playing" || !room.publicGame || !room.privateState) throw new RoomActionError("room/not-playing", "Oyun aktiv deyil.");
        if (room.meta.currentPlayerId !== uid) throw new RoomActionError("room/not-turn", "Hazırda sizin növbəniz deyil.");
        if (room.publicGame.turnPhase !== "draw") throw new RoomActionError("room/double-draw", "Yenidən daş götürə bilməzsiniz.");
        const hand = room.privateState.hands[uid];
        if (!hand || hand.length !== 14) throw new RoomActionError("room/hand-count", "Əlinizdə gözlənilməyən sayda daş var.");
        const lastDiscard = room.publicGame.lastDiscard;
        if (!lastDiscard) throw new RoomActionError("room/no-discard", "Götürülə bilən açıq daş yoxdur.");
        const previousIndex = (room.meta.currentPlayerIndex - 1 + room.meta.playerOrder.length) % room.meta.playerOrder.length;
        const previousPlayerId = room.meta.playerOrder[previousIndex];
        if (!previousPlayerId || lastDiscard.playerId !== previousPlayerId) throw new RoomActionError("room/wrong-discard", "Yalnız əvvəlki oyunçunun son daşını götürə bilərsiniz.");
        room.publicGame.discardPiles ??= {};
        const pile = room.publicGame.discardPiles[previousPlayerId] ?? [];
        const tile = pile.pop();
        if (!tile || tile.id !== lastDiscard.tile.id) throw new RoomActionError("room/no-discard", "Açıq daş artıq mövcud deyil.");
        room.publicGame.discardPiles[previousPlayerId] = pile;
        room.publicGame.lastDiscard = null;
        hand.push(tile);
        room.players[uid]!.tileCount = hand.length;
        room.publicGame.turnPhase = "discard";
        room.meta.updatedAt = Date.now();
        room.meta.lastActivityAt = Date.now();
        return room;
      });
      return { taken: true };
    },

    async discard(roomCodeValue, tileId) {
      const uid = requireUid(auth);
      const roomCode = normalizeRoomCode(roomCodeValue);
      await mutateRoom(database, roomCode, (value) => {
        const room = requireRoom(value);
        requirePlayer(room, uid);
        if (room.meta.status !== "playing" || !room.publicGame || !room.privateState) throw new RoomActionError("room/not-playing", "Oyun aktiv deyil.");
        if (room.meta.currentPlayerId !== uid) throw new RoomActionError("room/not-turn", "Hazırda sizin növbəniz deyil.");
        if (room.publicGame.turnPhase !== "discard") throw new RoomActionError("room/draw-first", "Əvvəlcə daş götürməlisiniz.");
        const hand = room.privateState.hands[uid];
        if (!hand || hand.length !== 15) throw new RoomActionError("room/hand-count", "Daş atmaq üçün əlinizdə 15 daş olmalıdır.");
        const tileIndex = hand.findIndex((tile) => tile.id === tileId);
        if (tileIndex < 0) throw new RoomActionError("room/not-your-tile", "Bu daş sizə aid deyil.");
        const removed = hand.splice(tileIndex, 1)[0];
        if (!removed) throw new RoomActionError("room/game-error", "Daş atıla bilmədi.");
        const now = Date.now();
        room.publicGame.discardPiles ??= {};
        const pile = room.publicGame.discardPiles[uid] ?? [];
        pile.push(removed);
        room.publicGame.discardPiles[uid] = pile;
        room.publicGame.lastDiscard = { tile: removed, playerId: uid, discardedAt: now };
        room.players[uid]!.tileCount = hand.length;
        const nextIndex = (room.meta.currentPlayerIndex + 1) % room.meta.playerOrder.length;
        const nextPlayerId = room.meta.playerOrder[nextIndex];
        if (!nextPlayerId) throw new RoomActionError("room/game-error", "Növbəti oyunçu tapılmadı.");
        room.meta.currentPlayerIndex = nextIndex;
        room.meta.currentPlayerId = nextPlayerId;
        room.publicGame.turnPhase = "draw";
        room.meta.updatedAt = now;
        room.meta.lastActivityAt = now;
        return room;
      });
      return { discarded: true };
    },

    async finish(roomCodeValue, tileId) {
      const uid = requireUid(auth);
      const roomCode = normalizeRoomCode(roomCodeValue);
      await mutateRoom(database, roomCode, (value) => {
        const room = requireRoom(value);
        requirePlayer(room, uid);
        if (room.meta.status !== "playing" || !room.publicGame || !room.privateState) throw new RoomActionError("room/not-playing", "Oyun aktiv deyil.");
        if (room.meta.currentPlayerId !== uid || room.publicGame.turnPhase !== "discard") throw new RoomActionError("room/not-turn", "Oyunu yalnız öz gedişinizdə bitirə bilərsiniz.");
        const hand = room.privateState.hands[uid];
        if (!hand || hand.length !== 15) throw new RoomActionError("room/hand-count", "Bitirmək üçün 15 daşınız olmalıdır.");
        const discardIndex = hand.findIndex((tile) => tile.id === tileId);
        if (discardIndex < 0) throw new RoomActionError("room/not-your-tile", "Bu daş sizə aid deyil.");
        const candidate = hand.filter((_, index) => index !== discardIndex);
        if (!validateHand(candidate)) throw new RoomActionError("room/not-winning", "Əliniz hələ qalib kombinasiya deyil.");
        const winningDiscard = hand[discardIndex] as OkeyTile;
        const now = Date.now();
        room.privateState.hands[uid] = candidate;
        room.players[uid]!.tileCount = candidate.length;
        room.publicGame.discardPiles ??= {};
        const pile = room.publicGame.discardPiles[uid] ?? [];
        pile.push(winningDiscard);
        room.publicGame.discardPiles[uid] = pile;
        room.publicGame.lastDiscard = { tile: winningDiscard, playerId: uid, discardedAt: now };
        room.publicGame.winnerId = uid;
        room.meta.status = "finished";
        room.meta.updatedAt = now;
        room.meta.lastActivityAt = now;
        return room;
      });
      return { finished: true };
    },

    async rematch(roomCodeValue) {
      const uid = requireUid(auth);
      const roomCode = normalizeRoomCode(roomCodeValue);
      let restarted = false;
      const result = await mutateRoom(database, roomCode, (value) => {
        const room = requireRoom(value);
        requirePlayer(room, uid);
        if (room.meta.status !== "finished") throw new RoomActionError("room/not-finished", "Oyun hələ bitməyib.");
        room.rematchVotes ??= {};
        room.rematchVotes[uid] = true;
        const requiredPlayerIds = room.meta.playerOrder.filter((playerId) => room.players[playerId] !== undefined);
        if (requiredPlayerIds.length === 4 && requiredPlayerIds.every((playerId) => room.rematchVotes?.[playerId])) {
          restarted = true;
          return initializeRound(room);
        }
        room.meta.updatedAt = Date.now();
        room.meta.lastActivityAt = Date.now();
        return room;
      });
      return { restarted, votes: Object.keys(result?.rematchVotes ?? {}).length };
    },
  };
}
