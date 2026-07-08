import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Provider } from "jotai";
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

type AppPhase = "menu" | "playing";

const MIN_VIEWPORT_SCALE = 0.1;

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

function GameCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setCanvas(canvas);
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
      width={WIDTH}
      height={HEIGHT}
      aria-label="Moonlit Tide Survivor"
      className="pixel-canvas"
    />
  );
}

function AppShell() {
  const [phase, setPhase] = useState<AppPhase>("menu");
  const [assetsReady, setAssetsReady] = useState(false);
  const [startQueued, setStartQueued] = useState(false);
  const viewportScale = useViewportGameScale();
  const isPlaying = phase === "playing";
  const viewportStyle = {
    width: WIDTH * viewportScale,
    height: HEIGHT * viewportScale,
  } satisfies CSSProperties;
  const frameStyle = {
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
      event.preventDefault();
      requestStart();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, requestStart]);

  return (
    <main className="app-shell game-shell">
      <div className="game-viewport" style={viewportStyle}>
        <section className="game-frame" style={frameStyle}>
          <GameCanvas active={isPlaying} />
          {isPlaying ? (
            <>
              <GameHud />
              <TouchControls />
            </>
          ) : null}
          {phase === "menu" ? (
            <StartScreen assetsReady={assetsReady} startQueued={startQueued} onStart={requestStart} />
          ) : null}
        </section>
      </div>
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
