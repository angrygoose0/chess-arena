const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function startGame(whiteAgent = 'claude', blackAgent = 'gpt') {
  const res = await fetch(`${API_URL}/api/game/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ whiteAgent, blackAgent }),
  });
  return res.json();
}

export async function getGameState() {
  const res = await fetch(`${API_URL}/api/game`);
  if (!res.ok) return null;
  return res.json();
}

export async function getMarketState(gameId: string) {
  const res = await fetch(`${API_URL}/api/market/${gameId}`);
  if (!res.ok) return null;
  return res.json();
}

export async function buyWhite(gameId: string, userId: string, amount: number) {
  const res = await fetch(`${API_URL}/api/market/${gameId}/buy-white`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, amount }),
  });
  return res.json();
}

export async function buyBlack(gameId: string, userId: string, amount: number) {
  const res = await fetch(`${API_URL}/api/market/${gameId}/buy-black`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, amount }),
  });
  return res.json();
}

export async function getPosition(gameId: string, userId: string) {
  const res = await fetch(`${API_URL}/api/market/${gameId}/position/${userId}`);
  return res.json();
}
