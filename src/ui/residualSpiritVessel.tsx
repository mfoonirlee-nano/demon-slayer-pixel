import type { CSSProperties } from "react";
import { resolveStaticAssetUrl } from "../assets/staticAssetUrl";
import { RESIDUAL_SPIRIT_PICKUP_SPRITE } from "../constants";
import type { Language } from "../i18n/language";
import { UiSprite, uiSpriteDisplaySize } from "./uiSprite";

const RESIDUAL_SPIRIT_BEAD_COUNT = 6;
const FULL_CIRCLE_DEGREES = 360;
const PERCENT_SCALE = 100;
const RESIDUAL_SPIRIT_PICKUP_SRC = resolveStaticAssetUrl(
  RESIDUAL_SPIRIT_PICKUP_SPRITE.src,
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
        ...style,
      } as CSSProperties}
    >
      <span className="residual-spirit-channel-seal" aria-hidden="true" />
      <span className="residual-spirit-beads" aria-hidden="true">
        {fillRatios.map((ratio, index) => (
          <span className="residual-spirit-bead" key={index}>
            <span
              className="residual-spirit-bead-fill"
              data-fill={ratio}
              style={{ height: `${ratio * PERCENT_SCALE}%` }}
            >
              <img src={RESIDUAL_SPIRIT_PICKUP_SRC} alt="" draggable={false} />
            </span>
          </span>
        ))}
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
