import { afterAll, describe, expect, it, vi } from "vitest";
import {
  ENEMY_SFX_SAMPLE_URLS,
  hasEnemySfxSample,
  playEnemySfxSample,
  preloadEnemySfxSamples,
} from "./audioSamples";

const EXPECTED_ENEMY_SFX = [
  "enemyAura",
  "enemyBirth",
  "enemyBurrow",
  "enemyCastRelease",
  "enemyCastStart",
  "enemyCurseTick",
  "enemyCleave",
  "enemyDash",
  "enemyDefeat",
  "enemyDive",
  "enemyEmerge",
  "enemyHurt",
  "enemyImpact",
  "enemyLeap",
  "enemyLunge",
  "enemyShieldBash",
  "enemyShieldBreak",
  "enemyShieldGuard",
  "enemySlash",
  "enemySplit",
  "enemyTalismanCastRelease",
  "enemyTalismanCastStart",
  "enemyWarning",
] as const;
const TEST_CONTEXT_TIME = 3;
const TEST_PITCH = 0.84;
const TEST_VOLUME = 0.2;
const ENCODED_AUDIO_BYTE_LENGTH = 8;

describe("enemy audio samples", () => {
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("maps every generated enemy sound to a WAV asset", () => {
    expect(Object.keys(ENEMY_SFX_SAMPLE_URLS).sort()).toEqual([...EXPECTED_ENEMY_SFX].sort());
    for (const url of Object.values(ENEMY_SFX_SAMPLE_URLS)) {
      expect(url).toMatch(/\.wav$/);
    }
  });

  it("decodes samples and plays them through pitch and volume controls", async () => {
    const decodedBuffer = {} as AudioBuffer;
    const source = {
      buffer: null as AudioBuffer | null,
      playbackRate: { value: 1 },
      connect: vi.fn(),
      start: vi.fn(),
    };
    const gain = {
      gain: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
    };
    const context = {
      currentTime: TEST_CONTEXT_TIME,
      destination: {},
      decodeAudioData: vi.fn().mockResolvedValue(decodedBuffer),
      createBufferSource: vi.fn(() => source),
      createGain: vi.fn(() => gain),
    } as unknown as AudioContext;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(ENCODED_AUDIO_BYTE_LENGTH)),
    });
    vi.stubGlobal("fetch", fetchMock);

    preloadEnemySfxSamples(context);
    await vi.waitFor(() => expect(hasEnemySfxSample("enemyHurt")).toBe(true));

    expect(fetchMock).toHaveBeenCalledTimes(EXPECTED_ENEMY_SFX.length);
    expect(context.decodeAudioData).toHaveBeenCalledTimes(EXPECTED_ENEMY_SFX.length);

    playEnemySfxSample(context, "enemyHurt", TEST_PITCH, TEST_VOLUME);

    expect(source.buffer).toBe(decodedBuffer);
    expect(source.playbackRate.value).toBe(TEST_PITCH);
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(TEST_VOLUME, TEST_CONTEXT_TIME);
    expect(source.connect).toHaveBeenCalledWith(gain);
    expect(gain.connect).toHaveBeenCalledWith(context.destination);
    expect(source.start).toHaveBeenCalledOnce();
  });
});
