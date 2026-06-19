import { useCallback, useEffect, useRef, useState } from "react";
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
      className="pixel-canvas block h-auto w-[960px] max-w-full bg-[#0b1220] max-md:h-[100svh] max-md:w-screen max-md:max-w-none"
    />
  );
}

function AppShell() {
  const [phase, setPhase] = useState<AppPhase>("menu");
  const [assetsReady, setAssetsReady] = useState(false);
  const [startQueued, setStartQueued] = useState(false);
  const isPlaying = phase === "playing";

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
    <main className="mx-auto flex min-h-screen w-full max-w-[1020px] flex-col items-center justify-center px-4 py-4 text-center max-md:max-w-none max-md:px-0 max-md:py-0">
      {isPlaying ? (
        <>
          <h1 className="mb-4 text-base tracking-[1px] md:text-2xl max-md:hidden">月潮夜行</h1>
          <p className="mb-2 text-[10px] opacity-90 md:text-[13px] max-md:hidden">A/D 移动 · W/空格 跳跃 · J 攻击 · K 释放技能 · L 大招 · 1/2/3 切换技能 · ESC/P 暂停 · R 重开</p>
        </>
      ) : null}
      <section className="relative w-fit max-w-full overflow-hidden border-4 border-[#3f5f8a] bg-black shadow-[0_16px_48px_rgba(0,0,0,0.5)] max-md:h-[100svh] max-md:w-screen max-md:border-0 max-md:shadow-none">
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
