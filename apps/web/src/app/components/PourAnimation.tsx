import { motion } from 'motion/react';
import type { PowderColor } from '../types/game';
import { COLOR_PALETTE } from '../types/game';

interface PourAnimationProps {
  color: PowderColor;
  fromPosition: { x: number; y: number };
  toPosition: { x: number; y: number };
  /** Bottle tilt in degrees at stream start (clockwise positive). */
  sourceTiltDeg?: number;
  /** Seconds to wait before the stream starts (vial travel phase). */
  streamDelay?: number;
  /** Seconds the visible powder should keep flowing. */
  streamDuration?: number;
  onComplete: () => void;
}

export function PourAnimation({
  color,
  fromPosition,
  toPosition,
  sourceTiltDeg = 0,
  streamDelay = 0,
  streamDuration = 0.78,
  onComplete,
}: PourAnimationProps) {
  const baseColor = COLOR_PALETTE[color];
  const safeStreamDuration = Math.max(streamDuration, 0.001);
  const dx = toPosition.x - fromPosition.x;
  const verticalDrop = Math.max(26, toPosition.y - fromPosition.y);
  const horizontalReach = Math.max(24, Math.abs(dx));
  const tiltRad = (sourceTiltDeg * Math.PI) / 180;
  const mouthBiasX = Math.sin(tiltRad);
  const mouthBiasY = Math.max(0.35, Math.cos(tiltRad));
  const emissionReach = Math.max(20, Math.min(52, horizontalReach * 0.5 + verticalDrop * 0.12));
  const controlOneX = fromPosition.x + dx * 0.42 + mouthBiasX * emissionReach * 1.18;
  const controlOneY = fromPosition.y + Math.max(7, verticalDrop * 0.08) + mouthBiasY * emissionReach * 0.12;
  const controlTwoX = toPosition.x - dx * 0.12 - mouthBiasX * Math.min(12, horizontalReach * 0.09);
  const controlTwoY = toPosition.y - Math.max(10, verticalDrop * 0.18);
  const midX = fromPosition.x + dx * 0.58 + mouthBiasX * emissionReach * 0.58;
  const midY = fromPosition.y + verticalDrop * 0.28 + mouthBiasY * emissionReach * 0.08;
  const arcPath = `M ${fromPosition.x} ${fromPosition.y} C ${controlOneX} ${controlOneY} ${controlTwoX} ${controlTwoY} ${toPosition.x} ${toPosition.y}`;

  const grainCount = 46;
  const beadCount = 14;

  const grains = Array.from({ length: grainCount }, (_, index) => {
    const polarity = index % 2 === 0 ? 1 : -1;

    return {
      id: index,
      size: 0.75 + (index % 5) * 0.22,
      drift: polarity * (2.2 + (index % 6) * 0.85),
      lift: 1.2 + (index % 5) * 0.55,
      delay: index * 0.012,
      opacity: 0.14 + (index % 6) * 0.045,
    };
  });

  return (
    <svg className="pointer-events-none fixed inset-0 z-[78]" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id={`powder-stream-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={baseColor} stopOpacity="0.14" />
          <stop offset="32%" stopColor={baseColor} stopOpacity="0.62" />
          <stop offset="100%" stopColor={baseColor} stopOpacity="0.22" />
        </linearGradient>

        <filter id={`powder-soft-${color}`}>
          <feGaussianBlur stdDeviation="1.05" />
        </filter>

        <filter id={`powder-dust-${color}`}>
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        <filter id={`beam-glow-${color}`}>
          <feGaussianBlur stdDeviation="1.8" />
        </filter>
      </defs>

      <motion.path
        d={arcPath}
        stroke="rgba(150,208,255,0.58)"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
        filter={`url(#beam-glow-${color})`}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: [0, 1, 1, 0.96], opacity: [0, 0.82, 0.8, 0] }}
        transition={{ duration: safeStreamDuration, times: [0, 0.16, 0.78, 1], ease: 'linear', delay: streamDelay }}
      />

      <motion.path
        d={arcPath}
        stroke={`url(#powder-stream-${color})`}
        strokeWidth="9.2"
        fill="none"
        strokeLinecap="round"
        strokeDasharray="2.2 7.2"
        filter={`url(#powder-soft-${color})`}
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: [0, 1, 1, 1], opacity: [0, 1, 0.92, 0] }}
        exit={{ opacity: 0 }}
        transition={{ duration: safeStreamDuration, times: [0, 0.22, 0.82, 1], ease: [0.25, 0.1, 0.25, 1], delay: streamDelay }}
        onAnimationComplete={onComplete}
      />

      <motion.circle
        cx={fromPosition.x}
        cy={fromPosition.y}
        r="8.6"
        fill={baseColor}
        filter={`url(#powder-dust-${color})`}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 0.72, 0], scale: [0.58, 1.12, 1.28] }}
        transition={{ duration: Math.min(0.28, safeStreamDuration * 0.34), delay: streamDelay, ease: 'easeOut' }}
      />

      <motion.path
        d={arcPath}
        stroke={baseColor}
        strokeWidth="3"
        strokeOpacity="0.36"
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: [0, 1, 1, 1], opacity: [0, 0.92, 0.7, 0] }}
        exit={{ opacity: 0 }}
        transition={{ duration: safeStreamDuration, times: [0, 0.18, 0.82, 1], ease: [0.33, 0, 0.2, 1], delay: streamDelay }}
      />

      <motion.ellipse
        cx={toPosition.x}
        cy={toPosition.y + 3}
        rx="13"
        ry="4.5"
        fill={baseColor}
        filter={`url(#powder-dust-${color})`}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 0.2, 0], scale: [0.65, 1.12, 1.22] }}
        transition={{ duration: 0.32, ease: 'easeOut', delay: streamDelay + safeStreamDuration }}
      />

      {grains.map((grain) => (
        <motion.ellipse
          key={grain.id}
          rx={grain.size}
          ry={grain.size * 0.7}
          fill={baseColor}
          filter={`url(#powder-soft-${color})`}
          initial={{
            cx: fromPosition.x,
            cy: fromPosition.y,
            opacity: 0,
            rotate: 0,
          }}
          animate={{
            cx: [fromPosition.x, midX + grain.drift * 0.55, toPosition.x + grain.drift * 0.16],
            cy: [fromPosition.y, midY - grain.lift * 0.04, toPosition.y + 0.7],
            opacity: [0, grain.opacity, 0],
            rotate: [0, grain.drift * 2.2, grain.drift * 3.2],
          }}
          transition={{
            duration: safeStreamDuration * 0.6,
            delay: streamDelay + (grain.id / Math.max(1, grainCount - 1)) * safeStreamDuration * 0.4,
            ease: [0.33, 0, 0.25, 1],
          }}
        />
      ))}

      {Array.from({ length: beadCount }, (_, beadIndex) => (
        <motion.circle
          key={`bead-${beadIndex}`}
          r="2.5"
          fill={baseColor}
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="0.6"
          initial={{
            cx: fromPosition.x,
            cy: fromPosition.y,
            opacity: 0,
          }}
          animate={{
            cx: [fromPosition.x, midX + (beadIndex % 2 === 0 ? 3.2 : -3.2), toPosition.x],
            cy: [fromPosition.y, midY - 0.25, toPosition.y],
            opacity: [0, 0.92, 0.22, 0],
          }}
          transition={{
            duration: Math.max(0.18, safeStreamDuration * 0.55),
            delay: streamDelay + (beadIndex / Math.max(1, beadCount - 1)) * safeStreamDuration * 0.45,
            ease: [0.3, 0, 0.2, 1],
          }}
        />
      ))}

      {Array.from({ length: 9 }, (_, sparkleIndex) => (
        <motion.circle
          key={`jump-${sparkleIndex}`}
          r="1.1"
          fill="rgba(220,245,255,0.9)"
          initial={{ cx: fromPosition.x, cy: fromPosition.y, opacity: 0 }}
          animate={{
            cx: [fromPosition.x, midX + (sparkleIndex - 4) * 2.1, toPosition.x],
            cy: [fromPosition.y, midY - 1.8, toPosition.y - 2.4],
            opacity: [0, 0.75, 0],
          }}
          transition={{
            duration: Math.max(0.18, safeStreamDuration * 0.26),
            delay: streamDelay + (sparkleIndex / 8) * safeStreamDuration * 0.52,
            ease: 'easeOut',
          }}
        />
      ))}

      {Array.from({ length: 12 }, (_, index) => (
        <motion.ellipse
          key={`settle-${index}`}
          rx={index % 2 === 0 ? 1.35 : 1}
          ry={0.75}
          fill="rgba(245,246,247,0.55)"
          initial={{
            cx: toPosition.x,
            cy: toPosition.y - 3,
            opacity: 0,
          }}
          animate={{
            cx: [toPosition.x, toPosition.x + (index - 5.5) * 2.8],
            cy: [toPosition.y - 3, toPosition.y - 6 - (index % 3) * 1.4],
            opacity: [0, 0.45, 0],
          }}
          transition={{
            duration: 0.42,
            delay: streamDelay + safeStreamDuration + index * 0.015,
            ease: 'easeOut',
          }}
        />
      ))}
    </svg>
  );
}
