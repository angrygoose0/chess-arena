/**
 * Simple AMM for binary outcome prediction market
 * 
 * Uses constant product formula: x * y = k
 * Where x = WHITE_WIN tokens, y = BLACK_WIN tokens
 * 
 * Prices always sum to ~$1 (minus small rounding)
 * When you buy WHITE, price goes up; BLACK goes down
 */

export interface MarketState {
  gameId: string;
  whitePool: number;      // WHITE_WIN tokens in pool
  blackPool: number;      // BLACK_WIN tokens in pool
  k: number;              // constant product
  whitePrice: number;     // current price of WHITE_WIN in USDC
  blackPrice: number;     // current price of BLACK_WIN in USDC
  totalVolume: number;    // total USDC volume traded
  resolved: boolean;
  winner: "white" | "black" | "draw" | null;
}

export interface Position {
  userId: string;
  whiteTokens: number;
  blackTokens: number;
  totalSpent: number;
}

export interface OrderBookLevel {
  price: number;
  size: number;
}

export interface OrderBook {
  whiteBids: OrderBookLevel[];
  whiteAsks: OrderBookLevel[];
  blackBids: OrderBookLevel[];
  blackAsks: OrderBookLevel[];
}

export class PredictionMarket {
  private whitePool: number;
  private blackPool: number;
  private k: number;
  private gameId: string;
  private positions: Map<string, Position> = new Map();
  private totalVolume: number = 0;
  private resolved: boolean = false;
  private winner: "white" | "black" | "draw" | null = null;

  constructor(gameId: string, initialLiquidity: number = 1000) {
    this.gameId = gameId;
    // Start with equal pools (50/50 odds)
    this.whitePool = initialLiquidity;
    this.blackPool = initialLiquidity;
    this.k = this.whitePool * this.blackPool;
  }

  // Get current prices based on pool ratios
  getWhitePrice(): number {
    return this.blackPool / (this.whitePool + this.blackPool);
  }

  getBlackPrice(): number {
    return this.whitePool / (this.whitePool + this.blackPool);
  }

  // Calculate how many tokens you get for USDC input
  calculateBuyWhite(usdcAmount: number): { tokensOut: number; avgPrice: number; priceImpact: number } {
    const priceBefore = this.getWhitePrice();
    
    const newBlackPool = this.blackPool + usdcAmount;
    const newWhitePool = this.k / newBlackPool;
    const tokensOut = this.whitePool - newWhitePool;
    
    const avgPrice = usdcAmount / tokensOut;
    const priceAfter = newBlackPool / (newWhitePool + newBlackPool);
    const priceImpact = (priceAfter - priceBefore) / priceBefore;

    return { tokensOut, avgPrice, priceImpact };
  }

  calculateBuyBlack(usdcAmount: number): { tokensOut: number; avgPrice: number; priceImpact: number } {
    const priceBefore = this.getBlackPrice();
    
    const newWhitePool = this.whitePool + usdcAmount;
    const newBlackPool = this.k / newWhitePool;
    const tokensOut = this.blackPool - newBlackPool;
    
    const avgPrice = usdcAmount / tokensOut;
    const priceAfter = newWhitePool / (newBlackPool + newWhitePool);
    const priceImpact = (priceAfter - priceBefore) / priceBefore;

    return { tokensOut, avgPrice, priceImpact };
  }

  // Execute buy order
  buyWhite(userId: string, usdcAmount: number): { tokensOut: number; newPrice: number } {
    if (this.resolved) throw new Error("Market is resolved");
    if (usdcAmount <= 0) throw new Error("Amount must be positive");

    const { tokensOut } = this.calculateBuyWhite(usdcAmount);
    
    this.blackPool += usdcAmount;
    this.whitePool -= tokensOut;
    
    const position = this.positions.get(userId) || { userId, whiteTokens: 0, blackTokens: 0, totalSpent: 0 };
    position.whiteTokens += tokensOut;
    position.totalSpent += usdcAmount;
    this.positions.set(userId, position);
    
    this.totalVolume += usdcAmount;

    return { tokensOut, newPrice: this.getWhitePrice() };
  }

  buyBlack(userId: string, usdcAmount: number): { tokensOut: number; newPrice: number } {
    if (this.resolved) throw new Error("Market is resolved");
    if (usdcAmount <= 0) throw new Error("Amount must be positive");

    const { tokensOut } = this.calculateBuyBlack(usdcAmount);
    
    this.whitePool += usdcAmount;
    this.blackPool -= tokensOut;
    
    const position = this.positions.get(userId) || { userId, whiteTokens: 0, blackTokens: 0, totalSpent: 0 };
    position.blackTokens += tokensOut;
    position.totalSpent += usdcAmount;
    this.positions.set(userId, position);
    
    this.totalVolume += usdcAmount;

    return { tokensOut, newPrice: this.getBlackPrice() };
  }

  // Generate synthetic order book from AMM curve
  getOrderBook(depth: number = 10, stepSize: number = 10): OrderBook {
    const whiteBids: OrderBookLevel[] = [];
    const whiteAsks: OrderBookLevel[] = [];
    const blackBids: OrderBookLevel[] = [];
    const blackAsks: OrderBookLevel[] = [];

    for (let i = 1; i <= depth; i++) {
      const amount = stepSize * i;
      
      const whiteBuy = this.calculateBuyWhite(amount);
      const blackBuy = this.calculateBuyBlack(amount);
      
      whiteBids.push({ price: whiteBuy.avgPrice, size: amount });
      blackBids.push({ price: blackBuy.avgPrice, size: amount });
      
      whiteAsks.push({ price: 1 - blackBuy.avgPrice, size: amount });
      blackAsks.push({ price: 1 - whiteBuy.avgPrice, size: amount });
    }

    return { whiteBids, whiteAsks, blackBids, blackAsks };
  }

  // Resolve market and calculate payouts
  resolve(winner: "white" | "black" | "draw"): Map<string, number> {
    if (this.resolved) throw new Error("Already resolved");
    
    this.resolved = true;
    this.winner = winner;
    
    const payouts = new Map<string, number>();
    
    for (const [userId, position] of this.positions) {
      let payout = 0;
      
      if (winner === "white") {
        payout = position.whiteTokens;
      } else if (winner === "black") {
        payout = position.blackTokens;
      } else {
        payout = (position.whiteTokens + position.blackTokens) / 2;
      }
      
      payouts.set(userId, payout);
    }
    
    return payouts;
  }

  getPosition(userId: string): Position | undefined {
    return this.positions.get(userId);
  }

  getState(): MarketState {
    return {
      gameId: this.gameId,
      whitePool: this.whitePool,
      blackPool: this.blackPool,
      k: this.k,
      whitePrice: this.getWhitePrice(),
      blackPrice: this.getBlackPrice(),
      totalVolume: this.totalVolume,
      resolved: this.resolved,
      winner: this.winner,
    };
  }
}

export class MarketManager {
  private markets: Map<string, PredictionMarket> = new Map();

  createMarket(gameId: string, initialLiquidity: number = 1000): PredictionMarket {
    const market = new PredictionMarket(gameId, initialLiquidity);
    this.markets.set(gameId, market);
    return market;
  }

  getMarket(gameId: string): PredictionMarket | undefined {
    return this.markets.get(gameId);
  }
}
