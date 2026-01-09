import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import Login from "./Login";
import Lobby from "./Lobby";
import ChessGame from "./ChessGame";
import socket from "./socket";

export default function App() {
  const [user, setUser] = useState(null);
  const [roomId, setRoomId] = useState(null);

  useEffect(() => {
    onAuthStateChanged(auth, user => {
      setUser(user);
      if (user) socket.connect();
    });
  }, []);

  if (!user) return <Login setUser={setUser} />;

  if (!roomId) return <Lobby onEnterRoom={setRoomId} />;

  return <ChessGame user={user} roomId={roomId} />;
}