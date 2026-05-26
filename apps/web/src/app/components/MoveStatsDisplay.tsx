import { Sparkles } from 'lucide-react';
import { GAME_MAX_LEVEL } from '../utils/gameLogic';
import type { LevelMoveSlot } from '../utils/levelMoveStats';
import { sumRecordedMoves } from '../utils/levelMoveStats';

type MovePairHighlight = 'none' | 'record' | 'tied';

interface MovePairProps {
  run: number;
  best: number;
  size?: 'lg' | 'sm';
  highlight?: MovePairHighlight;
  runTone?: 'default' | 'primary';
  heading?: string;
  showRecordSparkle?: boolean;
}

function MovePair({
  run,
  best,
  size = 'lg',
  highlight = 'none',
  runTone = 'default',
  heading,
  showRecordSparkle = false,
}: MovePairProps) {
  const isLarge = size === 'lg';
  const celebrate = highlight === 'record' || highlight === 'tied';
  const accentColor = celebrate ? 'text-primary' : runTone === 'primary' ? 'text-primary' : 'text-foreground';
  const runColor = highlight === 'record' ? 'text-primary' : accentColor;
  const bestColor = celebrate ? 'text-primary' : 'text-foreground';

  if (!isLarge) {
    return (
      <div className="flex flex-col items-center justify-center gap-0.5 py-0.5" aria-hidden>
        <span className={`font-mono text-[0.66rem] leading-none tabular-nums font-medium sm:text-[0.7rem] ${runColor}`}>{run}</span>
        <span className={`font-mono text-[0.58rem] leading-none tabular-nums font-medium sm:text-[0.62rem] ${bestColor}`}>{best}</span>
      </div>
    );
  }

  const numberClass = 'font-mono text-[2.35rem] font-semibold tabular-nums tracking-tight sm:text-4xl';

  const pair = (
    <div className="flex items-stretch justify-center">
      <div className="min-w-[4.5rem] flex-1 text-center">
        <div className={`${numberClass} ${runColor}`}>{run}</div>
        <div className="mt-1 font-mono text-[0.62rem] tracking-[0.14em] text-foreground-soft sm:text-xs">This run</div>
      </div>

      <div className="mx-3 w-px self-stretch bg-[color-mix(in_srgb,var(--border)_80%,transparent)] sm:mx-4" aria-hidden />

      <div className="min-w-[4.5rem] flex-1 text-center">
        <div className={`${numberClass} ${bestColor}`}>{best}</div>
        <div className="mt-1 flex items-center justify-center gap-1 font-mono text-[0.62rem] tracking-[0.14em] text-foreground-soft sm:text-xs">
          <span>Best</span>
          {showRecordSparkle && <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden />}
        </div>
      </div>
    </div>
  );

  if (!heading) {
    return pair;
  }

  return (
    <div>
      <div className="mb-3 font-mono text-[0.68rem] tracking-[0.2em] text-foreground-soft sm:text-xs">{heading}</div>
      {pair}
    </div>
  );
}

export interface LevelCompleteMoveStatsProps {
  level: number;
  moves: number;
  best: number;
  previousBest: number | null;
  isNewBest: boolean;
  hadPreviousBest: boolean;
}

type LevelOutcome = 'new_record' | 'first_clear' | 'tied' | 'above_best';

function resolveLevelOutcome(
  moves: number,
  best: number,
  isNewBest: boolean,
  hadPreviousBest: boolean,
): LevelOutcome {
  if (isNewBest && hadPreviousBest) return 'new_record';
  if (!hadPreviousBest) return 'first_clear';
  if (moves === best) return 'tied';
  return 'above_best';
}

function resolveMovePairHighlight(outcome: LevelOutcome): MovePairHighlight {
  if (outcome === 'new_record' || outcome === 'first_clear') return 'record';
  if (outcome === 'tied') return 'tied';
  return 'none';
}

export function LevelCompleteMoveStats({
  level,
  moves,
  best,
  isNewBest,
  hadPreviousBest,
}: LevelCompleteMoveStatsProps) {
  const outcome = resolveLevelOutcome(moves, best, isNewBest, hadPreviousBest);
  const celebrate = outcome === 'new_record' || outcome === 'first_clear';
  const highlight = resolveMovePairHighlight(outcome);

  return (
    <div
      className={[
        'game-stat-chip mt-5 rounded-xl px-5 py-4 text-center sm:px-6 sm:py-5',
        celebrate ? 'border-primary/40 bg-primary/10' : '',
      ].join(' ')}
      aria-label={`Level ${level}: ${moves} moves this run, best ${best}${outcome === 'new_record' ? ', new record' : ''}`}
    >
      <MovePair
        run={moves}
        best={best}
        size="lg"
        highlight={highlight}
        heading="Moves"
        showRecordSparkle={outcome === 'new_record'}
      />
    </div>
  );
}

