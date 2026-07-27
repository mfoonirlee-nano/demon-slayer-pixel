import type { CSSProperties, ReactNode } from "react";
import { resolveStaticAssetUrl } from "../assets/staticAssetUrl";
import { UI_SPRITES, type UiSpriteId } from "../constants";

export function uiSpriteDisplaySize(spriteId: UiSpriteId) {
  const sprite = UI_SPRITES[spriteId];
  return {
    w: "displayW" in sprite ? sprite.displayW : sprite.w,
    h: "displayH" in sprite ? sprite.displayH : sprite.h,
  };
}

function uiSpriteStyle(spriteId: UiSpriteId, width?: number, height?: number): CSSProperties {
  const sprite = UI_SPRITES[spriteId];
  const displaySize = uiSpriteDisplaySize(spriteId);
  const displayW = width ?? displaySize.w;
  const displayH = height ?? displaySize.h;

  return {
    width: displayW,
    height: displayH,
    backgroundImage: `url("${resolveStaticAssetUrl(sprite.src)}")`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${displayW}px ${displayH}px`,
    imageRendering: "pixelated",
  };
}

export function UiSprite({ id, width, height, className = "", style, children }: {
  id: UiSpriteId;
  width?: number;
  height?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div className={`ui-sprite ${className}`} style={{ ...uiSpriteStyle(id, width, height), ...style }}>
      {children}
    </div>
  );
}
