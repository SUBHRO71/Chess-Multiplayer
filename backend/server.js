const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { Chess } = require("chess.js");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
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
      whiteTime: 300,
      blackTime: 300
    };

    socket.join(roomId);
    socket.emit("assignColor", "white");
    socket.emit("setMode", mode);
    
    console.log(`🎮 Room ${roomId} created by ${socket.id} (white)`);
  });

  socket.on("joinRoom", ({ roomId }) => {
    const room = rooms[roomId];

    if (!room) {
      console.log(`❌ Room ${roomId} does not exist`);
      socket.emit("errorMsg", "Room does not exist");
      return;
    }

    if (room.players.length >= 2) {
      console.log(`❌ Room ${roomId} is full`);
      socket.emit("errorMsg", "Room is full");
      return;
    }

    room.players.push(socket.id);
    room.colors[socket.id] = "black";
    socket.join(roomId);

    socket.emit("assignColor", "black");
    socket.emit("setMode", room.mode);
    socket.emit("gameState", { fen: room.game.fen() });

    if (!room.started) {
      room.started = true;
      io.to(roomId).emit("startGame");
      io.to(roomId).emit("timeSync", {
        whiteTime: room.whiteTime,
        blackTime: room.blackTime
      });
      
      console.log(`🎮 Game started in room ${roomId}`);
      console.log(`   White: ${room.players[0]}`);
      console.log(`   Black: ${socket.id}`);
    }
  });

  socket.on("move", ({ roomId, move }) => {
    const room = rooms[roomId];
    
    if (!room) {
      console.log(`❌ Room ${roomId} not found`);
      return;
    }

    console.log(`\n🎯 Move attempt in room ${roomId}:`);
    console.log(`   Player: ${socket.id}`);
    console.log(`   Color: ${room.colors[socket.id]}`);
    console.log(`   Move: ${move.from} → ${move.to}`);
    console.log(`   Current turn: ${room.game.turn() === "w" ? "white" : "black"}`);

    const playerColor = room.colors[socket.id];
    const currentTurn = room.game.turn() === "w" ? "white" : "black";

    if (playerColor !== currentTurn) {
      console.log(`❌ Not player's turn!`);
      socket.emit("errorMsg", "Not your turn");
      return;
    }

    try {
      const result = room.game.move(move);
      
      if (result) {
        const newFen = room.game.fen();
        console.log(`✅ Move successful!`);
        console.log(`   New FEN: ${newFen}`);
        console.log(`   Next turn: ${room.game.turn() === "w" ? "white" : "black"}`);
        
        // Send the move to the opponent
        socket.to(roomId).emit("opponentMove", move);
        
        // Check for game over
        if (room.game.isGameOver()) {
          console.log(`🏁 Game over in room ${roomId}`);
          let reason = "unknown";
          let winner = null;
          
          if (room.game.isCheckmate()) {
            reason = "checkmate";
            winner = currentTurn;
            console.log(`   Checkmate! ${winner} wins!`);
          } else if (room.game.isDraw()) {
            reason = "draw";
            console.log(`   Draw!`);
          } else if (room.game.isStalemate()) {
            reason = "stalemate";
            console.log(`   Stalemate!`);
          }
          
          io.to(roomId).emit("gameOver", { winner, reason });
        }
      } else {
        console.log(`❌ Invalid move!`);
        socket.emit("errorMsg", "Invalid move");
      }
    } catch (error) {
      console.error(`❌ Move error:`, error.message);
      socket.emit("errorMsg", "Invalid move");
      socket.emit("gameState", { fen: room.game.fen() });
    }
  });

  socket.on("timeUpdate", ({ roomId, whiteTime, blackTime }) => {
    const room = rooms[roomId];
    if (!room) return;

    room.whiteTime = whiteTime;
    room.blackTime = blackTime;
    io.to(roomId).emit("timeSync", { whiteTime, blackTime });
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    
    for (const roomId in rooms) {
      const room = rooms[roomId];
      
      if (room.players.includes(socket.id)) {
        console.log(`🚪 Player left room ${roomId}`);
        socket.to(roomId).emit("opponentLeft");
        delete rooms[roomId];
        console.log(`   Room ${roomId} deleted`);
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log("Chess Server running on port ",PORT);
});