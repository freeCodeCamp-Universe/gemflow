function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

type MotionEaseName = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut';

/** Safety caps only for extreme layout. */
const MAX_TRAVEL_X = 980;
const MAX_TRAVEL_Y = 620;
const VIAL_POUR_PIVOT_Y = 0.925;
const VIAL_POUR_HOLD_SCALE = 1.04;
const VIAL_POUR_MOUTH_CENTER_Y = 11.36;
const VIAL_POUR_SOURCE_EDGE_OFFSET_X = 20.5;

/** Short-neck glass jar opening — keep in sync with `Vial` rim/opening geometry. */
export const VIAL_POUR_MOUTH_INSET_PX = VIAL_POUR_MOUTH_CENTER_Y;

export interface PourVisualPlan {
  /** Pure translation (px): lift → move over target. */
  travel: {
    x: readonly number[];
    y: readonly number[];
  };
  /** Rotation (deg) only on inner layer; pivot at bottle base. */
  tilt: {
    rotate: readonly number[];
  };
  transition: {
    duration: number;
    times: readonly number[];
    ease: readonly MotionEaseName[];
  };
  alignTravel: { x: number; y: number };
  pourHoldTravel: { x: number; y: number };
  pourHoldTiltDeg: number;
  streamFrom: { x: number; y: number };
  streamTo: { x: number; y: number };
  pourWindow: {
    startSec: number;
    endSec: number;
    durationSec: number;
  };
  resolveAfterMs: number;
}

function solveTravelForMouthPoint(
  fromRect: DOMRect,
  desiredMouth: { x: number; y: number },
  rotateDeg: number,
): { x: number; y: number } {
  const direction = rotateDeg >= 0 ? 1 : -1;
  const pivotBaseX = fromRect.left + fromRect.width / 2;
  const pivotBaseY = fromRect.top + VIAL_POUR_PIVOT_Y * fromRect.height;
  const mouthOffsetX = direction * VIAL_POUR_SOURCE_EDGE_OFFSET_X * VIAL_POUR_HOLD_SCALE;
  const mouthOffsetY = (VIAL_POUR_MOUTH_CENTER_Y - VIAL_POUR_PIVOT_Y * fromRect.height) * VIAL_POUR_HOLD_SCALE;
  const radians = (rotateDeg * Math.PI) / 180;
  const rotatedOffsetX = mouthOffsetX * Math.cos(radians) - mouthOffsetY * Math.sin(radians);
  const rotatedOffsetY = mouthOffsetX * Math.sin(radians) + mouthOffsetY * Math.cos(radians);

  return {
    x: desiredMouth.x - (pivotBaseX + rotatedOffsetX),
    y: desiredMouth.y - (pivotBaseY + rotatedOffsetY),
  };
}

function solveUprightTravelForMouthPoint(
  fromRect: DOMRect,
  desiredMouth: { x: number; y: number },
): { x: number; y: number } {
  return {
    x: desiredMouth.x - (fromRect.left + fromRect.width / 2),
    y: desiredMouth.y - (fromRect.top + VIAL_POUR_MOUTH_CENTER_Y),
  };
}

/**
 * World-space mouth after `translate(travel)` on outer wrapper then `rotate(deg)` on inner
 * (inner `transform-origin: 50% 92.5%` of the vial button box).
 */
export function pourMouthWorld(
  fromRect: DOMRect,
  travel: { x: number; y: number },
  rotateDeg: number,
): { x: number; y: number } {
  const direction = rotateDeg >= 0 ? 1 : -1;
  const w = fromRect.width;
  const h = fromRect.height;
  const pivotX = fromRect.left + w / 2 + travel.x;
  const pivotY = fromRect.top + VIAL_POUR_PIVOT_Y * h + travel.y;
  const mouthOffsetX = direction * VIAL_POUR_SOURCE_EDGE_OFFSET_X * VIAL_POUR_HOLD_SCALE;
  const mouthOffsetY = (VIAL_POUR_MOUTH_CENTER_Y - VIAL_POUR_PIVOT_Y * h) * VIAL_POUR_HOLD_SCALE;
  const rad = (rotateDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: pivotX + mouthOffsetX * cos - mouthOffsetY * sin,
    y: pivotY + mouthOffsetX * sin + mouthOffsetY * cos,
  };
}

export function targetPourOpening(tr: DOMRect): { x: number; y: number } {
  return {
    x: tr.left + tr.width / 2,
    y: tr.top + VIAL_POUR_MOUTH_CENTER_Y,
  };
}

/**
 * Lift high → travel over target → tilt. Translation and rotation are split for correct CSS order.
 */
