import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  COVER_MOON_PHASE_COUNT,
  getCoverMoonPhaseIndex,
  getCoverProgress,
  readCoverKills,
  readLastSeenCoverKills,
  writeLastSeenCoverKills,
} from "../game/coverProgress";

type CustomCssProperties = CSSProperties & Record<`--${string}`, string>;

type StartScreenProps = {
  assetsReady: boolean;
  startQueued: boolean;
  onStart: () => void;
};

type CoverTransitionKind = "none" | "minor" | "phase";

const COVER_LAYERS = [
  { src: "assets/sprites/ui/cover/background.png", className: "cover-background" },
  { src: "assets/sprites/ui/cover/lantern_light.png", className: "cover-light" },
  { src: "assets/sprites/ui/cover/emissive_objects.png", className: "cover-warm-emitters" },
];

const MOON_PHASE_SHEET_SRC = "assets/sprites/ui/cover/moon.png";
const MOON_PHASE_FRAME_W = 160;
const MOON_PHASE_FRAME_H = 160;
const COVER_CANVAS_W = 1672;
const COVER_CANVAS_H = 941;
const MOON_PHASE_X = 416;
const MOON_PHASE_Y = 47;
const CSS_VALUE_PRECISION = 3;
const COVER_PROGRESS_SYNC_MS = 1000;
const DARKNESS_OPACITY_START = 0.96;
const DARKNESS_OPACITY_END = 0.18;
const DARKNESS_MID_SCALE = 0.82;
const DARKNESS_MID_END = 0.08;
const CLEAR_OPACITY_START = 0.035;
const SWEEP_WIDTH_START_VMIN = 28;
const SWEEP_WIDTH_END_VMIN = 58;
const SWEEP_HEIGHT_START_VMIN = 9;
const SWEEP_HEIGHT_END_VMIN = 22;
const CLEAR_CORE_START_PERCENT = 16;
const CLEAR_CORE_END_PERCENT = 28;
const SOFT_EDGE_START_PERCENT = 58;
const SOFT_EDGE_END_PERCENT = 76;
const SAME_PHASE_TRANSITION_MS = 700;
const PHASE_TRANSITION_MS = 1100;
const SWEEP_CENTER_X_START = 49;
const SWEEP_CENTER_X_END = 50;
const SWEEP_SCALE_X_START = 1.0;
const SWEEP_SCALE_X_END = 1.2;
const SWEEP_CENTER_Y_START = 81;
const SWEEP_CENTER_Y_END = 55;
const SWEEP_SCALE_Y_START = 1.0;
const SWEEP_SCALE_Y_END = 7.0;
const KILL_DIGIT_COLUMNS = 5;
const KILL_DIGIT_ROWS = 2;
const KILL_DIGIT_SHEET_SRC = "assets/sprites/ui/numbers.png";
const KILL_DIGIT_SHEET_W = 1672;
const KILL_DIGIT_SHEET_H = 941;
const KILL_DIGIT_FRAME_W = Math.floor(KILL_DIGIT_SHEET_W / KILL_DIGIT_COLUMNS);
const KILL_DIGIT_FRAME_H = Math.floor(KILL_DIGIT_SHEET_H / KILL_DIGIT_ROWS);

function lerp(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

function easeOutCubic(progress: number) {
  const clampedProgress = Math.max(0, Math.min(1, progress));
  return 1 - (1 - clampedProgress) ** 3;
}

function readPrefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(readPrefersReducedMotion);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setPrefersReducedMotion(query.matches);
    syncPreference();
    query.addEventListener("change", syncPreference);
    return () => query.removeEventListener("change", syncPreference);
  }, []);

  return prefersReducedMotion;
}