interface CampaignMoveStatsProps {
  runMoves: LevelMoveSlot[];
  bestMoves: LevelMoveSlot[];
}

interface LevelScoreCell {
  level: number;
  run: number | null;
  best: number | null;
}

function buildLevelScoreCells(runMoves: LevelMoveSlot[], bestMoves: LevelMoveSlot[]): LevelScoreCell[] {
  return Array.from({ length: GAME_MAX_LEVEL }, (_, index) => ({
    level: index + 1,
    run: runMoves[index],
    best: bestMoves[index],
  }));
}

function formatMoveCell(value: LevelMoveSlot): string {
  return value === null ? '—' : String(value);
}

export function CampaignMoveStats({ runMoves, bestMoves }: CampaignMoveStatsProps) {
  const cells = buildLevelScoreCells(runMoves, bestMoves);
  const runTotal = sumRecordedMoves(runMoves);
  const bestTotal = sumRecordedMoves(bestMoves);

  return (
    <div className="mt-5 text-left">
      <div className="game-stat-chip overflow-hidden rounded-xl">
        <div className="border-b border-[color-mix(in_srgb,var(--border)_85%,transparent)] bg-primary/10 px-4 py-3.5 text-center sm:px-5 sm:py-4">
          <div className="font-mono text-sm font-semibold tracking-[0.28em] text-primary sm:text-base">Moves</div>
        </div>

        <div className="max-h-[min(52vh,24rem)] overflow-auto">
          <table className="w-full table-fixed border-collapse font-mono text-[0.8rem] sm:text-sm">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[36%]" />
              <col className="w-[36%]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-[color-mix(in_srgb,var(--card)_98%,transparent)] backdrop-blur-sm">
              <tr className="border-b border-[color-mix(in_srgb,var(--border)_85%,transparent)]">
                <th className="px-4 py-2.5 text-left text-[0.62rem] font-normal tracking-[0.14em] text-muted-foreground sm:px-5 sm:text-xs">
                  Level
                </th>
                <th className="px-4 py-2.5 text-right text-[0.62rem] font-normal tracking-[0.14em] text-muted-foreground sm:px-5 sm:text-xs">
                  This run
                </th>
                <th className="px-4 py-2.5 text-right text-[0.62rem] font-normal tracking-[0.14em] text-muted-foreground sm:px-5 sm:text-xs">
                  Best
                </th>
              </tr>
            </thead>
            <tbody>
              {cells.map((cell, index) => {
                const hasRun = cell.run !== null;
                const hasBest = cell.best !== null;

                return (
                  <tr
                    key={cell.level}
                    className={[
                      'border-b border-[color-mix(in_srgb,var(--border)_45%,transparent)]',
                      index % 2 === 1 ? 'bg-[color-mix(in_srgb,var(--foreground)_3%,transparent)]' : '',
                    ].join(' ')}
                  >
                    <td className="px-4 py-2.5 text-foreground-soft sm:px-5">{cell.level}</td>
                    <td
                      className={[
                        'px-4 py-2.5 text-right tabular-nums sm:px-5',
                        hasRun ? 'text-foreground' : 'text-muted-foreground',
                      ].join(' ')}
                    >
                      {formatMoveCell(cell.run)}
                    </td>
                    <td
                      className={[
                        'px-4 py-2.5 text-right tabular-nums sm:px-5',
                        hasBest ? 'text-foreground' : 'text-muted-foreground',
                      ].join(' ')}
                    >
                      {formatMoveCell(cell.best)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 z-10 bg-primary/12 backdrop-blur-sm">
              <tr className="border-t-2 border-primary/25">
                <td className="px-4 py-3.5 text-sm font-semibold tracking-[0.16em] text-primary sm:px-5 sm:text-base">Total</td>
                <td className="px-4 py-3.5 text-right text-base font-semibold tabular-nums text-foreground sm:px-5 sm:text-lg">
                  {runTotal}
                </td>
                <td className="px-4 py-3.5 text-right text-base font-semibold tabular-nums text-foreground sm:px-5 sm:text-lg">
                  {bestTotal > 0 ? bestTotal : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
