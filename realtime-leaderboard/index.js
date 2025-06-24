const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

app.use(cors());

// ✅ Replace with your actual connection string
mongoose.connect("mongodb+srv://rupamdholakiya:n7e8iTBa1HMn6MBU@cluster0.0ams6zn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Atlas connected"))
.catch((err) => console.error("❌ MongoDB connection error:", err));

// Player Schema
const playerSchema = new mongoose.Schema({
  playerId: { type: String, required: true },
  region: { type: String, required: true },
  gameMode: { type: String, required: true },
  score: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

// Bonus: TTL index to reset leaderboard every 24 hours
playerSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

const Player = mongoose.model("Player", playerSchema);

// Socket.io logic
io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  socket.on("updateScore", async ({ playerId, score, region, gameMode }) => {
    const filter = { playerId, region, gameMode };
    const update = {
      $inc: { score },
      $set: { updatedAt: new Date() },
    };

    await Player.findOneAndUpdate(filter, update, { upsert: true });
    io.emit("leaderboardUpdated", { playerId, score });
  });

  socket.on("getTopPlayers", async ({ region, gameMode, topN }, callback) => {
    const players = await Player.find({ region, gameMode })
      .sort({ score: -1 })
      .limit(topN)
      .lean();

    callback(players);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});

httpServer.listen(3000, () =>
  console.log("🚀 Server running at http://localhost:3000")
);
