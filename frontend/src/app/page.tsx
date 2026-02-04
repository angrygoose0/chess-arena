'use client';

import { useEffect, useState, useCallback } from 'react';
import ChessBoard from '@/components/ChessBoard';
import MarketPanel from '@/components/MarketPanel';
import { getSocket } from '@/lib/socket';
import { startGame, buyWhite, buyBlack } from '@/lib/api';
import { Play, RotateCcw } from 'lucide-react';

interface GameState {
  id: string;
  fen: string;
  pgn: string;
  moves: string[];
  turn: 'w' | 'b';
  status: string;
  whiteAgent: string;
  blackAgent: string;
  moveCount: number;
  lastMove: string | null;
}

interface MarketState {
  gameId: string;
  whitePool: number;
  blackPool: number;
  whitePrice: number;
  blackPrice: number;
  totalVolume: number;
  resolved: boolean;
  winner: string | null;
  orderBook: {
    whiteBids: { price: number; size: number }[];
    whiteAsks: { price: number; size: number }[];
    blackBids: { price: number; size: number }[];
    blackAsks: { price: number; size: number }[];
  };
}

interface Position {
  userId: string;
  whiteTokens: number;
  blackTokens: number;
  totalSpent: number;
}

// Generate a random user ID for demo purposes
const getUserId = () => {
  if (typeof window === 'undefined') return 'user_demo';
  let userId = localStorage.getItem('chess_arena_user_id');
  if (!userId) {
    userId = `user_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('chess_arena_user_id', userId);
  }
  return userId;
};

export default function Home() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [marketState, setMarketState] = useState<MarketState | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [userId, setUserId] = useState<string>('user_demo');

  useEffect(() => {
    setUserId(getUserId());
  }, []);

  useEffect(() => {
    const socket = getSocket();

    socket.on('game:state', (state: GameState) => {
      setGameState(state);
    });

    socket.on('game:start', (state: GameState) => {
      setGameState(state);
      setPosition(null);
    });

    socket.on('game:move', (state: GameState) => {
      setGameState(state);
    });

    socket.on('game:end', ({ game, market }: { game: GameState; market: MarketState }) => {
      setGameState(game);
      setMarketState(market);
    });

    socket.on('market:update', (state: MarketState) => {
      setMarketState(state);
    });

    return () => {
      socket.off('game:state');
      socket.off('game:start');
      socket.off('game:move');
      socket.off('game:end');
      socket.off('market:update');
    };
  }, []);

  const handleStartGame = async () => {
    setIsStarting(true);
    try {
      const { game, market } = await startGame('claude', 'gpt');
      setGameState(game);
      setMarketState(market);
      setPosition(null);
    } catch (error) {
      console.error('Failed to start game:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const handleBuyWhite = useCallback(async (amount: number) => {
    if (!marketState?.gameId) return;
    try {
      const result = await buyWhite(marketState.gameId, userId, amount);
      setPosition(result.position);
    } catch (error) {
      console.error('Failed to buy WHITE:', error);
    }
  }, [marketState?.gameId, userId]);

  const handleBuyBlack = useCallback(async (amount: number) => {
    if (!marketState?.gameId) return;
    try {
      const result = await buyBlack(marketState.gameId, userId, amount);
      setPosition(result.position);
    } catch (error) {
      console.error('Failed to buy BLACK:', error);
    }
  }, [marketState?.gameId, userId]);

  const isGameOver = gameState?.status === 'white_wins' || 
                      gameState?.status === 'black_wins' || 
                      gameState?.status === 'draw';

  return (
    <main className="min-h-screen p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              ♟️ Chess Arena
            </h1>
            <p className="text-gray-400">
              Claude vs GPT — Watch AI battle. Bet on the winner.
            </p>
          </div>
          
          <button
            onClick={handleStartGame}
            disabled={isStarting || (gameState?.status === 'playing')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
              isStarting || gameState?.status === 'playing'
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {isGameOver ? (
              <>
                <RotateCcw className="w-5 h-5" />
                New Game
              </>
            ) : gameState?.status === 'playing' ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Game in Progress
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                {isStarting ? 'Starting...' : 'Start Game'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
          {/* Chess Board */}
          <div className="flex-shrink-0">
            <ChessBoard gameState={gameState} />
          </div>

          {/* Market Panel */}
          <div className="w-full lg:w-auto">
            <MarketPanel
              market={marketState}
              position={position}
              onBuyWhite={handleBuyWhite}
              onBuyBlack={handleBuyBlack}
              gameStatus={gameState?.status || 'waiting'}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl mx-auto mt-12 text-center text-sm text-gray-500">
        <p>Built for the Colosseum Agent Hackathon 2026</p>
        <p className="mt-1">Prediction market uses USDC on Solana (demo mode)</p>
      </div>
    </main>
  );
}
