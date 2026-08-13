import { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { resolveStaticAssetUrl } from "../assets/staticAssetUrl";
import { DEATH_SPRITE_SHEET } from "../constants";
import { languageAtom } from "../i18n/language";
import { message } from "../i18n/messages";

const DEATH_SPRITE_COLUMNS = DEATH_SPRITE_SHEET.columns;
const DEATH_SPRITE_ROWS = DEATH_SPRITE_SHEET.rows;
const DEATH_SPRITE_FRAMES = DEATH_SPRITE_COLUMNS * DEATH_SPRITE_ROWS;
const DEATH_SPRITE_LOOP_START_FRAME = DEATH_SPRITE_FRAMES - DEATH_SPRITE_COLUMNS;
const DEATH_SPRITE_SCALE_NUMERATOR = 2;
const DEATH_SPRITE_SCALE_DENOMINATOR = 3;
export const DEATH_SPRITE_SCALE = DEATH_SPRITE_SCALE_NUMERATOR / DEATH_SPRITE_SCALE_DENOMINATOR;
export const DEATH_FRAME_WIDTH = DEATH_SPRITE_SHEET.frameW
  / DEATH_SPRITE_SHEET.sourceScale * DEATH_SPRITE_SCALE;
export const DEATH_FRAME_HEIGHT = DEATH_SPRITE_SHEET.frameH
  / DEATH_SPRITE_SHEET.sourceScale * DEATH_SPRITE_SCALE;
const DEATH_SHEET_WIDTH = DEATH_SPRITE_SHEET.w
  / DEATH_SPRITE_SHEET.sourceScale * DEATH_SPRITE_SCALE;
const DEATH_SHEET_HEIGHT = DEATH_SPRITE_SHEET.h
  / DEATH_SPRITE_SHEET.sourceScale * DEATH_SPRITE_SCALE;
const DEATH_FRAME_CONTENT_OFFSET_X = DEATH_SPRITE_SHEET.offsetX
  / DEATH_SPRITE_SHEET.sourceScale * DEATH_SPRITE_SCALE;
const DEATH_FRAME_CONTENT_OFFSET_Y = DEATH_SPRITE_SHEET.offsetY
  / DEATH_SPRITE_SHEET.sourceScale * DEATH_SPRITE_SCALE;

export function deathSpriteFrameForStep(step: number) {
  if (step < DEATH_SPRITE_FRAMES) return step;

  const loopFrameCount = DEATH_SPRITE_FRAMES - DEATH_SPRITE_LOOP_START_FRAME;
  return DEATH_SPRITE_LOOP_START_FRAME + (step - DEATH_SPRITE_FRAMES) % loopFrameCount;
}

export function DeathScreen({ elapsed }: { elapsed: number }) {
  const language = useAtomValue(languageAtom);
  const [frame, setFrame] = useState(0);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    setFrame(0);
    setShowMessage(false);
    let animationFrameId = 0;
    const animationStartedAt = performance.now();
    let currentFrame = 0;
    let messageShown = false;

    const tick = (now: number) => {
      const animationStep = Math.floor(
        (now - animationStartedAt) / DEATH_SPRITE_SHEET.frameDurationMs,
      );
      const nextFrame = deathSpriteFrameForStep(animationStep);

      if (nextFrame !== currentFrame) {
        currentFrame = nextFrame;
        setFrame(currentFrame);
      }

      if (!messageShown && animationStep >= DEATH_SPRITE_FRAMES - 1) {
        messageShown = true;
        setShowMessage(true);
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [elapsed]);

  const column = frame % DEATH_SPRITE_COLUMNS;
  const row = Math.floor(frame / DEATH_SPRITE_COLUMNS);

  return (
    <div className="death-screen absolute inset-0 z-50 flex flex-col items-center justify-center px-6 text-center text-white">
      {language === "zh-CN" ? (
        <div
          aria-hidden="true"
          className="death-sprite-frame"
          style={{ width: DEATH_FRAME_WIDTH, height: DEATH_FRAME_HEIGHT }}
        >
          <img
            src={resolveStaticAssetUrl(DEATH_SPRITE_SHEET.src)}
            alt=""
            draggable={false}
            className="death-sprite-sheet"
            style={{
              width: DEATH_SHEET_WIDTH,
              height: DEATH_SHEET_HEIGHT,
              transform: `translate3d(-${column * DEATH_FRAME_WIDTH + DEATH_FRAME_CONTENT_OFFSET_X}px, -${row * DEATH_FRAME_HEIGHT + DEATH_FRAME_CONTENT_OFFSET_Y}px, 0)`,
            }}
          />
        </div>
      ) : (
        <div className="death-title death-title-animated">{message(language, "death.title")}</div>
      )}

      <div
        className={`death-message space-y-3 ${showMessage ? "death-message-visible" : ""}`}
        aria-hidden={!showMessage}
      >
        <div className="death-survival-text">
          {message(language, "death.survival", { seconds: elapsed.toFixed(1) })}
        </div>
        <div className="death-restart-text">{message(language, "common.restart")}</div>
      </div>
    </div>
  );
}
