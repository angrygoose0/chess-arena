import Anthropic from "@anthropic-ai/sdk";
import { Chess } from "chess.js";

let _anthropic: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return _anthropic;
}

export type AgentType = "claude" | "gpt";

const SYSTEM_PROMPT = `You are a chess grandmaster. You will be given the current board state in FEN notation and a list of legal moves.

Your task: Choose the best move from the legal moves list.

IMPORTANT: Respond with ONLY the move in UCI notation (e.g., "e2e4", "g1f3", "e7e8q" for promotion).
Do not include any explanation, just the move. Nothing else.`;

async function getClaudeApiMove(
  model: string,
  fen: string,
  legalMoves: string[],
  label: string
): Promise<string> {
  const message = await getAnthropicClient().messages.create({
    model,
    max_tokens: 10,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Current position (FEN): ${fen}\n\nLegal moves: ${legalMoves.join(", ")}\n\nYour move:`,
      },
    ],
  });

  const response = (message.content[0] as { type: string; text: string }).text
    .trim()
    .toLowerCase();
  
  // Validate the move is legal
  if (legalMoves.includes(response)) {
    return response;
  }
  
  // Try to extract a valid move from the response
  for (const move of legalMoves) {
    if (response.includes(move)) {
      return move;
    }
  }
  
  // Fallback: return first legal move
  console.warn(`${label} returned invalid move "${response}", using fallback`);
  return legalMoves[0];
}

export async function getClaudeMove(
  fen: string,
  legalMoves: string[]
): Promise<string> {
  return getClaudeApiMove("claude-sonnet-4-20250514", fen, legalMoves, "Claude");
}

export async function getGptMove(
  fen: string,
  legalMoves: string[]
): Promise<string> {
  // Temporarily using Claude API for GPT player as well
  return getClaudeApiMove("claude-sonnet-4-20250514", fen, legalMoves, "GPT");
}

export async function getAgentMove(
  agent: AgentType,
  fen: string,
  legalMoves: string[]
): Promise<string> {
  if (agent === "claude") {
    return getClaudeMove(fen, legalMoves);
  } else {
    return getGptMove(fen, legalMoves);
  }
}
