import { Navigate, Route, Routes } from "react-router-dom";
import { GamePage } from "./pages/GamePage";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { RoomPage } from "./pages/RoomPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/room/:roomCode" element={<RoomPage />} />
      <Route path="/game/:roomCode" element={<GamePage />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
