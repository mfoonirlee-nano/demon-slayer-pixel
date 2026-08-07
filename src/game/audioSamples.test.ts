import { afterAll, describe, expect, it, vi } from "vitest";
import {
  BOSS_SFX_SAMPLE_URLS,
  ENEMY_SFX_SAMPLE_URLS,
  PLAYER_SFX_SAMPLE_URLS,
  hasSfxSample,
  playSfxSample,
  preloadSfxSamples,
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
const EXPECTED_PLAYER_SFX = [
  "playerAttackHit",
  "playerAttackStart",
  "playerBossHit",
  "playerCounter",
  "playerDeath",
  "playerFallAttackImpact",
  "playerFallAttackStart",
  "playerHurt",
  "playerJump",
  "playerLand",
  "playerRunStep",
  "playerSkillArc",
  "playerSkillArmorBreak",
  "playerSkillArmorBreakImpact",
  "playerSkillCast",
  "playerSkillDash",
  "playerSkillGuard",
  "playerSkillLine",
  "playerSkillRain",
  "playerSkillReturningBlade",
  "playerSkillReturningBladeCatch",
  "playerSkillReturningBladeTurn",
  "playerSkillVerticalWave",
  "playerSkillVortex",
  "playerStatusStun",
  "playerUltimateCast",
  "playerUltimateAfterimage",
  "playerUltimateEnd",
  "playerUltimateImpact",
] as const;
const EXPECTED_BOSS_SFX = [
  "bossMistBoneCast",
  "bossMistBoneDart",
  "bossMistBoneWarning",
  "bossMistBoneSpike",
  "bossMistBoneCharge",
  "bossMistBoneDeath",
  "bossKill",
] as const;
const TEST_CONTEXT_TIME = 3;
const TEST_PITCH = 0.84;
const TEST_VOLUME = 0.2;
const ENCODED_AUDIO_BYTE_LENGTH = 8;

describe("audio samples", () => {
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("maps every generated enemy sound to a WAV asset", () => {
    expect(Object.keys(ENEMY_SFX_SAMPLE_URLS).sort()).toEqual([...EXPECTED_ENEMY_SFX].sort());
    for (const url of Object.values(ENEMY_SFX_SAMPLE_URLS)) {
      expect(url).toMatch(/\.wav$/);
    }
  });

  it("decodes boss, enemy, and player samples and plays them through pitch and volume controls", async () => {
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

    preloadSfxSamples(context);
    await vi.waitFor(() => {
      expect(hasSfxSample("bossMistBoneCast")).toBe(true);
      expect(hasSfxSample("bossKill")).toBe(true);
      expect(hasSfxSample("enemyHurt")).toBe(true);
      expect(hasSfxSample("playerSkillLine")).toBe(true);
    });

    const expectedSampleCount = (
      EXPECTED_BOSS_SFX.length + EXPECTED_ENEMY_SFX.length + EXPECTED_PLAYER_SFX.length
    );
    expect(fetchMock).toHaveBeenCalledTimes(expectedSampleCount);
    expect(context.decodeAudioData).toHaveBeenCalledTimes(expectedSampleCount);
    for (const [url] of fetchMock.mock.calls) {
      expect(url).toMatch(/^\.\.\/assets\/audio\/sfx\/.+\.wav$/);
    }

    playSfxSample(context, "bossKill", TEST_PITCH, TEST_VOLUME);

    expect(source.buffer).toBe(decodedBuffer);
    expect(source.playbackRate.value).toBe(TEST_PITCH);
    expect(gain.gain.setValueAtTime).toHaveBeenCalledWith(TEST_VOLUME, TEST_CONTEXT_TIME);
    expect(source.connect).toHaveBeenCalledWith(gain);
    expect(gain.connect).toHaveBeenCalledWith(context.destination);
    expect(source.start).toHaveBeenCalledOnce();
  });
});

describe("player audio samples", () => {
  it("maps every player action sound to a WAV asset", () => {
    expect(Object.keys(PLAYER_SFX_SAMPLE_URLS).sort()).toEqual([...EXPECTED_PLAYER_SFX].sort());
    for (const url of Object.values(PLAYER_SFX_SAMPLE_URLS)) {
      expect(url).toMatch(/\.wav$/);
    }
  });
});

describe("boss audio samples", () => {
  it("maps the generic defeat and Mist Bone action sounds to WAV assets", () => {
    expect(Object.keys(BOSS_SFX_SAMPLE_URLS)).toEqual(EXPECTED_BOSS_SFX);
    for (const url of Object.values(BOSS_SFX_SAMPLE_URLS)) {
      expect(url).toMatch(/\.wav$/);
    }
  });
});
