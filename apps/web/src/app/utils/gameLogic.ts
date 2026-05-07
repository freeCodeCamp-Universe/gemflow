import type {
  Vial,
  PowderColor,
  Move,
  Level,
  GameState,
  Collection,
  GemType,
  HistoryEvent,
  PourHistoryEvent,
  SynthesisMove,
} from '../types/game';
import { COLOR_TO_GEM } from '../types/game';

const POWDER_COLORS = new Set<PowderColor>(['red', 'blue', 'green', 'yellow', 'purple', 'orange']);
const GEM_TYPES: GemType[] = ['Ruby', 'Sapphire', 'Emerald', 'Topaz', 'Amethyst', 'Citrine'];
const ALL_COLORS: PowderColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];
const VIAL_CAPACITY = 4;
const GENERATION_RETRY_LIMIT = 250;

export const GAME_MAX_LEVEL = 20;

interface LevelSpec {
  activeColors: PowderColor[];
  extraEmpty: number;
  scrambleSteps: number;
  label: string;
  summary: string;
}

export interface LevelDifficultyInfo {
  label: string;
  summary: string;
  colorCount: number;
  vialCount: number;
  spareVials: number;
  scrambleSteps: number;
}

function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return 1;
  return Math.max(1, Math.min(GAME_MAX_LEVEL, Math.floor(level)));
}

function emptyCollection(): Collection {
  return {
    Ruby: 0,
    Sapphire: 0,
    Emerald: 0,
    Topaz: 0,
    Amethyst: 0,
    Citrine: 0,
  };
}

function isPowderColor(value: unknown): value is PowderColor {
  return typeof value === 'string' && POWDER_COLORS.has(value as PowderColor);
}

function isValidVial(value: unknown): value is Vial {
  if (!value || typeof value !== 'object') return false;
  const vial = value as Record<string, unknown>;

  if (typeof vial.id !== 'number' || !Number.isInteger(vial.id) || vial.id < 0) return false;
  if (
    typeof vial.capacity !== 'number' ||
    !Number.isInteger(vial.capacity) ||
    vial.capacity < 1 ||
    !Array.isArray(vial.layers) ||
    vial.layers.length > vial.capacity
  ) {
    return false;
  }

  return vial.layers.every(isPowderColor);
}

function isValidMove(value: unknown): value is Move {
  if (!value || typeof value !== 'object') return false;
  const move = value as Record<string, unknown>;

  return (
    typeof move.from === 'number' &&
    typeof move.to === 'number' &&
    typeof move.count === 'number' &&
    isPowderColor(move.color) &&
    Number.isInteger(move.from) &&
    Number.isInteger(move.to) &&
    Number.isInteger(move.count) &&
    move.count > 0
  );
}

function isValidSynthesisMove(value: unknown): value is SynthesisMove {
  if (!value || typeof value !== 'object') return false;
  const move = value as Record<string, unknown>;

  return (
    move.type === 'synthesis' &&
    typeof move.vialId === 'number' &&
    Number.isInteger(move.vialId) &&
    move.vialId >= 0 &&
    typeof move.gem === 'string' &&
    GEM_TYPES.includes(move.gem as GemType) &&
    Array.isArray(move.layers) &&
    move.layers.length > 0 &&
    move.layers.length <= VIAL_CAPACITY &&
    move.layers.every(isPowderColor)
  );
}

function normalizeHistoryEvent(value: unknown): HistoryEvent | null {
  if (!value || typeof value !== 'object') return null;
  const event = value as Record<string, unknown>;

  if (event.type === 'synthesis') {
    return isValidSynthesisMove(event) ? (event as SynthesisMove) : null;
  }

  if (event.type === 'pour') {
    return isValidMove(event) ? ({ ...(event as Move), type: 'pour' } as PourHistoryEvent) : null;
  }

  if (isValidMove(event)) {
    return { ...(event as Move), type: 'pour' };
  }

  return null;
}

