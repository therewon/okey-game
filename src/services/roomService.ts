import { auth, database } from "../firebase/firebase";
import { createDirectRoomService } from "./directRoomService";

export const roomService = createDirectRoomService(auth, database);
