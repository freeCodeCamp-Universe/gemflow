import { forwardRef } from 'react';
import { motion } from 'motion/react';
import type { PowderColor, Vial as VialType } from '../types/game';
import { COLOR_PALETTE } from '../types/game';
import type { PourVisualPlan } from '../utils/pourMotion';

const POWDER_SURFACES = [
  'polygon(0% 100%, 0% 30%, 10% 21%, 22% 26%, 34% 15%, 48% 22%, 62% 17%, 74% 25%, 88% 19%, 100% 24%, 100% 100%)',
  'polygon(0% 100%, 0% 26%, 14% 18%, 28% 23%, 42% 16%, 56% 24%, 70% 19%, 82% 27%, 100% 20%, 100% 100%)',
  'polygon(0% 100%, 0% 28%, 12% 20%, 24% 27%, 38% 17%, 54% 22%, 68% 15%, 82% 21%, 92% 18%, 100% 22%, 100% 100%)',
] as const;
const POWDER_SPARKLES = [
  { left: '22%', top: '30%', size: '0.28rem', delay: 0 },
  { left: '58%', top: '18%', size: '0.36rem', delay: 0.24 },
  { left: '76%', top: '54%', size: '0.24rem', delay: 0.48 },
] as const;

export interface PowderRenderLayer {
  color: PowderColor;
  fill: number;
  key?: string;
}

interface VialProps {
  vial: VialType;
  isSelected: boolean;
  onClick: () => void;
  isSynthesizing?: boolean;
  hoverFlow?: 'in' | 'out' | null;
  showForbidden?: boolean;
  invalidPulse?: boolean;
  isReceivingPour?: boolean;
  /** Lift → travel → align → pour hold → return (keyframes from `buildPourVisualPlan`). */
  pourVisual?: PourVisualPlan | null;
  renderLayers?: PowderRenderLayer[];
}

