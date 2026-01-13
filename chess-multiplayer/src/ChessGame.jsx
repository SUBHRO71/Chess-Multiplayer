import { useEffect, useState, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import socket from "./socket";
import "./ChessGame.css";

export default function ChessGame({ user, roomId }) {
  const gameRef = useRef(new Chess());

  const [fen, setFen] = useState(gameRef.current.fen());
  const [color, setColor] = useState(null);
  const [mode, setMode] = useState(null);
  const [started, setStarted] = useState(false);

  const [whiteTime, setWhiteTime] = useState(300);
  const [blackTime, setBlackTime] = useState(300);
  const [copied, setCopied] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const timerRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());

  useEffect(() => {
    const handleMove = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  const copyRoomId = async () => {
    await navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => {
    socket.on("assignColor", setColor);
    socket.on("setMode", setMode);

    socket.on("startGame", () => {
      setStarted(true);
      lastUpdateRef.current = Date.now();
    });

    socket.on("opponentMove", (move) => {
      const result = gameRef.current.move(move);
      if (result) {
        setFen(gameRef.current.fen());
        lastUpdateRef.current = Date.now();
      }
    });

    socket.on("gameState", ({ fen }) => {
      gameRef.current = new Chess(fen);
      setFen(fen);
    });

    socket.on("timeSync", ({ whiteTime, blackTime }) => {
      setWhiteTime(whiteTime);
      setBlackTime(blackTime);
      lastUpdateRef.current = Date.now();
    });

    return () => {
      socket.off("assignColor");
      socket.off("setMode");
      socket.off("startGame");
      socket.off("opponentMove");
      socket.off("gameState");
      socket.off("timeSync");
    };
  }, []);

  useEffect(() => {
    if (!started || mode !== "rapid") {
      clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - lastUpdateRef.current) / 1000);

      if (elapsed >= 1) {
        lastUpdateRef.current = now;
        const turn = gameRef.current.turn();

        if (turn === "w") {
          setWhiteTime(t => {
            const nt = Math.max(t - elapsed, 0);
            socket.emit("timeUpdate", { roomId, whiteTime: nt, blackTime });
            return nt;
          });
        } else {
          setBlackTime(t => {
            const nt = Math.max(t - elapsed, 0);
            socket.emit("timeUpdate", { roomId, whiteTime, blackTime: nt });
            return nt;
          });
        }
      }
    }, 100);

    return () => clearInterval(timerRef.current);
  }, [started, mode, roomId, whiteTime, blackTime]);

  const onPieceDrop = (from, to) => {
    if (!started || !color) return false;

    const turn = gameRef.current.turn();
    const myTurn =
      (turn === "w" && color === "white") ||
      (turn === "b" && color === "black");

    if (!myTurn) return false;

    const move = gameRef.current.move({
      from,
      to,
      promotion: "q",
    });

    if (!move) return false;

    setFen(gameRef.current.fen());
    socket.emit("move", { roomId, move });
    lastUpdateRef.current = Date.now();
    return true;
  };

  const isGameOver = gameRef.current.isGameOver();
  const isCheck = gameRef.current.isCheck();
  const turn = gameRef.current.turn();

  let winner = null;
  if (isGameOver && gameRef.current.isCheckmate()) {
    winner = turn === "w" ? "Black" : "White";
  }

  return (
    <div className="chess-page">
      <div 
        className="mouse-glow" 
        style={{ left: `${mousePos.x}px`, top: `${mousePos.y}px` }}
      />

      <div className="game-layout">
        <div className="sidebar">
          <h2 className="title">♟️ Online Chess</h2>

          <div className="info-card">
            <div className="info-item">
              <span>Player</span>
              <strong>{user.displayName}</strong>
            </div>
            <div className="info-item">
              <span>Room ID</span>
              <div className="room-row">
                <strong className="highlight-green">{roomId}</strong>
                <button className="copy-btn" onClick={copyRoomId}>
                  {copied ? "✔" : "📋"}
                </button>
              </div>
            </div>
            <div className="info-item">
              <span>Your Color</span>
              <strong className={color ? "highlight-green" : ""}>
                {color ? color.charAt(0).toUpperCase() + color.slice(1) : "Waiting..."}
              </strong>
            </div>
            <div className="info-item">
              <span>Mode</span>
              <strong className="capitalize">{mode || "Waiting..."}</strong>
            </div>
          </div>

          {mode === "rapid" && (
            <div className="timer-container">
              <div className={`time-box ${turn === "w" ? "active" : ""}`}>
                <span className="dot">⚪</span>
                {Math.floor(whiteTime / 60)}:{String(whiteTime % 60).padStart(2, "0")}
              </div>
              <div className={`time-box ${turn === "b" ? "active" : ""}`}>
                <span className="dot">⚫</span>
                {Math.floor(blackTime / 60)}:{String(blackTime % 60).padStart(2, "0")}
              </div>
            </div>
          )}

          <button className="leave-btn" onClick={() => window.location.reload()}>
            Leave Game
          </button>
        </div>

        <div className="main-board">
          {isCheck && !isGameOver && <div className="check-badge">CHECK!</div>}
          
          {isGameOver && (
            <div className="overlay">
              <div className="game-over-card">
                <h3>🏁 Game Over</h3>
                {winner ? <p>👑 {winner} wins by checkmate!</p> : <p>Draw!</p>}
                <button className="primary-btn" onClick={() => window.location.reload()}>Back to Lobby</button>
              </div>
            </div>
          )}

          {!started && (
            <div className="overlay">
              <div className="waiting-card">
                <div className="spinner"></div>
                <p>Waiting for opponent…</p>
              </div>
            </div>
          )}

          <div className="board-wrapper">
            <Chessboard
              position={fen}
              boardOrientation={color || "white"}
              onPieceDrop={onPieceDrop}
              boardWidth={580}
              customDarkSquareStyle={{ backgroundColor: "#311B92" }}
              customLightSquareStyle={{ backgroundColor: "#E1F5FE" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}