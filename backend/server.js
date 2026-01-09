const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { Chess } = require("chess.js");
require("dotenv").config();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"]
  })
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST"]
  }
});

const rooms = {};

io.on("connection", socket => {
  console.log("✅ User connected:", socket.id);

  socket.on("createRoom", ({ roomId, mode }) => {
    rooms[roomId] = {
      players: [socket.id],
      colors: { [socket.id]: "white" },
      mode,
      started: false,
      game: new Chess(),
      whiteTime: mode === "rapid" ? 300 : null,
      blackTime: mode === "rapid" ? 300 : null
    };

    socket.join(roomId);
    socket.emit("assignColor", "white");
    socket.emit("setMode", mode);

    console.log(`🎮 Room ${roomId} created by ${socket.id}`);
  });

  socket.on("joinRoom", ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.players.length >= 2) return;

    room.players.push(socket.id);
    room.colors[socket.id] = "black";
    socket.join(roomId);

    socket.emit("assignColor", "black");
    socket.emit("setMode", room.mode);
    socket.emit("gameState", { fen: room.game.fen() });

    if (!room.started) {
      room.started = true;
      io.to(roomId).emit("startGame");

      if (room.mode === "rapid") {
        io.to(roomId).emit("timeSync", {
          whiteTime: room.whiteTime,
          blackTime: room.blackTime
        });
      }
    }
  });

  socket.on("move", ({ roomId, move }) => {
    const room = rooms[roomId];
    if (!room) return;

    const playerColor = room.colors[socket.id];
    const currentTurn = room.game.turn() === "w" ? "white" : "black";

    if (playerColor !== currentTurn) {
      socket.emit("errorMsg", "Not your turn");
      return;
    }

    const result = room.game.move(move);
    if (!result) {
      socket.emit("errorMsg", "Invalid move");
      return;
    }

    socket.to(roomId).emit("opponentMove", move);

    if (room.game.isGameOver()) {
      let reason = "unknown";
      let winner = null;

      if (room.game.isCheckmate()) {
        reason = "checkmate";
        winner = playerColor;
      } else if (room.game.isDraw()) {
        reason = "draw";
      }

      io.to(roomId).emit("gameOver", { winner, reason });
    }
  });

  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      if (rooms[roomId].players.includes(socket.id)) {
        socket.to(roomId).emit("opponentLeft");
        delete rooms[roomId];
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log("Chess Server running on port", PORT);
});
