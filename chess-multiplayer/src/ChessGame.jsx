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

  const timerRef = useRef(null);
  const lastUpdateRef = useRef(Date.now());

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
      <h2 className="title">♟️ Online Chess</h2>

      <div className="info-card">
        <p><strong>Player:</strong> {user.displayName}</p>

        <p>
          <strong>Room:</strong>{" "}
          <span className="highlight-green">{roomId}</span>
          <button className="copy-btn" onClick={copyRoomId}>
            {copied ? "✔ Copied" : "📋 Copy"}
          </button>
        </p>

        <p>
          <strong>Your Color:</strong>{" "}
          <span className={color ? "highlight-green" : "highlight-wait"}>
            {color || "Waiting..."}
          </span>
        </p>

        <p><strong>Mode:</strong> {mode || "Waiting..."}</p>

        <p>
          <strong>Current Turn:</strong>{" "}
          {turn === "w" ? "White ⚪" : "Black ⚫"}
        </p>
      </div>

      {mode === "rapid" && (
        <div className="timer">
          <span className={turn === "w" ? "active-turn" : "inactive-turn"}>
            ⚪ {Math.floor(whiteTime / 60)}:
            {String(whiteTime % 60).padStart(2, "0")}
          </span>
          |
          <span className={turn === "b" ? "active-turn" : "inactive-turn"}>
            ⚫ {Math.floor(blackTime / 60)}:
            {String(blackTime % 60).padStart(2, "0")}
          </span>
        </div>
      )}

      {!started && <p className="waiting">⏳ Waiting for opponent…</p>}

      {isCheck && !isGameOver && (
        <p className="check-warning">⚠️ CHECK! ⚠️</p>
      )}

      {isGameOver && (
        <div className="game-over">
          <p>🏁 Game Over!</p>
          {winner && <p>👑 {winner} wins by checkmate!</p>}
          {gameRef.current.isDraw() && <p>🤝 Draw!</p>}
          {gameRef.current.isStalemate() && <p>😐 Stalemate!</p>}
        </div>
      )}

      <div className="board-container">
        <Chessboard
          position={fen}
          boardOrientation={color || "white"}
          onPieceDrop={onPieceDrop}
          boardWidth={600}
          animationDuration={200}
        />
      </div>

      <button className="leave-btn" onClick={() => window.location.reload()}>
        🚪 Leave Game
      </button>
    </div>
  );
}
