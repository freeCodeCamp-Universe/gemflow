import {
  AlertTriangle,
  HelpCircle,
  LayoutGrid,
  Settings,
  Shuffle,
  Sparkles,
  Trophy,
  Undo2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GemType, PowderColor } from '../types/game';
import { COLOR_TO_GEM } from '../types/game';
import {
  canPour,
  canSynthesize,
  createGameStateForLevel,
  GAME_MAX_LEVEL,
  isDeadEnd,
  isLevelComplete,
  pour,
  readAndParseGameState,
} from '../utils/gameLogic';
import {
  buildPourVisualPlan,
  type PourVisualPlan
} from '../utils/pourMotion';
import { CollectionPanel } from './CollectionPanel';
import { GameInstructions } from './GameInstructions';
import { GemIcon } from './GemIcon';
import { LevelOverview } from './LevelOverview';
import { PourAnimation } from './PourAnimation';
import { SynthesisAnimation } from './SynthesisAnimation';
import { Vial, type PowderRenderLayer } from './Vial';
import { playFailureTone, playPourRustle, playSuccessTone, setSoundEnabled, type PourRustleHandle } from './gameAudio';
import { SettingsPanel } from './SettingsPanel';
import { Button } from './ui/button';
import { readSoundEnabled, readTheme, writeTheme, type ThemeMode } from '../utils/gamePreferences';

function formatLevelTargets(targets: Partial<Record<GemType, number>>): string {
  return Object.entries(targets)
    .filter(([, count]) => typeof count === 'number' && count > 0)
    .map(([gem, count]) => `${gem}×${count}`)
    .join(' • ');
}

function clampPreviewUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function createPowderRenderLayers(layers: PowderColor[]): PowderRenderLayer[] {
  return layers.map((color, index) => ({
    color,
    fill: 1,
    key: `${color}-${index}`,
  }));
}

function buildSourcePreviewLayers(layers: PowderColor[], movedAmount: number): PowderRenderLayer[] {
  const previewLayers = createPowderRenderLayers(layers);
  let remaining = Math.max(0, movedAmount);

  for (let index = previewLayers.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const removed = Math.min(1, remaining);
    previewLayers[index] = {
      ...previewLayers[index],
      fill: clampPreviewUnit(previewLayers[index].fill - removed),
      key: `${previewLayers[index].color}-${index}-source`,
    };
    remaining -= removed;
  }

  return previewLayers.filter((layer) => layer.fill > 0.015);
}

function buildTargetPreviewLayers(
  layers: PowderColor[],
  color: PowderColor,
  movedAmount: number,
  capacity: number,
): PowderRenderLayer[] {
  const previewLayers = createPowderRenderLayers(layers);
  const cappedAmount = Math.max(0, Math.min(movedAmount, capacity - layers.length));
  const fullLayers = Math.floor(cappedAmount);
  const partialFill = clampPreviewUnit(cappedAmount - fullLayers);

  for (let index = 0; index < fullLayers; index += 1) {
    previewLayers.push({
      color,
      fill: 1,
      key: `${color}-preview-full-${index}`,
    });
  }

  if (partialFill > 0.015) {
    previewLayers.push({
      color,
      fill: partialFill,
      key: `${color}-preview-partial`,
    });
  }

  return previewLayers;
}

interface FlashMessage {
  id: number;
  kind: 'invalid' | 'dead-end';
  title: string;
  detail: string;
}

interface PourPreviewState {
  from: number;
  to: number;
  fromLayers: PowderRenderLayer[];
  toLayers: PowderRenderLayer[];
}

function TargetGemTile({ gem, crafted, target }: { gem: GemType; crafted: number; target: number }) {
  const complete = crafted >= target;

  return (
    <div
      className={[
        'flex min-w-[4.8rem] items-center gap-1.5 rounded-full border px-2.25 py-0.5',
        complete ? 'border-[var(--color-lab-success)]/30 bg-[var(--color-lab-success)]/10' : 'target-gem-tile',
      ].join(' ')}
      aria-label={`${gem} target ${crafted} of ${target}`}
    >
      <GemIcon gem={gem} size={18} animated={crafted > 0 && !complete} glow />
      <div className="min-w-0 flex-1 text-right">
        <div className={['font-mono text-[0.82rem] leading-none sm:text-[0.9rem]', complete ? 'text-[var(--color-lab-success)]' : 'text-foreground'].join(' ')}>
          {crafted}
          <span className="text-[0.68rem] text-foreground-subtle">/{target}</span>
        </div>
        <div className="mt-[0.1rem] truncate font-mono text-[8px] tracking-[0.16em] text-muted-foreground sm:text-[9px]">{gem}</div>
      </div>
    </div>
  );
}

