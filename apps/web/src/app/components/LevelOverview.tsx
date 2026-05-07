import { motion } from 'motion/react';
import { CheckCircle2, Lock, Play } from 'lucide-react';

interface LevelOverviewProps {
  currentLevel: number;
  highestCompletedLevel: number;
  maxLevel: number;
  currentLevelComplete: boolean;
  onSelectLevel: (level: number) => void;
}

export function LevelOverview({
  currentLevel,
  highestCompletedLevel,
  maxLevel,
  currentLevelComplete,
  onSelectLevel,
}: LevelOverviewProps) {
  const highestUnlockedLevel = Math.min(maxLevel, Math.max(currentLevel, highestCompletedLevel + 1));

  return (
    <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5 sm:gap-2">
      {Array.from({ length: maxLevel }, (_, index) => {
        const level = index + 1;
        const isCurrent = level === currentLevel;
        const isCompleted = level <= highestCompletedLevel || (isCurrent && currentLevelComplete);
        const isUnlocked = level <= highestUnlockedLevel;

        return (
          <motion.button
            key={level}
            type="button"
            whileHover={isUnlocked ? { y: -2 } : undefined}
            whileTap={isUnlocked ? { scale: 0.98 } : undefined}
            onClick={() => {
              if (isUnlocked) onSelectLevel(level);
            }}
            disabled={!isUnlocked}
            aria-current={isCurrent ? 'page' : undefined}
            className={[
              'relative flex min-h-[3.7rem] items-center justify-center rounded-lg border px-2 py-1.5 text-center transition-all sm:min-h-[4rem] sm:px-2.5 sm:py-2',
              isCurrent
                ? 'border-primary bg-primary/10 text-foreground shadow-[0_0_0_1px_rgba(241,190,50,0.35)]'
                : isCompleted
                  ? 'border-[var(--color-lab-success)]/40 bg-[var(--color-lab-success)]/10 text-foreground'
                  : isUnlocked
                    ? 'border-border bg-background/50 text-foreground hover:border-[var(--color-lab-info)]/60 hover:bg-secondary/75'
                    : 'border-border/70 bg-background/35 text-muted-foreground opacity-70',
            ].join(' ')}
          >
            <div className="absolute right-2 top-2 flex h-4 w-4 shrink-0 items-center justify-center">
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-lab-success)]" />
              ) : isCurrent ? (
                <Play className="h-4 w-4 shrink-0 text-primary" />
              ) : isUnlocked ? (
                <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-lab-info)]" />
              ) : (
                <Lock className="h-4 w-4 shrink-0" />
              )}
            </div>

            <div className="whitespace-nowrap text-sm leading-tight text-foreground sm:text-base">
              Level {level}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