function coverStyleFromProgress(progress: number): CustomCssProperties {
  const darknessOpacity = lerp(DARKNESS_OPACITY_START, DARKNESS_OPACITY_END, progress);
  return {
    "--cover-darkness-opacity": darknessOpacity.toFixed(CSS_VALUE_PRECISION),
    "--cover-darkness-mid-opacity": lerp(
      darknessOpacity * DARKNESS_MID_SCALE,
      DARKNESS_MID_END,
      progress,
    ).toFixed(CSS_VALUE_PRECISION),
    "--cover-clear-opacity": lerp(CLEAR_OPACITY_START, 0, progress).toFixed(CSS_VALUE_PRECISION),
    "--cover-sweep-width": `${lerp(SWEEP_WIDTH_START_VMIN, SWEEP_WIDTH_END_VMIN, progress).toFixed(2)}vmin`,
    "--cover-sweep-height": `${lerp(SWEEP_HEIGHT_START_VMIN, SWEEP_HEIGHT_END_VMIN, progress).toFixed(2)}vmin`,
    "--cover-clear-core": `${lerp(CLEAR_CORE_START_PERCENT, CLEAR_CORE_END_PERCENT, progress).toFixed(2)}%`,
    "--cover-soft-edge": `${lerp(SOFT_EDGE_START_PERCENT, SOFT_EDGE_END_PERCENT, progress).toFixed(2)}%`,
    "--cover-sweep-center-x": `${lerp(SWEEP_CENTER_X_START, SWEEP_CENTER_X_END, progress).toFixed(2)}%`,
    "--cover-sweep-scale-x": lerp(SWEEP_SCALE_X_START, SWEEP_SCALE_X_END, progress).toFixed(CSS_VALUE_PRECISION),
    "--cover-sweep-center-y": `${lerp(SWEEP_CENTER_Y_START, SWEEP_CENTER_Y_END, progress).toFixed(2)}%`,
    "--cover-sweep-scale-y": lerp(SWEEP_SCALE_Y_START, SWEEP_SCALE_Y_END, progress).toFixed(CSS_VALUE_PRECISION),
  };
}

function useCoverProgress(prefersReducedMotion: boolean) {
  const [kills, setKills] = useState(() => readCoverKills());
  const [displayKills, setDisplayKills] = useState(() => {
    const currentKills = readCoverKills();
    const lastSeenKills = readLastSeenCoverKills();
    return !prefersReducedMotion && currentKills > lastSeenKills ? lastSeenKills : currentKills;
  });
  const [transitionKind, setTransitionKind] = useState<CoverTransitionKind>("none");
  const displayKillsRef = useRef(displayKills);

  useEffect(() => {
    const syncKills = () => setKills(readCoverKills());
    const intervalId = window.setInterval(syncKills, COVER_PROGRESS_SYNC_MS);

    window.addEventListener("focus", syncKills);
    window.addEventListener("storage", syncKills);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", syncKills);
      window.removeEventListener("storage", syncKills);
    };
  }, []);

  useEffect(() => {
    displayKillsRef.current = displayKills;
  }, [displayKills]);

  useEffect(() => {
    const startKills = displayKillsRef.current;

    if (prefersReducedMotion || kills <= startKills) {
      displayKillsRef.current = kills;
      setDisplayKills(kills);
      setTransitionKind("none");
      writeLastSeenCoverKills(kills);
      return;
    }

    const startProgress = getCoverProgress(startKills);
    const targetProgress = getCoverProgress(kills);
    const startPhase = getCoverMoonPhaseIndex(startProgress);
    const targetPhase = getCoverMoonPhaseIndex(targetProgress);
    const nextTransitionKind: CoverTransitionKind = startPhase === targetPhase ? "minor" : "phase";
    const duration = nextTransitionKind === "phase" ? PHASE_TRANSITION_MS : SAME_PHASE_TRANSITION_MS;
    const startTime = window.performance.now();
    let animationFrameId = 0;

    writeLastSeenCoverKills(kills);
    setTransitionKind(nextTransitionKind);

    const step = (timestamp: number) => {
      const progress = easeOutCubic((timestamp - startTime) / duration);
      const nextKills = lerp(startKills, kills, progress);
      displayKillsRef.current = nextKills;
      setDisplayKills(nextKills);

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
        return;
      }

      displayKillsRef.current = kills;
      setDisplayKills(kills);
      setTransitionKind("none");
    };

    animationFrameId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [kills, prefersReducedMotion]);

  return {
    kills,
    progress: getCoverProgress(displayKills),
    transitionKind,
  };
}

