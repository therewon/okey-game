export const TILE_COLORS = ["red", "blue", "black", "yellow"] as const;

export type TileColor = (typeof TILE_COLORS)[number];

export interface OkeyTile {
  id: string;
  number: number;
  color: TileColor;
  isFakeJoker?: boolean;
  isOkey?: boolean;
}

export interface Player {
  uid: string;
  nickname: string;
  connected: boolean;
  ready: boolean;
  tileCount: number;
  joinedAt: number;
}

export type RoomStatus = "waiting" | "playing" | "finished";
export type TurnPhase = "draw" | "discard";

export interface RoomMeta {
  hostId: string;
  status: RoomStatus;
  createdAt: number;
  updatedAt: number;
  lastActivityAt: number;
  currentPlayerId: string | null;
  currentPlayerIndex: number;
  playerOrder: string[];
  round: number;
}

export interface VisibleDiscard {
  tile: OkeyTile;
  playerId: string;
  discardedAt: number;
}

export interface PublicGameState {
  indicatorTile: OkeyTile;
  okeyTile: OkeyTile;
  remainingTileCount: number;
  turnPhase: TurnPhase;
  discardPiles: Record<string, OkeyTile[]>;
  lastDiscard: VisibleDiscard | null;
  winnerId: string | null;
  startedAt: number;
}

export interface PrivateGameState {
  hands: Record<string, OkeyTile[]>;
  closedPile: OkeyTile[];
}

export interface RoomData {
  meta: RoomMeta;
  players: Record<string, Player>;
  publicGame?: PublicGameState;
  privateState?: PrivateGameState;
  rematchVotes?: Record<string, boolean>;
}

export interface DealResult {
  hands: Record<string, OkeyTile[]>;
  closedPile: OkeyTile[];
}

export interface NewRoundState {
  indicatorTile: OkeyTile;
  okeyTile: OkeyTile;
  startingPlayerId: string;
  startingPlayerIndex: number;
  deal: DealResult;
}
