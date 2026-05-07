import { CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import type { GemType } from '../types/game';
import { GEM_VISUALS } from '../types/game';
import { GemIcon } from './GemIcon';

interface SynthesisAnimationProps {
  gem: GemType;
  onComplete: () => void;
}

export function SynthesisAnimation({ gem, onComplete }: SynthesisAnimationProps) {
  const color = GEM_VISUALS[gem].color;
  const shards = Array.from({ length: 6 }, (_, index) => ({
    id: index,
    x: Math.cos((index / 6) * Math.PI * 2) * (86 + (index % 2) * 16),
    y: Math.sin((index / 6) * Math.PI * 2) * (58 + (index % 3) * 12),
    rotate: 18 + index * 24,
  }));

  return (
    <motion.div
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0 bg-[rgba(10,10,35,0.78)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: `radial-gradient(circle, ${color}66 0%, ${color}00 70%)`,
        }}
        initial={{ opacity: 0, scale: 0.1 }}
        animate={{ opacity: [0, 0.8, 0.35, 0], scale: [0.1, 1.35, 1.5, 1.65] }}
        transition={{ duration: 1, times: [0, 0.2, 0.7, 1] }}
      />

      <motion.div
        className="relative flex flex-col items-center"
        initial={{ scale: 0.9, opacity: 0, y: 16 }}
        animate={{
          scale: [0.9, 1.01, 1],
          opacity: [0, 1, 1],
          y: [16, 0, 0],
        }}
        exit={{
          scale: 0.96,
          opacity: 0,
          y: -18,
        }}
        transition={{
          duration: 1.65,
          times: [0, 0.35, 1],
        }}
        onAnimationComplete={onComplete}
      >
        <motion.div
          className="absolute inset-x-0 top-12 h-40 rounded-full blur-3xl"
          style={{
            background: `radial-gradient(circle, ${color}4a 0%, transparent 72%)`,
          }}
          animate={{
            scale: [0.96, 1.06, 0.98],
            opacity: [0.34, 0.58, 0.34],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
          }}
        />

        <motion.div
          className="relative w-[20rem] overflow-hidden rounded-[1.6rem] border border-white/14 bg-[rgba(27,27,50,0.95)] px-7 py-7 shadow-[0_30px_100px_rgba(10,10,35,0.62)] backdrop-blur-xl"
          style={{
            boxShadow: `0 30px 100px rgba(10,10,35,0.62), inset 0 0 0 1px ${color}1f`,
          }}
        >
          <div className="absolute inset-x-6 top-5 h-px bg-white/10" />
          <div className="absolute inset-x-6 bottom-5 h-px bg-white/10" />

          <div className="relative flex items-center gap-5">
            <motion.div
              className="relative flex h-24 w-24 items-center justify-center"
              animate={{ rotate: [0, 16, -14, 0], scale: [0.9, 1.04, 1] }}
              transition={{ duration: 0.95, times: [0, 0.5, 1], ease: 'easeInOut' }}
            >
              <GemIcon gem={gem} size={96} animated glow />

              <motion.div
                className="absolute left-[30%] top-[16%] h-[64%] w-[14%] rounded-full bg-white/50 blur-[1px]"
                animate={{ opacity: [0.3, 0.58, 0.3] }}
                transition={{ duration: 1.1, repeat: Infinity }}
              />
            </motion.div>

            <div className="space-y-2 text-left">
              <div
                className="flex items-center gap-2 font-mono text-base font-semibold tracking-[0.18em] drop-shadow-[0_0_14px]"
                style={{
                  color,
                  textShadow: `0 0 12px ${color}99, 0 0 24px ${color}66`,
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                Synthesis Complete
              </div>
              <div className="text-3xl leading-none text-white">{gem}</div>
              <div className="whitespace-nowrap text-base text-muted-foreground">Added to Collection</div>
            </div>
          </div>

          <motion.div
            className="mt-6 h-2 overflow-hidden rounded-full bg-white/6"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${color}8a 0%, ${color}f0 52%, rgba(255,255,255,0.88) 100%)`,
              }}
              animate={{ width: ['0%', '100%'] }}
              transition={{
                duration: 1.05,
                ease: 'easeOut',
              }}
            />
          </motion.div>

          <motion.div
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.22, delay: 0.45 }}
          >
            <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
            <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30" />
            <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
          </motion.div>
        </motion.div>

        {shards.map((shard) => (
          <motion.div
            key={shard.id}
            className="absolute h-3 w-2 rounded-[2px] border border-white/14"
            style={{
              left: '50%',
              top: '50%',
              background: `linear-gradient(180deg, rgba(255,255,255,0.9), ${color}d8)`,
              boxShadow: `0 0 10px ${color}44`,
            }}
            initial={{
              x: 0,
              y: 0,
              opacity: 0,
              rotate: 0,
              scale: 0.4,
            }}
            animate={{
              x: shard.x,
              y: shard.y,
              opacity: [0, 0.9, 0],
              rotate: [0, shard.rotate],
              scale: [0.4, 1, 0.7],
            }}
            transition={{
              duration: 0.9,
              delay: 0.14 + shard.id * 0.04,
            }}
          />
        ))}
      </motion.div>
    </motion.div>
  );
}
