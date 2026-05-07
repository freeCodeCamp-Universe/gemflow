import { motion } from 'motion/react';
import type { GemType } from '../types/game';
import { GEM_VISUALS } from '../types/game';
import { cn } from './ui/utils';

interface GemIconProps {
  gem: GemType;
  size?: number;
  className?: string;
  animated?: boolean;
  glow?: boolean;
}

export function GemIcon({ gem, size = 32, className, animated = false, glow = true }: GemIconProps) {
  const visual = GEM_VISUALS[gem];
  const glowSize = Math.max(12, Math.round(size * 0.4));

  return (
    <motion.div
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
      animate={
        animated
          ? {
              scale: [1, 1.04, 1],
              rotate: [0, 1.4, 0, -1.4, 0],
            }
          : undefined
      }
      transition={animated ? { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } : undefined}
    >
      {glow && (
        <div
          className="absolute inset-[8%] rounded-full blur-md"
          style={{
            background: `radial-gradient(circle, ${visual.color}52 0%, transparent 72%)`,
          }}
        />
      )}

      <div
        className="absolute inset-0"
        style={{
          clipPath: visual.shape,
          background: `linear-gradient(145deg, rgba(255,255,255,0.95) 0%, ${visual.color}ee 22%, ${visual.color}bf 56%, rgba(10,10,35,0.96) 100%)`,
          boxShadow: `0 0 ${glowSize}px ${visual.color}2b, inset 0 1px 0 rgba(255,255,255,0.42)`,
        }}
      />

      <div
        className="absolute inset-[10%] opacity-95"
        style={{
          clipPath: visual.facet,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.46), rgba(255,255,255,0.08) 44%, transparent 86%)',
        }}
      />

      <div
        className="absolute inset-[8%]"
        style={{
          clipPath: visual.shape,
          boxShadow: 'inset 0 -10px 12px rgba(10,10,35,0.26)',
        }}
      />

      <div
        className="absolute inset-0 opacity-90"
        style={{
          clipPath: visual.gleam,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.12) 74%, transparent)',
          filter: 'blur(0.4px)',
        }}
      />

      <div
        className="absolute inset-[15%] opacity-60"
        style={{
          clipPath: visual.shape,
          border: '1px solid rgba(255,255,255,0.18)',
          transform: 'scale(0.82)',
        }}
      />
    </motion.div>
  );
}
