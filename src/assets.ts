import {
  PLAYER_SHEETS,
  ENEMY_SHEETS,
  CRAWLER_SHEETS,
  CASTER_SHEETS,
  CASTER_WISP_SHEET,
  DUELIST_SHEETS,
  RUNNER_SHEETS,
  BRUTE_SHEETS,
  BINDER_SHEETS,
  BINDER_ZONE_SHEET,
  BINDER_ZONE_BACK_SHEET,
  BINDER_ZONE_FRONT_SHEET,
  BOSS_SHEET,
  BOSS_SKILL1_SHEET,
  BOSS_SKILL1_EFFECT_SHEET,
  DEAD_BELL_SHEET,
  DEAD_BELL_CAST_SHEET,
  DEAD_BELL_WAVE_SHEET,
  DEAD_BELL_BLADE_SHEET,
  LANTERN_EMBER_SHEET,
  LANTERN_EMBER_SUMMON_SHEET,
  LANTERN_EMBER_FIRELINE_CAST_SHEET,
  LANTERN_EMBER_BUFF_CAST_SHEET,
  LANTERN_EMBER_DEATH_SHEET,
  LANTERN_EMBER_LURE_EFFECT_SHEET,
  LANTERN_EMBER_FIRELINE_SHEET,
  LANTERN_EMBER_BUFF_TETHER_SHEET,
  LANTERN_EMBER_AWAKENED_GRID_SHEET,
  LANTERN_EMBER_ASH_ZONE_SHEET,
  MIRROR_DREAM_SHEET,
  MIRROR_DREAM_CAST_SHEET,
  MIRROR_SHARD_SHEET,
  MIRROR_AFTERIMAGE_SHEET,
  MIRROR_NIGHTMARE_SHEET,
  BLOOD_MOON_SHEET,
  BLOOD_MOON_PHASE_SHIFT_SHEET,
  BLOOD_MOON_RECOVER_SHEET,
  BLOOD_MOON_DEATH_SHEET,
  BLOOD_MOON_SPIDER_MIST_CAST_SHEET,
  BLOOD_MOON_MIRROR_FANG_CAST_SHEET,
  BLOOD_MOON_LANTERN_BELL_CAST_SHEET,
  BLOOD_MOON_SIXFOLD_CAST_SHEET,
  BLOOD_MOON_MANY_FACES_CAST_SHEET,
  BLOOD_MOON_SPIDER_MIST_EFFECT_SHEET,
  BLOOD_MOON_MIRROR_FANG_EFFECT_SHEET,
  BLOOD_MOON_LANTERN_BELL_EFFECT_SHEET,
  BLOOD_MOON_SIXFOLD_EFFECT_SHEET,
  BLOOD_MOON_MANY_FACES_EFFECT_SHEET,
  SKILLS,
  SKILL1_EFFECT_SHEET,
  SKILL2_EFFECT_SHEET,
  SKILL3_EFFECT_SHEET,
  ULTIMATE_SKILL_SHEET,
  ULTIMATE_SKILL_EFFECT_SHEET,
  SKY_SPRITES,
  CLOUD_SPRITES,
  TREE_SPRITES,
  STONE_TOWER_SPRITES,
  STONE_TOWER_SMALL_SPRITES,
  TORII_SPRITES,
  MOUNTAIN_SPRITES,
  GROUND_TILE_SPRITES,
  PLATFORM_SPRITES,
} from "./constants";
import { loadImage } from "./utils";
import { state } from "./state";

let loadTask: Promise<void> | null = null;

