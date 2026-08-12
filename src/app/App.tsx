import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Provider, useAtomValue } from "jotai";
import {
  WIDTH,
  HEIGHT,
} from "../constants";
import { loadSprites } from "../assets";
import { setCanvas } from "../rendering/context";
import { startGame } from "../game/runtime";
import { gameStore, setGameSnapshot } from "../game/gameStore";
import { StartScreen } from "../ui/startScreen";
import { ensureAudio } from "../game/audio";
import { GameHud } from "../ui/gameHud";
import { TouchControls } from "../ui/touchControls";
import { languageAtom } from "../i18n/language";
import { message } from "../i18n/messages";

type AppPhase = "menu" | "playing";

const MIN_VIEWPORT_SCALE = 0.1;
const MAX_CANVAS_BACKING_SCALE = 4;

function viewportGameScale() {
  if (typeof window === "undefined") return 1;

  const viewport = window.visualViewport;
  const viewportWidth = viewport?.width ?? window.innerWidth;
  const viewportHeight = viewport?.height ?? window.innerHeight;
  return Math.max(
    MIN_VIEWPORT_SCALE,
    Math.min(viewportWidth / WIDTH, viewportHeight / HEIGHT),
  );
}

function viewportDevicePixelRatio() {
  if (typeof window === "undefined") return 1;
  return window.devicePixelRatio || 1;
}

function canvasBackingScale(viewportScale: number) {
  return Math.max(
    1,
    Math.min(MAX_CANVAS_BACKING_SCALE, viewportScale * viewportDevicePixelRatio()),
  );
}

function applyCanvasBackingScale(canvas: HTMLCanvasElement, backingScale: number) {
  const backingWidth = Math.round(WIDTH * backingScale);
  const backingHeight = Math.round(HEIGHT * backingScale);
  if (canvas.width !== backingWidth) canvas.width = backingWidth;
  if (canvas.height !== backingHeight) canvas.height = backingHeight;
}

function useViewportGameScale() {
  const [scale, setScale] = useState(viewportGameScale);

  useEffect(() => {
    const updateScale = () => setScale(viewportGameScale());
    const viewport = window.visualViewport;

    updateScale();
    window.addEventListener("resize", updateScale);
    viewport?.addEventListener("resize", updateScale);

    return () => {
      window.removeEventListener("resize", updateScale);
      viewport?.removeEventListener("resize", updateScale);
    };
  }, []);

  return scale;
}

function GameCanvas({ active, backingScale }: { active: boolean; backingScale: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const language = useAtomValue(languageAtom);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    applyCanvasBackingScale(canvas, backingScale);
    setCanvas(canvas, backingScale);
  }, [backingScale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setCanvas(canvas, backingScale);
    if (!active) {
      return () => {
        setCanvas(null);
      };
    }

    const stopGame = startGame({ onStateChange: setGameSnapshot });

    return () => {
      stopGame();
      setCanvas(null);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      id="game"
      aria-label={message(language, "app.canvasLabel")}
      className="pixel-canvas"
    />
  );
}

function AppShell() {
  const [phase, setPhase] = useState<AppPhase>("menu");
  const [assetsReady, setAssetsReady] = useState(false);
  const [startQueued, setStartQueued] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const viewportScale = useViewportGameScale();
  const backingScale = canvasBackingScale(viewportScale);
  const isPlaying = phase === "playing";
  const frameStyle = {
    width: WIDTH * viewportScale,
    height: HEIGHT * viewportScale,
  } satisfies CSSProperties;
  const overlayStyle = {
    width: WIDTH,
    height: HEIGHT,
    transform: `scale(${viewportScale})`,
  } satisfies CSSProperties;

  useEffect(() => {
    let disposed = false;

    loadSprites()
      .then(() => {
        if (!disposed) setAssetsReady(true);
      })
      .catch((err) => {
        console.error("[app] preload sprites failed:", err);
        if (!disposed) setAssetsReady(true);
      });

    return () => {
      disposed = true;
    };
  }, []);

  const requestStart = useCallback(() => {
    if (phase !== "menu") return;
    ensureAudio();
    setControlsOpen(false);
    setStartQueued(true);
    if (assetsReady) {
      setPhase("playing");
    }
  }, [assetsReady, phase]);

  useEffect(() => {
    if (phase === "menu" && startQueued && assetsReady) {
      setPhase("playing");
    }
  }, [assetsReady, phase, startQueued]);

  useEffect(() => {
    if (phase !== "menu") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (controlsOpen) {
        if (event.key === "Escape") {
          event.preventDefault();
          setControlsOpen(false);
        }
        return;
      }

      const isButtonActivation = (event.key === "Enter" || event.key === " ")
        && event.target instanceof Element
        && event.target.closest("button");
      if (isButtonActivation) return;
      event.preventDefault();
      requestStart();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [controlsOpen, phase, requestStart]);

  return (
    <main className="app-shell game-shell">
      <section className="game-frame" style={frameStyle}>
        <GameCanvas active={isPlaying} backingScale={backingScale} />
        <div className="game-overlay" style={overlayStyle}>
          {isPlaying ? (
            <>
              <GameHud />
              <TouchControls />
            </>
          ) : null}
          {phase === "menu" ? (
            <StartScreen
              assetsReady={assetsReady}
              startQueued={startQueued}
              controlsOpen={controlsOpen}
              onOpenControls={() => setControlsOpen(true)}
              onCloseControls={() => setControlsOpen(false)}
              onStart={requestStart}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}

export default function App() {
  return (
    <Provider store={gameStore}>
      <AppShell />
    </Provider>
  );
}