function isValidCollection(value: unknown): value is Collection {
  if (!value || typeof value !== 'object') return false;
  const collection = value as Record<string, unknown>;

  return GEM_TYPES.every(
    (gem) => typeof collection[gem] === 'number' && Number.isFinite(collection[gem]!) && (collection[gem] as number) >= 0
  );
}

function normalizeHighestCompletedLevel(raw: unknown, level: number): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.min(GAME_MAX_LEVEL, Math.floor(raw)));
  }

  return Math.max(0, level - 1);
}

function normalizeLevelTargets(raw: unknown, levelNumber: number): Partial<Record<GemType, number>> {
  if (!raw || typeof raw !== 'object') {
    return generateLevel(levelNumber).targetGems ?? {};
  }

  const input = raw as Record<string, unknown>;
  const out: Partial<Record<GemType, number>> = {};

  for (const gem of GEM_TYPES) {
    const value = input[gem];
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
      out[gem] = value;
    }
  }

  return Object.keys(out).length > 0 ? out : generateLevel(levelNumber).targetGems ?? {};
}

function getLevelSpec(levelNumber: number): LevelSpec {
  const level = clampLevel(levelNumber);
  const colorCount = level <= 3 ? 3 : level <= 6 ? 4 : level <= 10 ? 5 : 6;
  const activeColors = ALL_COLORS.slice(0, colorCount);
  const extraEmpty = 2;
  const scrambleSteps = 4 + level * 2;

  if (level <= 3) {
    return {
      activeColors,
      extraEmpty,
      scrambleSteps,
      label: 'Apprentice',
      summary: 'Three powder colors, two spare vials, and short scramble chains build the basic rhythm.',
    };
  }

  if (level <= 6) {
    return {
      activeColors,
      extraEmpty,
      scrambleSteps,
      label: 'Journeyman',
      summary: 'A fourth color and more tubes raise the sorting pressure while keeping two recovery spaces.',
    };
  }

  if (level <= 10) {
    return {
      activeColors,
      extraEmpty,
      scrambleSteps,
      label: 'Artisan',
      summary: 'Purple joins the lab, tube count increases, and deeper scrambles create longer solution paths.',
    };
  }

  return {
    activeColors,
    extraEmpty,
    scrambleSteps,
    label: 'Master',
    summary: 'Orange unlocks at full tube count, and late levels get their difficulty from more colors plus deeper scrambling.',
  };
}

export function getLevelDifficultyInfo(levelNumber: number): LevelDifficultyInfo {
  const spec = getLevelSpec(levelNumber);

  return {
    label: spec.label,
    summary: spec.summary,
    colorCount: spec.activeColors.length,
    vialCount: spec.activeColors.length + spec.extraEmpty,
    spareVials: spec.extraEmpty,
    scrambleSteps: spec.scrambleSteps,
  };
}

function createSolvedBottles(colors: PowderColor[], extraEmpty: number): PowderColor[][] {
  const bottles = colors.map((color) => Array<PowderColor>(VIAL_CAPACITY).fill(color));

  for (let i = 0; i < extraEmpty; i++) {
    bottles.push([]);
  }

  return bottles;
}

function cloneBottles(bottles: PowderColor[][]): PowderColor[][] {
  return bottles.map((layers) => [...layers]);
}

function sameTopColorCount(layers: PowderColor[]): number {
  if (layers.length === 0) return 0;

  const topColor = layers[layers.length - 1];
  let count = 0;

  for (let i = layers.length - 1; i >= 0; i--) {
    if (layers[i] === topColor) {
      count++;
    } else {
      break;
    }
  }

  return count;
}

function shuffleArray<T>(items: T[]): T[] {
  const out = [...items];

  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }

  return out;
}

function applyReverseMove(
  bottles: PowderColor[][],
  fromIndex: number,
  toIndex: number,
  count: number
): PowderColor[][] {
  const next = cloneBottles(bottles);
  const moved = next[fromIndex].slice(-count);
  next[fromIndex] = next[fromIndex].slice(0, -count);
  next[toIndex] = [...next[toIndex], ...moved];
  return next;
}

function hasMixedBottle(bottles: PowderColor[][]): boolean {
  return bottles.some((layers) => layers.length > 1 && !layers.every((color) => color === layers[0]));
}