export function loadSprites(): Promise<void> {
  if (loadTask) return loadTask;

  const jobs: Array<Promise<void>> = [];
  for (const sheet of Object.values(PLAYER_SHEETS)) {
    jobs.push(loadImage(sheet.src).then((img) => { sheet.image = img; }));
  }
  for (const sheet of ENEMY_SHEETS) {
    jobs.push(loadImage(sheet.src).then((img) => { sheet.image = img; }));
  }
  for (const sheet of Object.values(CRAWLER_SHEETS)) {
    if (ENEMY_SHEETS.includes(sheet)) continue;
    jobs.push(loadImage(sheet.src).then((img) => { sheet.image = img; }));
  }
  for (const sheet of Object.values(CASTER_SHEETS)) {
    if (ENEMY_SHEETS.includes(sheet)) continue;
    jobs.push(loadImage(sheet.src).then((img) => { sheet.image = img; }));
  }
  jobs.push(loadImage(CASTER_WISP_SHEET.src).then((img) => { CASTER_WISP_SHEET.image = img; }));
  for (const sheet of Object.values(DUELIST_SHEETS)) {
    if (ENEMY_SHEETS.includes(sheet)) continue;
    jobs.push(loadImage(sheet.src).then((img) => { sheet.image = img; }));
  }
  for (const sheet of Object.values(RUNNER_SHEETS)) {
    if (ENEMY_SHEETS.includes(sheet)) continue;
    jobs.push(loadImage(sheet.src).then((img) => { sheet.image = img; }));
  }
  for (const sheet of Object.values(BRUTE_SHEETS)) {
    if (ENEMY_SHEETS.includes(sheet)) continue;
    jobs.push(loadImage(sheet.src).then((img) => { sheet.image = img; }));
  }
  for (const sheet of Object.values(BINDER_SHEETS)) {
    if (ENEMY_SHEETS.includes(sheet)) continue;
    jobs.push(loadImage(sheet.src).then((img) => { sheet.image = img; }));
  }
  jobs.push(loadImage(BINDER_ZONE_SHEET.src).then((img) => { BINDER_ZONE_SHEET.image = img; }));
  jobs.push(loadImage(BINDER_ZONE_BACK_SHEET.src).then((img) => { BINDER_ZONE_BACK_SHEET.image = img; }));
  jobs.push(loadImage(BINDER_ZONE_FRONT_SHEET.src).then((img) => { BINDER_ZONE_FRONT_SHEET.image = img; }));
  jobs.push(loadImage(BOSS_SHEET.src).then((img) => { BOSS_SHEET.image = img; }));
  jobs.push(loadImage(BOSS_SKILL1_SHEET.src).then((img) => { BOSS_SKILL1_SHEET.image = img; }));
  jobs.push(loadImage(BOSS_SKILL1_EFFECT_SHEET.src).then((img) => { BOSS_SKILL1_EFFECT_SHEET.image = img; }));
  jobs.push(loadImage(DEAD_BELL_SHEET.src).then((img) => { DEAD_BELL_SHEET.image = img; }));
  jobs.push(loadImage(DEAD_BELL_CAST_SHEET.src).then((img) => { DEAD_BELL_CAST_SHEET.image = img; }));
  jobs.push(loadImage(DEAD_BELL_WAVE_SHEET.src).then((img) => { DEAD_BELL_WAVE_SHEET.image = img; }));
  jobs.push(loadImage(DEAD_BELL_BLADE_SHEET.src).then((img) => { DEAD_BELL_BLADE_SHEET.image = img; }));
  for (const sheet of [
    LANTERN_EMBER_SHEET,
    LANTERN_EMBER_SUMMON_SHEET,
    LANTERN_EMBER_FIRELINE_CAST_SHEET,
    LANTERN_EMBER_BUFF_CAST_SHEET,
    LANTERN_EMBER_DEATH_SHEET,
    LANTERN_EMBER_LURE_EFFECT_SHEET,
    LANTERN_EMBER_FIRELINE_SHEET,
    LANTERN_EMBER_BUFF_TETHER_SHEET,
    LANTERN_EMBER_AWAKENED_GRID_SHEET,
    LANTERN_EMBER_ASH_ZONE_SHEET,
  ]) {
    jobs.push(loadImage(sheet.src).then((img) => { sheet.image = img; }));
  }
  jobs.push(loadImage(MIRROR_DREAM_SHEET.src).then((img) => { MIRROR_DREAM_SHEET.image = img; }));
  jobs.push(loadImage(MIRROR_DREAM_CAST_SHEET.src).then((img) => { MIRROR_DREAM_CAST_SHEET.image = img; }));
  jobs.push(loadImage(MIRROR_SHARD_SHEET.src).then((img) => { MIRROR_SHARD_SHEET.image = img; }));
  jobs.push(loadImage(MIRROR_AFTERIMAGE_SHEET.src).then((img) => { MIRROR_AFTERIMAGE_SHEET.image = img; }));
  jobs.push(loadImage(MIRROR_NIGHTMARE_SHEET.src).then((img) => { MIRROR_NIGHTMARE_SHEET.image = img; }));
  for (const sheet of [
    BLOOD_MOON_SHEET,
    BLOOD_MOON_PHASE_SHIFT_SHEET,
    BLOOD_MOON_RECOVER_SHEET,
    BLOOD_MOON_DEATH_SHEET,
    BLOOD_MOON_SPIDER_MIST_CAST_SHEET,
    BLOOD_MOON_MIRROR_FANG_CAST_SHEET,
    BLOOD_MOON_LANTERN_BELL_CAST_SHEET,
    BLOOD_MOON_SIXFOLD_CAST_SHEET,
    BLOOD_MOON_MANY_FACES_CAST_SHEET,
    BLOOD_MOON_SPIDER_MIST_EFFECT_SHEET,
    BLOOD_MOON_MIRROR_FANG_EFFECT_SHEET,
    BLOOD_MOON_LANTERN_BELL_EFFECT_SHEET,
    BLOOD_MOON_SIXFOLD_EFFECT_SHEET,
    BLOOD_MOON_MANY_FACES_EFFECT_SHEET,
  ]) {
    jobs.push(loadImage(sheet.src).then((img) => { sheet.image = img; }));
  }
  jobs.push(loadImage(SKY_SPRITES.src).then((img) => { SKY_SPRITES.image = img; }));
  jobs.push(loadImage(CLOUD_SPRITES.big.src).then((img) => { CLOUD_SPRITES.big.image = img; }));
  jobs.push(loadImage(CLOUD_SPRITES.small.src).then((img) => { CLOUD_SPRITES.small.image = img; }));
  for (const sheet of TREE_SPRITES.sheets) {
    jobs.push(loadImage(sheet.src).then((img) => { sheet.image = img; }));
  }
  jobs.push(loadImage(STONE_TOWER_SPRITES.src).then((img) => { STONE_TOWER_SPRITES.image = img; }));
  jobs.push(loadImage(STONE_TOWER_SMALL_SPRITES.src).then((img) => { STONE_TOWER_SMALL_SPRITES.image = img; }));
  jobs.push(loadImage(TORII_SPRITES.src).then((img) => { TORII_SPRITES.image = img; }));
  jobs.push(loadImage(MOUNTAIN_SPRITES.src).then((img) => { MOUNTAIN_SPRITES.image = img; }));
  jobs.push(loadImage(GROUND_TILE_SPRITES.grass.src).then((img) => { GROUND_TILE_SPRITES.grass.image = img; }));
  jobs.push(loadImage(GROUND_TILE_SPRITES.grass.frontSrc).then((img) => { GROUND_TILE_SPRITES.grass.frontImage = img; }));
  jobs.push(loadImage(GROUND_TILE_SPRITES.stone.src).then((img) => { GROUND_TILE_SPRITES.stone.image = img; }));
  jobs.push(loadImage(GROUND_TILE_SPRITES.stone.frontSrc).then((img) => { GROUND_TILE_SPRITES.stone.frontImage = img; }));
  jobs.push(loadImage(PLATFORM_SPRITES.src).then((img) => { PLATFORM_SPRITES.image = img; }));
  jobs.push(loadImage(SKILL1_EFFECT_SHEET.src).then((img) => { SKILL1_EFFECT_SHEET.image = img; }));
  jobs.push(loadImage(SKILL2_EFFECT_SHEET.src).then((img) => { SKILL2_EFFECT_SHEET.image = img; }));
  jobs.push(loadImage(SKILL3_EFFECT_SHEET.src).then((img) => { SKILL3_EFFECT_SHEET.image = img; }));
  jobs.push(loadImage(ULTIMATE_SKILL_SHEET.src).then((img) => { ULTIMATE_SKILL_SHEET.image = img; }));
  jobs.push(loadImage(ULTIMATE_SKILL_EFFECT_SHEET.src).then((img) => { ULTIMATE_SKILL_EFFECT_SHEET.image = img; }));
  for (const skill of SKILLS) {
    jobs.push(loadImage(skill.src).then((img) => { skill.image = img; }));
  }

  loadTask = Promise.all(jobs).then(() => {
    console.log('[assets] all sprites loaded, setting spritesReady=true');
    state.spritesReady = true;
  });
  return loadTask;
}
