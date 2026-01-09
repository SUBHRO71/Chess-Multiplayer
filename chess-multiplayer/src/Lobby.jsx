import { useState } from "react";
import socket from "./socket";

export default function Lobby({ onEnterRoom }) {
  const [mode, setMode] = useState(null);
  const [joinRoomId, setJoinRoomId] = useState("");

  const createRoom = () => {
    const roomId = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    socket.emit("createRoom", { roomId, mode });
    onEnterRoom(roomId); // 🔥 directly enter game
  };

  const joinRoom = () => {
    if (!joinRoomId) return alert("Enter Room ID");
    socket.emit("joinRoom", { roomId: joinRoomId });
    onEnterRoom(joinRoomId);
  };

  return (
    <div style={{ textAlign: "center", marginTop: 100 }}>
      {!mode && (
        <>
          <h2>Select Game Mode</h2>
          <button onClick={() => setMode("rapid")}>Rapid</button>
          <button onClick={() => setMode("notimer")}>No Timer</button>
        </>
      )}

      {mode && (
        <>
          <h3>Mode selected: {mode}</h3>
          <button onClick={createRoom}>Create Room</button>
        </>
      )}

      <hr style={{ margin: "40px auto", width: 300 }} />

      <h3>Join Existing Room</h3>
      <input
        placeholder="Enter Room ID"
        value={joinRoomId}
        onChange={e => setJoinRoomId(e.target.value.toUpperCase())}
      />
      <button onClick={joinRoom}>Join</button>
    </div>
  );
}