function CoverKillCounter({ value }: { value: number }) {
  const kills = Math.max(0, Math.floor(value));
  if (kills <= 0) return null;

  return (
    <div className="cover-kill-counter" aria-label={`击杀 ${kills}`}>
      {String(kills).split("").map((digit, index) => {
        const digitIndex = Number(digit);
        const column = digitIndex % KILL_DIGIT_COLUMNS;
        const row = Math.floor(digitIndex / KILL_DIGIT_COLUMNS);

        return (
          <svg
            key={`${index}-${digit}`}
            className="cover-kill-counter-digit"
            viewBox={`0 0 ${KILL_DIGIT_FRAME_W} ${KILL_DIGIT_FRAME_H}`}
            aria-hidden="true"
            focusable="false"
          >
            <image
              href={KILL_DIGIT_SHEET_SRC}
              x={-column * KILL_DIGIT_FRAME_W}
              y={-row * KILL_DIGIT_FRAME_H}
              width={KILL_DIGIT_SHEET_W}
              height={KILL_DIGIT_SHEET_H}
            />
          </svg>
        );
      })}
    </div>
  );
}

function CoverMoonPhase({ progress, transitionKind }: {
  progress: number;
  transitionKind: CoverTransitionKind;
}) {
  const phaseIndex = getCoverMoonPhaseIndex(progress);
  const moonCenterX = MOON_PHASE_X + MOON_PHASE_FRAME_W / 2;
  const moonCenterY = MOON_PHASE_Y + MOON_PHASE_FRAME_H / 2;

  return (
    <svg
      className="cover-layer cover-moon-emitter"
      viewBox={`0 0 ${COVER_CANVAS_W} ${COVER_CANVAS_H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <svg
        x={MOON_PHASE_X}
        y={MOON_PHASE_Y}
        width={MOON_PHASE_FRAME_W}
        height={MOON_PHASE_FRAME_H}
        viewBox={`0 0 ${MOON_PHASE_FRAME_W} ${MOON_PHASE_FRAME_H}`}
      >
        <image
          href={MOON_PHASE_SHEET_SRC}
          x={-phaseIndex * MOON_PHASE_FRAME_W}
          y={0}
          width={MOON_PHASE_FRAME_W * COVER_MOON_PHASE_COUNT}
          height={MOON_PHASE_FRAME_H}
        />
      </svg>
      {transitionKind !== "none" ? (
        <circle
          className={`cover-moon-flare cover-moon-flare-${transitionKind}`}
          cx={moonCenterX}
          cy={moonCenterY}
          r={92}
        />
      ) : null}
    </svg>
  );
}

export function StartScreen({ assetsReady, startQueued, onStart }: StartScreenProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { kills, progress, transitionKind } = useCoverProgress(prefersReducedMotion);
  const promptText = assetsReady ? "按任意键开始" : "加载像素贴图中...";
  const promptClassName = startQueued && !assetsReady
    ? "start-prompt start-prompt-loading"
    : "start-prompt";
  const stageClassName = transitionKind === "none"
    ? "cover-stage"
    : `cover-stage cover-stage-transition-${transitionKind}`;

  return (
    <div
      className="start-screen absolute inset-0 z-40 overflow-hidden text-left"
      role="button"
      tabIndex={0}
      aria-label={promptText}
      onPointerDown={(event) => {
        event.preventDefault();
        onStart();
      }}
      onClick={onStart}
    >
      <div className={stageClassName} style={coverStyleFromProgress(progress)} aria-hidden="true">
        {COVER_LAYERS.map((layer) => (
          <img
            key={layer.src}
            src={layer.src}
            alt=""
            draggable={false}
            className={`cover-layer ${layer.className}`}
          />
        ))}
        <CoverMoonPhase progress={progress} transitionKind={transitionKind} />
        <div className="cover-darkness" />
      </div>
      <CoverKillCounter value={kills} />
      <div className={promptClassName}>{promptText}</div>
    </div>
  );
}
