import { useEffect, useState } from "react";

const DEATH_SPRITE_COLUMNS = 6;
const DEATH_SPRITE_ROWS = 4;
const DEATH_SPRITE_FRAMES = DEATH_SPRITE_COLUMNS * DEATH_SPRITE_ROWS;
const DEATH_FRAME_MS = 70;
const DEATH_SHEET_WIDTH = 1672;
const DEATH_SHEET_HEIGHT = 941;
const DEATH_FRAME_WIDTH = 272;
const DEATH_FRAME_HEIGHT = 203;
const DEATH_FRAME_CONTENT_OFFSET_X = 23;
const DEATH_FRAME_CONTENT_OFFSET_Y = 22;

export function DeathScreen({ elapsed }: { elapsed: number }) {
  const [frame, setFrame] = useState(0);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    setFrame(0);
    setShowMessage(false);
    let animationFrameId = 0;
    let lastFrameAt = performance.now();
    let currentFrame = 0;

    const tick = (now: number) => {
      if (now - lastFrameAt >= DEATH_FRAME_MS) {
        const steps = Math.floor((now - lastFrameAt) / DEATH_FRAME_MS);
        lastFrameAt += steps * DEATH_FRAME_MS;
        currentFrame = Math.min(DEATH_SPRITE_FRAMES - 1, currentFrame + steps);
        setFrame(currentFrame);

        if (currentFrame >= DEATH_SPRITE_FRAMES - 1) {
          setShowMessage(true);
          return;
        }
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [elapsed]);

  const column = frame % DEATH_SPRITE_COLUMNS;
  const row = Math.floor(frame / DEATH_SPRITE_COLUMNS);

  return (
    <div className="death-screen absolute inset-0 z-50 flex flex-col items-center justify-center bg-black px-6 text-center text-white">
      <div aria-hidden="true" className="death-sprite-frame">
        <img
          src="assets/sprites/ui/end.png"
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

      <div
        className={`death-message space-y-3 ${showMessage ? "death-message-visible" : ""}`}
        aria-hidden={!showMessage}
      >
        <div className="death-survival-text">最终生存 {elapsed.toFixed(1)}s</div>
        <div className="death-restart-text">按 R 重新开始</div>
      </div>
    </div>
  );
}
