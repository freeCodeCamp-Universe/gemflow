export type PowderColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

export type GemType = 'Ruby' | 'Sapphire' | 'Emerald' | 'Topaz' | 'Amethyst' | 'Citrine';

export interface GemVisual {
  color: string;
  powderColor: PowderColor;
  powderLabel: string;
  shape: string;
  facet: string;
  gleam: string;
}

export interface Vial {
  id: number;
  layers: PowderColor[];
  capacity: number;
  isSynthesizing?: boolean;
}

export interface Move {
  from: number;
  to: number;
  color: PowderColor;
  count: number;
}

export interface SynthesisMove {
  type: 'synthesis';
  vialId: number;
  gem: GemType;
  layers: PowderColor[];
}

export interface PourHistoryEvent extends Move {
  type: 'pour';
}

export type HistoryEvent = PourHistoryEvent | SynthesisMove;

export interface Level {
  id: number;
  bottles: PowderColor[][];
  extraEmpty: number;
  targetGems?: Partial<Record<GemType, number>>;
}

export interface Collection {
  Ruby: number;
  Sapphire: number;
  Emerald: number;
  Topaz: number;
  Amethyst: number;
  Citrine: number;
}

export interface GameState {
  level: number;
  vials: Vial[];
  history: HistoryEvent[];
  collection: Collection;
  moves: number;
  highestCompletedLevel: number;
  /** 本关每种宝石应合成次数（与关卡颜色管数一致） */
  levelTargets: Partial<Record<GemType, number>>;
}

export const COLOR_TO_GEM: Record<PowderColor, GemType> = {
  red: 'Ruby',
  blue: 'Sapphire',
  green: 'Emerald',
  yellow: 'Topaz',
  purple: 'Amethyst',
  orange: 'Citrine',
};

export const COLOR_PALETTE: Record<PowderColor, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#10b981',
  yellow: '#f59e0b',
  purple: '#a855f7',
  orange: '#f97316',
};

export const GEM_TYPES: readonly GemType[] = ['Ruby', 'Sapphire', 'Emerald', 'Topaz', 'Amethyst', 'Citrine'];

export const GEM_VISUALS: Record<GemType, GemVisual> = {
  Ruby: {
    color: COLOR_PALETTE.red,
    powderColor: 'red',
    powderLabel: 'Red',
    shape: 'polygon(50% 0%, 84% 18%, 100% 50%, 84% 84%, 50% 100%, 16% 84%, 0% 50%, 16% 18%)',
    facet: 'polygon(50% 8%, 78% 24%, 72% 76%, 28% 76%, 22% 24%)',
    gleam: 'polygon(34% 10%, 52% 16%, 43% 66%, 26% 56%)',
  },
  Sapphire: {
    color: COLOR_PALETTE.blue,
    powderColor: 'blue',
    powderLabel: 'Blue',
    shape: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    facet: 'polygon(50% 12%, 82% 50%, 50% 88%, 18% 50%)',
    gleam: 'polygon(36% 16%, 50% 26%, 38% 62%, 24% 52%)',
  },
  Emerald: {
    color: COLOR_PALETTE.green,
    powderColor: 'green',
    powderLabel: 'Green',
    shape: 'polygon(18% 0%, 82% 0%, 100% 18%, 100% 82%, 82% 100%, 18% 100%, 0% 82%, 0% 18%)',
    facet: 'polygon(28% 12%, 72% 12%, 88% 28%, 88% 72%, 72% 88%, 28% 88%, 12% 72%, 12% 28%)',
    gleam: 'polygon(30% 12%, 46% 12%, 40% 64%, 26% 64%)',
  },
  Topaz: {
    color: COLOR_PALETTE.yellow,
    powderColor: 'yellow',
    powderLabel: 'Yellow',
    shape: 'polygon(50% 0%, 88% 30%, 70% 100%, 30% 100%, 12% 30%)',
    facet: 'polygon(50% 14%, 74% 32%, 62% 82%, 38% 82%, 26% 32%)',
    gleam: 'polygon(34% 12%, 50% 22%, 42% 58%, 28% 50%)',
  },
  Amethyst: {
    color: COLOR_PALETTE.purple,
    powderColor: 'purple',
    powderLabel: 'Purple',
    shape: 'polygon(50% 0%, 100% 86%, 0% 86%)',
    facet: 'polygon(50% 14%, 76% 68%, 24% 68%)',
    gleam: 'polygon(38% 18%, 50% 26%, 40% 56%, 30% 52%)',
  },
  Citrine: {
    color: COLOR_PALETTE.orange,
    powderColor: 'orange',
    powderLabel: 'Orange',
    shape: 'polygon(20% 8%, 80% 8%, 100% 50%, 80% 92%, 20% 92%, 0% 50%)',
    facet: 'polygon(28% 18%, 72% 18%, 84% 50%, 72% 82%, 28% 82%, 16% 50%)',
    gleam: 'polygon(30% 20%, 46% 20%, 40% 60%, 26% 56%)',
  },
};
