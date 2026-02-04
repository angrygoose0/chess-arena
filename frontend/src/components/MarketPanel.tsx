'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface OrderBookLevel {
  price: number;
  size: number;
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
    whiteBids: OrderBookLevel[];
    whiteAsks: OrderBookLevel[];
    blackBids: OrderBookLevel[];
    blackAsks: OrderBookLevel[];
  };
}

interface Position {
  userId: string;
  whiteTokens: number;
  blackTokens: number;
  totalSpent: number;
}

interface MarketPanelProps {
  market: MarketState | null;
  position: Position | null;
  onBuyWhite: (amount: number) => void;
  onBuyBlack: (amount: number) => void;
  gameStatus: string;
}

export default function MarketPanel({ 
  market, 
  position, 
  onBuyWhite, 
  onBuyBlack,
  gameStatus 
}: MarketPanelProps) {
  const [amount, setAmount] = useState<string>('10');
  const [selectedSide, setSelectedSide] = useState<'white' | 'black'>('white');

  const isGameActive = gameStatus === 'playing';
  const isGameOver = ['white_wins', 'black_wins', 'draw'].includes(gameStatus);

  const handleBuy = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    
    if (selectedSide === 'white') {
      onBuyWhite(numAmount);
    } else {
      onBuyBlack(numAmount);
    }
  };

  const formatPrice = (price: number) => `$${price.toFixed(3)}`;
  const formatPercent = (price: number) => `${(price * 100).toFixed(1)}%`;

  return (
    <div className="bg-gray-900/80 rounded-xl p-6 w-full max-w-md border border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Prediction Market</h2>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <DollarSign className="w-4 h-4" />
          <span>Vol: ${market?.totalVolume.toFixed(0) || '0'}</span>
        </div>
      </div>

      {/* Prices */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => setSelectedSide('white')}
          className={`p-4 rounded-lg border-2 transition-all ${
            selectedSide === 'white'
              ? 'border-green-500 bg-green-500/10'
              : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-semibold">CLAUDE</span>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-400">
            {formatPercent(market?.whitePrice || 0.5)}
          </div>
          <div className="text-sm text-gray-400">
            {formatPrice(market?.whitePrice || 0.5)}
          </div>
        </button>

        <button
          onClick={() => setSelectedSide('black')}
          className={`p-4 rounded-lg border-2 transition-all ${
            selectedSide === 'black'
              ? 'border-red-500 bg-red-500/10'
              : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-white font-semibold">GPT</span>
            <TrendingDown className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">
            {formatPercent(market?.blackPrice || 0.5)}
          </div>
          <div className="text-sm text-gray-400">
            {formatPrice(market?.blackPrice || 0.5)}
          </div>
        </button>
      </div>

      {/* Order Book Depth */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Order Depth</h3>
        <div className="grid grid-cols-2 gap-4 text-xs">
          {/* White depth */}
          <div className="space-y-1">
            {market?.orderBook?.whiteBids.slice(0, 5).map((level, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-green-400">{formatPrice(level.price)}</span>
                <span className="text-gray-500">${level.size}</span>
              </div>
            ))}
          </div>
          {/* Black depth */}
          <div className="space-y-1">
            {market?.orderBook?.blackBids.slice(0, 5).map((level, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-red-400">{formatPrice(level.price)}</span>
                <span className="text-gray-500">${level.size}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Buy Interface */}
      {!isGameOver && (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Amount (USDC)</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="10"
                min="1"
                step="1"
              />
              <div className="flex gap-1">
                {[10, 50, 100].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAmount(preset.toString())}
                    className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-400 hover:bg-gray-700 transition-colors"
                  >
                    ${preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleBuy}
            disabled={!isGameActive}
            className={`w-full py-3 rounded-lg font-semibold transition-all ${
              selectedSide === 'white'
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'bg-red-600 hover:bg-red-500 text-white'
            } ${!isGameActive ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isGameActive
              ? `Buy ${selectedSide === 'white' ? 'CLAUDE' : 'GPT'} @ ${formatPrice(
                  selectedSide === 'white' ? market?.whitePrice || 0.5 : market?.blackPrice || 0.5
                )}`
              : gameStatus === 'waiting'
              ? 'Waiting for game...'
              : 'Market Closed'}
          </button>
        </div>
      )}

      {/* Position */}
      {position && (position.whiteTokens > 0 || position.blackTokens > 0) && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Your Position</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">CLAUDE tokens:</span>
              <span className="text-green-400 ml-2">{position.whiteTokens.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-500">GPT tokens:</span>
              <span className="text-red-400 ml-2">{position.blackTokens.toFixed(2)}</span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">Total spent:</span>
              <span className="text-white ml-2">${position.totalSpent.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Winner banner */}
      {isGameOver && market?.winner && (
        <div className={`mt-6 p-4 rounded-lg text-center ${
          market.winner === 'white' ? 'bg-green-500/20 border border-green-500' :
          market.winner === 'black' ? 'bg-red-500/20 border border-red-500' :
          'bg-yellow-500/20 border border-yellow-500'
        }`}>
          <p className="text-lg font-bold">
            {market.winner === 'white' && '🏆 CLAUDE WINS!'}
            {market.winner === 'black' && '🏆 GPT WINS!'}
            {market.winner === 'draw' && '🤝 DRAW!'}
          </p>
          {position && (
            <p className="text-sm text-gray-300 mt-2">
              Your payout: $
              {market.winner === 'white' ? position.whiteTokens.toFixed(2) :
               market.winner === 'black' ? position.blackTokens.toFixed(2) :
               ((position.whiteTokens + position.blackTokens) / 2).toFixed(2)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