function hasSynthesizableBottle(bottles: PowderColor[][]): boolean {
  return bottles.some(
    (layers) => layers.length === VIAL_CAPACITY && layers.every((color) => color === layers[0])
  );
}

function buildReverseScrambledBottles(spec: LevelSpec): PowderColor[][] | null {
  let current = createSolvedBottles(spec.activeColors, spec.extraEmpty);
  let lastMove: { from: number; to: number; count: number } | null = null;

  for (let step = 0; step < spec.scrambleSteps; step++) {
    const options: Array<{ from: number; to: number; count: number; mixedTarget: boolean }> = [];

    for (let from = 0; from < current.length; from++) {
      const fromLayers = current[from];
      const contiguous = sameTopColorCount(fromLayers);

      if (contiguous === 0) continue;

      for (let to = 0; to < current.length; to++) {
        if (to === from) continue;
        const space = VIAL_CAPACITY - current[to].length;
        if (space === 0) continue;

        for (let count = 1; count <= Math.min(contiguous, space); count++) {
          if (
            lastMove &&
            lastMove.from === to &&
            lastMove.to === from &&
            lastMove.count === count
          ) {
            continue;
          }

          options.push({
            from,
            to,
            count,
            mixedTarget: current[to].length > 0,
          });
        }
      }
    }

    if (options.length === 0) {
      return null;
    }

    const mixedOptions = options.filter((option) => option.mixedTarget);
    const pool = mixedOptions.length > 0 ? mixedOptions : options;
    const choice = pool[Math.floor(Math.random() * pool.length)];

    current = applyReverseMove(current, choice.from, choice.to, choice.count);
    lastMove = { from: choice.from, to: choice.to, count: choice.count };
  }

  if (!hasMixedBottle(current)) return null;
  if (hasSynthesizableBottle(current)) return null;

  return current;
}

function createTargetGems(colors: PowderColor[]): Partial<Record<GemType, number>> {
  const targetGems: Partial<Record<GemType, number>> = {};

  for (const color of colors) {
    const gem = COLOR_TO_GEM[color];
    targetGems[gem] = (targetGems[gem] ?? 0) + 1;
  }

  return targetGems;
}

function createDeterministicFallbackBottles(spec: LevelSpec): PowderColor[][] {
  const bottles = createSolvedBottles(spec.activeColors, spec.extraEmpty);
  const firstEmptyIndex = spec.activeColors.length;
  const secondEmptyIndex = spec.activeColors.length + 1;

  bottles[0] = bottles[0].slice(0, -1);
  bottles[firstEmptyIndex] = [spec.activeColors[0]];
  bottles[1] = bottles[1].slice(0, -1);
  bottles[firstEmptyIndex] = [...bottles[firstEmptyIndex], spec.activeColors[1]];

  if (secondEmptyIndex < bottles.length) {
    bottles[2] = bottles[2].slice(0, -1);
    bottles[secondEmptyIndex] = [spec.activeColors[2]];
  }

  return shuffleArray(bottles);
}

export function parseStoredGameState(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  const input = raw as Record<string, unknown>;

  if (typeof input.level !== 'number' || !Number.isFinite(input.level) || input.level < 1) return null;
  if (!Array.isArray(input.vials) || input.vials.length === 0 || !input.vials.every(isValidVial)) return null;
  if (!Array.isArray(input.history)) return null;
  if (!isValidCollection(input.collection)) return null;
  if (typeof input.moves !== 'number' || !Number.isFinite(input.moves) || input.moves < 0) return null;

  const history = input.history
    .map(normalizeHistoryEvent)
    .filter((event): event is HistoryEvent => event !== null);

  if (history.length !== input.history.length) return null;

  const level = clampLevel(input.level);

  return {
    level,
    vials: (input.vials as Vial[]).map((vial) => ({ ...vial, layers: [...vial.layers] })),
    history,
    collection: { ...(input.collection as Collection) },
    moves: Math.floor(input.moves),
    highestCompletedLevel: normalizeHighestCompletedLevel(input.highestCompletedLevel, level),
    levelTargets: normalizeLevelTargets(input.levelTargets, level),
  };
}

