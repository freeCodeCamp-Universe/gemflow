import { GAME_MAX_LEVEL } from './gameLogic';

const LEVEL_BEST_MOVES_KEY = 'gem_level_best_moves';

export type LevelMoveSlot = number | null;

export function createEmptyRunMoves(): LevelMoveSlot[] {
  return Array.from({ length: GAME_MAX_LEVEL }, () => null);
}

function normalizeBestMoves(raw: unknown): LevelMoveSlot[] {
  const slots = createEmptyRunMoves();

  if (!Array.isArray(raw)) return slots;

  for (let index = 0; index < Math.min(raw.length, GAME_MAX_LEVEL); index += 1) {
    const value = raw[index];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      slots[index] = Math.floor(value);
    }
  }

  return slots;
}

export function readLevelBestMoves(): LevelMoveSlot[] {
  if (typeof window === 'undefined') return createEmptyRunMoves();

  try {
    const raw = localStorage.getItem(LEVEL_BEST_MOVES_KEY);
    if (!raw) return createEmptyRunMoves();
    return normalizeBestMoves(JSON.parse(raw));
  } catch {
    return createEmptyRunMoves();
  }
}

function writeLevelBestMoves(moves: LevelMoveSlot[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LEVEL_BEST_MOVES_KEY, JSON.stringify(moves));
}

export interface RecordLevelBestResult {
  best: number;
  previousBest: number | null;
  isNewBest: boolean;
  hadPreviousBest: boolean;
}

export function getLevelBestMove(level: number): number | null {
  const safeLevel = Math.max(1, Math.min(GAME_MAX_LEVEL, Math.floor(level)));
  return readLevelBestMoves()[safeLevel - 1];
}

export function recordLevelBestMove(level: number, moves: number): RecordLevelBestResult {
  const safeLevel = Math.max(1, Math.min(GAME_MAX_LEVEL, Math.floor(level)));
  const safeMoves = Math.max(0, Math.floor(moves));
  const bests = readLevelBestMoves();
  const index = safeLevel - 1;
  const previous = bests[index];
  const isNewBest = previous === null || safeMoves < previous;

  if (isNewBest) {
    bests[index] = safeMoves;
    writeLevelBestMoves(bests);
  }

  const storedBest = readLevelBestMoves()[index];

  return {
    best: storedBest ?? safeMoves,
    previousBest: previous,
    isNewBest,
    hadPreviousBest: previous !== null,
  };
}

export function sumRecordedMoves(slots: LevelMoveSlot[]): number {
  return slots.reduce<number>((total, value) => (value === null ? total : total + value), 0);
}
