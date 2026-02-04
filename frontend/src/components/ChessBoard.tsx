'use client';

import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { useMemo } from 'react';

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

interface ChessBoardProps {
  gameState: GameState | null;
}

export default function ChessBoard({ gameState }: ChessBoardProps) {
  const position = gameState?.fen || 'start';
  
  // Get last move squares for highlighting
  const lastMoveSquares = useMemo(() => {
    if (!gameState?.moves.length) return {};
    
    try {
      const chess = new Chess();
      // Replay all moves except the last to get the from/to squares
      for (let i = 0; i < gameState.moves.length - 1; i++) {
        chess.move(gameState.moves[i]);
      }
      const lastMove = chess.move(gameState.moves[gameState.moves.length - 1]);
      if (lastMove) {
        return {
          [lastMove.from]: { background: 'rgba(255, 255, 0, 0.4)' },
          [lastMove.to]: { background: 'rgba(255, 255, 0, 0.4)' },
        };
      }
    } catch (e) {
      // Ignore parsing errors
    }
    return {};
  }, [gameState?.moves]);

  const getStatusText = () => {
    if (!gameState) return 'Waiting for game...';
    
    switch (gameState.status) {
      case 'waiting':
        return 'Waiting to start...';
      case 'playing':
        return gameState.turn === 'w' 
          ? `${gameState.whiteAgent.toUpperCase()} (White) thinking...`
          : `${gameState.blackAgent.toUpperCase()} (Black) thinking...`;
      case 'white_wins':
        return `🏆 ${gameState.whiteAgent.toUpperCase()} (White) WINS!`;
      case 'black_wins':
        return `🏆 ${gameState.blackAgent.toUpperCase()} (Black) WINS!`;
      case 'draw':
        return '🤝 DRAW!';
      default:
        return 'Unknown state';
    }
  };

  const isGameOver = gameState?.status === 'white_wins' || 
                      gameState?.status === 'black_wins' || 
                      gameState?.status === 'draw';

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Header */}
      <div className="flex items-center justify-between w-full max-w-[500px]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-black rounded-full border border-gray-600" />
          <span className="text-sm font-medium text-gray-300">
            {gameState?.blackAgent?.toUpperCase() || 'GPT'} (Black)
          </span>
        </div>
      </div>

      {/* Chess Board */}
      <div className="relative">
        <Chessboard
          position={position}
          boardWidth={500}
          arePiecesDraggable={false}
          customSquareStyles={lastMoveSquares}
          customDarkSquareStyle={{ backgroundColor: '#4a5568' }}
          customLightSquareStyle={{ backgroundColor: '#a0aec0' }}
        />
        
        {/* Overlay for game end */}
        {isGameOver && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="text-3xl font-bold text-white text-center px-4">
              {getStatusText()}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between w-full max-w-[500px]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-white rounded-full border border-gray-600" />
          <span className="text-sm font-medium text-gray-300">
            {gameState?.whiteAgent?.toUpperCase() || 'CLAUDE'} (White)
          </span>
        </div>
      </div>

      {/* Status */}
      <div className="text-center">
        <p className={`text-lg font-semibold ${isGameOver ? 'text-yellow-400' : 'text-blue-400'}`}>
          {getStatusText()}
        </p>
        {gameState?.lastMove && !isGameOver && (
          <p className="text-sm text-gray-400 mt-1">
            Move {gameState.moveCount}: {gameState.lastMove}
          </p>
        )}
      </div>

      {/* Move History */}
      {gameState?.moves && gameState.moves.length > 0 && (
        <div className="w-full max-w-[500px] bg-gray-800/50 rounded-lg p-3 max-h-32 overflow-y-auto">
          <p className="text-xs text-gray-400 mb-2">Move History</p>
          <div className="flex flex-wrap gap-1 text-sm font-mono">
            {gameState.moves.map((move, i) => (
              <span key={i} className={i % 2 === 0 ? 'text-white' : 'text-gray-400'}>
                {i % 2 === 0 && <span className="text-gray-500">{Math.floor(i/2) + 1}.</span>}
                {move}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