export function buildPourVisualPlan(fromRect: DOMRect, toRect: DOMRect, layerCount: number): PourVisualPlan {
  const target = targetPourOpening(toRect);
  const deltaX = target.x - (fromRect.left + fromRect.width / 2);
  const deltaY = target.y - (fromRect.top + fromRect.height / 2);
  const dist = Math.hypot(deltaX, deltaY);
  const direction = deltaX >= 0 ? 1 : -1;

  const hoverGap = clamp(88 + layerCount * 5 + Math.abs(deltaX) * 0.018, 88, 114);
  const streamGap = clamp(56 + layerCount * 4 + Math.abs(deltaX) * 0.016, 56, 76);
  const hoverSideClearance = clamp(
    toRect.width * 0.54 + fromRect.width * 0.22 + Math.abs(deltaX) * 0.02,
    70,
    94,
  );
  const alignTravel = solveUprightTravelForMouthPoint(fromRect, {
    x: target.x - direction * hoverSideClearance,
    y: target.y - hoverGap,
  });

  const liftY = clamp(Math.min(-116, alignTravel.y - 42 - Math.min(40, dist * 0.045)), -MAX_TRAVEL_Y, -116);
  const cruiseX = clamp(alignTravel.x * 0.5, -MAX_TRAVEL_X, MAX_TRAVEL_X);
  const cruiseY = clamp(Math.min(liftY, alignTravel.y - 32), -MAX_TRAVEL_Y, MAX_TRAVEL_Y);

  const pourHoldTiltDeg = direction * clamp(42 + Math.abs(deltaX) * 0.024 + Math.max(0, deltaY) * 0.01, 42, 52);
  const mouthSideClearance = clamp(
    toRect.width * 0.16 + fromRect.width * 0.12 + Math.abs(deltaX) * 0.012,
    18,
    30,
  );
  const pourHoldTravel = solveTravelForMouthPoint(
    fromRect,
    {
      x: target.x - direction * mouthSideClearance,
      y: target.y - streamGap,
    },
    pourHoldTiltDeg,
  );

  const sourceMouth = pourMouthWorld(fromRect, pourHoldTravel, pourHoldTiltDeg);
  const targetMouth = {
    x: target.x,
    y: target.y,
  };

  const liftSec = 0.18;
  const cruiseSec = clamp(0.28 + dist * 0.0003, 0.28, 0.42);
  const alignSec = 0.16;
  const tiltSec = 0.18;
  const pourHoldSec = clamp(0.48 + layerCount * 0.16 + dist * 0.00016, 0.62, 1.08);
  const returnSec = clamp(0.28 + dist * 0.00012, 0.28, 0.4);
  const duration = liftSec + cruiseSec + alignSec + tiltSec + pourHoldSec + returnSec;
  const pourStartSec = liftSec + cruiseSec + alignSec + tiltSec;
  const pourEndSec = pourStartSec + pourHoldSec;
  const times = [
    0,
    liftSec / duration,
    (liftSec + cruiseSec) / duration,
    (liftSec + cruiseSec + alignSec) / duration,
    pourStartSec / duration,
    pourEndSec / duration,
    1,
  ] as const;
  const travelX = [0, 0, cruiseX, alignTravel.x, pourHoldTravel.x, pourHoldTravel.x, 0] as const;
  const travelY = [0, liftY, cruiseY, alignTravel.y, pourHoldTravel.y, pourHoldTravel.y, 0] as const;
  const tiltRotate = [0, 0, 0, 0, pourHoldTiltDeg, pourHoldTiltDeg, 0] as const;
  const resolveAfterMs = Math.round(duration * 1000);

  return {
    travel: {
      x: travelX,
      y: travelY,
    },
    tilt: {
      rotate: tiltRotate,
    },
    transition: {
      duration,
      times,
      ease: ['easeOut', 'easeInOut', 'easeOut', 'easeInOut', 'linear', 'easeInOut'] as const,
    },
    alignTravel,
    pourHoldTravel,
    pourHoldTiltDeg,
    streamFrom: sourceMouth,
    streamTo: targetMouth,
    pourWindow: {
      startSec: pourStartSec,
      endSec: pourEndSec,
      durationSec: pourHoldSec,
    },
    resolveAfterMs,
  };
}

export function computePourDeltas(fromEl: HTMLElement, toEl: HTMLElement): { deltaX: number; deltaY: number } {
  const fr = fromEl.getBoundingClientRect();
  const tr = toEl.getBoundingClientRect();
  const fromCx = fr.left + fr.width / 2;
  const fromCy = fr.top + fr.height / 2;
  const toCx = tr.left + tr.width / 2;
  const toCy = tr.top + tr.height / 2;
  return { deltaX: toCx - fromCx, deltaY: toCy - fromCy };
}
