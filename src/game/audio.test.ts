import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameSfx } from "./audioTypes";

const EXPECTED_SAMPLE_COUNT = 53;
const EXPECTED_OSCILLATOR_COUNT = 3;
const ENCODED_AUDIO_BYTE_LENGTH = 8;
const EXPECTED_SAMPLE_VOLUME = 0.16;
const SAMPLE_MIN_GAP = 0.12;

function oscillatorNode() {
  return {
    frequency: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    type: "sine",
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
}

function gainNode() {
  return {
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  };
}

describe("audio fallback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("preloads samples while keeping rate-limited oscillator sounds available", async () => {
    const createOscillator = vi.fn(oscillatorNode);
    const createGain = vi.fn(gainNode);
    class FakeAudioContext {
      state = "running";
      currentTime = 1;
      destination = {};
      resume = vi.fn();
      createOscillator = createOscillator;
      createGain = createGain;
    }
    const fetchMock = vi.fn(() => new Promise<Response>(() => undefined));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      AudioContext: FakeAudioContext,
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
      },
    });

    const { ensureAudio, playSfx } = await import("./audio");
    ensureAudio();

    expect(fetchMock).toHaveBeenCalledTimes(EXPECTED_SAMPLE_COUNT);

    playSfx("enemyHurt");
    playSfx("enemyHurt");
    playSfx("bossHurt");

    expect(createOscillator).toHaveBeenCalledTimes(EXPECTED_OSCILLATOR_COUNT);
    expect(createGain).toHaveBeenCalledTimes(EXPECTED_OSCILLATOR_COUNT);
  });

  it("rate-limits decoded samples and applies the sample mix volume", async () => {
    const decodedBuffer = {} as AudioBuffer;
    const source = {
      buffer: null as AudioBuffer | null,
      playbackRate: { value: 1 },
      connect: vi.fn(),
      start: vi.fn(),
    };
    const gain = gainNode();
    const contexts: FakeAudioContext[] = [];
    class FakeAudioContext {
      state = "running";
      currentTime = 1;
      destination = {};
      resume = vi.fn();
      createOscillator = vi.fn(oscillatorNode);
      createGain = vi.fn(() => gain);
      createBufferSource = vi.fn(() => source);
      decodeAudioData = vi.fn().mockResolvedValue(decodedBuffer);

      constructor() {
        contexts.push(this);
      }
    }
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(ENCODED_AUDIO_BYTE_LENGTH)),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("window", {
      AudioContext: FakeAudioContext,
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
      },
    });

    const { ensureAudio, playSfx } = await import("./audio");
    const { hasSfxSample } = await import("./audioSamples");
    ensureAudio();
    await vi.waitFor(() => expect(hasSfxSample("enemyHurt")).toBe(true));

    playSfx("enemyHurt");
    playSfx("enemyHurt");

    expect(contexts[0]!.createBufferSource).toHaveBeenCalledOnce();
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(EXPECTED_SAMPLE_VOLUME, contexts[0]!.currentTime);

    contexts[0]!.currentTime += SAMPLE_MIN_GAP;
    playSfx("enemyHurt");

    expect(contexts[0]!.createBufferSource).toHaveBeenCalledTimes(2);
  });

  it("keeps an oscillator fallback for every player sample before decoding", async () => {
    const createOscillator = vi.fn(oscillatorNode);
    class FakeAudioContext {
      state = "running";
      currentTime = 1;
      destination = {};
      resume = vi.fn();
      createOscillator = createOscillator;
      createGain = vi.fn(gainNode);
    }
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => undefined)));
    vi.stubGlobal("window", {
      AudioContext: FakeAudioContext,
      localStorage: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
      },
    });

    const { ensureAudio, playSfx } = await import("./audio");
    const { PLAYER_SFX_SAMPLE_URLS } = await import("./audioSamples");
    ensureAudio();

    for (const sfx of Object.keys(PLAYER_SFX_SAMPLE_URLS) as GameSfx[]) {
      createOscillator.mockClear();
      playSfx(sfx);
      expect(createOscillator, `${sfx} should keep a fallback tone`).toHaveBeenCalled();
    }
  });
});
