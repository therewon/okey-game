import { FirebaseError } from "firebase/app";
import { RoomActionError } from "./directRoomService";

const knownMessages: Record<string, string> = {
  "auth/network-request-failed": "İnternet bağlantısını yoxlayın.",
  "auth/too-many-requests": "Çox sayda sorğu göndərildi. Bir az sonra yenidən yoxlayın.",
  "database/permission-denied": "Bu əməliyyata icazə verilmir.",
  PERMISSION_DENIED: "Bu əməliyyata icazə verilmir.",
  NETWORK_ERROR: "İnternet bağlantısını yoxlayın.",
};

export function friendlyError(error: unknown): string {
  if (error instanceof RoomActionError) return error.message;
  if (error instanceof FirebaseError) {
    const details = typeof error.message === "string" ? error.message.replace(/^.*?:\s*/, "") : "";
    return knownMessages[error.code] ?? details ?? "Əməliyyat tamamlanmadı.";
  }
  return "Əməliyyat tamamlanmadı. Yenidən yoxlayın.";
}
