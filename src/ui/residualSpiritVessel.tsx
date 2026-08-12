import type { CSSProperties } from "react";
import { resolveStaticAssetUrl } from "../assets/staticAssetUrl";
import { RESIDUAL_SPIRIT_BEAD_CHARGE_SHEET } from "../constants";
import type { Language } from "../i18n/language";
import {
  HUD_RESIDUAL_SPIRIT_COMPACT_SCALE,
  HUD_RESIDUAL_SPIRIT_INTAKE,
} from "./gameHudLayout";
import { UiSprite, uiSpriteDisplaySize } from "./uiSprite";

const RESIDUAL_SPIRIT_BEAD_COUNT = 6;
const FULL_CIRCLE_DEGREES = 360;
const PERCENT_SCALE = 100;
const LAST_CHARGE_STAGE = RESIDUAL_SPIRIT_BEAD_CHARGE_SHEET.rows - 1;
const LAST_PARTIAL_CHARGE_STAGE = LAST_CHARGE_STAGE - 1;
const RESIDUAL_SPIRIT_BEAD_CYCLE_MS = RESIDUAL_SPIRIT_BEAD_CHARGE_SHEET.columns
  * RESIDUAL_SPIRIT_BEAD_CHARGE_SHEET.frameDurationMs;
const RESIDUAL_SPIRIT_BEAD_HEALING_CYCLE_MS = RESIDUAL_SPIRIT_BEAD_CHARGE_SHEET.columns
  * RESIDUAL_SPIRIT_BEAD_CHARGE_SHEET.healingFrameDurationMs;
const RESIDUAL_SPIRIT_BEAD_SHEET_SRC = resolveStaticAssetUrl(
  RESIDUAL_SPIRIT_BEAD_CHARGE_SHEET.src,
);

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function residualSpiritBeadFillRatios(value: number, max: number) {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
    return Array.from({ length: RESIDUAL_SPIRIT_BEAD_COUNT }, () => 0);
  }

  const filledBeads = clamp(value, 0, max) / max * RESIDUAL_SPIRIT_BEAD_COUNT;
  return Array.from(
    { length: RESIDUAL_SPIRIT_BEAD_COUNT },
    (_, index) => clamp(filledBeads - index, 0, 1),
  );
}

export function residualSpiritBeadChargeStage(ratio: number) {
  if (!Number.isFinite(ratio) || ratio <= 0) return null;
  if (ratio >= 1) return LAST_CHARGE_STAGE;
  return Math.min(
    LAST_PARTIAL_CHARGE_STAGE,
    Math.floor(ratio * LAST_CHARGE_STAGE),
  );
}

function healingProgress(timer: number, duration: number) {
  if (timer <= 0 || duration <= 0) return 0;
  return clamp(1 - timer / duration, 0, 1);
}

function vesselAriaLabel(
  language: Language,
  value: number,
  max: number,
  healTimer: number,
  healDuration: number,
  compact: boolean,
) {
  const amount = `${Math.floor(value)} / ${Math.floor(max)}`;
  if (healTimer <= 0) {
    if (compact) return language === "en" ? `Residual spirit ${amount}.` : `残灵 ${amount}。`;
    return language === "en"
      ? `Residual spirit ${amount}. Press H to restore health.`
      : `残灵 ${amount}。按 H 恢复生命。`;
  }

  const progress = Math.round(healingProgress(healTimer, healDuration) * PERCENT_SCALE);
  return language === "en"
    ? `Residual spirit ${amount}. Restoring health, ${progress}%.`
    : `残灵 ${amount}。正在恢复生命，${progress}%。`;
}

