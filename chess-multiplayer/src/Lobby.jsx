import { useState, useEffect } from "react";
import socket from "./socket";
import "./Lobby.css";

export default function Lobby({ onEnterRoom }) {
  const [mode, setMode] = useState(null);
  const [joinRoomId, setJoinRoomId] = useState("");
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const createRoom = () => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    socket.emit("createRoom", { roomId, mode });
    onEnterRoom(roomId);
  };

  const joinRoom = () => {
    if (!joinRoomId) return alert("Enter Room ID");
    socket.emit("joinRoom", { roomId: joinRoomId });
    onEnterRoom(joinRoomId);
  };

  return (
    <div className="lobby-container">
      <div 
        className="mouse-glow" 
        style={{ left: `${position.x}px`, top: `${position.y}px` }}
      />

      <div className="lobby-card">
        {!mode ? (
          <div className="section">
            <h2>Select Game Mode</h2>
            <div className="button-group">
              <button className="secondary-btn" onClick={() => setMode("rapid")}>Rapid</button>
              <button className="secondary-btn" onClick={() => setMode("notimer")}>No Timer</button>
            </div>
          </div>
        ) : (
          <div className="section">
            <h3>Mode: <span className="highlight">{mode.toUpperCase()}</span></h3>
            <button className="primary-btn" onClick={createRoom}>Create Room</button>
            <button className="back-btn" onClick={() => setMode(null)}>Change Mode</button>
          </div>
        )}

        <div className="divider">
          <span>OR</span>
        </div>

        <div className="section">
          <h3>Join Existing Room</h3>
          <div className="input-group">
            <input
              placeholder="ENTER ROOM ID"
              value={joinRoomId}
              onChange={e => setJoinRoomId(e.target.value.toUpperCase())}
            />
            <button className="primary-btn" onClick={joinRoom}>Join</button>
          </div>
        </div>
      </div>
    </div>
  );
}