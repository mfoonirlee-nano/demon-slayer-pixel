import { spriteCatalog } from "./sprite-audit-catalog.mjs";

const catalog = spriteCatalog();

export const actors = [
  {
    id: "player",
    displayName: "潮刃者",
    category: "player",
    runtimeStatus: "runtime-enabled player",
    baseline: ["docs/art/player.md", "assets/art/player-concept.png", "assets/art/player-skills-concept.png"],
    sheets: [
      sheet("idle", "assets/sprites/player/player_idle.png", { primary: true }),
      sheet("run", "assets/sprites/player/player_run.png"),
      sheet("jump", "assets/sprites/player/player_jump.png"),
      sheet("attack", "assets/sprites/player/player_attack.png"),
      sheet("movingAttack", "assets/sprites/player/player_moving_attack.png"),
      sheet("fallAttack", "assets/sprites/player/player_fall_attack.png"),
      sheet("moonTide:idle", "assets/sprites/player/moon_tide/player_moon_tide_idle.png"),
      sheet("moonTide:run", "assets/sprites/player/moon_tide/player_moon_tide_run.png"),
      sheet("moonTide:jump", "assets/sprites/player/moon_tide/player_moon_tide_jump.png"),
      sheet("moonTide:attack", "assets/sprites/player/moon_tide/player_moon_tide_attack.png"),
      sheet("moonTide:movingAttack", "assets/sprites/player/moon_tide/player_moon_tide_moving_attack.png"),
      sheet("moonTide:fallAttack", "assets/sprites/player/moon_tide/player_moon_tide_fall_attack.png"),
      sheet("skill:line_projectile", "assets/sprites/skills/line_projectile/skill.png"),
      sheet("skill:close_arc", "assets/sprites/skills/close_arc/skill.png"),
      sheet("skill:guard_counter", "assets/sprites/skills/guard_counter/skill.png"),
      sheet("skill:dash_reposition", "assets/sprites/skills/dash_reposition/skill.png"),
      sheet("skill:vortex_control", "assets/sprites/skills/vortex_control/skill.png"),
      sheet("skill:armor_break", "assets/sprites/skills/armor_break/skill.png"),
      sheet("skill:anti_air_multi", "assets/sprites/skills/anti_air_multi/skill.png"),
      sheet("skill:returning_blade", "assets/sprites/skills/returning_blade/skill.png"),
      sheet("skill:vertical_wave", "assets/sprites/skills/vertical_wave/skill.png"),
      sheet("ultimateCast", "assets/sprites/skills/ultimate_skill/skill.png"),
    ],
    outOfScope: ["assets/sprites/skills/*/effect.png", "assets/sprites/skills/*/icon.png"],
  },
  enemy("chaser", "裸身追妖", "chaser", [sheet("move", "assets/sprites/enemies/chaser/chaser.png", { primary: true })]),
  enemy("crawler", "伏地蛛妖", "crawler", [
    sheet("move", "assets/sprites/enemies/crawler/crawler.png", { primary: true }),
    sheet("windup", "assets/sprites/enemies/crawler/crawler_windup.png"),
    sheet("lunge", "assets/sprites/enemies/crawler/crawler_lunge.png"),
    sheet("leap", "assets/sprites/enemies/crawler/crawler_spin_lunge.png"),
    sheet("recover", "assets/sprites/enemies/crawler/crawler_recover.png"),
  ]),
  enemy("runner", "角突夜妖", "runner", [
    sheet("approach", "assets/sprites/enemies/runner/runner_approach.png", { primary: true }),
    sheet("windup", "assets/sprites/enemies/runner/runner_windup.png"),
    sheet("dash", "assets/sprites/enemies/runner/runner_dash.png"),
    sheet("recover", "assets/sprites/enemies/runner/runner_recover.png"),
  ]),
  enemy("caster", "提灯咒妖", "caster", [
    sheet("move", "assets/sprites/enemies/caster/caster_move.png", { primary: true }),
    sheet("windup", "assets/sprites/enemies/caster/caster_windup.png"),
    sheet("cast", "assets/sprites/enemies/caster/caster_cast.png"),
    sheet("recover", "assets/sprites/enemies/caster/caster_recover.png"),
    sheet("hit", "assets/sprites/enemies/caster/caster_hit.png"),
  ], ["assets/sprites/enemies/caster/caster_wisp.png"]),
  enemy("duelist", "双刃裂妖", "duelist", [
    sheet("approach", "assets/sprites/enemies/duelist/duelist.png", { primary: true }),
    sheet("windup", "assets/sprites/enemies/duelist/duelist_windup.png"),
    sheet("slash", "assets/sprites/enemies/duelist/duelist_slash.png"),
    sheet("spin", "assets/sprites/enemies/duelist/duelist_spin.png"),
    sheet("recover", "assets/sprites/enemies/duelist/duelist_recover.png"),
  ]),
  enemy("brute", "盾甲重妖", "brute", [
    sheet("advance", "assets/sprites/enemies/brute/brute_advance.png", { primary: true }),
    sheet("guard", "assets/sprites/enemies/brute/brute_guard.png"),
    sheet("shieldBash", "assets/sprites/enemies/brute/brute_shield_bash.png"),
    sheet("recover", "assets/sprites/enemies/brute/brute_recover.png"),
    sheet("shieldBreak", "assets/sprites/enemies/brute/brute_shield_break.png"),
    sheet("brokenAdvance", "assets/sprites/enemies/brute/brute_broken_advance.png"),
    sheet("cleave", "assets/sprites/enemies/brute/brute_cleave.png"),
    sheet("brokenRecover", "assets/sprites/enemies/brute/brute_broken_recover.png"),
  ]),
  enemy("binder", "缚咒夜妖", "binder", [
    sheet("move", "assets/sprites/enemies/binder/binder_move.png", { primary: true }),
    sheet("windup", "assets/sprites/enemies/binder/binder_windup.png"),
    sheet("cast", "assets/sprites/enemies/binder/binder_cast.png"),
    sheet("recover", "assets/sprites/enemies/binder/binder_recover.png"),
    sheet("hit", "assets/sprites/enemies/binder/binder_hit.png"),
  ], ["assets/sprites/enemies/binder/binder_zone*.png"]),
  enemy("glider", "膜翼巡妖", "glider", [
    sheet("hover", "assets/sprites/enemies/glider/glider_hover.png", { primary: true }),
    sheet("windup", "assets/sprites/enemies/glider/glider_windup.png"),
    sheet("dive/pass", "assets/sprites/enemies/glider/glider_dive.png"),
    sheet("recover", "assets/sprites/enemies/glider/glider_recover.png"),
  ]),
  enemy("leaper", "裂足跳妖", "leaper", [
    sheet("stalk", "assets/sprites/enemies/leaper/leaper_stalk.png", { primary: true }),
    sheet("windup", "assets/sprites/enemies/leaper/leaper_windup.png"),
    sheet("leap", "assets/sprites/enemies/leaper/leaper_leap.png"),
    sheet("impact", "assets/sprites/enemies/leaper/leaper_impact.png"),
    sheet("recover", "assets/sprites/enemies/leaper/leaper_recover.png"),
  ]),
  enemy("splitter", "裂影夜妖", "splitter", [
    sheet("move", "assets/sprites/enemies/splitter/splitter_move.png", { primary: true }),
    sheet("hit", "assets/sprites/enemies/splitter/splitter_hit.png"),
    sheet("attack", "assets/sprites/enemies/splitter/splitter_attack.png"),
    sheet("split", "assets/sprites/enemies/splitter/splitter_split.png"),
    sheet("splitlingBirth", "assets/sprites/enemies/splitter/splitling_birth.png", { proxy: true }),
    sheet("splitlingMove", "assets/sprites/enemies/splitter/splitling_move.png", { proxy: true }),
  ]),
  enemy("warden", "御阵夜妖", "warden", [
    sheet("move", "assets/sprites/enemies/warden/warden_move.png", { primary: true }),
    sheet("aura", "assets/sprites/enemies/warden/warden_aura.png"),
    sheet("hit", "assets/sprites/enemies/warden/warden_hit.png"),
  ], [
    "assets/sprites/enemies/warden/warden_aura_effect.png",
    "assets/sprites/enemies/warden/warden_blood_moon_buff.png",
  ]),
  enemy("burrower", "土潜夜妖", "burrower", [
    sheet("move", "assets/sprites/enemies/burrower/burrower_move.png", { primary: true }),
    sheet("sink", "assets/sprites/enemies/burrower/burrower_sink.png"),
    sheet("burrow", "assets/sprites/enemies/burrower/burrower_burrow.png"),
    sheet("emerge", "assets/sprites/enemies/burrower/burrower_emerge.png"),
    sheet("recover", "assets/sprites/enemies/burrower/burrower_recover.png"),
  ]),
  boss("spider-string", "血月眷属 · 蛛弦", "spider-string", [
    sheet("move", "assets/sprites/boss/spider-string/boss.png", { primary: true }),
    sheet("attack", "assets/sprites/boss/spider-string/boss_attack.png"),
    sheet("cast", "assets/sprites/boss/spider-string/boss_skill1.png"),
    sheet("pillarCast", "assets/sprites/boss/spider-string/boss_pillar_cast.png"),
    sheet("ultimateCast", "assets/sprites/boss/spider-string/boss_ultimate_cast.png"),
  ], [
    "assets/sprites/boss/spider-string/boss_skill1_effect.png",
    "assets/sprites/boss/spider-string/boss_pillar_effect.png",
    "assets/sprites/boss/spider-string/boss_ultimate_pillar.png",
  ]),
  boss("mist-bone", "血月眷属 · 雾骨", "mist-bone", [
    sheet("move", "assets/sprites/boss/mist-bone/mist_bone_move.png", { primary: true }),
    sheet("attack", "assets/sprites/boss/mist-bone/mist_bone_attack.png"),
    sheet("pointCast", "assets/sprites/boss/mist-bone/mist_bone_cast.png"),
    sheet("lineCast", "assets/sprites/boss/mist-bone/mist_bone_line_cast.png"),
    sheet("cageCast", "assets/sprites/boss/mist-bone/mist_bone_cage_cast.png"),
  ], [
    "assets/sprites/boss/mist-bone/mist_bone_spikes.png",
    "assets/sprites/boss/mist-bone/mist_bone_dart.png",
  ]),
  boss("mirror-dream", "血月眷属 · 镜魇", "mirror-dream", [
    sheet("move", "assets/sprites/boss/mirror-dream/mirror_dream.png", { primary: true }),
    sheet("cast", "assets/sprites/boss/mirror-dream/mirror_dream_cast.png"),
    sheet("recover", "assets/sprites/boss/mirror-dream/mirror_dream_recover.png"),
    sheet("awakened:move", "assets/sprites/boss/mirror-dream/mirror_dream_awakened_cracks.png", { overlay: true }),
    sheet("awakened:cast", "assets/sprites/boss/mirror-dream/mirror_dream_cast_awakened_cracks.png", { overlay: true }),
    sheet("awakened:recover", "assets/sprites/boss/mirror-dream/mirror_dream_recover_awakened_cracks.png", { overlay: true }),
    sheet("afterimage", "assets/sprites/boss/mirror-dream/mirror_afterimage.png", { proxy: true }),
    sheet("nightmare", "assets/sprites/boss/mirror-dream/mirror_nightmare.png", { proxy: true }),
  ], ["assets/sprites/boss/mirror-dream/mirror_shard.png"]),
  boss("fang-gale", "血月眷属 · 牙岚", "fang-gale", [
    sheet("move", "assets/sprites/boss/fang-gale/fang_gale_move.png", { primary: true }),
    sheet("windup", "assets/sprites/boss/fang-gale/fang_gale_windup.png"),
    sheet("bite", "assets/sprites/boss/fang-gale/fang_gale_bite.png"),
    sheet("retreat", "assets/sprites/boss/fang-gale/fang_gale_retreat.png"),
    sheet("turn", "assets/sprites/boss/fang-gale/fang_gale_turn.png"),
    sheet("finalBite", "assets/sprites/boss/fang-gale/fang_gale_final_bite.png"),
    sheet("recover", "assets/sprites/boss/fang-gale/fang_gale_recover.png"),
  ], ["assets/sprites/boss/fang-gale/fang_gale_wave.png"]),
  boss("lantern-ember", "血月眷属 · 灯烬", "lantern-ember", [
    sheet("move", "assets/sprites/boss/lantern-ember/lantern_ember_move.png", { primary: true }),
    sheet("summon", "assets/sprites/boss/lantern-ember/lantern_ember_summon.png"),
    sheet("firelineCast", "assets/sprites/boss/lantern-ember/lantern_ember_fireline_cast.png"),
    sheet("buffCast", "assets/sprites/boss/lantern-ember/lantern_ember_buff_cast.png"),
    sheet("death", "assets/sprites/boss/lantern-ember/lantern_ember_death.png"),
  ], ["assets/sprites/boss/lantern-ember/*effect*.png", "assets/sprites/boss/lantern-ember/lantern_ember_fireline.png", "assets/sprites/boss/lantern-ember/lantern_ember_*zone.png", "assets/sprites/boss/lantern-ember/lantern_ember_buff_tether.png"]),
  boss("dead-bell", "血月眷属 · 枯铃", "dead-bell", [
    sheet("move", "assets/sprites/boss/dead_bell/dead_bell.png", { primary: true }),
    sheet("cast", "assets/sprites/boss/dead_bell/dead_bell_cast.png"),
    sheet("recover", "assets/sprites/boss/dead_bell/dead_bell_recover.png"),
  ], [
    "assets/sprites/boss/dead_bell/dead_bell_awakened_echo_bell.png",
    "assets/sprites/boss/dead_bell/dead_bell_wave.png",
    "assets/sprites/boss/dead_bell/dead_bell_blade.png",
  ]),
  boss("blood-moon-many-faces", "终幕之妖 · 万相血月", "blood-moon-many-faces", [
    sheet("move", "assets/sprites/boss/blood-moon-many-faces/blood_moon.png", { primary: true }),
    sheet("phaseShift", "assets/sprites/boss/blood-moon-many-faces/blood_moon_phase_shift.png"),
    sheet("recover", "assets/sprites/boss/blood-moon-many-faces/blood_moon_recover.png"),
    sheet("death", "assets/sprites/boss/blood-moon-many-faces/blood_moon_death.png"),
    sheet("finalStagger", "assets/sprites/boss/blood-moon-many-faces/blood_moon_final_stagger.png"),
    sheet("spiderMistCast", "assets/sprites/boss/blood-moon-many-faces/blood_moon_spider_mist_cast.png"),
    sheet("mirrorFangCast", "assets/sprites/boss/blood-moon-many-faces/blood_moon_mirror_fang_cast.png"),
    sheet("lanternBellCast", "assets/sprites/boss/blood-moon-many-faces/blood_moon_lantern_bell_cast.png"),
    sheet("sixfoldCast", "assets/sprites/boss/blood-moon-many-faces/blood_moon_sixfold_cast.png"),
    sheet("manyFacesCast", "assets/sprites/boss/blood-moon-many-faces/blood_moon_many_faces_cast.png"),
  ], ["assets/sprites/boss/blood-moon-many-faces/*effect.png"]),
];

function sheet(state, src, flags = {}) {
  const spec = catalog.get(src);
  if (!spec) throw new Error(`Unregistered actor sprite: ${src}`);
  return { state, ...spec, ...flags };
}

function enemy(id, displayName, docSlug, sheets, outOfScope = []) {
  return {
    id,
    displayName,
    category: "enemy",
    runtimeStatus: "runtime-enabled enemy",
    baseline: [`docs/art/enemies/${docSlug}.md`, `assets/art/${docSlug}-concept.png`],
    sheets,
    outOfScope,
  };
}

function boss(id, displayName, docSlug, sheets, outOfScope = []) {
  return {
    id,
    displayName,
    category: "boss",
    runtimeStatus: "runtime-enabled or registered boss",
    baseline: [`docs/art/bosses/${docSlug}.md`, `assets/art/boss-${docSlug}-concept.png`],
    sheets,
    outOfScope,
  };
}
