import { Chess } from "chess.js";
import { getAgentMove, AgentType } from "./chess-agent";

export type GameStatus = "waiting" | "playing" | "white_wins" | "black_wins" | "draw";

export interface GameState {
  id: string;
  fen: string;
  pgn: string;
  moves: string[];
  turn: "w" | "b";
  status: GameStatus;
  whiteAgent: AgentType;
  blackAgent: AgentType;
  moveCount: number;
  lastMove: string | null;
  startedAt: number | null;
  endedAt: number | null;
}

export class ChessGame {
  private chess: Chess;
  private id: string;
  private whiteAgent: AgentType;
  private blackAgent: AgentType;
  private moves: string[] = [];
  private status: GameStatus = "waiting";
  private startedAt: number | null = null;
  private endedAt: number | null = null;
  private lastMove: string | null = null;
  private isProcessing: boolean = false;

  constructor(id: string, whiteAgent: AgentType = "claude", blackAgent: AgentType = "gpt") {
    this.chess = new Chess();
    this.id = id;
    this.whiteAgent = whiteAgent;
    this.blackAgent = blackAgent;
  }

  getState(): GameState {
    return {
      id: this.id,
      fen: this.chess.fen(),
      pgn: this.chess.pgn(),
      moves: this.moves,
      turn: this.chess.turn(),
      status: this.status,
      whiteAgent: this.whiteAgent,
      blackAgent: this.blackAgent,
      moveCount: this.moves.length,
      lastMove: this.lastMove,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
    };
  }

  start() {
    this.status = "playing";
    this.startedAt = Date.now();
  }

  private getLegalMovesUCI(): string[] {
    return this.chess.moves({ verbose: true }).map((m) => m.from + m.to + (m.promotion || ""));
  }

  async playNextMove(onMove?: (state: GameState) => void): Promise<GameState> {
    if (this.status !== "playing" || this.isProcessing) {
      return this.getState();
    }

    this.isProcessing = true;

    try {
      const currentAgent = this.chess.turn() === "w" ? this.whiteAgent : this.blackAgent;
      const legalMoves = this.getLegalMovesUCI();

      if (legalMoves.length === 0) {
        this.endGame();
        return this.getState();
      }

      const moveUCI = await getAgentMove(currentAgent, this.chess.fen(), legalMoves);
      
      // Convert UCI to move object
      const from = moveUCI.slice(0, 2);
      const to = moveUCI.slice(2, 4);
      const promotion = moveUCI.length > 4 ? moveUCI[4] : undefined;

      const move = this.chess.move({ from, to, promotion });
      
      if (move) {
        this.moves.push(move.san);
        this.lastMove = move.san;
        
        if (onMove) {
          onMove(this.getState());
        }

        // Check for game end
        if (this.chess.isGameOver()) {
          this.endGame();
        }
      }

      return this.getState();
    } finally {
      this.isProcessing = false;
    }
  }

  private endGame() {
    this.endedAt = Date.now();
    
    if (this.chess.isCheckmate()) {
      // The player who just moved wins
      this.status = this.chess.turn() === "w" ? "black_wins" : "white_wins";
    } else if (this.chess.isDraw() || this.chess.isStalemate() || this.chess.isThreefoldRepetition() || this.chess.isInsufficientMaterial()) {
      this.status = "draw";
    }
  }

  isGameOver(): boolean {
    return this.status === "white_wins" || this.status === "black_wins" || this.status === "draw";
  }

  async playFullGame(onMove?: (state: GameState) => void, delayMs: number = 3000): Promise<GameState> {
    this.start();
    
    if (onMove) {
      onMove(this.getState());
    }

    while (!this.isGameOver()) {
      await this.playNextMove(onMove);
      
      if (!this.isGameOver() && delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return this.getState();
  }
}

// Game manager for multiple concurrent games
export class GameManager {
  private games: Map<string, ChessGame> = new Map();
  private currentGameId: string | null = null;

  createGame(whiteAgent: AgentType = "claude", blackAgent: AgentType = "gpt"): ChessGame {
    const id = `game_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const game = new ChessGame(id, whiteAgent, blackAgent);
    this.games.set(id, game);
    this.currentGameId = id;
    return game;
  }

  getGame(id: string): ChessGame | undefined {
    return this.games.get(id);
  }

  getCurrentGame(): ChessGame | undefined {
    return this.currentGameId ? this.games.get(this.currentGameId) : undefined;
  }

  listGames(): GameState[] {
    return Array.from(this.games.values()).map((g) => g.getState());
  }
}
