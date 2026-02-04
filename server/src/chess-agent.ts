import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { Chess } from "chess.js";

const anthropic = new Anthropic();
const openai = new OpenAI();

export type AgentType = "claude" | "gpt";

const SYSTEM_PROMPT = `You are a chess grandmaster. You will be given the current board state in FEN notation and a list of legal moves.

Your task: Choose the best move from the legal moves list.

IMPORTANT: Respond with ONLY the move in UCI notation (e.g., "e2e4", "g1f3", "e7e8q" for promotion).
Do not include any explanation, just the move. Nothing else.`;

export async function getClaudeMove(
  fen: string,
  legalMoves: string[]
): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
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
  console.warn(`Claude returned invalid move "${response}", using fallback`);
  return legalMoves[0];
}

export async function getGptMove(
  fen: string,
  legalMoves: string[]
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 10,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Current position (FEN): ${fen}\n\nLegal moves: ${legalMoves.join(", ")}\n\nYour move:`,
      },
    ],
  });

  const response = (completion.choices[0].message.content || "")
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
  console.warn(`GPT returned invalid move "${response}", using fallback`);
  return legalMoves[0];
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
