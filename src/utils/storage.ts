const NICKNAME_KEY = "okey:nickname";
const ROOM_KEY = "okey:lastRoomCode";

export const localProfile = {
  getNickname: () => localStorage.getItem(NICKNAME_KEY) ?? "",
  setNickname: (nickname: string) => localStorage.setItem(NICKNAME_KEY, nickname),
  getRoom: () => localStorage.getItem(ROOM_KEY) ?? "",
  setRoom: (roomCode: string) => localStorage.setItem(ROOM_KEY, roomCode),
  clearRoom: () => localStorage.removeItem(ROOM_KEY),
};