export function readAndParseGameState(): GameState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem('gem_game_state');
    if (!raw) return null;
    return parseStoredGameState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function createGameStateForLevel(
  levelNumber: number,
  options?: { preserveCollection?: Collection; highestCompletedLevel?: number }
): GameState {
  const level = clampLevel(levelNumber);
  const levelData = generateLevel(level);

  return {
    level,
    vials: levelData.bottles.map((layers, index) => ({
      id: index,
      layers,
      capacity: VIAL_CAPACITY,
    })),
    history: [],
    collection: options?.preserveCollection ? { ...options.preserveCollection } : emptyCollection(),
    moves: 0,
    highestCompletedLevel: Math.max(0, Math.min(GAME_MAX_LEVEL, options?.highestCompletedLevel ?? level - 1)),
    levelTargets: levelData.targetGems ?? {},
  };
}

export function canPour(from: Vial, to: Vial): boolean {
  if (from.layers.length === 0) return false;
  if (to.layers.length >= to.capacity) return false;

  const fromTopColor = from.layers[from.layers.length - 1];
  const toTopColor = to.layers[to.layers.length - 1];

  return to.layers.length === 0 || fromTopColor === toTopColor;
}

export function countTopSameColor(vial: Vial): number {
  return sameTopColorCount(vial.layers);
}

export function pour(from: Vial, to: Vial): { newFrom: Vial; newTo: Vial; move: PourHistoryEvent } | null {
  if (!canPour(from, to)) return null;

  const topColor = from.layers[from.layers.length - 1];
  const count = countTopSameColor(from);
  const space = to.capacity - to.layers.length;
  const moveCount = Math.min(count, space);

  return {
    newFrom: { ...from, layers: from.layers.slice(0, -moveCount) },
    newTo: { ...to, layers: [...to.layers, ...Array(moveCount).fill(topColor)] },
    move: { from: from.id, to: to.id, color: topColor, count: moveCount, type: 'pour' },
  };
}

export function isVialComplete(vial: Vial): boolean {
  if (vial.layers.length === 0) return true;
  if (vial.layers.length !== vial.capacity) return false;

  const firstColor = vial.layers[0];
  return vial.layers.every((color) => color === firstColor);
}

export function isLevelComplete(vials: Vial[]): boolean {
  if (vials.length === 0) return false;
  return vials.every((vial) => vial.layers.length === 0);
}

export function canSynthesize(vial: Vial): boolean {
  if (vial.layers.length !== vial.capacity) return false;
  const firstColor = vial.layers[0];
  return vial.layers.every((color) => color === firstColor);
}

export function hasAnyValidMove(vials: Vial[]): boolean {
  for (let from = 0; from < vials.length; from++) {
    for (let to = 0; to < vials.length; to++) {
      if (from !== to && canPour(vials[from], vials[to])) {
        return true;
      }
    }
  }

  return false;
}

export function isDeadEnd(vials: Vial[]): boolean {
  if (isLevelComplete(vials)) return false;
  if (vials.some((vial) => canSynthesize(vial))) return false;
  return !hasAnyValidMove(vials);
}

export function generateLevel(levelNumber: number): Level {
  const level = clampLevel(levelNumber);
  const spec = getLevelSpec(level);
  const targetGems = createTargetGems(spec.activeColors);

  for (let attempt = 0; attempt < GENERATION_RETRY_LIMIT; attempt++) {
    const bottles = buildReverseScrambledBottles(spec);
    if (!bottles) continue;

    const shuffledBottles = shuffleArray(bottles);

    return {
      id: level,
      bottles: shuffledBottles,
      extraEmpty: spec.extraEmpty,
      targetGems,
    };
  }

  const fallback = buildReverseScrambledBottles(spec) ?? createDeterministicFallbackBottles(spec);

  return {
    id: level,
    bottles: fallback,
    extraEmpty: spec.extraEmpty,
    targetGems,
  };
}
