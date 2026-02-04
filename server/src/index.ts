import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { config } from "dotenv";
import { resolve } from "path";
import { GameManager, GameState } from "./game";
import { MarketManager } from "./market";

config({ path: resolve(__dirname, "../.env") });

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

const gameManager = new GameManager();
const marketManager = new MarketManager();

// REST API endpoints

// Get current game state
app.get("/api/game", (req, res) => {
  const game = gameManager.getCurrentGame();
  if (!game) {
    return res.status(404).json({ error: "No active game" });
  }
  res.json(game.getState());
});

// Get market state
app.get("/api/market/:gameId", (req, res) => {
  const market = marketManager.getMarket(req.params.gameId);
  if (!market) {
    return res.status(404).json({ error: "Market not found" });
  }
  res.json({
    ...market.getState(),
    orderBook: market.getOrderBook(),
  });
});

// Get user position
app.get("/api/market/:gameId/position/:userId", (req, res) => {
  const market = marketManager.getMarket(req.params.gameId);
  if (!market) {
    return res.status(404).json({ error: "Market not found" });
  }
  const position = market.getPosition(req.params.userId);
  res.json(position || { userId: req.params.userId, whiteTokens: 0, blackTokens: 0, totalSpent: 0 });
});

// Buy WHITE tokens
app.post("/api/market/:gameId/buy-white", (req, res) => {
  const market = marketManager.getMarket(req.params.gameId);
  if (!market) {
    return res.status(404).json({ error: "Market not found" });
  }
  
  const { userId, amount } = req.body;
  if (!userId || !amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    const result = market.buyWhite(userId, amount);
    const newState = market.getState();
    
    // Broadcast market update
    io.emit("market:update", {
      ...newState,
      orderBook: market.getOrderBook(),
    });
    
    res.json({ ...result, position: market.getPosition(userId) });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Buy BLACK tokens
app.post("/api/market/:gameId/buy-black", (req, res) => {
  const market = marketManager.getMarket(req.params.gameId);
  if (!market) {
    return res.status(404).json({ error: "Market not found" });
  }
  
  const { userId, amount } = req.body;
  if (!userId || !amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid request" });
  }

  try {
    const result = market.buyBlack(userId, amount);
    const newState = market.getState();
    
    // Broadcast market update
    io.emit("market:update", {
      ...newState,
      orderBook: market.getOrderBook(),
    });
    
    res.json({ ...result, position: market.getPosition(userId) });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Start a new game
app.post("/api/game/start", async (req, res) => {
  const { whiteAgent = "claude", blackAgent = "gpt" } = req.body;
  
  const game = gameManager.createGame(whiteAgent, blackAgent);
  const market = marketManager.createMarket(game.getState().id);
  
  // Broadcast initial states
  io.emit("game:start", game.getState());
  io.emit("market:update", {
    ...market.getState(),
    orderBook: market.getOrderBook(),
  });
  
  res.json({ game: game.getState(), market: market.getState() });
  
  // Start the game in background
  game.playFullGame(
    (state: GameState) => {
      io.emit("game:move", state);
      
      // Check for game end
      if (state.status === "white_wins" || state.status === "black_wins" || state.status === "draw") {
        const winner = state.status === "white_wins" ? "white" : state.status === "black_wins" ? "black" : "draw";
        const payouts = market.resolve(winner);
        
        io.emit("game:end", { 
          game: state, 
          market: market.getState(),
          payouts: Object.fromEntries(payouts),
        });
      }
    },
    3000 // 3 second delay between moves for suspense
  );
});

// WebSocket connection handling
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  
  // Send current state on connect
  const game = gameManager.getCurrentGame();
  if (game) {
    socket.emit("game:state", game.getState());
    const market = marketManager.getMarket(game.getState().id);
    if (market) {
      socket.emit("market:update", {
        ...market.getState(),
        orderBook: market.getOrderBook(),
      });
    }
  }
  
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🎮 Chess Arena server running on port ${PORT}`);
});
