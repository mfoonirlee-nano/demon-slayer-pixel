import { type UiSpriteId } from "../../constants";
import { UiSprite } from "../uiSprite";
import {
  AUDIO_PERCENT_SCALE,
  PAUSE_DETAIL_PANEL_H,
  PAUSE_ICON_OFFSET_Y,
  PAUSE_SLIDER_THUMB_H,
  PAUSE_SLIDER_THUMB_TOP,
  PAUSE_SLIDER_THUMB_W,
  PAUSE_SLIDER_TRACK_H,
  PAUSE_SLIDER_TRACK_TOP,
  PAUSE_SLIDER_TRACK_W,
  PAUSE_SLIDER_WRAP_H,
} from "./constants";
import type { PauseDetailCopy } from "./types";

export function StatRow({ label, value, accent = false }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="flex h-full min-h-[24px] min-w-0 items-center px-2 py-[5px] text-[10px] leading-none">
      <div className="flex w-full min-w-0 items-baseline justify-between gap-2">
        <span className="shrink-0 text-[#7fc8e0]">{label}</span>
        <span className={`min-w-0 truncate text-right text-[18px] ${accent ? "font-bold text-[#ffd46e]" : "font-bold text-[#26d5ff]"}`}>{value}</span>
      </div>
    </div>
  );
}

function pauseSquareSprite(active: boolean, disabled = false, empty = false): UiSpriteId {
  if (disabled) return "skillSlotDisabled";
  if (active) return "skillSlotActive";
  if (empty) return "skillSlotEmpty";
  return "skillSlotNormal";
}

export function PauseSquareIcon({
  active = false,
  disabled = false,
  empty = false,
  iconSrc,
  badgeSrc,
  centerText,
  leftBadgeText,
  rightBadgeText,
  size,
  iconSize,
  badgeSize,
}: {
  active?: boolean;
  disabled?: boolean;
  empty?: boolean;
  iconSrc?: string;
  badgeSrc?: string;
  centerText?: string;
  leftBadgeText?: string;
  rightBadgeText?: string;
  size: number;
  iconSize: number;
  badgeSize?: number;
}) {
  return (
    <UiSprite
      id={pauseSquareSprite(active, disabled, empty)}
      width={size}
      height={size}
      className="relative"
    >
      {iconSrc ? (
        <img
          src={iconSrc}
          alt=""
          draggable={false}
          className="absolute object-contain"
          style={{
            width: iconSize,
            height: iconSize,
            left: (size - iconSize) / 2,
            top: (size - iconSize) / 2 + PAUSE_ICON_OFFSET_Y,
            imageRendering: "pixelated",
          }}
        />
      ) : null}
      {!iconSrc && centerText ? (
        <span className="absolute inset-0 flex items-center justify-center pb-[2px] text-[14px] font-bold text-[#ffd46e]">
          {centerText}
        </span>
      ) : null}
      {leftBadgeText ? (
        <span className="pause-square-badge pause-square-badge-left">{leftBadgeText}</span>
      ) : null}
      {badgeSrc && badgeSize ? (
        <img
          src={badgeSrc}
          alt=""
          draggable={false}
          className="absolute"
          style={{
            width: badgeSize,
            height: badgeSize,
            right: 2,
            top: 2,
            imageRendering: "pixelated",
          }}
        />
      ) : null}
      {rightBadgeText ? (
        <span className="pause-square-badge pause-square-badge-right">{rightBadgeText}</span>
      ) : null}
    </UiSprite>
  );
}

export function PauseDetailPanel({ detail }: { detail: PauseDetailCopy }) {
  return (
    <div className="pause-detail-panel" style={{ height: PAUSE_DETAIL_PANEL_H, minHeight: PAUSE_DETAIL_PANEL_H }}>
      <div className="truncate text-[8px] leading-none text-[#7fc8e0]">{detail.kicker}</div>
      <div className="mt-[5px] truncate text-[12px] font-bold leading-none text-[#ffd46e]">{detail.title}</div>
      <div className="mt-[5px] line-clamp-2 text-[8px] leading-[1.35] text-[#c8efff]">{detail.body}</div>
    </div>
  );
}

export function AudioVolumeControl({ label, value, onChange }: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const percent = Math.round(value * AUDIO_PERCENT_SCALE);
  const thumbTransform = percent <= 0
    ? "translateX(0)"
    : percent >= AUDIO_PERCENT_SCALE
      ? "translateX(-100%)"
      : "translateX(-50%)";

  return (
    <label className="grid gap-2 px-2 py-[5px] text-[10px] leading-none text-[#c8efff]">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-[#7fc8e0]">{label}</span>
        <span className="text-[18px] font-bold text-[#26d5ff]">{percent}%</span>
      </span>
      <span className="relative block" style={{ height: PAUSE_SLIDER_WRAP_H }}>
        <UiSprite
          id="pauseSliderTrack"
          width={PAUSE_SLIDER_TRACK_W}
          height={PAUSE_SLIDER_TRACK_H}
          className="absolute left-0"
          style={{ top: PAUSE_SLIDER_TRACK_TOP }}
        />
        <span
          className="absolute left-0 block overflow-hidden"
          style={{ width: `${percent}%`, height: PAUSE_SLIDER_TRACK_H, top: PAUSE_SLIDER_TRACK_TOP }}
        >
          <UiSprite
            id="pauseSliderFill"
            width={PAUSE_SLIDER_TRACK_W}
            height={PAUSE_SLIDER_TRACK_H}
          />
        </span>
        <UiSprite
          id="pauseSliderThumb"
          width={PAUSE_SLIDER_THUMB_W}
          height={PAUSE_SLIDER_THUMB_H}
          className="absolute"
          style={{ left: `${percent}%`, top: PAUSE_SLIDER_THUMB_TOP, transform: thumbTransform }}
        />
        <input
          type="range"
          min={0}
          max={AUDIO_PERCENT_SCALE}
          step={5}
          value={percent}
          className="absolute inset-0 w-full cursor-pointer opacity-0"
          onChange={(event) => onChange(Number(event.currentTarget.value) / AUDIO_PERCENT_SCALE)}
        />
      </span>
    </label>
  );
}
