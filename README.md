# Chess Arena 🎮♟️

**Claude vs GPT** — Watch AI agents battle in chess. Bet on the outcome.

Built for the [Colosseum Agent Hackathon](https://colosseum.com/agent-hackathon) 2026.

## What is this?

A single-page webapp where:
- **Two AI agents** (Claude and GPT) play chess against each other in real-time
- **Prediction market** lets humans and agents bet on who wins
- **AMM-based pricing** — prices move based on buying pressure
- **Solana settlement** — bets resolve on-chain when the game ends

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                   │
├─────────────────────────┬───────────────────────────────┤
│                         │                               │
│     ♜ CHESS BOARD ♖     │      📊 PREDICTION MARKET     │
│                         │                               │
│    Claude (White)       │   CLAUDE WIN    GPT WIN       │
│         vs              │   ─────────     ─────────     │
│      GPT (Black)        │   $0.52         $0.48         │
│                         │                               │
│    [live moves]         │   [BUY CLAUDE] [BUY GPT]      │
│                         │                               │
└─────────────────────────┴───────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  GAME SERVER    │
                    │  (Express +     │
                    │   Socket.IO)    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │  Claude  │  │   GPT    │  │  Solana  │
        │   API    │  │   API    │  │   AMM    │
        └──────────┘  └──────────┘  └──────────┘
```

## Quick Start

### Prerequisites
- Node.js 18+
- Anthropic API key
- OpenAI API key

### Setup

```bash
# Clone and install
cd chess-arena
npm run install:all

# Configure API keys
cp server/.env.example server/.env
# Edit server/.env with your API keys

# Run development servers
npm run dev
```

Frontend runs on http://localhost:3000
Server runs on http://localhost:3001

### Start a Game

1. Open http://localhost:3000
2. Click "Start Game"
3. Watch Claude (White) vs GPT (Black) battle
4. Place bets on who you think will win
5. See your payout when the game ends

## How the Market Works

The prediction market uses a **constant product AMM** (like Uniswap):

- Two tokens: `CLAUDE_WIN` and `GPT_WIN`
- Prices always sum to ~$1
- Buying `CLAUDE_WIN` pushes its price up, `GPT_WIN` price down
- When game ends:
  - Winning token = $1
  - Losing token = $0
  - Draw = both tokens worth $0.50

## Tech Stack

- **Frontend**: Next.js 14, React, TailwindCSS, react-chessboard
- **Backend**: Express, Socket.IO, chess.js
- **AI**: Claude (Anthropic), GPT-4o (OpenAI)
- **Blockchain**: Solana (for production settlement)

## Project Structure

```
chess-arena/
├── frontend/           # Next.js app
│   ├── src/
│   │   ├── app/        # Pages
│   │   ├── components/ # React components
│   │   └── lib/        # API & socket helpers
├── server/             # Game server
│   └── src/
│       ├── index.ts    # Express + Socket.IO server
│       ├── game.ts     # Chess game logic
│       ├── chess-agent.ts  # AI player integration
│       └── market.ts   # AMM prediction market
└── contracts/          # Solana programs (TODO)
```

## Roadmap

- [x] Chess game with Claude vs GPT
- [x] Real-time WebSocket updates
- [x] AMM prediction market logic
- [x] Frontend UI
- [ ] Solana smart contract for settlement
- [ ] Wallet connection (Phantom, etc.)
- [ ] On-chain betting with USDC
- [ ] Game history & leaderboard
- [ ] Agent-to-agent betting API

## License

MIT

## Built by

**voidclaw** — for the Colosseum Agent Hackathon 2026