export const Vial = forwardRef<HTMLButtonElement, VialProps>(function Vial(
  {
    vial,
    isSelected,
    onClick,
    isSynthesizing,
    hoverFlow,
    showForbidden,
    invalidPulse,
    isReceivingPour,
    pourVisual,
    renderLayers,
  },
  ref,
) {
  const { layers, capacity } = vial;
  const glowColor = layers.length > 0 ? COLOR_PALETTE[layers[0]] : undefined;
  const isPouring = Boolean(pourVisual);
  const isEmpty = layers.length === 0;
  const displayedLayers = renderLayers ?? layers.map((color, index) => ({ color, fill: 1, key: `${color}-${index}` }));
  const basePowderColor = displayedLayers[0] ? COLOR_PALETTE[displayedLayers[0].color] : 'rgba(241,190,50,0.5)';
  const sidePowderColor = displayedLayers[1] ? COLOR_PALETTE[displayedLayers[1].color] : basePowderColor;
  const bottleScaleKeyframes = [1, 1.02, 1.03, 1.032, 1.04, 1.04, 1] as const;
  const bottleKeyframes = pourVisual
    ? pourVisual.travel.x.map((x, index) => {
        const y = pourVisual.travel.y[index] ?? 0;
        const rotate = pourVisual.tilt.rotate[index] ?? 0;
        const scale = bottleScaleKeyframes[index] ?? bottleScaleKeyframes[bottleScaleKeyframes.length - 1];
        return `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${scale})`;
      })
    : ['translate(0px, 0px) rotate(0deg) scale(1)'];

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      className="group relative h-[7.2rem] w-[5.2rem] touch-manipulation cursor-pointer transition-transform min-[380px]:h-[7.75rem] min-[380px]:w-[5.6rem] sm:h-[9.5rem] sm:w-[6.9rem]"
      whileHover={isPouring ? undefined : { y: -3 }}
      whileTap={isPouring ? undefined : { scale: 0.98 }}
      animate={
        isSynthesizing
          ? { y: [0, -3, 0] }
          : isReceivingPour
            ? { y: [0, 2, 0, -1, 0, 1, 0] }
            : { y: 0 }
      }
      transition={
        isSynthesizing
          ? { duration: 0.75, repeat: Infinity, ease: 'easeInOut' }
          : isReceivingPour
            ? { duration: 0.42, ease: 'easeOut' }
            : { duration: 0.2 }
      }
    >
      {isSynthesizing && glowColor && (
        <motion.div
          className="absolute inset-x-0 bottom-0 top-8 rounded-[1.4rem] blur-2xl"
          style={{
            background: `radial-gradient(circle, ${glowColor}45 0%, transparent 72%)`,
          }}
          animate={{
            opacity: [0.24, 0.5, 0.24],
            scale: [0.98, 1.03, 0.98],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
          }}
        />
      )}
      {!isEmpty && !isPouring && (
        <>
          <div
            className="pointer-events-none absolute -bottom-[0.2rem] left-1/2 z-0 h-[1.25rem] w-[84%] -translate-x-1/2 rounded-full blur-[4px]"
            style={{
              background: `radial-gradient(ellipse at center, ${basePowderColor}7a 0%, ${basePowderColor}38 42%, transparent 76%)`,
            }}
          />
          <div
            className="pointer-events-none absolute bottom-[1.95rem] left-[0.12rem] z-0 h-[2.6rem] w-[0.9rem] rounded-full blur-[3px]"
            style={{
              background: `linear-gradient(180deg, transparent 0%, ${sidePowderColor}40 36%, ${sidePowderColor}14 75%, transparent 100%)`,
            }}
          />
          <div
            className="pointer-events-none absolute bottom-[1.9rem] right-[0.1rem] z-0 h-[2.4rem] w-[0.74rem] rounded-full blur-[3px]"
            style={{
              background: `linear-gradient(180deg, transparent 0%, ${sidePowderColor}30 38%, ${sidePowderColor}10 74%, transparent 100%)`,
            }}
          />
        </>
      )}

      <motion.div
        className="absolute inset-0"
        initial={false}
        animate={{ transform: bottleKeyframes }}
        transition={
          pourVisual
            ? {
                duration: pourVisual.transition.duration,
                times: [...pourVisual.transition.times],
                ease: [...pourVisual.transition.ease],
              }
            : { type: 'spring', stiffness: 300, damping: 32, mass: 0.88 }
        }
        style={{
          transformOrigin: '50% 92.5%',
          filter: pourVisual ? 'drop-shadow(0 14px 22px rgba(0,0,0,0.42))' : undefined,
        }}
      >
        <div className="absolute left-1/2 top-[0.18rem] z-30 h-[0.96rem] w-[3.62rem] -translate-x-1/2 rounded-full border border-white/48 bg-[radial-gradient(ellipse_at_center,rgba(226,243,255,0.27)_0%,rgba(176,214,246,0.16)_42%,rgba(255,255,255,0.13)_68%,rgba(184,226,255,0.09)_100%)] shadow-[inset_0_2px_3px_rgba(255,255,255,0.28),inset_0_-1px_2px_rgba(80,120,180,0.12),0_0_8px_rgba(166,220,255,0.12)]" />
        <div className="absolute left-1/2 top-[0.46rem] z-40 h-[0.34rem] w-[2.62rem] -translate-x-1/2 rounded-full border border-white/24 bg-[rgba(175,210,240,0.13)] shadow-[inset_0_1px_2px_rgba(255,255,255,0.18),inset_0_-1px_2px_rgba(35,52,82,0.16)]" />
        <div className="absolute left-1/2 top-[0.84rem] z-20 h-[0.24rem] w-[3.16rem] -translate-x-1/2 rounded-full border border-white/28 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.05))] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_0_6px_rgba(190,226,255,0.08)]" />
        <div
          className="absolute left-1/2 top-[0.94rem] z-[18] h-[2.18rem] w-[2.36rem] -translate-x-1/2 overflow-hidden rounded-b-[1.02rem] rounded-t-[0.56rem] border border-white/20 backdrop-blur-sm"
          style={{
            background:
              'linear-gradient(90deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.075) 20%, rgba(190,220,245,0.04) 48%, rgba(255,255,255,0.02) 68%, rgba(180,225,255,0.12) 100%)',
            boxShadow:
              'inset 0 0 0 1px rgba(255,255,255,0.07), inset 0 10px 12px rgba(255,255,255,0.055), inset 0 -10px 14px rgba(10,10,35,0.15), 0 10px 16px rgba(10,10,35,0.17)',
          }}
        >
          <div className="absolute inset-x-[0.3rem] top-[0.24rem] h-[0.2rem] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.24),transparent)]" />
        </div>
        <div
          className="absolute inset-x-[0.32rem] bottom-0 top-[2.58rem] overflow-hidden rounded-t-[0.96rem] rounded-b-[1.12rem] border backdrop-blur-sm transition-all"
          style={{
            borderColor: isSelected
              ? 'rgba(241,190,50,0.9)'
              : isSynthesizing && glowColor
                ? `${glowColor}88`
                : 'rgba(208,208,213,0.26)',
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.17) 0%, rgba(255,255,255,0.06) 18%, rgba(208,232,255,0.035) 52%, rgba(10,10,35,0.08) 100%)',
            boxShadow: isSelected
              ? '0 0 0 3px rgba(241,190,50,0.6), 0 0 20px rgba(241,190,50,0.3), inset 0 0 0 2px rgba(255,255,255,0.12), 0 16px 30px rgba(10,10,35,0.45)'
              : isSynthesizing && glowColor
                ? `0 0 0 1px ${glowColor}26, inset 0 0 0 2px rgba(255,255,255,0.1), 0 16px 30px rgba(10,10,35,0.45)`
                : 'inset 0 0 0 2px rgba(255,255,255,0.1), 0 16px 30px rgba(10,10,35,0.42)',
            opacity: isEmpty ? 0.95 : 0.9,
          }}
        >
          {showForbidden && <div className="absolute inset-0 bg-[rgba(110,116,128,0.3)]" />}
          <div className="absolute inset-y-[0.9rem] left-[0.34rem] w-[1.05rem] rounded-full bg-[linear-gradient(90deg,rgba(255,255,255,0.24),rgba(255,255,255,0.05),transparent)]" />
          <div className="absolute inset-y-[0.9rem] right-[0.34rem] w-[1.05rem] rounded-full bg-[linear-gradient(270deg,rgba(255,255,255,0.22),rgba(255,255,255,0.04),transparent)]" />
          <div className="absolute inset-x-[0.88rem] top-[0.4rem] h-[0.88rem] rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.16),transparent)]" />
          <div className="absolute inset-x-[0.76rem] bottom-[1.12rem] top-[1.98rem] overflow-hidden rounded-t-[0.58rem] rounded-b-[0.4rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.01)_22%,rgba(10,10,35,0.035)_100%)]">
            <div className="absolute inset-x-[4%] bottom-[0%] top-[0%] flex flex-col-reverse gap-0">
              {displayedLayers.map((layer, index) => (
                <PowderLayer
                  key={layer.key ?? `${layer.color}-${index}`}
                  color={layer.color}
                  height={`${(layer.fill / capacity) * 100}%`}
                  index={index}
                  isSynthesizing={isSynthesizing}
                />
              ))}
            </div>
            {isEmpty &&
              Array.from({ length: 5 }, (_, dustIndex) => (
                <motion.div
                  key={`dust-${dustIndex}`}
                  className="absolute h-[0.22rem] w-[0.22rem] rounded-full bg-white/35"
                  style={{
                    left: `${20 + dustIndex * 14}%`,
                    top: `${18 + (dustIndex % 3) * 16}%`,
                  }}
                  animate={{
                    y: [0, 24, 48],
                    x: [0, dustIndex % 2 === 0 ? -2 : 2, 0],
                    opacity: [0, 0.48, 0],
                  }}
                  transition={{
                    duration: 1.9 + dustIndex * 0.18,
                    repeat: Infinity,
                    delay: dustIndex * 0.22,
                    ease: 'linear',
                  }}
                />
              ))}
          </div>
          <div
            className="absolute inset-x-[0.38rem] bottom-[0.08rem] h-[1.18rem] rounded-full border border-white/16"
            style={{
              background: isEmpty
                ? 'radial-gradient(ellipse at center, rgba(255,255,255,0.2), rgba(150,205,255,0.06) 42%, rgba(7,10,26,0.2) 82%)'
                : 'radial-gradient(ellipse at center, rgba(255,255,255,0.32), rgba(255,211,78,0.11) 28%, rgba(150,205,255,0.08) 46%, rgba(7,10,26,0.24) 80%)',
              boxShadow: isEmpty
                ? 'inset 0 1px 3px rgba(255,255,255,0.18), 0 0 8px rgba(150,205,255,0.06)'
                : 'inset 0 1px 4px rgba(255,255,255,0.26), 0 0 14px rgba(241,190,50,0.1)',
            }}
          >
            <div className="absolute left-1/2 top-[0.22rem] h-[0.18rem] w-[56%] -translate-x-1/2 rounded-full bg-white/16" />
          </div>
          {invalidPulse && (
            <motion.div
              className="absolute left-1/2 top-4 h-7 w-7 -translate-x-1/2 rounded-full border border-red-300/55"
              style={{
                background:
                  'radial-gradient(circle, rgba(240,60,90,0.22) 0%, rgba(240,60,90,0.08) 55%, transparent 80%)',
              }}
              animate={{ scale: [0.5, 1.4], opacity: [0.8, 0] }}
              transition={{ duration: 0.35, repeat: 2, ease: 'easeOut' }}
            />
          )}
          {hoverFlow && (
            <div className="pointer-events-none absolute left-1/2 top-0 z-50 h-7 w-8 -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              {Array.from({ length: 4 }, (_, flowIndex) => (
                <motion.div
                  key={flowIndex}
                  className="absolute h-[0.18rem] w-[0.18rem] rounded-full bg-white/80"
                  style={{
                    left: `${24 + flowIndex * 14}%`,
                    top: hoverFlow === 'out' ? '18%' : '58%',
                    boxShadow: '0 0 4px rgba(170,215,255,0.65)',
                  }}
                  animate={{
                    y: hoverFlow === 'out' ? [4, -7] : [-7, 4],
                    opacity: [0, 0.8, 0],
                  }}
                  transition={{
                    duration: 0.7,
                    repeat: Infinity,
                    delay: flowIndex * 0.08,
                    ease: 'linear',
                  }}
                />
              ))}
            </div>
          )}
        </div>

      </motion.div>
    </motion.button>
  );
});