export function ResidualSpiritVessel({
  value,
  max,
  healTimer,
  healDuration,
  language,
  compact = false,
  className = "",
  style,
}: {
  value: number;
  max: number;
  healTimer: number;
  healDuration: number;
  language: Language;
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const frameSize = uiSpriteDisplaySize("residualSpiritVesselFrame");
  const fillRatios = residualSpiritBeadFillRatios(value, max);
  const healProgress = healingProgress(healTimer, healDuration);
  const isHealing = healTimer > 0;
  const displayValue = Math.floor(clamp(value, 0, Math.max(0, max)));
  const displayMax = Math.max(0, Math.floor(max));

  return (
    <div
      className={`residual-spirit-vessel ${compact ? "residual-spirit-vessel--compact" : ""} ${
        isHealing ? "residual-spirit-vessel--healing" : ""
      } ${className}`}
      role="meter"
      aria-label={vesselAriaLabel(
        language,
        displayValue,
        displayMax,
        healTimer,
        healDuration,
        compact,
      )}
      aria-valuemin={0}
      aria-valuemax={displayMax}
      aria-valuenow={displayValue}
      style={{
        width: frameSize.w,
        height: frameSize.h,
        "--residual-spirit-heal-angle": `${healProgress * FULL_CIRCLE_DEGREES}deg`,
        "--residual-spirit-compact-scale": HUD_RESIDUAL_SPIRIT_COMPACT_SCALE,
        "--residual-spirit-intake-left": `${HUD_RESIDUAL_SPIRIT_INTAKE.left}px`,
        "--residual-spirit-intake-top": `${HUD_RESIDUAL_SPIRIT_INTAKE.top}px`,
        "--residual-spirit-intake-size": `${HUD_RESIDUAL_SPIRIT_INTAKE.size}px`,
        "--residual-spirit-bead-sheet": `url("${RESIDUAL_SPIRIT_BEAD_SHEET_SRC}")`,
        "--residual-spirit-bead-sheet-width": `${
          RESIDUAL_SPIRIT_BEAD_CHARGE_SHEET.columns
            * RESIDUAL_SPIRIT_BEAD_CHARGE_SHEET.displayFrameW
        }px`,
        "--residual-spirit-bead-sheet-height": `${
          RESIDUAL_SPIRIT_BEAD_CHARGE_SHEET.rows
            * RESIDUAL_SPIRIT_BEAD_CHARGE_SHEET.displayFrameH
        }px`,
        "--residual-spirit-bead-frame-width": `${
          RESIDUAL_SPIRIT_BEAD_CHARGE_SHEET.displayFrameW
        }px`,
        "--residual-spirit-bead-frame-height": `${
          RESIDUAL_SPIRIT_BEAD_CHARGE_SHEET.displayFrameH
        }px`,
        "--residual-spirit-bead-cycle": `${RESIDUAL_SPIRIT_BEAD_CYCLE_MS}ms`,
        "--residual-spirit-bead-healing-cycle": `${RESIDUAL_SPIRIT_BEAD_HEALING_CYCLE_MS}ms`,
        ...style,
      } as CSSProperties}
    >
      <span className="residual-spirit-channel-seal" aria-hidden="true" />
      <span className="residual-spirit-beads" aria-hidden="true">
        {fillRatios.map((ratio, index) => {
          const chargeStage = residualSpiritBeadChargeStage(ratio);
          const chargeState = ratio >= 1 ? "full" : ratio > 0 ? "partial" : "empty";
          const animationDelay = -Math.round(
            index * RESIDUAL_SPIRIT_BEAD_CYCLE_MS / RESIDUAL_SPIRIT_BEAD_COUNT,
          );

          return (
            <span
              className={`residual-spirit-bead residual-spirit-bead--${chargeState}`}
              data-fill={ratio}
              key={index}
            >
              {chargeStage === null ? null : (
                <span className="residual-spirit-bead-charge">
                  <span
                    className="residual-spirit-bead-soul"
                    data-animation-phase={index}
                    data-charge-stage={chargeStage}
                    style={{
                      "--residual-spirit-delay": `${animationDelay}ms`,
                      "--residual-spirit-charge-stage-y": `${
                        chargeStage / LAST_CHARGE_STAGE * PERCENT_SCALE
                      }%`,
                    } as CSSProperties}
                  />
                </span>
              )}
              {chargeState === "partial" ? (
                <span
                  className="residual-spirit-bead-charge-marker"
                  style={{
                    "--residual-spirit-charge-level": `${ratio * PERCENT_SCALE}%`,
                  } as CSSProperties}
                />
              ) : null}
            </span>
          );
        })}
      </span>
      <UiSprite
        id="residualSpiritVesselFrame"
        className="residual-spirit-vessel-frame"
      />
      <span className="residual-spirit-count" aria-hidden="true">
        {displayValue}/{displayMax}
      </span>
      {compact ? null : (
        <kbd className="residual-spirit-key-hint" aria-hidden="true">H</kbd>
      )}
    </div>
  );
}