export function Game() {
  const [gameState, setGameState] = useState(() => readAndParseGameState() ?? createGameStateForLevel(1));
  const [selectedVial, setSelectedVial] = useState<number | null>(null);
  const [showCollection, setShowCollection] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showCampaignPanel, setShowCampaignPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabledState] = useState(() => readSoundEnabled());
  const [theme, setTheme] = useState<ThemeMode>(() => readTheme());
  const [synthesizingVial, setSynthesizingVial] = useState<number | null>(null);
  const [synthesizedGem, setSynthesizedGem] = useState<GemType | null>(null);
  const [showLevelComplete, setShowLevelComplete] = useState(false);
  const [showGameVictory, setShowGameVictory] = useState(false);
  const [pouringAnimation, setPouringAnimation] = useState<{
    color: PowderColor;
    from: number;
    to: number;
    pourVisual: PourVisualPlan;
    streamFrom: { x: number; y: number };
    streamTo: { x: number; y: number };
    streamTiltDeg: number;
  } | null>(null);
  const [pourPreview, setPourPreview] = useState<PourPreviewState | null>(null);
  const [boardShakeKey, setBoardShakeKey] = useState(0);
  const [flashMessage, setFlashMessage] = useState<FlashMessage | null>(null);
  const [invalidTargetPulse, setInvalidTargetPulse] = useState<{ to: number } | null>(null);
  const vialRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const levelResolutionRef = useRef(false);
  const deadEndNotifiedRef = useRef(false);
  const flashTimeoutRef = useRef<number | null>(null);
  const pendingPourTimeoutRef = useRef<number | null>(null);
  const pourAudioStartTimeoutRef = useRef<number | null>(null);
  const pourAudioStopTimeoutRef = useRef<number | null>(null);
  const pourPreviewFrameRef = useRef<number | null>(null);
  const pourPreviewStartRef = useRef<number | null>(null);
  const activePourRustleRef = useRef<PourRustleHandle | null>(null);

  const stopPourRustle = () => {
    if (pourAudioStopTimeoutRef.current !== null) {
      window.clearTimeout(pourAudioStopTimeoutRef.current);
      pourAudioStopTimeoutRef.current = null;
    }

    activePourRustleRef.current?.stop();
    activePourRustleRef.current = null;
  };

  const cancelPendingPour = (resetState: boolean) => {
    if (pendingPourTimeoutRef.current !== null) {
      window.clearTimeout(pendingPourTimeoutRef.current);
      pendingPourTimeoutRef.current = null;
    }

    if (pourAudioStartTimeoutRef.current !== null) {
      window.clearTimeout(pourAudioStartTimeoutRef.current);
      pourAudioStartTimeoutRef.current = null;
    }

    if (pourPreviewFrameRef.current !== null) {
      window.cancelAnimationFrame(pourPreviewFrameRef.current);
      pourPreviewFrameRef.current = null;
    }

    pourPreviewStartRef.current = null;

    stopPourRustle();

    if (resetState) {
      setPourPreview(null);
      setPouringAnimation(null);
      setSelectedVial(null);
    }
  };

  const levelComplete = useMemo(() => isLevelComplete(gameState.vials), [gameState.vials]);
  const synthesisPending = useMemo(
    () => synthesizingVial !== null || gameState.vials.some((vial) => canSynthesize(vial)),
    [gameState.vials, synthesizingVial],
  );
  const deadEnd = useMemo(
    () => !levelComplete && !showLevelComplete && !showGameVictory && !synthesisPending && isDeadEnd(gameState.vials),
    [gameState.vials, levelComplete, showGameVictory, showLevelComplete, synthesisPending],
  );
  const levelTargetEntries = useMemo(
    () =>
      Object.entries(gameState.levelTargets).flatMap(([gem, count]) =>
        typeof count === 'number' && count > 0 ? [{ gem: gem as GemType, target: count }] : [],
      ),
    [gameState.levelTargets],
  );
  const synthesesByGem = useMemo(
    () =>
      gameState.history.reduce<Partial<Record<GemType, number>>>((accumulator, event) => {
        if (event.type === 'synthesis') {
          accumulator[event.gem] = (accumulator[event.gem] ?? 0) + 1;
        }

        return accumulator;
      }, {}),
    [gameState.history],
  );
  const totalCollected = Object.values(gameState.collection).reduce((sum, count) => sum + count, 0);
  const hasUndoablePour = gameState.history[gameState.history.length - 1]?.type === 'pour';
  const boardBusy = synthesisPending || pouringAnimation !== null;

  const synthesesThisLevel = useMemo(
    () => gameState.history.filter((event) => event.type === 'synthesis').length,
    [gameState.history],
  );
  const goalTotal = useMemo(() => {
    const sum = levelTargetEntries.reduce((accumulator, { target }) => accumulator + target, 0);
    return Math.max(1, sum);
  }, [levelTargetEntries]);
  const showFlash = (message: FlashMessage) => {
    if (flashTimeoutRef.current !== null) {
      window.clearTimeout(flashTimeoutRef.current);
    }

    setFlashMessage(message);

    flashTimeoutRef.current = window.setTimeout(() => {
      setFlashMessage((current) => (current?.id === message.id ? null : current));
      flashTimeoutRef.current = null;
    }, message.kind === 'dead-end' ? 2800 : 1800);
  };

  useEffect(() => {
    const hasSeenInstructions = localStorage.getItem('gem_has_seen_instructions');

    if (!hasSeenInstructions) {
      setShowInstructions(true);
      localStorage.setItem('gem_has_seen_instructions', 'true');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('gem_game_state', JSON.stringify(gameState));
  }, [gameState]);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current !== null) {
        window.clearTimeout(flashTimeoutRef.current);
      }

      cancelPendingPour(false);
    };
  }, []);

  useEffect(() => {
    if (!levelComplete) {
      levelResolutionRef.current = false;
      return;
    }

    setGameState((previous) => {
      if (previous.highestCompletedLevel >= previous.level) return previous;
      return { ...previous, highestCompletedLevel: previous.level };
    });
  }, [levelComplete]);

  useEffect(() => {
    if (!levelComplete) return;
    if (showLevelComplete || showGameVictory) return;
    if (levelResolutionRef.current) return;

    levelResolutionRef.current = true;
    playSuccessTone(gameState.level >= GAME_MAX_LEVEL ? 'victory' : 'level');

    const timeoutId = window.setTimeout(() => {
      if (gameState.level >= GAME_MAX_LEVEL) {
        setShowGameVictory(true);
      } else {
        setShowLevelComplete(true);
      }
    }, 520);

    return () => window.clearTimeout(timeoutId);
  }, [gameState.level, levelComplete, showGameVictory, showLevelComplete]);

  useEffect(() => {
    if (pouringAnimation !== null) return;
    if (showLevelComplete || showGameVictory) return;

    const vialToSynthesize = gameState.vials.find((vial) => canSynthesize(vial));
    if (!vialToSynthesize) return;

    const vialId = vialToSynthesize.id;
    const color = vialToSynthesize.layers[0];
    const gem = COLOR_TO_GEM[color];

    let cancelled = false;
    const timeoutIds: number[] = [];

    timeoutIds.push(
      window.setTimeout(() => {
        if (cancelled) return;
        setSynthesizedGem(gem);
        playSuccessTone('synthesis');
      }, 120),
    );

    timeoutIds.push(
      window.setTimeout(() => {
        if (cancelled) return;
        setSynthesizingVial(vialId);
      }, 0),
    );

    timeoutIds.push(
      window.setTimeout(() => {
        if (cancelled) return;
        setGameState((previous) => {
          const currentVial = previous.vials[vialId];
          if (!canSynthesize(currentVial)) return previous;

          const nextVials = [...previous.vials];
          nextVials[vialId] = { ...nextVials[vialId], layers: [] };

          return {
            ...previous,
            vials: nextVials,
            collection: {
              ...previous.collection,
              [gem]: (previous.collection[gem] || 0) + 1,
            },
            history: [
              ...previous.history,
              {
                type: 'synthesis',
                vialId,
                gem,
                layers: [...currentVial.layers],
              },
            ],
          };
        });
        setSynthesizingVial(null);
      }, 2080),
    );

    return () => {
      cancelled = true;
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      setSynthesizingVial(null);
    };
  }, [gameState.vials, pouringAnimation, showGameVictory, showLevelComplete]);

  useEffect(() => {
    if (deadEnd) {
      if (deadEndNotifiedRef.current) return;

      deadEndNotifiedRef.current = true;
      setBoardShakeKey((current) => current + 1);
      showFlash({
        id: Date.now(),
        kind: 'dead-end',
        title: 'No legal pours remain',
        detail: 'Undo or regenerate to reopen the solution path.',
      });
      playFailureTone();
      return;
    }

    deadEndNotifiedRef.current = false;
  }, [deadEnd]);

  const handleVialClick = (vialId: number) => {
    if (synthesisPending || pouringAnimation !== null) return;

    if (selectedVial === null) {
      const clicked = gameState.vials.find((v) => v.id === vialId);
      if (clicked && clicked.layers.length > 0) {
        setSelectedVial(vialId);
      }
      return;
    }

    if (selectedVial === vialId) {
      setSelectedVial(null);
      return;
    }

    const fromVial = gameState.vials.find((v) => v.id === selectedVial);
    const toVial = gameState.vials.find((v) => v.id === vialId);
    if (!fromVial || !toVial) {
      setSelectedVial(null);
      return;
    }

    const result = pour(fromVial, toVial);

    if (!result) {
      const isFullTarget = toVial.layers.length >= toVial.capacity;
      setInvalidTargetPulse({
        to: toVial.id,
      });
      window.setTimeout(() => {
        setInvalidTargetPulse((current) => (current?.to === toVial.id ? null : current));
      }, 760);
      setSelectedVial(null);
      setBoardShakeKey((current) => current + 1);
      showFlash({
        id: Date.now(),
        kind: 'invalid',
        title: isFullTarget ? 'Target vial is full' : 'Blocked transfer',
        detail: isFullTarget
          ? 'Choose another target or clear space before pouring.'
          : 'Pour only into an empty vial or onto the same top powder.',
      });
      playFailureTone();
      return;
    }

    const fromEl = vialRefs.current.get(fromVial.id);
    const toEl = vialRefs.current.get(toVial.id);

    if (!fromEl || !toEl) {
      setGameState((previous) => {
        const src = previous.vials.find((v) => v.id === result.move.from);
        const dst = previous.vials.find((v) => v.id === result.move.to);
        if (!src || !dst) return previous;

        const nextResult = pour(src, dst);
        if (!nextResult) return previous;

        const nextVials = [...previous.vials];
        const fromIx = previous.vials.findIndex((v) => v.id === result.move.from);
        const toIx = previous.vials.findIndex((v) => v.id === result.move.to);
        nextVials[fromIx] = nextResult.newFrom;
        nextVials[toIx] = nextResult.newTo;

        return {
          ...previous,
          vials: nextVials,
          history: [...previous.history, nextResult.move],
          moves: previous.moves + 1,
        };
      });
      setSelectedVial(null);
      return;
    }

    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const pourVisual = buildPourVisualPlan(fromRect, toRect, result.move.count);
    setPouringAnimation({
      color: result.move.color,
      from: fromVial.id,
      to: toVial.id,
      pourVisual,
      streamFrom: pourVisual.streamFrom,
      streamTo: pourVisual.streamTo,
      streamTiltDeg: pourVisual.pourHoldTiltDeg,
    });

    if (pourAudioStartTimeoutRef.current !== null) {
      window.clearTimeout(pourAudioStartTimeoutRef.current);
    }
    stopPourRustle();

    const pourWindowStartMs = Math.round(pourVisual.pourWindow.startSec * 1000);
    const pourWindowDurationMs = Math.round(pourVisual.pourWindow.durationSec * 1000);
    const pourWindowEndMs = Math.round(pourVisual.pourWindow.endSec * 1000);
    const audioLeadMs = 50;
    const pourAudioStartDelayMs = Math.max(0, pourWindowStartMs - audioLeadMs);

    setPourPreview({
      from: fromVial.id,
      to: toVial.id,
      fromLayers: createPowderRenderLayers(fromVial.layers),
      toLayers: createPowderRenderLayers(toVial.layers),
    });

    if (pourPreviewFrameRef.current !== null) {
      window.cancelAnimationFrame(pourPreviewFrameRef.current);
    }

    pourPreviewStartRef.current = null;

    const animatePourPreview = (frameTime: number) => {
      if (pourPreviewStartRef.current === null) {
        pourPreviewStartRef.current = frameTime;
      }

      const elapsedMs = frameTime - pourPreviewStartRef.current;
      const streamProgress = clampPreviewUnit((elapsedMs - pourWindowStartMs) / Math.max(pourWindowDurationMs, 1));
      const movedAmount = result.move.count * streamProgress;

      setPourPreview({
        from: fromVial.id,
        to: toVial.id,
        fromLayers: buildSourcePreviewLayers(fromVial.layers, movedAmount),
        toLayers: buildTargetPreviewLayers(toVial.layers, result.move.color, movedAmount, toVial.capacity),
      });

      if (elapsedMs < pourWindowEndMs) {
        pourPreviewFrameRef.current = window.requestAnimationFrame(animatePourPreview);
      } else {
        pourPreviewFrameRef.current = null;
      }
    };

    pourPreviewFrameRef.current = window.requestAnimationFrame(animatePourPreview);

    pourAudioStartTimeoutRef.current = window.setTimeout(() => {
      activePourRustleRef.current = playPourRustle(result.move.count);
      pourAudioStartTimeoutRef.current = null;
      pourAudioStopTimeoutRef.current = window.setTimeout(() => {
        stopPourRustle();
      }, pourWindowDurationMs);
    }, pourAudioStartDelayMs);

    pendingPourTimeoutRef.current = window.setTimeout(() => {
      setGameState((previous) => {
        const src = previous.vials.find((v) => v.id === result.move.from);
        const dst = previous.vials.find((v) => v.id === result.move.to);
        if (!src || !dst) return previous;

        const nextResult = pour(src, dst);
        if (!nextResult) return previous;

        const nextVials = [...previous.vials];
        const fromIx = previous.vials.findIndex((v) => v.id === result.move.from);
        const toIx = previous.vials.findIndex((v) => v.id === result.move.to);
        nextVials[fromIx] = nextResult.newFrom;
        nextVials[toIx] = nextResult.newTo;

        return {
          ...previous,
          vials: nextVials,
          history: [...previous.history, nextResult.move],
          moves: previous.moves + 1,
        };
      });
      stopPourRustle();
      pendingPourTimeoutRef.current = null;
      setPourPreview(null);
      pourPreviewStartRef.current = null;
      setPouringAnimation(null);
      setSelectedVial(null);
    }, pourVisual.resolveAfterMs);
  };

  const selectedSource = selectedVial !== null ? gameState.vials.find((vial) => vial.id === selectedVial) : null;

  const handleUndo = () => {
    if (synthesisPending || pouringAnimation !== null) return;

    setGameState((previous) => {
      const lastEvent = previous.history[previous.history.length - 1];
      if (!lastEvent || lastEvent.type !== 'pour') return previous;

      const nextVials = [...previous.vials];
      const fromVial = nextVials[lastEvent.from];
      const toVial = nextVials[lastEvent.to];
      const movedLayers = toVial.layers.slice(-lastEvent.count);

      nextVials[lastEvent.to] = {
        ...toVial,
        layers: toVial.layers.slice(0, -lastEvent.count),
      };
      nextVials[lastEvent.from] = {
        ...fromVial,
        layers: [...fromVial.layers, ...movedLayers],
      };

        return {
          ...previous,
          vials: nextVials,
          history: previous.history.slice(0, -1),
          moves: Math.max(0, previous.moves - 1),
        };
      });
  };

  const handleShuffle = () => {
    if (synthesisPending || pouringAnimation !== null) return;
    cancelPendingPour(true);
    setGameState((previous) =>
      createGameStateForLevel(previous.level, {
        preserveCollection: previous.collection,
        highestCompletedLevel: previous.highestCompletedLevel,
      }),
    );
    setSelectedVial(null);
  };

  const handleSelectLevel = (level: number) => {
    if (synthesisPending || pouringAnimation !== null) return;
    cancelPendingPour(true);
    setGameState((previous) =>
      createGameStateForLevel(level, {
        preserveCollection: previous.collection,
        highestCompletedLevel: previous.highestCompletedLevel,
      }),
    );
    setSelectedVial(null);
    setShowLevelComplete(false);
    setShowGameVictory(false);
    setSynthesizedGem(null);
    setPouringAnimation(null);
  };

  const handleNextLevel = () => {
    setGameState((previous) => {
      if (previous.level >= GAME_MAX_LEVEL) return previous;

      return createGameStateForLevel(previous.level + 1, {
        preserveCollection: previous.collection,
        highestCompletedLevel: Math.max(previous.highestCompletedLevel, previous.level),
      });
    });
    setShowLevelComplete(false);
  };

  const handlePlayAgain = () => {
    cancelPendingPour(true);
    setGameState((previous) =>
      createGameStateForLevel(1, {
        highestCompletedLevel: previous.highestCompletedLevel,
      }),
    );
    setShowGameVictory(false);
    setShowLevelComplete(false);
    setSelectedVial(null);
    setSynthesizedGem(null);
    setPouringAnimation(null);
    setFlashMessage(null);
  };

  return (
    <div className={[theme === 'dark' ? 'dark' : '', 'min-h-screen bg-background text-foreground'].filter(Boolean).join(' ')}>
      <div
        className={`relative isolate flex min-h-[100dvh] flex-col ${pouringAnimation ? 'overflow-visible' : 'overflow-hidden'}`}
      >
        <div className="game-backdrop-base absolute inset-0" />
        <div className="game-backdrop-glow absolute inset-0" />
        <div className="game-backdrop-dots absolute inset-0" />
        <div className="game-backdrop-grid absolute inset-0" />

        <div className="relative z-20 px-2 pt-[max(0.35rem,env(safe-area-inset-top))] sm:px-5 sm:pt-[max(0.45rem,env(safe-area-inset-top))]">
          <div className="mx-auto flex w-full max-w-[90rem] flex-col">
            <div className="flex flex-wrap items-start justify-between gap-1 sm:gap-1.5">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 sm:gap-1.5">
                <div className="game-stat-chip flex items-center gap-1.5 rounded-full px-2 py-[0.24rem] sm:gap-2 sm:px-3 sm:py-[0.3rem]">
                  <div className="font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground sm:text-[0.75rem] sm:tracking-[0.18em]">Level</div>
                  <div className="font-mono text-sm text-foreground sm:text-[0.95rem]">
                    <span className="text-primary">{String(gameState.level).padStart(2, '0')}</span>
                    <span className="text-foreground-subtle"> /{GAME_MAX_LEVEL}</span>
                  </div>
                </div>

                <div className="game-stat-chip flex items-center gap-1.5 rounded-full px-2 py-[0.24rem] sm:gap-2 sm:px-3 sm:py-[0.3rem]">
                  <div className="font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground sm:text-[0.75rem] sm:tracking-[0.18em]">Goal</div>
                  <div className="font-mono text-sm text-foreground-soft sm:text-[0.95rem]">
                    {synthesesThisLevel} / {goalTotal}
                  </div>
                </div>

                <div className="game-stat-chip flex items-center gap-1.5 rounded-full px-2 py-[0.24rem] sm:gap-2 sm:px-3 sm:py-[0.3rem]">
                  <div className="font-mono text-[0.62rem] tracking-[0.14em] text-muted-foreground sm:text-[0.75rem] sm:tracking-[0.18em]">Moves</div>
                  <div className={['font-mono text-sm text-foreground-soft sm:text-[0.95rem]', deadEnd ? 'text-destructive' : ''].join(' ')}>
                    {gameState.moves}
                  </div>
                </div>

                {levelTargetEntries.length > 0 && (
                  <div className="basis-full pt-0.5">
                    <div className="flex flex-wrap gap-1">
                      {levelTargetEntries.map(({ gem, target }) => (
                        <TargetGemTile key={gem} gem={gem} crafted={synthesesByGem[gem] ?? 0} target={target} />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-row gap-1.5 self-start sm:gap-2 xl:flex-col">
                <button
                type="button"
                title="Level"
                aria-label="Level"
                onClick={() => setShowCampaignPanel(true)}
                className="game-icon-btn flex h-9 w-9 touch-manipulation items-center justify-center rounded-full sm:h-10 sm:w-10"
              >
                <LayoutGrid className="h-[1.125rem] w-[1.125rem]" />
              </button>
                <button
                type="button"
                title="Rule"
                aria-label="Rule"
                onClick={() => setShowInstructions(true)}
                className="game-icon-btn flex h-9 w-9 touch-manipulation items-center justify-center rounded-full sm:h-10 sm:w-10"
              >
                <HelpCircle className="h-[1.125rem] w-[1.125rem]" />
              </button>
                <button
                type="button"
                title="Collection"
                aria-label="Collection"
                onClick={() => setShowCollection(true)}
                className="game-icon-btn relative flex h-9 w-9 touch-manipulation items-center justify-center rounded-full sm:h-10 sm:w-10"
              >
                <Sparkles className="h-[1.125rem] w-[1.125rem]" />
                {totalCollected > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border border-border bg-card px-1 font-mono text-[10px] text-foreground">
                    {totalCollected > 99 ? '99+' : totalCollected}
                  </span>
                )}
              </button>
                <button
                type="button"
                title="Settings"
                aria-label="Settings"
                onClick={() => setShowSettings(true)}
                className="game-icon-btn flex h-9 w-9 touch-manipulation items-center justify-center rounded-full sm:h-10 sm:w-10"
              >
                <Settings className="h-[1.125rem] w-[1.125rem]" />
              </button>
            </div>

            </div>

          </div>
        </div>

        <motion.div
          key={boardShakeKey}
          initial={false}
          animate={{ x: [0, -8, 8, -5, 5, 0] }}
          transition={{ duration: 0.34, ease: 'easeOut' }}
          className="relative flex min-h-0 flex-1 flex-col border-border/30"
        >
          <div className="game-board-glow absolute inset-0" />
          <div className="relative flex min-h-0 flex-1 flex-col px-2 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-1 sm:px-6 sm:pb-32 sm:pt-2 md:px-10">
            <div className="flex min-h-[min(50dvh,36rem)] flex-1 items-center justify-center sm:min-h-[min(58dvh,43rem)] xl:min-h-[min(62dvh,45rem)]">
              <div className="flex w-full max-w-[90rem] flex-wrap items-start justify-center gap-x-1.5 gap-y-4 min-[380px]:gap-x-2 min-[380px]:gap-y-5 sm:gap-x-5 sm:gap-y-8 md:gap-x-6 xl:gap-y-10">
                {gameState.vials.map((vial) => (
                  <div
                    key={vial.id}
                    className={[
                      'relative flex w-[4.45rem] justify-center min-[380px]:w-[4.85rem] sm:w-[6.25rem] md:w-[6.75rem]',
                      pouringAnimation?.from === vial.id
                        ? 'z-[95]'
                        : pouringAnimation?.to === vial.id
                          ? 'z-[60]'
                          : 'z-0',
                    ].join(' ')}
                  >
                    <Vial
                      ref={(element) => {
                        if (element) {
                          vialRefs.current.set(vial.id, element);
                        } else {
                          vialRefs.current.delete(vial.id);
                        }
                      }}
                      vial={
                        pourPreview?.from === vial.id
                          ? { ...vial, layers: pourPreview.fromLayers.map((layer) => layer.color) }
                          : pourPreview?.to === vial.id
                            ? { ...vial, layers: pourPreview.toLayers.map((layer) => layer.color) }
                            : vial
                      }
                      isSelected={selectedVial === vial.id}
                      onClick={() => handleVialClick(vial.id)}
                      isSynthesizing={synthesizingVial === vial.id}
                      isReceivingPour={pouringAnimation?.to === vial.id}
                      hoverFlow={
                        selectedSource && !boardBusy && selectedSource.id !== vial.id && canPour(selectedSource, vial)
                          ? 'in'
                          : selectedSource && !boardBusy && selectedSource.id === vial.id
                            ? 'out'
                            : null
                      }
                      showForbidden={
                        Boolean(
                          selectedSource &&
                            !boardBusy &&
                            selectedSource.id !== vial.id &&
                            !canPour(selectedSource, vial),
                        )
                      }
                      invalidPulse={invalidTargetPulse?.to === vial.id}
                      pourVisual={pouringAnimation?.from === vial.id ? pouringAnimation.pourVisual : null}
                      renderLayers={
                        pourPreview?.from === vial.id
                          ? pourPreview.fromLayers
                          : pourPreview?.to === vial.id
                            ? pourPreview.toLayers
                            : undefined
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <div className="pointer-events-none fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-0 right-0 z-20 flex justify-center px-2 sm:bottom-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-4">
          <div className="game-dock pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-full p-1.5 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleUndo}
              disabled={!hasUndoablePour || boardBusy}
              className="game-dock-btn touch-manipulation rounded-full px-3 py-2 font-mono text-xs tracking-[0.12em] sm:px-5 sm:py-2.5 sm:text-sm sm:tracking-[0.14em]"
            >
              <Undo2 className="mr-1.5 h-4 w-4 sm:mr-2" />
              Undo
            </Button>
            <Button
              type="button"
              variant={deadEnd ? 'default' : 'outline'}
              onClick={handleShuffle}
              disabled={boardBusy}
              className={`touch-manipulation rounded-full px-3 py-2 font-mono text-xs tracking-[0.12em] sm:px-5 sm:py-2.5 sm:text-sm sm:tracking-[0.14em] ${
                deadEnd
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : 'game-dock-btn'
              }`}
            >
              <Shuffle className="mr-1.5 h-4 w-4 sm:mr-2" />
              <span className="sm:hidden">New</span>
              <span className="hidden sm:inline">Regenerate</span>
            </Button>
          </div>
        </div>
      </div>

      <CollectionPanel
        collection={gameState.collection}
        isOpen={showCollection}
        onClose={() => setShowCollection(false)}
      />

      <GameInstructions isOpen={showInstructions} onClose={() => setShowInstructions(false)} />

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        soundEnabled={soundEnabled}
        onSoundEnabledChange={(enabled) => {
          setSoundEnabled(enabled);
          setSoundEnabledState(enabled);
        }}
        theme={theme}
        onThemeChange={(next) => {
          setTheme(next);
          writeTheme(next);
        }}
      />

      <AnimatePresence>
        {showCampaignPanel && (
          <>
            <motion.div
              className="modal-scrim fixed inset-0 z-40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCampaignPanel(false)}
            />

            <motion.div
              className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5 sm:pt-[max(1.25rem,env(safe-area-inset-top))] sm:pb-[max(1.25rem,env(safe-area-inset-bottom))] pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex min-h-full items-center justify-center py-2 pointer-events-none">
                <motion.div
                  className="modal-panel pointer-events-auto flex max-h-[min(92dvh,52rem)] w-full max-w-4xl flex-col overflow-hidden rounded-[1.1rem] p-3 sm:rounded-[1.4rem] sm:p-5"
                  initial={{ scale: 0.96 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.97 }}
                >
                  <div className="panel-header-divider mb-4 flex shrink-0 items-start justify-between gap-4 pb-4">
                    <div className="font-mono text-sm tracking-[0.24em] text-primary">Level</div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowCampaignPanel(false)}
                      className="panel-close-btn"
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>

                  <div className="panel-inset min-h-0 flex-1 overflow-y-auto rounded-2xl p-3 sm:p-4">
                    <LevelOverview
                      currentLevel={gameState.level}
                      highestCompletedLevel={gameState.highestCompletedLevel}
                      currentLevelComplete={levelComplete}
                      maxLevel={GAME_MAX_LEVEL}
                      onSelectLevel={(level) => {
                        handleSelectLevel(level);
                        setShowCampaignPanel(false);
                      }}
                    />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {flashMessage && (
          <motion.div
            key={flashMessage.id}
            className="fixed left-1/2 top-5 z-50 w-[min(92vw,36rem)] -translate-x-1/2"
            initial={{ opacity: 0, y: -14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
          >
            <div
              className={[
                'flash-toast rounded-xl px-4 py-4',
                flashMessage.kind === 'dead-end' ? 'flash-toast--dead-end' : 'flash-toast--warning',
              ].join(' ')}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle
                  className={[
                    'mt-0.5 h-5 w-5',
                    flashMessage.kind === 'dead-end' ? 'text-destructive' : 'text-primary',
                  ].join(' ')}
                />
                <div>
                  <div className="text-lg text-foreground">{flashMessage.title}</div>
                  <div className="text-base text-muted-foreground">{flashMessage.detail}</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pouringAnimation && (
          <PourAnimation
            color={pouringAnimation.color}
            fromPosition={pouringAnimation.streamFrom}
            toPosition={pouringAnimation.streamTo}
            sourceTiltDeg={pouringAnimation.streamTiltDeg}
            streamDelay={pouringAnimation.pourVisual.pourWindow.startSec}
            streamDuration={pouringAnimation.pourVisual.pourWindow.durationSec}
            onComplete={() => {}}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {synthesizedGem && (
          <SynthesisAnimation
            gem={synthesizedGem}
            onComplete={() => setSynthesizedGem(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLevelComplete && (
          <motion.div
            className="modal-scrim fixed inset-0 z-50 flex items-center justify-center px-3 py-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md sm:px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal-panel w-full max-w-lg rounded-2xl p-5 text-center sm:p-8"
              initial={{ opacity: 0, scale: 0.94, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-primary/35 bg-primary/12 text-primary">
                <Trophy className="h-8 w-8" />
              </div>
              <h2 className="mt-3 text-3xl text-foreground sm:text-4xl">Level Complete</h2>
              <Button type="button" onClick={handleNextLevel} className="mt-6 w-full bg-primary text-primary-foreground hover:bg-primary/90">
                Next level
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGameVictory && (
          <motion.div
            className="modal-scrim fixed inset-0 z-50 flex items-center justify-center px-3 py-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md sm:px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal-panel w-full max-w-lg rounded-2xl p-5 text-center sm:p-8"
              initial={{ opacity: 0, scale: 0.94, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-primary/35 bg-primary/12 text-primary">
                <Trophy className="h-8 w-8" />
              </div>
              <h2 className="mt-3 text-3xl text-foreground sm:text-4xl">All Levels Complete</h2>
              <Button type="button" onClick={handlePlayAgain} className="mt-6 w-full bg-primary text-primary-foreground hover:bg-primary/90">
                Play again
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