interface PowderLayerProps {
  color: PowderColor;
  height: string;
  index: number;
  isSynthesizing?: boolean;
}

function PowderLayer({ color, height, index, isSynthesizing }: PowderLayerProps) {
  const baseColor = COLOR_PALETTE[color];
  const surfaceProfile = POWDER_SURFACES[index % POWDER_SURFACES.length];
  const grainTint = `${baseColor}28`;
  const sedimentTint = `${baseColor}4d`;

  return (
    <motion.div
      className="relative w-full overflow-hidden"
      style={{ height }}
      initial={{ opacity: 0, scaleY: 0.7, y: 4 }}
      animate={{
        opacity: 1,
        scaleY: 1,
        y: 0,
        filter: isSynthesizing ? 'brightness(1.08) saturate(1.02)' : 'brightness(0.96)',
      }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <div
        className="absolute inset-0"
        style={{
          clipPath: surfaceProfile,
          background: `linear-gradient(180deg, ${baseColor}fa 0%, ${baseColor}e6 40%, ${baseColor}c9 100%)`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -7px 12px rgba(10,10,35,0.18), 0 1px 0 rgba(255,255,255,0.05)`,
        }}
      />

      <div
        className="absolute inset-x-0 top-0 h-3"
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)',
          clipPath: surfaceProfile,
        }}
      />

      <div
        className="absolute inset-0 opacity-95"
        style={{
          backgroundImage: `radial-gradient(rgba(255,255,255,0.32) 1px, transparent 1.45px), radial-gradient(${grainTint} 1.4px, transparent 1.9px), radial-gradient(rgba(10,10,35,0.12) 0.9px, transparent 1.3px), repeating-linear-gradient(175deg, transparent 0 9px, rgba(10,10,35,0.05) 9px 11px)`,
          backgroundPosition: '0 0, 5px 4px, 2px 7px, 0 0',
          backgroundSize: '10px 10px, 14px 14px, 12px 12px, 100% 100%',
        }}
      />

      {POWDER_SPARKLES.map((sparkle, sparkleIndex) => (
        <motion.div
          key={sparkleIndex}
          className="absolute rotate-45 rounded-[1px] bg-white/80"
          style={{
            left: sparkle.left,
            top: sparkle.top,
            width: sparkle.size,
            height: sparkle.size,
            boxShadow: `0 0 5px ${baseColor}aa, 0 0 9px rgba(255,255,255,0.25)`,
          }}
          animate={{
            opacity: [0.28, 0.92, 0.36],
            scale: [0.75, 1.1, 0.82],
          }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            delay: sparkle.delay + index * 0.12,
          }}
        />
      ))}

      <div
        className="absolute inset-x-0 bottom-0 h-[46%]"
        style={{
          background: `linear-gradient(180deg, transparent 0%, ${sedimentTint} 100%)`,
          opacity: 0.34,
        }}
      />

      <div
        className="absolute inset-x-[10%] bottom-[16%] h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)',
        }}
      />

      {isSynthesizing && (
        <>
          <motion.div
            className="absolute inset-0 rounded-[0.32rem]"
            style={{
              background: `radial-gradient(circle at 50% 28%, rgba(255,255,255,0.22) 0%, ${baseColor}55 42%, transparent 76%)`,
            }}
            animate={{
              opacity: [0.22, 0.42, 0.22],
              scale: [1, 1.02, 1],
            }}
            transition={{
              duration: 0.9,
              repeat: Infinity,
            }}
          />

          <motion.div
            className="absolute inset-y-0 left-[-30%] w-[38%] rounded-[0.32rem]"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.36), transparent)',
            }}
            animate={{
              x: ['0%', '260%'],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear',
            }}
          />

          {Array.from({ length: 3 }, (_, sparkleIndex) => (
            <motion.div
              key={sparkleIndex}
              className="absolute h-2 w-2 rotate-45 rounded-[2px] border border-white/20 bg-white/70"
              style={{
                left: `${26 + sparkleIndex * 22}%`,
                top: `${26 + (sparkleIndex % 2) * 30}%`,
                boxShadow: `0 0 5px ${baseColor}55`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0.5, 1, 0.5],
                y: [2, -3, -6],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: sparkleIndex * 0.18,
              }}
            />
          ))}
        </>
      )}
    </motion.div>
  );
}
